const fs = require('fs');
var jsdiff = require('diff');
var childProcess = require('child_process');

let convertToFile = (name, location, code) => {
    let file = fs.createWriteStream(location + name);
    code.forEach(line => {
        file.write(line + "\n");
    });
    file.close();
};

function readFile(test) {
    let inputFile = "cache/" + test.name + ".myout";
    let output = {lines: []};
    try {
        const input = fs.readFileSync(inputFile, 'UTF-8');
        const inputLines = input.split(/\r?\n/);
        for (let i = 0; i < test.output.length; i++) {
            output.lines.push(inputLines[i]);
        }
    } catch (err) {
        console.error(err);
    }
    return {name: test.name, _id: test._id, output};
}

let compileAndCheck = (command, tests, cb) => {
    let compile = childProcess.exec(command);

    compile.on('exit', function () {

        let testCommand = "";
        tests.forEach(test => {
            testCommand += './a.out < cache/' + test.name + '.in > cache/' + test.name + '.myout &&';
        });

        let d = childProcess.exec(testCommand + " ls");
        d.on('exit', (code) => {
            console.log(code);
            let res = {
                results: []
            };
            tests.forEach(test => {
                res.results.push(readFile(test));
            });

            cb(res);
        });


    });
};

module.exports.compileAndCheck = compileAndCheck;
module.exports.convertToFile = convertToFile;




