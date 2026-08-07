
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            console.log(msg.type().toUpperCase() + ':', msg.text(), msg.location().url + ':' + msg.location().lineNumber);
        }
    });
    page.on('pageerror', err => {
        console.log('PAGE ERROR:', err.message, err.stack);
    });
    await page.goto('http://127.0.0.1:8080', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
})();

