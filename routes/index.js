let express = require('express');
let router = express.Router();
let compiler = require('../check.js');
let env = require('../env/env.js');
const version = require("../package.json").version;
const hostname = require('os').hostname();

let generateJobKey = () => {
    return Math.random().toString(36).slice(2)
};

router.post('/test', (req, res) => {
    const jobKey = generateJobKey();

    compiler.configDir(jobKey);

    let files = req.body.files;
    files.forEach(file => {
        compiler.convertToFile(file.name, `./cache/${jobKey}/`, file.contents);
    });

    let tests = req.body.tests;
    tests.forEach((test) => {
        compiler.convertToFile(test.name + ".in", `./cache/${jobKey}/tests/`, test.input);
    });

    let compileTimeout = req.body.timeout || 5000;

    compiler.compileAndCheck(req.body.make, tests, jobKey, compileTimeout, (testResponses, compileOutputs, time) => {
        return res.status(200).json({
            tests: testResponses, compile: compileOutputs, time: time,
            debug: {server: `${env.SERVER}:${hostname}`, version: version, node: env.NODE, instance: (process.env.NODE_ENV === "production")?(parseInt(process.env.INSTANCE_ID) + 1).toString():1}
        });
    }).then(r => {
    });


});

module.exports = router;