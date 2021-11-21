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
tljs               : 0.919965 ms/file ± 0.932074
htmlparser2        : 2.23830 ms/file ± 3.73695
html5parser        : 2.37009 ms/file ± 3.44304
htmlparser2-dom    : 2.85247 ms/file ± 4.16031
node-html-parser   : 2.94823 ms/file ± 2.16909
neutron-html5parser: 3.31393 ms/file ± 2.02473
html-dom-parser    : 3.95468 ms/file ± 5.49152
libxmljs           : 4.92975 ms/file ± 3.47270
htmljs-parser      : 6.90960 ms/file ± 8.30913
parse5             : 9.74852 ms/file ± 7.31035
htmlparser         : 17.4388 ms/file ± 108.846
html-parser        : 35.8347 ms/file ± 26.1177
saxes              : 53.5032 ms/file ± 148.738
html5              : 109.779 ms/file ± 136.509
```
Benchmark suite: [https://github.com/AndreasMadsen/htmlparser-benchmark](AndreasMadsen/htmlparser-benchmark)