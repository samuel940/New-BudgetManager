"use strict";

class Purchase {
  constructor(name, price, amount, category, description) {
    this.name = name;
    this.price = price;
    this.amount = amount;
    this.category = category;
    this.description = description;
  }


}

class PurchaseLog {

  constructor() {
    this.purchases = [];
  }

  add(purchase) {
    this.purchases.push(purchase);
  }

  getTotal() {
    let total = 0;
    for (let item of this.purchases) {
      total += item.price * item.amount;
    }
    return total;
  }

  
  clearLog() {
    this.purchases = [];
  }

  getFood() {
    let total = 0;
    for (let item of this.purchases) {
      if (item.category === "Food") {
        total += item.price * item.amount;
      }
    }
    return total;
  }

  getTransportation() {
    let total = 0;
    for (let item of this.purchases) {
      if (item.category === "Transportation") {
        total += item.price * item.amount;
      }
    }
    return total;
  }

  getHousingBills() {
    let total = 0;
    for (let item of this.purchases) {
      if (item.category === "Housing/Bills") {
        total += item.price * item.amount;
      }
    }
    return total;
  }

  getHealthcare() {
    let total = 0;
    for (let item of this.purchases) {
      if (item.category === "Healthcare") {
        total += item.price * item.amount;
      }
    }
    return total;
  }

  getEducation() {
    let total = 0;
    for (let item of this.purchases) {
      if (item.category === "Education") {
        total += item.price * item.amount;
      }
    }
    return total;
  }

  getOther() {
    let total = 0;
    for (let item of this.purchases) {
      if (item.category === "Other") {
        total += item.price * item.amount;
      }
    }
    return total;
  }

}


module.exports = {
  Purchase,
  PurchaseLog
}