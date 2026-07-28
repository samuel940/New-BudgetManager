document.getElementById("purchaseForm").onsubmit = validateRequest;

function validateRequest(){
    const name = document.getElementById("name").value;
    const price = document.getElementById("price").value;
    const amount = document.getElementById("amount").value;
    const categories = document.getElementsByName("category");
    let selected = "";
    let error = "";

    // checking which catogory is selected
    for (var i = 0; i < categories.length; i++) {
        if (categories[i].checked) {
            selected = categories[i].value;
            
            break; 
        }
    }

    // getting errors if there are any
    if (!name) {
        error += "No name given\n";
    }
    
    if (!price) {
        error += "No price given\n";
    }
    if (!amount) {
        error += "No amount given\n";
    }

    if (selected == "") {
        error += "No catagory selected\n";
    }

    // if everything is good confirm, else alert of mistakes
    if (error != "") {
        alert(error);
        return false;
    } else {
        return window.confirm("Are you sure what you submitted is correct?");
    }
    
}