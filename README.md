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
console.log(dom.querySelector('p#greeting').asTag().innerText()); // Hello World
console.log(dom.version() === tljs.HTMLVersion.HTML5); // true
```

## Benchmark
```
tl                 : 0.867211 ms/file ± 0.712470
htmlparser2        : 2.27647 ms/file ± 3.98507
html5parser        : 2.73132 ms/file ± 3.67408
node-html-parser   : 3.00771 ms/file ± 2.37876
htmlparser2-dom    : 3.09740 ms/file ± 5.11558
neutron-html5parser: 3.34103 ms/file ± 1.95397
html-dom-parser    : 3.90582 ms/file ± 5.52262
libxmljs           : 4.92904 ms/file ± 3.96175
htmljs-parser      : 7.38788 ms/file ± 9.71039
parse5             : 9.56172 ms/file ± 7.53395
htmlparser         : 18.4444 ms/file ± 119.896
html-parser        : 39.3015 ms/file ± 30.3498
saxes              : 59.1015 ms/file ± 167.816
html5              : 116.621 ms/file ± 150.214
```
Benchmarked against real world data using [AndreasMadsen/htmlparser-benchmark](https://github.com/AndreasMadsen/htmlparser-benchmark).

*Note: This benchmark only measures raw HTML parsing, not DOM interaction.*
