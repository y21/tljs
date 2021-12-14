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
tl                 : 0.958690 ms/file ± 1.05525
htmlparser2        : 2.29752 ms/file ± 3.98075
html5parser        : 2.30177 ms/file ± 3.19532
htmlparser2-dom    : 2.79198 ms/file ± 4.25506
node-html-parser   : 2.83298 ms/file ± 2.08092
neutron-html5parser: 3.22229 ms/file ± 2.16651
html-dom-parser    : 3.73140 ms/file ± 5.57067
htmljs-parser      : 5.91033 ms/file ± 7.45378
parse5             : 9.41607 ms/file ± 7.15010
htmlparser         : 16.8887 ms/file ± 107.539
html-parser        : 33.3128 ms/file ± 25.5523
saxes              : 50.4454 ms/file ± 140.833
html5              : 112.382 ms/file ± 146.228
```
Benchmarked against real world data using [AndreasMadsen/htmlparser-benchmark](https://github.com/AndreasMadsen/htmlparser-benchmark).

*Note: This benchmark only measures raw HTML parsing, not DOM interaction.*
