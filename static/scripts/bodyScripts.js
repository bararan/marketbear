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
})

socket.on("remove stock", (ticker) => {
    removeStock(ticker);
})

// Functions to modify page content 
const addNewStock = function(stock) {
    stocks.push(stock);
    let newButton = document.createElement("button");
    newButton.id = stock.symbol;
    newButton.className = "btn";
    newButton.value = stock.symbol;
    newButton.innerText = stock.name;
    newButton.onclick = ()=>{emitRemove(stock.symbol);}
    // newButton.onmouseover = () => {document.getElementById("price-" + stock.symbol).classList.add("highlighted");}
    // newButton.onmouseout = () => {document.getElementById("price-" + stock.symbol).classList.remove("highlighted");}
    document.getElementById("stocks").appendChild(newButton);
    plotStocks();
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
    if (stocks.length === 0) return;
    const margin = {top: 20, right: 20, bottom: 30, left: 50};
    const canvasWidth = document.getElementById("graph-container").offsetWidth - margin.left - margin.right;
    const canvasHeight = document.getElementById("graph-container").offsetHeight - margin.top - margin.bottom;
    const rainbow = d3.scaleSequential(d3.interpolateRainbow).domain([0, 20]); // 20 colours is probably plenty?
    const parseTime = d3.timeParse("%Y-%m-%d");
    let svg = d3.select("#graph-container").append("svg")
                                        .attr("id", "graph")
                                        .attr("width", canvasWidth + margin.left + margin.right)
                                        .attr("height", canvasHeight + margin.top + margin.bottom);
    // let tooltip = d3.select("#graph-container").append("div").attr("id", "tooltip").classed("hidden", true);
    // let tickerRow = tooltip.append("h6").attr("id", "tooltip-ticker");
    // let dateRow = tooltip.append("div").attr("id", "tooltip-date");
    // let priceRow = tooltip.append("div").attr("id", "tooltip-price");
    const today = new Date();
    const dateExtent = d3.extent(stocks[0].priceHistory.map((dataPoint)=>{return parseTime(dataPoint.date.slice(0, 10))}))
    let xScale = d3.scaleTime().domain(dateExtent).range([0, canvasWidth]);
    let xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat("%b '%y"));
    let priceExtent = d3.extent(
        stocks.reduce((prices, stock)=> {
            return prices.concat(stock.priceHistory.map((dataPoint)=>{return dataPoint.price}));
        }, [])
    );
    let yScale = d3.scaleLinear().domain(priceExtent).range([canvasHeight, 0]);
    let yAxis = d3.axisLeft(yScale).ticks(5);

    let plotLine = d3.line()
                        .x((d)=>{return xScale(parseTime(d.date.slice(0,10)))})
                        .y((d)=>{return yScale(d.price)});
    let graphGroup = d3.select("svg").append("g").attr("class", "price-plot") 
                                                .attr("id", "plot-group")  
                                                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    graphGroup.append("g").attr("transform", "translate(0," + canvasHeight + ")").call(xAxis);
    graphGroup.append("g").call(yAxis);                        

    graphGroup.append("g").selectAll(".price-line")
                .data(stocks)
                .enter().append("path")
                    .attr("id", (d)=> {return "price-" + d.symbol;})
                    .attr("class", "price-line")
                    .attr("d", (d)=> plotLine(d.priceHistory))
                    .attr("stroke", (d, i)=>{return rainbow(i);});

    graphGroup.selectAll(".highlight-circle")
                               .data(stocks.map((stock)=>{return stock.symbol;}))
                               .enter().append("circle")
                                .attr("class", "highlight-circle")
                                .attr("r", 6)
                                .attr("id", (d)=>{return "circle-" + d})
                                .attr("fill", (d, i)=>{return rainbow(i)})// "none")
                                .attr("opacity", 0.65)
                                .attr("stroke-width", 2.5)
                                .attr("stroke", (d, i)=>{return rainbow(i)})
                                .classed("hidden", true);

    graphGroup.selectAll(".highlight-text")
                             .data(stocks.map((stock)=>{return stock.symbol;}))
                             .enter().append("text")
                                .attr("class", "highlight-text")
                                .attr("text-anchor", "start")
                                .attr("id", (d)=>{return "info-" + d})
                                .attr("fill", (d, i)=>{return rainbow(i)})
                                .attr("font-weight", "bold")
                                .text((d)=>{return d + ": "})
                                .classed("hidden", true);

    let tooltipGroup = graphGroup.append("g");
    graphGroup.append("path")
                    .attr("class", "tooltip-line")
                    .attr("stroke-width", "1px")
                    .attr("stroke", "black")
                    .classed("hidden", true);

    let tooltipContainer = graphGroup.append("rect")
                                .attr("x", 0)
                                .attr("y", 0)
                                .attr("width", canvasWidth)
                                .attr("height", canvasHeight)
                                .attr("fill", "none")
                                .attr("pointer-events", "all")
                                .on("mouseout", ()=> {
                                    d3.select(".tooltip-line").classed("hidden", true);
                                    d3.selectAll(".highlight-circle").classed("hidden", true);
                                    d3.selectAll(".highlight-text").classed("hidden", true);
                                    d3.selectAll(".price-line").attr("opacity", 1.0);
                                })
                                .on("mouseover", () => {
                                    d3.select(".tooltip-line").classed("hidden", false);
                                    d3.selectAll(".highlight-circle").classed("hidden", false);
                                    d3.selectAll(".highlight-text").classed("hidden", false);
                                    d3.selectAll(".price-line").attr("opacity", 0.6);
                                })
                                .on("mousemove", function() {
                                    const coords = d3.mouse(this);
                                    d3.select(".tooltip-line")
                                        .attr("d", () => {
                                            return "M" + coords[0] + "," + 0 + "L" + coords[0] + "," + (canvasHeight);
                                        })
                                    d3.selectAll(".highlight-circle").attr("cx", coords[0]);
                                    d3.selectAll(".highlight-text").attr("x", coords[0] + 10);
                                    const date = xScale.invert(coords[0]).toISOString().slice(0,10);
                                    stocks.forEach((stock) => {
                                        const ind = stock.priceHistory.findIndex((dataPoint) => {
                                            return dataPoint.date.slice(0, 10) === date
                                        })
                                        if (ind > -1) { // No price data for wekends & holidays!
                                            const yCoord = yScale(stock.priceHistory[ind].price);
                                            d3.select("#circle-" + stock.symbol).attr("cy", yCoord);
                                            d3.select("#info-" + stock.symbol).attr("y", yCoord);
                                            d3.select("#info-" + stock.symbol).text(stock.symbol + ": $" + stock.priceHistory[ind].price.toFixed(3))
                                        }
                                    })
                                });
                                
    stocks.forEach((stock, i) => {
        d3.select("#" + stock.symbol).style("border", "2px solid " + rainbow(i));
        d3.select("#" + stock.symbol).on("mouseover", () => {d3.select("#price-" + stock.symbol).classed("highlighted", true);})
        d3.select("#" + stock.symbol).on("mouseout", () => {d3.select("#price-" + stock.symbol).classed("highlighted", false);})
    })
}