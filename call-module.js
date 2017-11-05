// emcc src/hello-func.c -o out/hello-module.js -s WASM=1 -Wall -s MODULARIZE=1 -s EXPORTED_FUNCTIONS="['_hello']" -O3
// emscripten module code
const path = require("path");
// to resolve wasm file
process.chdir(path.join(__dirname, "out"));
const Module = require("./out/hello-module");
Module().then(function(instance) {
    instance._hello();
});