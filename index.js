"use strict";
require("dotenv").config();
const express = require("express")
    // , session = require("express-session")
    , http = require("http")
    , socketIO = require("socket.io")
    , bodyParser = require("body-parser")
    , mongo = require("mongodb")
    , path = require("path")
    , pug = require("pug")
    , marketbear = require("./app/marketbear")
    , morgan = require("morgan")
    ;

const url = "mongodb://" + process.env.DBUSR + ":" + process.env.DBPW + "@" + process.env.DB_URI;
const dbClient = mongo.MongoClient;

dbClient.connect(url, function(err, db) {
    if (err) {
        throw err;
    }
    let app = express();
    const server = http.Server(app);
    const io = socketIO(server);
    app.use(
        express.static(path.join(__dirname, "static"))
        , morgan("dev")
        , bodyParser.json()
        , bodyParser.urlencoded({extended: true})
    );
    app.set("view engine", "pug");
    app.set("views", path.join(__dirname, "views"));
    app.engine("pug", pug.__express);
    app.set("port", (process.env.PORT || 5000));
    // app.use(session({
    //     // secret: "myDirtyLittleSecret"
    //     // , resave: true
    //     // , saveUninitialized: false
    //     // , store: new MongoStore(
    //     //     {
    //     //         db: db
    //     //         , collection: "mbSessions"
    //     //     }
    //     // )
    //     // , cookie: {maxAge: 24 * 60 * 60 * 1000}
    // }))

    server.listen(app.get("port"), function() {
        console.log(app.name + " running on port " + app.get("port"))
    })

    marketbear(app, db, io)
});    