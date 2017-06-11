let socket = io();
let stocks = []; // to keep track of what we already have on the page

// window.onload = function() {

// }

// Emitters
const emitTicker = function(ticker) {
    socket.emit("add ticker", ticker);
    document.getElementsByName("ticker")[0].value = "";
}

const emitRemove = function(ticker) {
    // const ticker = button.value;
    stocks = stocks.filter((stock) => {
        return stock.symbol !== ticker;
    })
    socket.emit("remove ticker", ticker);
    document.getElementById(ticker).remove();
    plotStocks();
}

// Socket message handlers
socket.on("initial setup", (newStocks) => {
    newStocks.forEach((stock) => {
        addNewStock(stock);
    })
})

socket.on("add stock", (newStock) => {
    if (!stocks.find((stock)=>{return stock.symbol === newStock.symbol})) {
        addNewStock(newStock);
        return;
    }
    console.log("HOLA@")
})

socket.on("remove stock", (ticker) => {
    removeStock(ticker);
})

// Functions to modify page content 
const addNewStock = function(stock) {
    stocks.push(stock);
    plotStocks();
    let newButton = document.createElement("button");
    newButton.id = stock.symbol;
    newButton.className = "btn btn-default";
    newButton.value = stock.symbol;
    newButton.innerText = stock.name;
    newButton.onclick = ()=>{emitRemove(stock.symbol);}
    document.getElementById("stocks").appendChild(newButton);
}

const removeStock = function(ticker) {
    document.getElementById(ticker).remove()
    stocks = stocks.filter((stock) => {
        return stock.symbol !== ticker;
    })
    plotStocks();
}

// Graphing
const plotStocks = function() {
    let graph = document.getElementById("graph");
    if (graph) {graph.remove();}
    const margin = {top: 20, right: 20, bottom: 30, left: 50};
    const canvasWidth = document.getElementById("graph-container").offsetWidth - margin.left - margin.right;
    const canvasHeight = document.getElementById("graph-container").offsetHeight - margin.top - margin.bottom;
    const rainbow = d3.scaleSequential(d3.interpolateRainbow).domain([0, 20]); // 20 colours is probably plenty?
    const parseTime = d3.timeParse("%Y-%m-%d");
    let svg = d3.select("#graph-container").append("svg")
                                        .attr("id", "graph")
                                        .attr("width", "100%")
                                        .attr("height", "100%");
    const dateExtent = d3.extent(stocks[0].priceHistory.map((d)=>{return parseTime(d.date.slice(0,10));}));
    let xScale = d3.scaleTime().domain(dateExtent).range([0, canvasWidth]);
    let xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat("%b %Y"));
    let priceExtent = d3.extent(
        stocks.reduce((prices, stock)=> {
            return prices.concat(stock.priceHistory.map((ph)=>{return ph.price}));
        }, [])
    );
    let yScale = d3.scaleLinear().domain(priceExtent).range([canvasHeight, 0]);
    let yAxis = d3.axisLeft(yScale).ticks(5);

    stocks.forEach((stock, ind) => {
        let graphGroup = d3.select("svg").append("g").attr("class", "price-plot")   
                                                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        let plotLine = d3.line()
                            .x((d)=>{return xScale(parseTime(d.date.slice(0,10)))})
                            .y((d)=>{return yScale(d.price)});

        graphGroup.selectAll(".price-line")
                    .attr("id", stock.symbol)
                    .data([stock.priceHistory]) // Somehow it doesn't work without the brackets!
                    .enter().append("path")
                        .attr("class", "price-line")
                        .attr("d", plotLine)
                        .attr("stroke",()=>{return rainbow(ind);});
                
        graphGroup.append("g").attr("transform", "translate(0," + canvasHeight + ")").call(xAxis);
        graphGroup.append("g").call(yAxis);    
    })     
}

