let express = require('express');
let router = express.Router();
let getDiff = require('../check.js');
let config = require('../env/config.json');

let generateJobKey = () => {
    return Math.random().toString(36).slice(2)
};

router.post('/test', (req, res, next) => {
    let jobKey = generateJobKey();

    getDiff.configDir(jobKey);

    let files = req.body.files;
    files.forEach(file => {
        getDiff.convertToFile(file.name, `./cache/${jobKey}/`, file.contents);
    });

    let tests = req.body.tests;
    console.log(`Creating necessary files for tests`);
    tests.forEach((test) => {
        console.log(`Creating necessary files for test ${test._id}`);
        getDiff.convertToFile(test.name + ".in", `./cache/${jobKey}/`, test.input);
    });

    getDiff.compileAndCheck(req.body.make, tests, jobKey, (testResponses, compileOutputs) => {
        return res.status(200).json({
            tests: testResponses, compile: compileOutputs,
            debug: {server: config.server, node: config.node, instance: (process.env.NODE_ENV === "prod")?(process.env.PORT - 5554).toString():config.instance}
        });
    }).then(r => {
    });


});

module.exports = router;