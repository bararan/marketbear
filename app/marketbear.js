"use strict";
const https = require("https");
let today = new Date();
let startDate = new Date(today - 365 * 24 * 60 * 60 * 1000);

module.exports = function(app, db, io) {
    let stocks = [];
    const queryBase = "https://www.quandl.com/api/v3/datasets/WIKI/";

    const checkDate = function() {
        const newDate = new Date();
        if (newDate.getDate() !== today.getDate()) {
            today = newDate();
            startDate = new Date(today - 365 * 24 * 60 * 60 * 1000);
            return true
        }
        return false;
    }
                       
    const addStock = function(ticker, callback, errcallback) {
        if (stocks.findIndex((stock) => {return stock.symbol === ticker}) >= 0) {
            return console.log("Stock " + ticker + " already there");
        }
        const query = queryBase 
                        + ticker + ".json?start_date=" + startDate
                        + "&column_index=4&api_key=" + process.env.QUANDL_APIKEY;
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
                        const dateArray = dataPoint[0].split("-");
                        const date = new Date(parseInt(dateArray[0]), parseInt(dateArray[1]), parseInt(dateArray[2]));
                        return {date: date, price: parseFloat(dataPoint[1])}
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
    }

    // TODO: This function is not complete yet and is not called anywhere.
    const refreshAll = function(newTicker) {
        // Need to refresh data on all stocks in memory (plus the newly requested one if it's not there)
        let tickers = stocks.map((stock)=>{return stock.symbol});
        tickers.push(newTicker); //Add the new ticker. If it's already in memory the query won't run anyway.
        // TODO: Need to update stock data here!
    }

    app.get("/", (req, res) => {
        return res.render("index");
    })

    io.on("connection", (socket) => {
        console.log("User " + socket.id + " connected to MarketBear");

        // Upon first connection emit all the stocks to the newly connected client!
        io.to(socket.id).emit("initial setup", stocks);

        // Wrappers for emitters to be used as callbacks
        const emitOnAdd = function(stock) {
            console.log("Adding " + stock.symbol)
            io.emit("add stock", stock)
        }
        const emitOnRemove = function(ticker) {
            console.log("Removing " + ticker)
            socket.broadcast.emit("remove stock", ticker)
        }
        const emitOnError = function(error) {
            io.emit("error", error)
        }

        // Event handlers
        socket.on("add ticker", (ticker) => {
            console.log("NEW TICKER RECEIVED: " + ticker)
            // TODO: uncomment the following after completing refreshAll()
            // if (checkDate()){
            //     refreshAll(ticker);
            //     return;
            // }
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