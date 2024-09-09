const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const path = require('path');
require('dotenv').config();  // Load environment variables from .env

const app = express();

// Enable CORS for your frontend origin from .env
app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || 'https://frontend.ecom-tools.com/'
}));

app.use(bodyParser.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: process.env.PUPPETEER_HEADLESS === 'true',
            args: process.env.PUPPETEER_ARGS.split(',')
        });
        const page = await browser.newPage();
        await page.goto(process.env.RANKERFOX_LOGIN_URL, { waitUntil: 'networkidle2' });
        await page.type('#iump_login_username', username);
        await page.type('#iump_login_password', password);
        await page.keyboard.press('Enter');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        const currentUrl = page.url();
        if (currentUrl.includes('premium-plan')) {
            res.json({ success: true, redirectUrl: '/success' });
        } else {
            res.json({ success: false, message: 'Invalid credentials. Please try again.' });
        }
    } catch (error) {
        console.error("An error occurred:", error);
        res.json({ success: false, message: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

// Serve success page
app.get('/success', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});
