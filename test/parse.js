const tljs = require('../');

module.exports = async function(html) {
    await tljs.parse(html);
};
