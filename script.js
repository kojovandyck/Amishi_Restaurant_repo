
class Order {
    constructor() {
        this._menu = [];
        this._previousSales = [];
        this._invoiceNumber = "";
        this._order = [];
        this._payment = {
            invoiceNumber: 0,
            amountPaid: 0,
            type: "",
            changeTip: 0
        };
    }

    get menu() {
        return this._menu;
    }

    set menu(menuArray) {
        this._menu = [];

        menuArray.forEach(menuItem => {
            let currItem = {};
            currItem.sku = menuItem[0];
            currItem.description = menuItem[1];
            currItem.price = menuItem[2];
            currItem.taxRate = menuItem[3];
            currItem.image = menuItem[4];
            this._menu.push(currItem);
        })
    }

    //Getters
    get previousSales() {
        return this._previousSales;
    }

    set previousSales(salesData) {
        this._previousSales = salesData;
    }

    get invoiceNumber() {
        return this._invoiceNumber;
    }

    get order() {
        return this._order;
    }

    get payment() {
        return this._payment;
    }

    set payment(payment) {
        this._payment = payment;
    }

    generateInvoiceNumber() {
        if (this._previousSales.length < 1 || this._previousSales == undefined) {
            this._invoiceNumber = 1;
        } else {
            let highest = 0;
            this._previousSales.forEach(previousSalesLine => {
                if (previousSalesLine[1] > highest) {
                    highest = previousSalesLine[1];
                }
                this._invoiceNumber = highest + 1;
            })
        }
    }

    addOrderLine(quantity, sku) {
        let currentLine = {};

        for (let i = 0; i < this._menu.length; i++) {
            if (sku === this._menu[i].sku) {
                currentLine.sku = this._menu[i].sku;
                currentLine.description = this._menu[i].description;
                currentLine.quantity = quantity;
                currentLine.price = this._menu[i].price;
                currentLine.subtotal = currentLine.quantity * currentLine.price;
                currentLine.tax = Utilities.roundToTwo(this._menu[i].taxRate * currentLine.subtotal);
            }
        }

        this._order.push(currentLine);
        Ui.receiptDetails(this);

    }

    deleteOrderLine(index) {
        this._order.splice(index, 1);

        Ui.receiptDetails(this);
    }

    clearOrder() {
        this._order = [];

        Ui.receiptDetails(this);
    }

    getSummary() {
        const summary = {
            subtotal: 0,
            tax: 0,
            grandtotal: 0
        }

        this.order.forEach(orderLine => {
            summary.subtotal += orderLine.subtotal;
            summary.tax += orderLine.tax;
        })
        summary.grandtotal = summary.subtotal + summary.tax;

        return summary;
    }

    paypad(input) {
        if (!isNaN(parseInt(input))) {
            Utilities.numberPaypad(parseInt(input), this);
        } else if (input === "back") {
            Utilities.backPaypad(this);
        } else if (input === "clear") {
            Utilities.clearPaypad(this);
        } else {
            this.closeSale();
        }
    }

    changePayment(input) {

        const orderGrandTotal = this.getSummary().grandtotal;
        if (input.invoiceNumber != null) this.payment.invoiceNumber = inputInvoiceNumber;
        if (input.amountPaid != null) this.payment.amountPaid = parseFloat(input.amountPaid);
        if (input.type != null) this.payment.type = input.type;
        if (this.payment.amountPaid > orderGrandTotal) {
            this.payment.changeTip = this.payment.amountPaid - orderGrandTotal;
            Ui.closeButton(false);
        } else {
            this.payment.changeTip = 0;
            Ui.closeButton(true);
        }

        Ui.paymentSummary(this);
    }

    clearPayment() {
        this._payment = {
            invoiceNumber: 0,
            amountPaid: 0,
            type: "",
            changeTip: 0
        };

        Ui.paymentSummary(this);
    }

