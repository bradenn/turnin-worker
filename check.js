const fs = require('fs');
const path = require('path');
let childProcess = require('child_process');

let configDir = (key) => {
    let dir = `./cache/${key}`;
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
};

let convertToFile = (name, location, code) => {
    return new Promise(async (resolve, reject) => {
        console.log(`Creating file: ${location + name} => ${code.length} lines `);
        let file = fs.createWriteStream(location + name);
        code.forEach(line => {
            if (line !== "") {
                file.write(line + "\n");
            }
        });
        file.end();
    });
};

function readFile(test, ext, key) {
    let inputFile = `./cache/${key}/${test.name}${ext}`;
    let output = [];
    try {
        const input = fs.readFileSync(inputFile, 'UTF-8');
        let lines = input.split(/\r?\n/);
        lines.forEach((ln) => {
            output.push(ln);
        });
    } catch (err) {
        console.error(err);
    }
    return output;
}

const getFiles = (key, cb) => {
    fs.readdir(`./cache/${key}/`, (err, files) => {
        cb(err, files);
    });
};

const getFilesPromise = (key) => {
    return new Promise(async (resolve) => {
        fs.readdir(`./cache/${key}/`, (err, files) => {
            resolve(files);
        });
    });
};

const cleanUp = (key, exec) => {
    console.log("Performing clean-up...");
    return new Promise(async (resolve, reject) => {
        getFiles(key, (err, files) => {
            if (err) throw err;
            console.log(`Deleting ${files.length} file(s) from ./cache`);
            for (const file of files) {
                fs.unlink(path.join(`./cache/${key}/`, file), err => {
                    if (err) throw err;
                    resolve(err);
                    console.log(`Deleting file: ./cache/${file}`);
                });
            }

        });

        // Kill the infinite loops that did not obey SIGTERM
        // TODO: improve timeout functions
        childProcess.exec(`pkill -9 ${exec}`, (err, out, stderr) => {
            console.log(`Killed stay instance(s) not conforming to SIGTERM`)
        });
    });
};

const testFile = (exec, test, key) => {
    return new Promise(async (resolve) => {
        console.log(`./${exec} < ${test.name}.in > ${test.name}.myout 2> ${test.name}.myerr`);
        childProcess.exec(`./${exec} < ${test.name}.in > ${test.name}.myout 2> ${test.name}.myerr`, {
            timeout: 2000,
            cwd: process.cwd() + `/cache/${key}/`
        }, (error, stdout, stderr) => {
            if (error) {
                resolve({
                    _id: test._id,
                    name: test.name,
                    code: error.code,
                    stdout: readFile(test, ".myout", key),
                    stderr: readFile(test, ".myerr", key),
                    signal: error.signal
                });
            } else {
                resolve({
                    _id: test._id,
                    name: test.name,
                    code: 0,
                    stdout: readFile(test, ".myout", key),
                    stderr: readFile(test, ".myerr", key),
                    signal: null
                });
            }
        });
    });
};

const compileFile = (command, key) => {
    return new Promise(async (resolve, reject) => {
        childProcess.exec(command, {
            timeout: 5000,
            killSignal: "SIGTERM",
            cwd: process.cwd() + `/cache/${key}/`
        }, (err, stdout, stderr) => {
            resolve({
                error: err,
                stdout: (stdout.length >= 1) ? stdout.split("\n") : "",
                stderr: (stderr.length >= 1) ? stderr.split("\n") : "",
                code: (err) ? err.code : 0,
                exec: ""
            });
        });
    });
};

const compileAndCheck = async (command, tests, key, cb) => {
    let preCompile = await getFilesPromise(key);
    const compileResults = await Promise.resolve(compileFile(command, key));
    let postCompile = await getFilesPromise(key);
    let exec = postCompile.filter(f => !preCompile.includes(f)).filter(f => (!f.includes(".o") || f.includes(".out")))[0];
    const testResults = await Promise.all(tests.map(test => testFile(exec, test, key)));
    const clean = await Promise.resolve(cleanUp(key, exec));
    fs.rmdirSync("./cache/" + key);
    cb(testResults, compileResults);
};

module.exports.compileAndCheck = compileAndCheck;
module.exports.configDir = configDir;
module.exports.convertToFile = convertToFile;




