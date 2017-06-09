"use strict";
const https = require("https");

module.exports = function(app, db, io) {
    let stocks = [];
    const queryBase = "https://www.quandl.com/api/v3/datasets/WIKI/";
                       
    const addStock = function(ticker, callback, errcallback) {
        if (stocks.findIndex((stock) => {return stock.symbol === ticker}) >= 0) {
            return console.log("Stock " + ticker + " already there");
        }
        const query = queryBase + ticker + ".json?column_index=4&api_key=" + process.env.QUANDL_APIKEY;
        https.get(query, (response) => {
            if (response.statusCode == 200) {
                let body = "";
                response.on("data", (chunk) => {
                    body += chunk;
                });
                response.on("end", () => {
                    const jsonData = JSON.parse(body).dataset;
                    let name = jsonData.name;
                    const priceHistory = jsonData.data.map((dataPoint) => {
                        return {date: dataPoint[0], price: parseFloat(dataPoint[1])}
                    })
                    const newStock = {
                        symbol: ticker,
                        name: name.slice(0, name.indexOf(" (")),
                        priceHistory: priceHistory
                    };
                    stocks.push(newStock);
                    callback(newStock);
                    })
            } else {
                console.log(response.statusCode + ": " + response.statusMessage)
                errcallback("Unable to find the ticker!")
            }
        })
    }

    const removeStock = function(ticker, callback) {
        callback(ticker);
        stocks = stocks.filter((stock) => {return stock.symbol !== ticker});
        // const ind = stocks.findIndex((stock) => {return stock.symbol === ticker});
        // stocks.splice(ind, 1);
    }

    app.get("/", (req, res) => {
        return res.render("index");
    })

    io.on("connection", (socket) => {
        console.log("User " + socket.id + " connected to MarketBear");

        // Upon first connection emit all the stocks
        io.to(socket.id).emit("initial setup", stocks);

        // Wrappers for emitters to be used as callbacks
        const emitOnAdd = function(stock) {
            console.log("Adding " + stock.symbol)
            io.emit("add stock", stock)
        }
        const emitOnRemove = function(ticker) {
            console.log("Removing " + ticker)
            io.emit("remove stock", ticker)
        }
        const emitOnError = function(error) {
            io.emit("error", error)
        }

        // Event handlers
        socket.on("add ticker", (ticker) => {
            console.log("NEW TICKER RECEIVED: " + ticker)
            addStock(ticker, emitOnAdd, emitOnError);
        });
        socket.on("remove ticker", (ticker) => {
            removeStock(ticker, emitOnRemove);
        });
        socket.on("disconnect", () => {
            console.log("User disconnected...");
        });
    })
}