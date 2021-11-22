# tljs
A very fast HTML5 parser for JavaScript.

## Usage
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
console.log(dom.version() === tljs.HTMLVersion.HTML5); // true

// Free memory used by this document
dom.free();
```

## Benchmark
```
tl                 : 0.782175 ms/file ± 0.586904
htmlparser2        : 2.24923 ms/file ± 3.84998
html5parser        : 2.28517 ms/file ± 3.19524
htmlparser2-dom    : 2.76991 ms/file ± 4.25234
node-html-parser   : 2.77929 ms/file ± 2.15366
neutron-html5parser: 3.15761 ms/file ± 1.99242
html-dom-parser    : 3.90452 ms/file ± 6.26166
htmljs-parser      : 5.73236 ms/file ± 7.26601
parse5             : 9.42388 ms/file ± 7.09356
htmlparser         : 16.5729 ms/file ± 105.663
html-parser        : 33.0697 ms/file ± 25.3634
saxes              : 49.7711 ms/file ± 139.698
html5              : 110.847 ms/file ± 144.033
```
Benchmarked against real world data using [AndreasMadsen/htmlparser-benchmark](https://github.com/AndreasMadsen/htmlparser-benchmark) (with slight modification to allow WebAssembly module instantiation before benchmarking)

*Note: This benchmark only measures raw HTML parsing, not DOM interaction.*