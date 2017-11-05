const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const readFile = promisify(fs.readFile);

readFile(path.join(__dirname, "./out/count-only-my-code.wasm"))
    .then(WebAssembly.compile)
    .then(waModule => new WebAssembly.Instance(waModule, {
        env: {
            STACKTOP: 0,
            STACK_MAX: 256,
            abortStackOverflow: function (i32) { console.log("stack oveflow"); },
            memory: new WebAssembly.Memory({ initial: 256, maximum: 256 }),
            table: new WebAssembly.Table({
                initial: 0, 
                maximum: 0, 
                element: "anyfunc"
            }),
            memoryBase: 0,
            tableBase: 0,
        },
    }))
    .then(instance => {
        // functions exposed in "exports"
        console.log(instance.exports._add(1, 2));
    });