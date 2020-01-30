let express = require('express');
let router = express.Router();
let getDiff = require('../check.js');


router.post('/test', (req, res, next) => {

    let files = req.body.files;
    files.forEach(file => {
        getDiff.convertToFile(file.name, "./cache/", file.contents);
    });

    let tests = req.body.tests;
    console.log(`Creating necessary files for tests`);
    tests.forEach((test) => {
        console.log(`Creating necessary files for test ${test._id}`);
        getDiff.convertToFile(test.name + ".in", "./cache/", test.input);
    });

    getDiff.compileAndCheck(req.body.make, tests, (testResponses, compileOutputs) => {
        return res.status(200).json({tests: testResponses, compile: compileOutputs});
    }).then(r => {
    });


});

module.exports = router;