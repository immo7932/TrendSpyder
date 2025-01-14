const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');


const X_USERNAME = 'immo7935';           
const X_PASSWORD = 'Asdfghjkl@123';      
const CHROME_DRIVER_PATH = 'C:\\Windows\\chromedriver.exe';

// ProxyMesh Configuration
const PROXY_MESH = {
  username: 'immo7932',    
  password: 'Qwertyuiop@123',    
    endpoints: [
        'us-wa.proxymesh.com:31280',
        'us-fl.proxymesh.com:31280',
        'us-il.proxymesh.com:31280',
        'us-ny.proxymesh.com:31280',
        'us-ca.proxymesh.com:31280'
    ]
};

async function getCurrentIP() {
    try {
        const res = await fetch('http://httpbin.org/ip');
        const json = await res.json();
        return json.origin;
    } catch (e) {
        return 'Unknown';
    }
}

async function getRandomProxyEndpoint() {
    return PROXY_MESH.endpoints[Math.floor(Math.random() * PROXY_MESH.endpoints.length)];
}

async function waitForPageLoad(driver) {
    await driver.wait(async () => {
        const state = await driver.executeScript('return document.readyState');
        return state === 'complete';
    }, 30000);
}

async function addStealthScripts(driver) {
    const scripts = [
        "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})",
        "delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array",
        "delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise",
        "delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol"
    ];
    
    for (const script of scripts) {
        await driver.executeScript(script);
    }
}

async function scrapeTrends() {
    let driver;
    
    try {
        const proxyEndpoint = await getRandomProxyEndpoint();
        const [proxyHost, proxyPort] = proxyEndpoint.split(':');

        let options = new chrome.Options();
        
        options.addArguments(
            '--disable-blink-features=AutomationControlled',
            '--disable-automation',
            '--useAutomationExtension=false',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--window-size=1920,1080',
            '--disable-gpu',
            '--disable-notifications',
            '--start-maximized'
        );

        const proxyString = `${PROXY_MESH.username}:${PROXY_MESH.password}@${proxyHost}:${proxyPort}`;
        options.setProxy({
            proxyType: 'manual',
            httpProxy: proxyString,
            sslProxy: proxyString
        });

        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .setChromeService(new chrome.ServiceBuilder(CHROME_DRIVER_PATH))
            .build();

        await addStealthScripts(driver);
        const ipAddress = await getCurrentIP();

        await driver.manage().setTimeouts({
            implicit: 10000,
            pageLoad: 30000,
            script: 30000
        });

        await driver.get('https://twitter.com/i/flow/login');
        await waitForPageLoad(driver);
        await driver.sleep(3000);

        const usernameField = await driver.wait(
            until.elementLocated(By.css('input[autocomplete="username"]')),
            15000
        );

        await usernameField.sendKeys(X_USERNAME);
        await driver.sleep(1000);

        const nextButton = await driver.findElement(By.xpath('//span[text()="Next"]'));
        await nextButton.click();
        await driver.sleep(2000);

        const passwordField = await driver.wait(
            until.elementLocated(By.css('input[name="password"]')),
            10000
        );

        await passwordField.sendKeys(X_PASSWORD);
        await driver.sleep(1000);

        const loginButton = await driver.findElement(By.xpath('//span[text()="Log in"]'));
        await loginButton.click();
        await driver.sleep(5000);

        await driver.get('https://twitter.com/home');
        await waitForPageLoad(driver);
        await driver.sleep(5000);

        const trendingNowHeading = await driver.wait(
            until.elementLocated(
                By.xpath("//h1[contains(text(),'Trending now')]")
            ),
            15000
        );

        const trendingSection = await driver.findElement(
            By.xpath("//section[@aria-labelledby='" + (await trendingNowHeading.getAttribute('id')) + "']")
        );

        const trendElements = await trendingSection.findElements(By.xpath(".//div[@role='link']"));

        const trends = [];
        for (let i = 0; i < Math.min(trendElements.length, 5); i++) {
            try {
                const trendText = await trendElements[i].getText();
                trends.push(trendText);
            } catch (error) {
                trends.push(`Trend ${i + 1} unavailable`);
            }
        }

        while (trends.length < 5) {
            trends.push('No trend available');
        }

        return {
            trends: trends,
            ipAddress,
            timestamp: new Date().toISOString()
        };

    } catch (err) {
        throw err;
    } finally {
        if (driver) {
            await driver.quit();
        }
    }
}

module.exports = { scrapeTrends };