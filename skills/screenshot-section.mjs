import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(__dirname, 'temporary screenshots', 'screenshot-tagline-detail.png');

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:3000/landing-page.html', { waitUntil: 'networkidle2' });

// Scroll to tagline section
await page.evaluate(() => {
    document.getElementById('tagline').scrollIntoView({ behavior: 'instant' });
});
await new Promise(r => setTimeout(r, 1800)); // wait for animation to play

await page.screenshot({ path: outputPath });
await browser.close();
console.log('Saved:', outputPath);
