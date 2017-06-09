let socket = io();

let tickers = []; // to keep track of what we already have on the page

// window.onload = function() {
//     socket.emit("request setup");
// }

const emitTicker = function(ticker) {
    socket.emit("add ticker", ticker);
    document.getElementsByName("ticker")[0].value = "";
}

const emitRemove = function(ticker) {
    alert("CLICKED")
    tickers = tickers.filter((tic) => {
        return tic !== ticker;
    })
    socket.emit("remove ticker", ticker);
    document.getElementById(ticker).remove();

}

const addNewStock = function(stock){
    let newButton = document.createElement("button");
    newButton.id = stock.symbol;
    newButton.className = "btn btn-default";
    newButton.value = stock.symbol;
    newButton.innerText = stock.name;
    newButton.onClick = "emitRemove(this.value)";
    document.getElementById("stocks").appendChild(newButton);
    tickers.push(stock.symbol);
}

socket.on("initial setup", (stocks) => {
    stocks.forEach((stock) => {
        addNewStock(stock);
    })
})

socket.on("add stock", (stock) => {
    if (tickers.indexOf(stock.symbol) === -1) {
        addNewStock(stock);
    }
})