    exportOrder(date) {
      let exportData = [];

        this.order.forEach(orderLine => {
            let currentLine = [];
            currentLine[0] = date;
            currentLine[1] = this.invoiceNumber;
            currentLine[2] = orderLine.sku;
            currentLine[3] = orderLine.quantity;
            currentLine[4] = orderLine.price;
            currentLine[5] = orderLine.tax;

            exportData.push(currentLine);
            this.previousSales.push(currentLine);

        });

        return exportData;
    }

    exportPayment(date) {
        const currentPayment = [[]];
        const tipChange = Utilities.roundToTwo(this.payment.amountPaid - this.getSummary().grandtotal)

        currentPayment[0][0] = date;
        currentPayment[0][1] = this.invoiceNumber;
        currentPayment[0][2] = this.getSummary().grandtotal;
        currentPayment[0][3] = this.payment.type;

        if (this.payment.type === "cash") {
            currentPayment[0][4] = 0;
        } else {
            currentPayment[0][4] = tipChange;
        }
       return currentPayment;
    }

    closeSale() {
        const date = new Date();
        const orderData = this.exportOrder(date);
        const paymentData = this.exportPayment(date);
        const exportData = {
          order : orderData,
          payment : paymentData
        }

        Ui.hidePaypad(this);
        this.clearPayment();
        this.clearOrder();
        Ui.invoiceNumber(this);

        google.script.run.setData(JSON.stringify(exportData));
    }
}

class Ui {
    static menu(orderInstance) {
        let frag = document.createDocumentFragment();

        orderInstance.menu.forEach(item => {
            let menuElement = `<img src="${item.image}" alt="${item.description}" class="menu-img" style="width:150px;">
            <figcaption>${item.description}</figcaption>
            <figcaption>${Utilities.convertFloatToString(item.price)}</figcaption>`

            let node = document.createElement("figure");
            node.className = "menu-item";
            node.setAttribute("data-sku", `${item.sku}`);
            node.innerHTML = menuElement;
            frag.appendChild(node);
        });

        document.getElementById("menu").appendChild(frag);

        document.querySelectorAll(".menu-item").forEach(button => {
            button.addEventListener('click', () => {
                orderInstance.addOrderLine(1, parseInt(button.getAttribute("data-sku")));
            });
        })
    }

    static receiptDetails(orderInstance) {
        let frag = document.createDocumentFragment();

        orderInstance.order.forEach((orderLine, index) => {
            let receiptLine = `<td class="description">${orderLine.description}</td>
            <td class="quantity">${orderLine.quantity}</td>
            <td class="price">${Utilities.convertFloatToString(orderLine.price)}</td>
            <td class="subtotal">${Utilities.convertFloatToString(orderLine.subtotal)}</td>
            <td class="delete" data-delete="${index.toString()}"><i class="fas fa-backspace"></i></td>`

            let node = document.createElement("tr");
            node.setAttribute("data-index", `${index.toString()}`);
            node.innerHTML = receiptLine;
            frag.appendChild(node);
        });

        let receiptDetails = document.getElementById("receipt-details");
        while (receiptDetails.hasChildNodes()) {
            receiptDetails.removeChild(receiptDetails.childNodes[0]);
        }

        receiptDetails.appendChild(frag);
        this.summary(orderInstance);

        document.querySelectorAll('.delete').forEach(button => {
            button.addEventListener('click', () => {
                orderInstance.deleteOrderLine(parseInt(button.getAttribute("data-delete")));
            })
        })
    }

    static invoiceNumber(orderInstance) {
        orderInstance.generateInvoiceNumber();
        const invoiceNumber = orderInstance.invoiceNumber;
        document.getElementById('invoice-number').textContent = `Order# ${invoiceNumber}`
    }

