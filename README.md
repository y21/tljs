# tljs
A [high performance](#benchmark) HTML5 parser for JavaScript.

This library wraps the Rust crate [tl](https://github.com/y21/tl) and exposes its interface to JavaScript.

## When To Use
This library can *very quickly* parse *very large* HTML documents. However, this library is not suitable for every use case.
In particular, if you find yourself having to do lots of operations on the nodes, this may not be for you, due to the overhead of calling into WebAssembly.
So, use this library if:

- Most of the time is likely spent parsing documents.
- Not a lot of operations are done on the nodes.
- You need to parse *large* documents (tens to hundreds of megabytes)

In any case, you should benchmark this library for your specific use case, and see if you benefit from the fast parsing speeds, or if the WebAssembly overhead is a bottleneck.

## How To Use
```js
const tljs = require('@y21/tljs');
const dom = await tljs.parse(`
    <!DOCTYPE html>
    <div>
        <p id="greeting">Hello World</p>
        <img id="img" src="image.png" />
    </div>
`);

console.log(dom.getElementById('img').asTag().attributes().get('src')); // image.png
console.log(dom.getElementById('greeting').asTag().innerText()); // Hello World
console.log(dom.querySelector('p#greeting').asTag().innerText()); // Hello World
console.log(dom.version() === tljs.HTMLVersion.HTML5); // true
```

## Spec compliance
This parser does **not** fully follow the HTML standard, however it is expected to be able to parse most "sane" HTML.
This greatly impacts performance and should be taken into consideration when comparing performance of different HTML parsers.
Not being bound to a spec enables a *lot* more optimization opportunities.

## Using this library in the browser
It's possible to use this library in very "restricted" JavaScript environments (for example no access to the file system or network). By default, this library assumes it's running under Node.js and attempts to load the `.wasm` binary needed to call into Rust code using `require('fs').readFile`.

If you want to use this library in the browser or other environments, you need to override the default WebAssembly loading mechanism. This depends on your setup, but one way to achieve this would be to host the `.wasm` binary elsewhere (maybe serve it from your webserver) and use `fetch()` to get the binary.
```js
const tljs = require('@y21/tljs');

// override the wasm loading function
tljs.setInitializerCallback(() => {
  return fetch('/tl.wasm').then(x => x.arrayBuffer()); // assuming `/tl.wasm` serves the binary.
});

tljs.parse('<p>Hello world</p>');
```
It doesn't matter *how* you obtain the WebAssembly binary, but you'll need to return an `ArrayBuffer` from the initializer callback (can also be a promise resolving to an `ArrayBuffer`).

## Benchmark
```
tl                 : 0.863912 ms/file ± 0.528114
htmlparser2        : 2.02348 ms/file ± 3.05865
html5parser        : 2.20736 ms/file ± 2.66850
htmlparser2-dom    : 2.70631 ms/file ± 3.40642
html-dom-parser    : 2.72998 ms/file ± 3.56091
neutron-html5parser: 2.74419 ms/file ± 1.52848
node-html-parser   : 2.89545 ms/file ± 1.80618
libxmljs           : 4.20240 ms/file ± 2.99146
zeed-dom           : 4.82065 ms/file ± 2.86533
htmljs-parser      : 5.97658 ms/file ± 6.65908
parse5             : 6.85238 ms/file ± 7.75122
arijs-stream       : 18.7410 ms/file ± 18.6447
arijs-tree         : 20.6841 ms/file ± 19.4813
htmlparser         : 21.8427 ms/file ± 154.758
html-parser        : 27.3543 ms/file ± 20.7064
saxes              : 58.8234 ms/file ± 167.164
html5              : 109.685 ms/file ± 146.399
```
Benchmarked against real world data using [AndreasMadsen/htmlparser-benchmark](https://github.com/AndreasMadsen/htmlparser-benchmark).

*Note: This benchmark only measures raw HTML parsing, not DOM interaction.*
