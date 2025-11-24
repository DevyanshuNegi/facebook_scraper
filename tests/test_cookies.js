const http = require('http');
const ScraperEngine = require('./scraper');
const { log } = require('./utils');

// Mock Cookies
process.env.FACEBOOK_COOKIES = JSON.stringify([
    [{"domain":".facebook.com","expirationDate":1797751835.449076,"hostOnly":false,"httpOnly":true,"name":"datr","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"zCsYaUn0brbJ6iFbUxsO5MXp"},{"domain":".facebook.com","expirationDate":1797751892.711638,"hostOnly":false,"httpOnly":true,"name":"sb","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"zCsYadp3FAN0HgbudE4yp6WL"},{"domain":".facebook.com","expirationDate":1797751846.708706,"hostOnly":false,"httpOnly":true,"name":"ps_l","path":"/","sameSite":"lax","secure":true,"session":false,"storeId":"0","value":"1"},{"domain":".facebook.com","expirationDate":1797751846.708779,"hostOnly":false,"httpOnly":true,"name":"ps_n","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"1"},{"domain":".facebook.com","expirationDate":1794744788.722652,"hostOnly":false,"httpOnly":false,"name":"c_user","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"61583656266188"},{"domain":".facebook.com","expirationDate":1763796692.711621,"hostOnly":false,"httpOnly":false,"name":"locale","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"hi_IN"},{"domain":".facebook.com","expirationDate":1770981284.281268,"hostOnly":false,"httpOnly":true,"name":"b_user","path":"/","sameSite":"lax","secure":true,"session":false,"storeId":"0","value":"61583656266188"},{"domain":".facebook.com","hostOnly":false,"httpOnly":false,"name":"presence","path":"/","sameSite":"unspecified","secure":true,"session":true,"storeId":"0","value":"C%7B%22t3%22%3A%5B%5D%2C%22utc3%22%3A1763207684699%2C%22v%22%3A1%7D"},{"domain":".facebook.com","expirationDate":1770984788.722767,"hostOnly":false,"httpOnly":true,"name":"fr","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"1QDC2hmAYjEr7weTw.AWdZWr73D8bUqtwu8YKD5dAQsxOIjxbkAFI1X-D5ajD4Z07h3pk.BpGG5U..AAA.0.0.BpGG5U.AWcfhpx7txDnzNkcTo2ZviPeBX8"},{"domain":".facebook.com","expirationDate":1794744788.722821,"hostOnly":false,"httpOnly":true,"name":"xs","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"12%3A_mMVIEGRc_l3NA%3A2%3A1763191891%3A-1%3A-1%3A%3AAcz6jp-ItRlnrkyTUFhmqwcO3nyHL2k3PxQ73L91iA"},{"domain":".facebook.com","expirationDate":1763814987,"hostOnly":false,"httpOnly":false,"name":"wd","path":"/","sameSite":"lax","secure":true,"session":false,"storeId":"0","value":"1920x927"}],
    // [{ name: "session", value: "2", domain: "localhost", path: "/" }]
]);
 
const PORT = 3000;
let requestCount = 0;

const server = http.createServer((req, res) => {
    requestCount++;
    log(`[Server] Received request #${requestCount} for ${req.url}`);

    if (req.url === '/login') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body>Login Page</body></html>');
        return;
    }

    // First request simulates expired session -> redirect to login
    if (requestCount === 1) {
        res.writeHead(302, { 'Location': '/login' });
        res.end();
        return;
    }

    // Second request simulates valid session
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><head><title>Success Page</title></head><body>Content</body></html>');
});

async function runTest() {
    server.listen(PORT, async () => {
        log(`Test server running on port ${PORT}`);

        const scraper = new ScraperEngine();
        await scraper.init();

        try {
            log('--- Starting Test ---');
            await scraper.processUrl(`http://localhost:${PORT}/target`);
            log('--- Test Complete ---');
        } catch (e) {
            console.error(e);
        } finally {
            await scraper.close();
            server.close();
        }
    });
}

runTest();
