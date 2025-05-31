const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const checkLogin = async (matricula, password) => {
  const LOGIN_URL = process.env.LOGIN_URL;
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');

    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });

    await page.type('#user', matricula);
    await page.type('#password', password);

    await Promise.all([
      page.click('#Login'),
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    ]);

    return page.url().includes('profile.php');
  } catch (err) {
    console.error('Error en checkLogin:', err.message);
    throw new Error('Error al verificar login');
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = checkLogin;
