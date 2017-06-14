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

socket.on("error", (err) => {
    alert(err);
})

// Functions to modify page content 
const addNewStock = function(stock) {
    stocks.push(stock);
    let newInfoCard = document.createElement("div");
    newInfoCard.id = stock.symbol;
    newInfoCard.className = "info-card";

    let removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-remove";
    removeBtn.id = "remove-" + stock.symbol;
    let newSpan = document.createElement("span");
    newSpan.setAttribute("class", "glyphicon glyphicon-remove");
    removeBtn.appendChild(newSpan);
    removeBtn.onclick = ()=>{emitRemove(stock.symbol);};
    newInfoCard.appendChild(removeBtn);

    let textContainer = document.createElement("div");
    textContainer.className = "text-container"

    let newCardText = document.createElement("h3");
    newCardText.id = "text-" + stock.symbol;
    newCardText.innerText = stock.symbol.toUpperCase();
    let hiddenText = document.createElement("h6");
    hiddenText.id = "hidden-" + stock.symbol;
    hiddenText.className = "hidden";
    hiddenText.innerText = stock.name;

    textContainer.appendChild(newCardText);
    textContainer.appendChild(hiddenText);
    newInfoCard.appendChild(textContainer);
    document.getElementById("stocks").appendChild(newInfoCard);
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
                        .y((d)=>{return yScale(d.price)})
                        .curve(d3.curveCatmullRom.alpha(0.5));
    let graphGroup = d3.select("svg").append("g").attr("class", "price-plot") 
                                                .attr("id", "plot-group")  
                                                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    graphGroup.append("g").attr("class", "axis axisDisplay").attr("transform", "translate(0," + canvasHeight + ")").call(xAxis);
    graphGroup.append("g").attr("class", "axis").call(yAxis);                        

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
                                .attr("id", (d)=>{return "info-" + d})
                                .attr("fill", (d, i)=>{return rainbow(i)})
                                .attr("font-weight", "bold")
                                .text((d)=>{return d + ": "})
                                .classed("hidden", true);

    graphGroup.append("text").attr("id", "date-info")
                             .attr("fill", "slategrey")
                             .attr("font-weight", "bold")
                             .classed("hidden", true)                                

    graphGroup.append("path")
                    .attr("class", "tooltip-line")
                    .attr("stroke-width", "1px")
                    .attr("stroke", "slategrey")
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
                                    d3.select("#date-info").classed("hidden", true);
                                    d3.selectAll(".highlight-circle").classed("hidden", true);
                                    d3.selectAll(".highlight-text").classed("hidden", true);
                                    d3.selectAll(".price-line").attr("opacity", 1.0);
                                })
                                .on("mouseover", () => {
                                    d3.select(".tooltip-line").classed("hidden", false);
                                    d3.select("#date-info").classed("hidden", false);
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
                                    d3.select("#date-info").attr("x", coords[0]);
                                    if (coords[0] > canvasWidth - 100) {
                                        d3.select("#date-info").attr("text-anchor", "end");
                                        d3.selectAll(".highlight-text").attr("text-anchor", "end");
                                        d3.selectAll(".highlight-text").attr("x", coords[0] - 10);
                                    } else {
                                        d3.select("#date-info").attr("text-anchor", "start");
                                        d3.selectAll(".highlight-text").attr("text-anchor", "start");
                                        d3.selectAll(".highlight-text").attr("x", coords[0] + 10);
                                    }
                                    d3.selectAll(".highlight-circle").attr("cx", coords[0]);
                                    const date = xScale.invert(coords[0]).toISOString().slice(0,10);
                                    stocks.forEach((stock) => {
                                        const ind = stock.priceHistory.findIndex((dataPoint) => {
                                            return dataPoint.date.slice(0, 10) === date
                                        })
                                        if (ind > -1) { // No price data for wekends & holidays, so ignore them!
                                            const yCoord = yScale(stock.priceHistory[ind].price);
                                            d3.select("#date-info").text(date);
                                            d3.select("#circle-" + stock.symbol).attr("cy", yCoord);
                                            d3.select("#info-" + stock.symbol).attr("y", yCoord);
                                            d3.select("#info-" + stock.symbol).text(stock.symbol.toUpperCase() 
                                                                                    + ": $" 
                                                                                    + stock.priceHistory[ind].price.toFixed(2))
                                        } else { // For some stocks data aren't avaliable for all dates!
                                            d3.select("#info-" + stock.symbol).text("");
                                        }
                                    })
                                });
                                
    stocks.forEach((stock, i) => {
        const colour = rainbow(i);
        d3.select("#" + stock.symbol).style("border-bottom", "4px solid " + colour);
        d3.select("#" + stock.symbol).on("mouseover", () => {
            d3.select("#price-" + stock.symbol).classed("highlighted", true);
            d3.select("#text-" + stock.symbol).classed("hidden", true);
            d3.select("#hidden-" + stock.symbol).classed("hidden", false);
        })
        d3.select("#" + stock.symbol).on("mouseout", () => {
            d3.select("#price-" + stock.symbol).classed("highlighted", false);
            d3.select("#text-" + stock.symbol).classed("hidden", false);
            d3.select("#hidden-" + stock.symbol).classed("hidden", true);
        })
    })
}