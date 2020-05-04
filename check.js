const fs = require('fs');
const path = require('path');
let childProcess = require('child_process');

let configDir = (key) => {
    let dir = `./cache/${key}`;
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    let testDir = `./cache/${key}/tests`;
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir);
    }
    let resultDir = `./cache/${key}/results`;
    if (!fs.existsSync(resultDir)) {
        fs.mkdirSync(resultDir);
    }
};

let convertToFile = (name, location, code) => {
    return new Promise(async (resolve, reject) => {
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
    let inputFile = `./cache/${key}/results/${test.name}${ext}`;
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
    return new Promise(async (resolve, reject) => {
        getFiles(key, (err, files) => {
            if (err) throw err;
            for (const file of files) {
                let stats = fs.lstatSync(path.join(`./cache/${key}/`, file));
                if (!stats.isDirectory()) {
                    fs.unlink(path.join(`./cache/${key}/`, file), err => {
                        if (err) console.log(`Cannot delete file: ./cache/${file}`);
                        resolve("");
                    });
                } else {
                    deleteFolderRecursive(path.join(`./cache/${key}/`, file));
                }

            }

        });

        // Kill the infinite loops that did not obey SIGTERM
        // TODO: improve timeout functions
        childProcess.exec(`pkill -9 ${exec}`, (err, out, stderr) => {
        });
    });
};

let deleteFolderRecursive = (path) => {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
            let curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

const removeTemp = (key) => {
    fs.rmdirSync("./cache/" + key);
};

const testFile = (exec, test, key) => {
    return new Promise(async (resolve) => {
        let startTime = new Date().getMilliseconds();
        let arguments = `${test.arguments} `;
        let stdoutMaxChars = test.max_stdout || 5000;
        let stderrMaxChars = test.max_stderr || 5000;
        let preparedArgument = `{ ./${exec} ${arguments}< tests/${test.name}.in 2>&3 | head -c ${stdoutMaxChars} > results/${test.name}.myout; } 3>&1 1>&2 | head -c ${stderrMaxChars} > results/${test.name}.myerr`;
        childProcess.exec(preparedArgument, {
            timeout: 2500,
            cwd: process.cwd() + `/cache/${key}/`
        }, (error, stdout, stderr) => {
            if (error) {
                resolve({
                    _id: test._id,
                    name: test.name,
                    code: error.code,
                    stdout: readFile(test, ".myout", key),
                    stderr: readFile(test, ".myerr", key),
                    signal: error.signal,
                    time: 0
                });
            } else {
                resolve({
                    _id: test._id,
                    name: test.name,
                    code: 0,
                    stdout: readFile(test, ".myout", key),
                    stderr: readFile(test, ".myerr", key),
                    signal: null,
                    time: 0
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
    const startTime = new Date().getMilliseconds();
    let preCompile = await getFilesPromise(key);
    const compileResults = await Promise.resolve(compileFile(command, key));
    let postCompile = await getFilesPromise(key);
    let exec = postCompile.filter(f => !preCompile.includes(f)).filter(f => (!f.includes(".o") || f.includes(".out")))[0];
    const testResults = await Promise.all(tests.map(test => testFile(exec, test, key)));
    await Promise.resolve(cleanUp(key, exec));
    deleteFolderRecursive(`./cache/${key}`);
    cb(testResults, compileResults, (new Date().getMilliseconds() - startTime));
};

module.exports.compileAndCheck = compileAndCheck;
module.exports.configDir = configDir;
module.exports.convertToFile = convertToFile;




