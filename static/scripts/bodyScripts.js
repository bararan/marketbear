let socket = io();


const emitTicker = function(ticker) {
    socket.emit("add ticker", ticker);
    document.getElementsByName("ticker")[0].value = "";
}

const emitRemove = function(ticker) {
    alert("CLICKED")
    socket.emit("remove ticker", ticker);
    document.getElementById(ticker).remove();

}

socket.on("add stock", (stock) => {
    console.log("New Stock: " + stock.symbol)
    let newButton = document.createElement("button");
    newButton.id = stock.symbol;
    newButton.className = "btn btn-default";
    newButton.value = stock.symbol;
    newButton.innerText = stock.name;
    newButton.onClick = "emitRemove(this.value)";
    document.getElementById("stocks").appendChild(newButton);
})