const totalSpent = window.pageData.totalSpent;
const userBudget = window.pageData.userBudget;
const allPurchases = window.pageData.allPurchases.purchases;
const budgetTable = document.getElementById("budgetInfo").innerHTML;

let info = document.getElementById("budgetInfo");

document.getElementById("total-budget").innerText = `Total Budget: $${userBudget.toLocaleString()}`;
const remaining = userBudget - totalSpent;

if (remaining >= 0){
    document.getElementById("budget-left").innerText = `Remaining Budget: $${remaining.toLocaleString()}`;
} else {
    document.getElementById("budget-left").innerText = `Remaining Budget: -$${(-1*remaining).toLocaleString()}\nYou are over budget. Fix it!`;
}

function getCategoryTotal(category) {
    return allPurchases
        .filter(item => item.category === category)
        .reduce((total, item) => total + item.price * item.amount, 0);
}

async function changeBudget() {
    let newBudget = prompt("What is your new budget in dollars?");
    let num = Number(newBudget);

    if (Number.isFinite(num) && num > 0) {
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
    } else if(newBudget !== null) {
        alert("Not a valid number");
    }
}
document.getElementById("logout").onsubmit = logOut;

function logOut(){
        return window.confirm("Are you sure you want to log out?");
}

function createGraph(graphType) {
    
    info.innerHTML = '<canvas id="budgetChart"></canvas>';

    // chart creation
    new Chart(document.getElementById("budgetChart"), {
        type: graphType, 
        data: {
            labels: ['Food', 'Transportation', 'Housing/Bills', 'Clothing', 'Education', 'Other'], 
            datasets: [{
                label: 'Current Budget Distribution',
                data: [
    getCategoryTotal("Food"),
    getCategoryTotal("Transportation"),
    getCategoryTotal("Housing/Bills"),
    getCategoryTotal("Clothing"),
    getCategoryTotal("Education"),
    getCategoryTotal("Other")], 
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
