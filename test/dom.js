const tljs = require('../');
const assert = require('assert');

module.exports = async function(html) {
    const dom = await tljs.parse(html);

    const children = dom.children();
    assert(children.length() > 0);
    assert(children.at(0) !== null);

    const element = dom.getElementById('mw-content-text');
    assert(element !== null);
    assert(element.innerText().length > 0);

    const query = dom.querySelector('div#mw-content-text');
    assert(query.innerText() === element.innerText());
    
    assert(dom.version() === tljs.HTMLVersion.HTML5);
};
