// adding everything I need
const path = require("path");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 
app.use(cookieParser());


// getting access to all folders
process.stdin.setEncoding("utf8");
app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname, "templates"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "JSCode")));



const { Purchase, PurchaseLog} = require("./JSCode/purchaseLog");


let allPurchases = new PurchaseLog();

const portNumber = process.env.PORT || 7003;

// get env information
require("dotenv").config({ 
  path: path.resolve(__dirname, "credentialsDontPost/.env") 
});

//  JWT secret to make passwords more secure
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

// mongo information and connection
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const databaseName = "budget";
const usersCollectionName = "users";  
const transactionsCollectionName = "transactions"; 
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

let usersCollection, transactionsCollection;

// connect to collections of users and transactions
async function connectToDatabase() {
  try {
    await client.connect();
    const database = client.db(databaseName);
    usersCollection = database.collection(usersCollectionName);
    transactionsCollection = database.collection(transactionsCollectionName);

    
    console.log("Connected to MongoDB");
  } catch (e) {
    console.error("Failed to connect to MongoDB:", e);
    process.exit(1);
  }
}

function authenticateToken(req, res, next) {
  
  const token = req.cookies.loggedIn;  // read from cookies
  
  // if cookies not fount, you need to login
  if (!token) {
    
    console.log("No token found - redirecting to login");
    return res.redirect('/login');
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log("Token invalid:", err.message);
      res.clearCookie('loggedIn');
      return res.redirect('/login');
    }
    
    req.user = user;
    next();
  });
}


// going to login and registration pages
app.get("/login", (req, res) => {
  res.render("login", {error: ""});
});

app.get("/register", (req, res) => {
  res.render("register", {error: ""});
});

// when you register a new account
app.post("/register", async (req, res) => {
  try {
    const username = req.body.username.toLowerCase();
    const password = req.body.password;
    
    // check if user exists and add it to database if it doesnt
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      return res.render("register", { error: `<p>The username you entered was already taken</p>` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // create user with initial budget
    const user = {
      username,
      password: hashedPassword,
      budget: 1000, // default budget
      createdAt: new Date()
    };
    const result = await usersCollection.insertOne(user);

    // go to login page
    res.redirect("/login");
  } catch (e) {
    res.render("register", { error: "Registration failed" });
  }
});

// when you try to login
app.post("/login", async (req, res) => {
  try {
    const username = req.body.username.toLowerCase();
    const password = req.body.password;
    
    // check if username exists
    const user = await usersCollection.findOne({ username });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.render("login", { error: `<p>The username or password you entered was incorrect</p>` });
    }

    // if it does, create JWT token 
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });
    
    // set token as cookie to keep track of if you are logged in
    res.cookie('loggedIn', token, { httpOnly: true, secure: true });
    res.redirect("/");
  } catch (e) {
    res.render("login", { error: "Login failed" });
  }
});

// logging out
app.get("/logout", (req, res) => {
  res.clearCookie('loggedIn');
  res.redirect("/login");
});



// base page (all stuff from here uses authentication to make sure you are logged in)
app.get("/", authenticateToken, async (req, res) => {
  try {
    // get budget and transactions from current user
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    const userBudget = user?.budget || 1000;
    const username = user.username;
    const transactions = await transactionsCollection.find({ userId: new ObjectId(req.user.userId) }).toArray();
    
    let transactionInfo = "";
    let totalSpent = 0;
    allPurchases.clearLog();
    
    // if no transactions, say so, otherwise create table
    if (transactions.length === 0) {
      transactionInfo = "<p>No purchases yet</p>";
    } else {
      transactionInfo = `<table border='1'><tr><th>Purchase</th><th>Cost</th><th>Amount</th></tr>`;
      transactions.forEach(purchase => {
        transactionInfo += `<tr><td>${purchase.name}</td><td>$${purchase.price}</td><td>${purchase.amount}</td></tr>`;
        const price = Number(purchase.price);
        const amount = Number(purchase.amount);
        totalSpent += price * amount;

        allPurchases.add(new Purchase(purchase.name,purchase.price,purchase.amount,purchase.category,purchase.description));
      });
      transactionInfo += `</table>`;
      //console.log(allPurchases);
    }

    res.render("index", { 
      transactionInfo, 
      totalSpent,
      userBudget,
      username,
      allPurchases
    });
  } catch (e) {
    console.error(e);
    res.redirect("/login");
  }
});

// when you click "Add Transaction"
app.get("/addTransaction", authenticateToken, async (req, res) => {
  try{
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    const username = user.username;

    res.render("addPurchase", {username});

  } catch (e) {
    console.error(e);
    res.redirect("/");
  }
  
});

