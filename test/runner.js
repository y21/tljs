const tljs = require('../');
const fs = require('fs');
const exclude = ['runner.js', 'setup.js'];
const files = fs.readdirSync(__dirname).filter(x => !exclude.includes(x) && x.endsWith('.js'));
const input = fs.readFileSync(`${__dirname}/test.html`, 'utf8');
tljs.initializeWasmSync();

(async () => {
    for (const file of files) {
        const mod = require(`./${file}`);
        console.time(file);
        try {
            await mod(input);
        } catch(e) {
            console.log(`[${file}] Failed: ${e.stack}`);
        } finally {
            console.timeEnd(file);
        }
    }
})();
