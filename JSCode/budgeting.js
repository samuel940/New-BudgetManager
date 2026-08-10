const totalSpent = window.pageData.totalSpent;
const userBudget = window.pageData.userBudget;
const allPurchases = window.pageData.allPurchases.purchases;
const budgetTable = document.getElementById("budgetInfo").innerHTML;

let info = document.getElementById("budgetInfo");

const foodTotal = allPurchases
    .filter(item => item.category === "Food")
    .reduce((total, item) => total + item.price * item.amount, 0);

const transportationTotal = allPurchases
    .filter(item => item.category === "Transportation")
    .reduce((total, item) => total + item.price * item.amount, 0);

const housingBillsTotal = allPurchases
    .filter(item => item.category === "Housing/Bills")
    .reduce((total, item) => total + item.price * item.amount, 0);

const clothingTotal = allPurchases
    .filter(item => item.category === "Clothing")
    .reduce((total, item) => total + item.price * item.amount, 0);

const educationTotal = allPurchases
    .filter(item => item.category === "Education")
    .reduce((total, item) => total + item.price * item.amount, 0);

const otherTotal = allPurchases
    .filter(item => item.category === "Other")
    .reduce((total, item) => total + item.price * item.amount, 0);

document.getElementById("total-budget").innerText = `Total Budget: $${userBudget.toLocaleString()}`;
const remaining = userBudget - totalSpent;

if (remaining >= 0){
document.getElementById("budget-left").innerText = `Remaining Budget: $${remaining.toLocaleString()}`;
} else {
document.getElementById("budget-left").innerText = `Remaining Budget: -$${(-1*remaining).toLocaleString()}\nYou are over budget. Fix it!`;
}

async function changeBudget() {
let newBudget = prompt("What is your new budget in dollars?");
let num = Number(newBudget);

if (Number.isFinite(num) && num > 0) {
    // Save to MongoDB via API
    const response = await fetch('/updateBudget', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ budget: num })
    });
    
    if (response.ok) {
    alert(`Budget changed to $${num.toLocaleString()}`);
    location.reload(); 
    } else {
    alert('Failed to update budget');
    }
} else {
    alert("Not a valid number");
}
}
document.getElementById("logout").onsubmit = logOut;

function logOut(){
        return window.confirm("Are you sure you want to log out?");
}

function createGraph(graphType) {
    
    info.innerHTML = '<canvas id="budgetChart"></canvas>';

    // Initialize a new Chart instance
    new Chart(document.getElementById("budgetChart"), {
        type: graphType, 
        data: {
            labels: ['Food', 'Transportation', 'Housing/Bills', 'Clothing', 'Education', 'Other'], 
            datasets: [{
                label: 'Current Budget Distribution',
                data: [foodTotal,transportationTotal,housingBillsTotal,clothingTotal,educationTotal,otherTotal], 
                borderWidth: 1
                }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true, 
                    grid: { color: function() {
                            if (graphType == "bar") {
                                return 'rgba(255, 255, 255, 0.5)';
                            } else {
                                return '#000040';
                            }
                        }
                    }
                }
            },
            maintainAspectRatio: false
        }
    });
}


function createTable(){
    info.innerHTML = budgetTable;
}
