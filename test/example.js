const tljs = require('../');
const assert = require('assert');

module.exports = async function() {
    const dom = await tljs.parse(`
        <!DOCTYPE html>
        <div>
            <p id="greeting">Hello World</p>
            <img id="img" src="image.png" />
        </div>
    `);

    assert(dom.getElementById('img').asTag().attributes().get('src') === 'image.png');
    assert(dom.getElementById('greeting').asTag().innerText() === 'Hello World');
    assert(dom.querySelector('p#greeting').asTag().innerText() === 'Hello World');
    assert(dom.version() === tljs.HTMLVersion.HTML5);
}
