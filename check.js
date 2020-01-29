const fs = require('fs');
const path = require('path');
let childProcess = require('child_process');


let convertToFile = (name, location, code) => {
    let file = fs.createWriteStream(location + name);
    code.forEach(line => {
        file.write(line + "\n");
    });
    file.close();
};

function readFile(test, ext) {
    let inputFile = "cache/" + test.name + ext;
    let output = {lines: []};
    try {
        const input = fs.readFileSync(inputFile, 'UTF-8');
        output.lines = input.split(/\r?\n/);
    } catch (err) {
        console.error(err);
    }
    return output;
}

const cleanUp = () => {
    fs.readdir("cache/", (err, files) => {
        if (err) throw err;
        for (const file of files) {
            fs.unlink(path.join("cache/", file), err => {
                if (err) throw err;
            });
        }
    });

    // Kill the infinite loops that did not obey SIGTERM
    // TODO: improve timeout functions
    childProcess.exec("pkill -9 a.out");
};

const testFile = (test) => {
    return new Promise(async (resolve, reject) => {
        childProcess.exec(`./a.out < ${test.name}.in > ${test.name}.myout 2> ${test.name}.myerr`, {
            timeout: 1000,
            cwd: process.cwd() + "/cache"
        }, (error, stdout, stderr) => {
            if (error) {
                resolve({
                    output: {name: test.name, _id: test._id, output: {lines: [""]}},
                    code: error.code,
                    signal: error.signal,
                    stderr: stderr,
                    stdout: stdout
                });
            } else {
                resolve({name: test.name, _id: test._id, stdout: readFile(test, ".myout"), stderr: readFile(test, ".myerr"), code: 0, signal: null });
            }
        });
    });
};

const compileFile = (command) => {
    return new Promise(async (resolve, reject) => {
        childProcess.exec(command, {
            timeout: 1000,
            killSignal: "SIGTERM",
            cwd: process.cwd() + "/cache"
        }, (err, stdout, stderr) => {
            resolve({error: err, stdout: stdout, stderr: stderr, code: (err) ? err.code : 0});
        });
    });
};

const compileAndCheck = async (command, tests, cb) => {
    const compileResults = await Promise.resolve(compileFile(command));
    const testResults = await Promise.all(tests.map(test => testFile(test)));
    cleanUp();
    cb(testResults, compileResults);
};

module.exports.compileAndCheck = compileAndCheck;
module.exports.convertToFile = convertToFile;




