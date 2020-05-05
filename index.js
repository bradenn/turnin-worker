let express = require('express');
let app = express();
const version = require("./package.json").version;
const hostname = require('os').hostname();
let env = require('./env/env.js');
let bodyParser = require('body-parser');

// Parse incoming requests
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

// Include routes
let routes = require('./routes/');
app.use('/api', routes);

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
    let err = new Error('Unknown Request');
    err.status = 404;
    next(err);
});

app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.send(err.message);
});

// Listen on port {port} <- config
app.listen(env.PORT, function () {
    console.log(`Turnin-worker v${version} started. Listing on port ${env.PORT} at ${hostname}@${env.SERVER}:${env.NODE}.`);
});
