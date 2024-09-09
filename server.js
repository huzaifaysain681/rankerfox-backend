const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const path = require('path');
const helmet = require('helmet'); // For basic security headers
require('dotenv').config();  // Load environment variables from .env

const app = express();

// Security: Set security headers
app.use(helmet());

// Enable CORS for your frontend origin from .env
app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || 'https://frontend.ecom-tools.com',
    methods: ['GET', 'POST'],  // Limit allowed methods
    credentials: true          // Allow cookies to be sent
}));

// Parse JSON bodies
app.use(bodyParser.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Puppeteer browser instance to avoid re-launching multiple times
let browser;

// Create a reusable browser instance on startup
(async () => {
    try {
        browser = await puppeteer.launch({
            headless: process.env.PUPPETEER_HEADLESS === 'true', // Set headless mode based on .env
            executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', // Corrected Chrome path
            args: process.env.PUPPETEER_ARGS ? process.env.PUPPETEER_ARGS.split(',') : ['--no-sandbox', '--disable-setuid-sandbox'] // Handle Puppeteer args
        });
        console.log('Puppeteer browser instance started.');
    } catch (err) {
        console.error('Failed to start Puppeteer:', err);
    }
})();

// Login route to handle automation
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    try {
        const page = await browser.newPage();
        await page.goto(process.env.RANKERFOX_LOGIN_URL || 'https://your-login-url.com', { waitUntil: 'networkidle2' });
        
        await page.type('#iump_login_username', username);
        await page.type('#iump_login_password', password);
        await page.keyboard.press('Enter');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        const currentUrl = page.url();
        await page.close(); // Close the page after use to avoid memory leaks

        if (currentUrl.includes('premium-plan')) {
            return res.json({ success: true, redirectUrl: '/success' });
        } else {
            return res.status(401).json({ success: false, message: 'Invalid credentials. Please try again.' });
        }
    } catch (error) {
        console.error('An error occurred during Puppeteer login:', error);
        return res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
});

// Serve success page
app.get('/success', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Graceful shutdown for Puppeteer
process.on('SIGINT', async () => {
    if (browser) {
        await browser.close();
        console.log('Puppeteer instance closed gracefully.');
    }
    process.exit(0);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});