    static summary(orderInstance) {
        const summary = orderInstance.getSummary();
        const subtotal = document.getElementById("subtotal-summary");
        const tax = document.getElementById("tax-summary");
        const grandtotal = document.getElementById("grandtotal-summary");

        subtotal.textContent = Utilities.convertFloatToString(summary.subtotal);
        tax.textContent = Utilities.convertFloatToString(summary.tax);
        grandtotal.textContent = Utilities.convertFloatToString(summary.grandtotal);
    }

    static showPaypad(orderInstance) {
        const paypad = document.getElementById('payment-overlay');
        paypad.style.display = "grid";
    }

    static hidePaypad(orderInstance) {
        const paypad = document.getElementById('payment-overlay');
        paypad.style.display = "none";
    }

    static paymentSummary(orderInstance) {
        document.getElementById('amount-paid').textContent = Utilities.convertFloatToString(orderInstance.payment.amountPaid);

        const changeTipTitle = document.getElementById('tip-change-title');
        const paymentType = document.getElementById("payment-type");

        if (orderInstance.payment.type === "credit") {
            changeTipTitle.textContent = "Tip:";
            paymentType.textContent = "CC";
        } else if (orderInstance.payment.type === "cash") {
            changeTipTitle.textContent = "Change:";
            paymentType.textContent = "Cash";
        } else {
            changeTipTitle.textContent = "Change:";
            paymentType.textContent = "";
        }
        document.getElementById("tip-change-value").textContent = Utilities.convertFloatToString(orderInstance.payment.changeTip);
    }

    static closeButton(bool) {
        const closeButton = document.getElementById('close-sale');
        if (bool) {
            closeButton.style.display = "none";
        } else {
            closeButton.style.display = "grid";
        }
    }

}

class Utilities {

    static convertFloatToString(float) {
        let priceParams = {
            style: "currency",
            currency: "aed"
        };

        return float.toLocaleString("ar-AE", priceParams);
    }

    static roundToTwo(num) {
        return +(Math.round(num + "e+2") + "e-2");
    }

    static numberPaypad(input, orderInstance) {
        const currentInput = this.roundToTwo(input * .01);
        const currentAmountPaid = this.roundToTwo(orderInstance.payment.amountPaid);
        const newAmountPaid = this.roundToTwo((currentAmountPaid * 10) + currentInput);

        if (currentAmountPaid === 0) {
            orderInstance.changePayment({ amountPaid: currentInput });
        } else {
            orderInstance.changePayment({ amountPaid: newAmountPaid });
        }
    }

    static backPaypad(orderInstance) {
        const currentPayment = orderInstance.payment.amountPaid;

        if (currentPayment > 0) {
            const toSubtract = ((currentPayment * 100) % 10) * 0.01;
            const newAmount = (currentPayment - toSubtract) * 0.1;
            orderInstance.changePayment({ amountPaid: newAmount });
        }
    }

    static clearPaypad(orderInstance) {
        orderInstance.changePayment({ amountPaid: 0 });
    }
}



// ORDER INSTANTIATION
const order = new Order();

function sheetData() {
  google.script.run.withSuccessHandler(function(dataArray){
    console.log(dataArray)
    items = Object.values(dataArray.items);
    sales = dataArray.sales;

    order.menu = items;
    order.previousSales = sales;

    Ui.menu(order);
    Ui.invoiceNumber(order);
  }).getData();
}

sheetData();



// STATIC EVENT LISTENERS
document.getElementById('clear-order').addEventListener('click', () => {
    order.clearOrder();
})

document.querySelectorAll('.paypad-show').forEach(button => {
    button.addEventListener('click', () => {
        Ui.showPaypad(order);
        order.changePayment(JSON.parse(button.getAttribute("data-payment-type")));

    })
})

document.getElementById('paypad-close').addEventListener('click', () => {
    order.clearPayment();
    Ui.hidePaypad(order);
})

document.querySelectorAll('.paypad-btn').forEach(button => {
    button.addEventListener('click', () => {
        order.paypad(button.getAttribute("data-id"));
    })
})