// when you submit a transaction
app.post("/processTransaction", authenticateToken, async (req, res) => {
  const { name, price, amount, category, description } = req.body;

  const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
  const username = user.username;
  
  // add new info to database
  try {
    const purchase = { 
      userId: new ObjectId(req.user.userId), // user who is adding it
      name, 
      price: Number(price), 
      amount: Number(amount), 
      category, 
      description
    };
    await transactionsCollection.insertOne(purchase);
    console.log(`Added ${purchase.name} purchase for user ${req.user.userId}`);
  } catch (e) {
    console.error(e);
  }

  // show info that user submitted
  const purchaseInfo = `<strong>Purchase:</strong> ${name}<br>
                       <strong>Price:</strong> $${price}<br>
                       <strong>Amount:</strong> ${amount}<br>
                       <strong>Category:</strong> ${category}<br>
                       <strong>Description:</strong> ${description}<br>
                       <hr><p>Transaction Added.</p>`;
  
  res.render("purchaseConfirmation", { purchaseInfo, username });
});

// when you click "clear all transactions"
app.get("/clear", authenticateToken, async (req, res) => {
  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    const username = user.username;
    await transactionsCollection.deleteMany({ userId: new ObjectId(req.user.userId) });
    res.render("purchaseConfirmation", { purchaseInfo: "<p>All Transactions Deleted</p>", username: username });
  } catch (e) {
    console.error(e);
    res.redirect("/");
  }
});

// when you click "Delete Transactions"
app.get("/manageTransactions", authenticateToken, async (req, res) => {
  try {
    const transactions = await transactionsCollection.find({ 
      userId: new ObjectId(req.user.userId) 
    }).toArray();
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    const username = user.username;
    
    
    // if there are none, say so, otherwise list each one out

    // build deletion rows: each row contains up to two .deletion divs
    let noTransactions = "";
    let deletionRows = "";

    if (transactions.length === 0) {
      noTransactions = "<p>No transactions to delete</p>";
    } else {
      for (let i = 0; i < transactions.length; i++) {
        if (i % 2 === 0) {
          // start a new row
          deletionRows += `<div class="deletionRow">`;
        }

        const purchase = transactions[i];
        deletionRows += `<div class="deletion"><p><strong>Purchase:</strong> ${purchase.name}<br>
                           <strong>Price:</strong> $${purchase.price}<br>
                           <strong>Amount:</strong> <button class="addSubtract" onclick='changeAmount(false,"${purchase._id}", ${purchase.amount})'>-</button>&nbsp&nbsp${purchase.amount}&nbsp&nbsp<button class="addSubtract" onclick='changeAmount(true,"${purchase._id}", ${purchase.amount})' >+</button><br>
                           <strong>Category:</strong> ${purchase.category}<br>
                           <strong>Description:</strong> ${purchase.description}<br></p>
                           <button onclick='deleteTransaction("${purchase._id}")' name="delete">Delete</button></div>`;

        if (i % 2 === 1 || i === transactions.length - 1) {
          // close the row and add a separator
          deletionRows += `</div><hr>`;
        }
      }
    }

    res.render("removal", { noTransactions, deletionRows, username });
  } catch (e) {
    console.error(e);
    res.redirect("/");
  }
});

// deleting a specific transaction
app.post("/delete", authenticateToken, async (req, res) => {
  const id = req.body.id;

  try {
    const result = await transactionsCollection.deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId)
    });

    res.json({
      success: result.deletedCount === 1
    });
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false });
  }
});

// what to do when you change budget
app.post("/updateBudget", authenticateToken, async (req, res) => {
  const budget = req.body.budget;
  try {
    await usersCollection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      { $set: { budget: Number(budget) } }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false });
  }
});

// adding or subtracting the amount of a transaction
app.post("/updateAmount", authenticateToken, async (req, res) => {
  const id = req.body.id;
  const more = req.body.more;

  try {
    let result;

    if (more) {
      result = await transactionsCollection.updateOne(
        {_id: new ObjectId(id),userId: new ObjectId(req.user.userId)},
        {$inc: { amount: 1 }}
      );
    } else {
      result = await transactionsCollection.updateOne(
        {_id: new ObjectId(id),userId: new ObjectId(req.user.userId),amount: { $gt: 1 }},
        {$inc: { amount: -1 }}
      );
    }

    res.json({
      success: result.modifiedCount === 1
    });

  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false });
  }
});

// opening server code
if (!portNumber) {
  console.log("unable to open");
  process.exit(1);
}

connectToDatabase().then(() => {
  app.listen(portNumber, () => {
    console.log(`Web server is running at http://localhost:${portNumber}`);
    console.log("Stop to shutdown the server");
  });
});

// info for closing and opening server on terminal
process.stdin.on('readable', () => {
  const dataInput = process.stdin.read();
  if (dataInput !== null) {
    const command = dataInput.trim();
    if (command === "stop") {
      process.stdout.write("Shutting down the server");
      process.exit(0);
    } else {
      process.stdout.write(`Invalid command: ${command}`);
    }
    process.stdin.resume();
  }
});
