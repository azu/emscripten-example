# emscripten example

## Usage

    $ npm run
    # show commands
    Scripts available in emscripten-example via `npm run-script`:
    hello:build
        emcc src/hello.c -o out/hello.js
    hello:run
        node out/hello.js
    hello-func:build
        emcc src/hello-func.c -o out/hello-func.js -s EXPORTED_FUNCTIONS="['_hello']"
    hello-func:run
        node call-hello.js
    hello-wasm-module:build
        emcc src/hello-func.c -o out/hello-module.js -s WASM=1 -Wall -s MODULARIZE=1 -s EXPORTED_FUNCTIONS="['_hello']"
    hello-wasm-module:run
        node call-module.js
    hello-wasm-direct:build
        emcc ./src/count-only-my-code.c -o ./out/count-only-my-code.wasm -Wall -s WASM=1 -s SIDE_MODULE=1 -s ONLY_MY_CODE=1 -s EXPORTED_FUNCTIONS="['_add']"
    hello-wasm-direct:run
        node call-wasm.js

----

## インストール

[Emscripten SDK](https://kripken.github.io/emscripten-site/docs/getting_started/downloads.html#sdk-download-and-install "Emscripten SDK")をインストール

```
brew install llvm
brew install emscripten --with-closure-compiler
```

ホントはバージョン管理できる[Emscripten SDK](https://kripken.github.io/emscripten-site/docs/getting_started/downloads.html "Emscripten SDK")を使うほうがよさそう。

## `.emscripten`の設定

一度、emccを実行するとパスが上手く通ってない的なエラーがでる。

```shell-session
✈ emcc -v
WARNING:root:LLVM version appears incorrect (seeing "9.0", expected "4.0")
CRITICAL:root:fastcomp in use, but LLVM has not been built with the JavaScript backend as a target, llc reports:
===========================================================================
(no targets could be identified: [Errno 2] No such file or directory)
===========================================================================
CRITICAL:root:you can fall back to the older (pre-fastcomp) compiler core, although that is not recommended, see http://kripken.github.io/emscripten-site/docs/building_from_source/LLVM-Backend.html
INFO:root:(Emscripten: Running sanity checks)
CRITICAL:root:Cannot find /usr/bin/llvm-link, check the paths in ~/.emscripten
```

[Emscriptenの環境設定](https://qiita.com/bellbind/items/c37183dd4b7eb9949b9a#emscripten%E3%81%AE%E7%92%B0%E5%A2%83%E8%A8%AD%E5%AE%9A "Emscriptenの環境設定")を参考に`~/.emscripten`の設定ファイルを変更した。

次の二箇所を変更したら動いた。Node.jsとかはnodebrewとかが勝手にパス入ってたので問題なかった。

```
EMSCRIPTEN_ROOT = os.path.expanduser(
    os.getenv('EMSCRIPTEN') or 
    '/usr/local/opt/emscripten/libexec')
LLVM_ROOT = os.path.expanduser(
    os.getenv('LLVM') or 
    '/usr/local/opt/emscripten/libexec/llvm/bin')
```

再度 `emcc -v` で確認して OK。

```shell-session
✈ emcc -v
INFO:root:generating system asset: is_vanilla.txt... (this will be cached in "/Users/azu/.emscripten_cache/is_vanilla.txt" for subsequent builds)
INFO:root: - ok
INFO:root:(Emscripten: Running sanity checks)
emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 1.37.22
clang version 4.0.0  (emscripten 1.37.22 : 1.37.22)
Target: x86_64-apple-darwin16.7.0
Thread model: posix
InstalledDir: /usr/local/opt/emscripten/libexec/llvm/bin
INFO:root:(Emscripten: Running sanity checks)
```

## チュートリアル

> [Emscripten Tutorial — Emscripten 1.37.22 documentation](https://kripken.github.io/emscripten-site/docs/getting_started/Tutorial.html "Emscripten Tutorial — Emscripten 1.37.22 documentation")を参照

### Hello World on Node.js

CのHello Worldを作る。

```cpp
#include <stdio.h>

int main() {
  printf("hello, world!\n");
  return 0;
}
```

これをemscriptenでjsへトランスパイルする。

```
emcc src/hello.c -o out/hello.js
# 先にout/ディレクトリ作ってないとエラーだった
```

Node.jsで実行する

```shell-session
✈ node out/hello.js
Hello, world!
```

**Notes** ファイルサイズ

何も最適化しないデフォルトは300kb

```
✈ ll out
total 776
-rw-r--r--  1 azu  staff   100K 11  4 22:51 hello.html
-rw-r--r--  1 azu  wheel   283K 11  4 22:52 hello.js
```

[Optimizing code](https://kripken.github.io/emscripten-site/docs/getting_started/Tutorial.html#optimizing-code "Optimizing code")ができるので、`-O1`してみると半分ぐらい。
```
✈ emcc -O1 src/hello.c -o out/hello.js

~/.ghq/github.com/azu/emscripten-example master*
✈ ll out
total 544
-rw-r--r--  1 azu  staff   100K 11  4 22:51 hello.html
-rw-r--r--  1 azu  wheel   168K 11  4 22:54 hello.js
```

`-O2`すると何か`mem`ファイルと一緒に生成される。

```
✈ ll out
total 336
-rw-r--r--  1 azu  staff   100K 11  4 22:51 hello.html
-rw-r--r--  1 azu  wheel    57K 11  4 22:55 hello.js
-rw-r--r--  1 azu  staff   389B 11  4 22:55 hello.js.mem
```

> If --memory-init-file is used, a .mem file will be created in addition to the generated .js and/or .html file.

同じディレクトリにあるなら読み込んで実行してくれる。


### `hello` function on Node.js

先ほどの`hello, world`をJavaScriptから呼べる`hello`関数にする。
まずは先ほどのコードに`hello`関数を作る。

```cpp
#include <stdio.h>

void hello(){
  printf("Hello, world!\n");
}

int main(int argc, char** argv){
  hello();  
  return 0;
}
```

JavaScriptからC(C++)のコードを呼ぶ場合は、何個かあるらしい。

- コンパイルオプションの[EXPORTED_FUNCTIONS](https://kripken.github.io/emscripten-site/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html?highlight=exported_functions "EXPORTED_FUNCTIONS")を使う
- コード上で`extern "C"`してexternしておく方法

今回は[EXPORTED_FUNCTIONS](https://kripken.github.io/emscripten-site/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html?highlight=exported_functions "EXPORTED_FUNCTIONS")を使う。

オプションで`_`付きにして関数名を指定すると、吐き出したファイルにその関数がexportされる。

> Note that you need _ at the beginning of the function names in the EXPORTED_FUNCTIONS list.

```shell-session
emcc src/hello-func.c -o out/hello-func.js -s EXPORTED_FUNCTIONS="['_hello']"
```

これを使う側のNode.jsのコードは次のような感じ。
普通に`require`して`EXPORTED_FUNCTIONS`した名前を呼ぶだけ。

```js
const func = require("./out/hello-func");
func._hello();
```

**参考**:

- [Emscripten(C/C++) と JavaScript 間の関数呼び出し方法 まとめ | Sumire Lab Docs](https://www.sumirelab.com/docs/tech/emscriptencc-%E3%81%A8-javascript-%E9%96%93%E3%81%AE%E9%96%A2%E6%95%B0%E5%91%BC%E3%81%B3%E5%87%BA%E3%81%97%E6%96%B9%E6%B3%95-%E3%81%BE%E3%81%A8%E3%82%81/ "Emscripten(C/C++) と JavaScript 間の関数呼び出し方法 まとめ | Sumire Lab Docs")
- [Interacting with code — Emscripten 1.37.22 documentation](https://kripken.github.io/emscripten-site/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html?highlight=exported_functions "Interacting with code — Emscripten 1.37.22 documentation")

## WASM in Node.js

`.wasm`ファイルを作ってNode.jsで実行する

- [Deploying Emscripten Compiled Pages — Emscripten 1.37.22 documentation](https://kripken.github.io/emscripten-site/docs/compiling/Deploying-Pages.html?highlight=wasm "Deploying Emscripten Compiled Pages — Emscripten 1.37.22 documentation")

`-s WASM=1 -o out.html`で実行すると、wasmファイルとそれを実行するhtmlが生成できるらしい。
<del>emccで`.wasm`だけを作成する方法はよくわからなかった。</del>

`-s SIDE_MODULE=1 -s ONLY_MY_CODE=1`がセットじゃないと`.wasm`だけを生成は出来ないっぽいふんいき。
(そのうちかわりそう)

- [WebAssembly Standalone · kripken/emscripten Wiki](https://github.com/kripken/emscripten/wiki/WebAssembly-Standalone "WebAssembly Standalone · kripken/emscripten Wiki")

`ONLY_MY_CODE=1`だとCでincludeできないんので別のサンプルコードにする。


```c
int add(int x, int y){
  return x + y;
}
```

`count-only-my-code.c`というコードを作ってこれをwasmにする。

```shell-session
✈ emcc ./src/count-only-my-code.c -o ./out/count-only-my-code.wasm -Wall -s WASM=1 -s SIDE_MODULE=1 -s ONLY_MY_CODE=1 -s EXPORTED_FUNCTIONS="['_add']"
```

出力内容。いったんasm.jsで吐いて、それを`asm2wasm`で変換してくれるらしい。
```
✈ ll out
total 368
-rw-r--r--  1 azu  staff   837B 11  5 09:04 count-only-my-code.asm.js
-rw-r--r--  1 azu  wheel   172K 11  5 08:49 count-only-my-code.js
-rw-r--r--  1 azu  wheel   280B 11  5 09:04 count-only-my-code.wasm
```

これを実行するには[WebAssembly](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly "WebAssembly")で実行環境を定義して、wasmを読んでコンパイルして使う感じっぽい。

[(Learn the Hard Way)nodejs-8でのWebAssembly自体を調べてみた - Qiita](https://qiita.com/bellbind/items/a6435b0c8f10306128b8 "(Learn the Hard Way)nodejs-8でのWebAssembly自体を調べてみた - Qiita")を参考にして読み込んで実行するのを書いた。

```js
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
```

stack oveflowするけど実行はできた。

```
✈ node call-wasm.js
stack oveflow
3
```



### FAQ

`-s SIDE_MODULE=1 -s ONLY_MY_CODE=1` だとエラーがでる。

```

Traceback (most recent call last):
  File "/usr/local/bin/emcc", line 13, in <module>
    emcc.run()
  File "/usr/local/Cellar/emscripten/1.37.22/libexec/emcc.py", line 1812, in run
    wasm_text_target, misc_temp_files, optimizer)
  File "/usr/local/Cellar/emscripten/1.37.22/libexec/emcc.py", line 2279, in do_binaryen
    subprocess.check_call(cmd)
  File "/System/Library/Frameworks/Python.framework/Versions/2.7/lib/python2.7/subprocess.py", line 535, in check_call
    retcode = call(*popenargs, **kwargs)
  File "/System/Library/Frameworks/Python.framework/Versions/2.7/lib/python2.7/subprocess.py", line 522, in call
    return Popen(*popenargs, **kwargs).wait()
  File "/System/Library/Frameworks/Python.framework/Versions/2.7/lib/python2.7/subprocess.py", line 710, in __init__
    errread, errwrite)
  File "/System/Library/Frameworks/Python.framework/Versions/2.7/lib/python2.7/subprocess.py", line 1335, in _execute_child
    raise child_exception
OSError: [Errno 2] No such file or directory
```

となるのは`EMCC_DEBUG=1`を付けて実行すると何が原因か分かる。


```
DEBUG:root:asm2wasm (asm.js => WebAssembly): bin/asm2wasm ./out/count-only-my-code.asm.js --total-memory=16777216 --trap-mode=allow --table-max=-1 --mem-max=-1 -o ./out/count-only-my-code.wasm
```

でオチていたので、binaryenのパスが通ってなかった。


- [WebAssemblyを試してみた - Calmery.me](http://calmery.hatenablog.com/entry/2017/03/08/222513)
- [楓 software: wasm に clang を使った場合に C 内で関数呼び出しする場合に出るエラー](http://www.kaede-software.com/2017/02/wasm_clang_c.html)
- [C言語でchar型を返す関数。 - kira924ageの雑記帳](http://kira000.hatenadiary.jp/entry/2014/05/16/020654)
- [WebAssembly 101: a developer's first steps](https://blog.openbloc.fr/webassembly-first-steps/)
- [(Learn the Hard Way)nodejs-8でのWebAssembly自体を調べてみた - Qiita](https://qiita.com/bellbind/items/a6435b0c8f10306128b8)
- [node v8.0.0でWebAssembly試してみる - Qiita](https://qiita.com/ukyo/items/996ab5087b63f1798029)
- [詳説WebAssembly](https://www.slideshare.net/llamerada-jp/webassembly-75175349 "詳説WebAssembly")
- [20171018-WASM // Speaker Deck](https://speakerdeck.com/chikoski/20171018-wasm "20171018-WASM // Speaker Deck")

