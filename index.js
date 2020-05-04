const config = require("./env/config.json");
let express = require('express');
let app = express();
let bodyParser = require('body-parser');

// Parse incoming requests
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

// Include routes
let routes = require('./routes/');
app.use('/api', routes);

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('File Not Found');
    err.status = 404;
    next(err);
});



app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.send(err.message);
});

// Listen on port {port} <- config
app.listen(config.port, function () {
    let port = config.port;
    if(process.env.NODE_ENV === "cluster"){
        port = process.env.PORT;
        console.log(`Launching in cluster mode.`)
    }
    console.log('Express server started. Listing on port ' + port + '.');
});
