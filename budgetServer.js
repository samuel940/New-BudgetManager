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

// open port
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

    // console says if it works or not
    console.log("Connected to MongoDB");
  } catch (e) {
    console.error("Failed to connect to MongoDB:", e);
    process.exit(1);
  }
}

function authenticateToken(req, res, next) {
  const token = req.cookies.token;  // read from cookies
  
  // if cookies not fount, you need to login
  if (!token) {
    // console says when token is gone
    console.log("No token found - redirecting to login");
    return res.redirect('/login');
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log("Token invalid:", err.message);
      res.clearCookie('token');
      return res.redirect('/login');
    }
    
    req.user = user;
    next();
  });
}

// getting access to templates (webpages) and public (stylesheet)
process.stdin.setEncoding("utf8");
app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname, "templates"));
app.use(express.static(path.join(__dirname, "public")));

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
    
    // check if user exists
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      return res.render("register", { error: `<p>The username you entered was already taken</p>` });
    }

    // if it doesnt, create hashed password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // create user with initial budget
    const user = {
      username,
      password: hashedPassword,
      budget: 1000, // default budget
      createdAt: new Date()
    };
    
    // go to login page
    const result = await usersCollection.insertOne(user);
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
    res.cookie('token', token, { httpOnly: true, secure: true });
    res.redirect("/");
  } catch (e) {
    res.render("login", { error: "Login failed" });
  }
});

// logging out
app.get("/logout", (req, res) => {
  res.clearCookie('token');
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
    
    // if no transactions, say so, otherwise create table
    if (transactions.length === 0) {
      transactionInfo = "No purchases yet";
    } else {
      transactionInfo = `<table border='1'><tr><th>Name</th><th>Cost</th><th>Amount</th></tr>`;
      transactions.forEach(purchase => {
        transactionInfo += `<tr><td>${purchase.name}</td><td>$${purchase.price}</td><td>${purchase.amount}</td></tr>`;
        const price = Number(purchase.price);
        const amount = Number(purchase.amount);
        totalSpent += price * amount;
      });
      transactionInfo += `</table>`;
    }

    res.render("index", { 
      transactionInfo, 
      totalSpent,
      userBudget,
      username 
    });
  } catch (e) {
    console.error(e);
    res.redirect("/login");
  }
});

// when you click "Add Transaction"
app.get("/addTransaction", authenticateToken, async (req, res) => {
  const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
  const username = user.username;

  res.render("addPurchase", {username});
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
  const purchaseInfo = `<strong>Name:</strong> ${name}<br>
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
app.get("/deleteTransactions", authenticateToken, async (req, res) => {
  try {
    const transactions = await transactionsCollection.find({ 
      userId: new ObjectId(req.user.userId) 
    }).toArray();
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    const username = user.username;
    
    
    // if there are none, say so, otherwise list each one out
    let allTransactions = "";
    if (transactions.length === 0) {
      allTransactions = "<p>No transactions to delete</p>";
    } else {
      transactions.forEach(purchase => {
        allTransactions += `<p><strong>Name:</strong> ${purchase.name}<br>
                           <strong>Price:</strong> $${purchase.price}<br>
                           <strong>Amount:</strong> ${purchase.amount}<br>
                           <strong>Category:</strong> ${purchase.category}<br>
                           <strong>Description:</strong> ${purchase.description}<br>
                           <form method="post" action="/delete">
                             <input type="hidden" name="id" value="${purchase._id}">
                             <button type="submit" name="delete">Delete</button>
                           </form></p><hr>`;
      });
    }
    res.render("removal", { allTransactions, username });
  } catch (e) {
    console.error(e);
    res.redirect("/");
  }
});

// when you click "Delete" on a specific transaction
app.post("/delete", authenticateToken, async (req, res) => {
  const id = req.body.id;
  try {
    await transactionsCollection.deleteOne({ 
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId) // only delete own transactions
    });
  } catch (e) {
    console.error(e);
  }
  res.redirect("/deleteTransactions");
});

// what to do when you change budget
app.post("/updateBudget", authenticateToken, async (req, res) => {
  const { budget } = req.body;
  try {
    await usersCollection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      { $set: { budget: Number(budget) } }
    );
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false });
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
