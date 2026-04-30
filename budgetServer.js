
const path = require("path");
const express = require("express");   /* Accessing express module */
const app = express();  /* app is a request handler */

app.use(express.urlencoded({ extended: true })); // lets me read body
const portNumber = process.env.PORT || 7003;

require("dotenv").config({
   path: path.resolve(__dirname, "credentialsDontPost/.env"),
});
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const databaseName = "budget";
const collectionName = "srowe";
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

let collection;

// connect to mongo when server starts
async function connectToDatabase() {
   try {
      await client.connect();
      const database = client.db(databaseName);
      collection = database.collection(collectionName);
      console.log("Connected to MongoDB");
   } catch (e) {
      console.error("Failed to connect to MongoDB:", e);
      process.exit(1);
   }
}

process.stdin.setEncoding("utf8");
app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname, "templates"));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", async (request, response) => {
   let transactionInfo = "";

   let totalSpent = 0;


   try {
      const filter = {};
      const cursor = collection.find(filter);
      const result = await cursor.toArray();
      console.log(`There are ${result.length} transactions`);
      
      // if there is none, say so, otherwise make table
      if (result.length == 0) {
         transactionInfo = "No purchases yet";
      } else {
         console.log(result);
         transactionInfo = `<table border='1'><tr><th>Name</th><th>Cost</th><th>Amount</th></tr>`;
         result.forEach(purchase => {
            transactionInfo += `<tr><td>${purchase.name}</td><td>${purchase.price}</td><td>${purchase.amount}</td></tr>`;
            const price = Number(purchase.price);
            const amount = Number(purchase.amount);
            totalSpent += price * amount;
         });
         transactionInfo += `</table>`;
      }
   } catch (e) {
      console.error(e);
   }
   response.render("index", {transactionInfo, totalSpent});
});

// when Add Transaction button is pressed
app.get("/addTransaction", (request, response) => {
   response.render("addPurchase");
});

app.post("/processTransaction", async (request, response) => {
   const name = request.body.name;
   const price = request.body.price;
   const amount = request.body.amount;
   const category = request.body.category;
   const description = request.body.description;

   

   try {
      const purchase = { name, price, amount, category, description };
      await collection.insertOne(purchase);
      console.log(`Added ${purchase.name} purchase`);
   } catch (e) {
      console.error(e);
   }

   const purchaseInfo = `<strong>Name: </strong>${name}<br>
   <strong>Price: </strong>${price}<br>
   <strong>Amount Bought: </strong>${amount}<br>
   <strong>Type of Purchase: </strong>${category}<br>
   <strong>Description: </strong>${description}<br>
   <hr><p>Transaction Added.</p>`;
   response.render("purchaseConfirmation", {purchaseInfo});
});

app.get("/clear", async (request, response) => {
   let purchaseInfo = "";
   try {
      await collection.drop();
      purchaseInfo = "<p>All Transactions Deleted<p>";
   } catch (e) {
      console.error(e);
   }
   response.render("purchaseConfirmation", {purchaseInfo});
});

app.get("/deleteTransactions", async (request, response) => {
   let allTransactions = "";
   try {
      const filter = {};
      const cursor = collection.find(filter);
      const result = await cursor.toArray();
      console.log(`There ${result.length} transactions`);
      
      // if there is none, say so, otherwise make table
      if (result.length == 0) {
         allTransactions = "<p>No transactions to delete</p>";
      } else {
         console.log(result);
         result.forEach(purchase => {
            allTransactions += `
               <p><strong>Name: </strong>${purchase.name}<br>
               <strong>Price: </strong>${purchase.price}<br>
               <strong>Amount Bought: </strong>${purchase.amount}<br>
               <strong>Type of Purchase: </strong>${purchase.category}<br>
               <strong>Description: </strong>${purchase.description}<br>
               <form method="post" action="/delete">
                  <input type="hidden" name="id" value="${purchase._id}">
                  <button type="submit" name="delete">Delete</button>
               </form></p>
               <hr>`;
         });
      }
   } catch (e) {
      console.error(e);
   }
   response.render("removal", {allTransactions});
});

app.post("/delete", async (request, response) => {
   const id = request.body.id;

   try {
      await collection.deleteOne({ _id: new ObjectId(id) });
      console.log(`Deleted transaction with id ${id}`);
   } catch (e) {
      console.error(e);
   }

   response.redirect("/deleteTransactions"); // reload page
});


// opening server
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

process.stdin.on('readable', () => {  /* on equivalent to addEventListener */
	const dataInput = process.stdin.read(); // terminal input
	if (dataInput !== null) {
		const command = dataInput.trim(); // checks what you type into the terminal
		if (command === "stop") { // if you type in stop, end the server
			process.stdout.write("Shutting down the server"); 
            process.exit(0);  /* exiting */
        }
            else {
			// if you type in anything else, say command is invalid
			process.stdout.write(`Invalid command: ${command}`);
		}
		process.stdin.resume(); // Allows the code to process next request
    }
});
