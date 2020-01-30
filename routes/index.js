let express = require('express');
let router = express.Router();
let getDiff = require('../check.js');


router.post('/test', (req, res, next) => {

    let files = req.body.files.files;
    for (const file of files) {
     const e = Promise.resolve(getDiff.convertToFile(file.name, "./cache/", file.contents));
    }

    let tests = req.body.tests.tests;
        tests.forEach((test) => {
        getDiff.convertToFile(test.name+".in", "./cache/", test.input);
     });

  getDiff.compileAndCheck(req.body.make, tests, (testResponses, compileOutputs) => {
      return res.status(200).json({tests: testResponses, compile: compileOutputs});
  }).then(r => {});


});

module.exports = router;