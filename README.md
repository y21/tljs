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
tl                 : 0.813267 ms/file ± 0.915871
htmlparser2        : 2.21103 ms/file ± 3.75915
html5parser        : 2.21831 ms/file ± 3.08665
node-html-parser   : 2.76944 ms/file ± 2.12705
htmlparser2-dom    : 2.78516 ms/file ± 4.22202
neutron-html5parser: 3.14495 ms/file ± 1.91157
html-dom-parser    : 4.31989 ms/file ± 6.27053
htmljs-parser      : 5.67571 ms/file ± 7.29359
parse5             : 9.14692 ms/file ± 7.22142
htmlparser         : 16.8457 ms/file ± 107.327
html-parser        : 32.9808 ms/file ± 24.9450
saxes              : 49.6793 ms/file ± 139.432
html5              : 110.896 ms/file ± 143.748
```
Benchmarked against real world data using [AndreasMadsen/htmlparser-benchmark](https://github.com/AndreasMadsen/htmlparser-benchmark)

*Note: This benchmark only measures raw HTML parsing, not DOM interaction.*