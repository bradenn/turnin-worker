const fs = require('fs');
const path = require('path');
const now = require('performance-now');
let childProcess = require('child_process');
let os = require('os');
let pidusage = require('pidusage');

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

// function readFile(test, ext, key) {
//     let inputFile = `./cache/${key}/results/${test.name}${ext}`;
//     let output = [];
//     try {
//         const input = fs.readFileSync(inputFile, 'UTF-8');
//         let lines = input.split(/\r?\n/);
//         lines.forEach((ln) => {
//             output.push(ln);
//         });
//     } catch (err) {
//         console.error(err);
//     }
//     return output;
// }

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

        // Kill the infinite loops that did not obey SIGTERM (That's all of them btw)
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


const testFile = (exec, test, key) => new Promise(async (resolve) => {
    let arguments = test.arguments || "";
    let stdoutMaxChars = test.max_stdout || 1000;
    let stderrMaxChars = test.max_stderr || 1000;
    let preparedArgument = `./${exec} ${arguments}< tests/${test.name}.in`;
    let startTime = now();
    childProcess.exec(preparedArgument, {
        killSignal: "SIGTERM",
        timeout: test.timeout || 2500,
        cwd: process.cwd() + `/cache/${key}/`,
        maxBuffer: (stdoutMaxChars + stderrMaxChars) * 2
    }, (error, stdout, stderr) => {
        resolve({
            _id: test._id,
            name: test.name,
            exit: (error) ? (error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") ? 127 : error.code : 0,
            stdout: stdout.substr(0, stdoutMaxChars).split('\n'),
            stderr: stderr.substr(0, stderrMaxChars).split('\n'),
            signal: (error) ? (error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") ? "SIGTERM" : error.signal : null,
            time: (now() - startTime).toFixed(2)
        });
    });
});

const compileFile = (command, key, timeout) => {
    return new Promise(async (resolve) => {
        const startTime = now();
        childProcess.exec(command, {
            timeout: timeout,
            killSignal: "SIGTERM",
            cwd: process.cwd() + `/cache/${key}/`
        }, (err, stdout, stderr) => {
            resolve({
                error: err,
                stdout: (stdout.length >= 1) ? stdout.split("\n") : "",
                stderr: (stderr.length >= 1) ? stderr.split("\n") : "",
                code: (err) ? err.code : 0,
                time: (now() - startTime).toFixed(2),
                exec: ""
            });
        });
    });
};

const compileAndCheck = async (command, tests, key, timeout, cb) => {
    const startTime = now();
    let preCompile = await getFilesPromise(key);
    const compileResults = await Promise.resolve(compileFile(command, key, timeout));
    let postCompile = await getFilesPromise(key);
    let exec = postCompile.filter(f => !preCompile.includes(f)).filter(f => (!f.includes(".o") || f.includes(".out")))[0];
    let testResults = await Promise.all(tests.map(test => testFile(exec, test, key)));
    await Promise.resolve(cleanUp(key, exec));
    deleteFolderRecursive(`./cache/${key}`);
    cb(testResults, compileResults, (now() - startTime).toFixed(2));
};

module.exports.compileAndCheck = compileAndCheck;
module.exports.configDir = configDir;
module.exports.convertToFile = convertToFile;




