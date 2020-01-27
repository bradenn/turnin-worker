let express = require('express');
let router = express.Router();
let getDiff = require('../check.js');


router.post('/test', (req, res) => {

    let files = req.body.files.files;
    files.forEach((file) => {
     getDiff.convertToFile(file.name, "", file.contents);
    });

     let tests = req.body.tests.tests;
        tests.forEach((test) => {
        getDiff.convertToFile(test.name+".in", "cache/", test.input);
     });

    let resp = [];
   getDiff.compileAndCheck(req.body.make, tests, (output) => {
        res.status(200).json({message: "Okay", output});
   });


});

module.exports = router;