const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const LOGIN_URL = process.env.LOGIN_URL;  // cargamos una sola vez al inicio

const checkLogin = async (matricula, password) => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36'
    );

    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.waitForSelector('#user', { timeout: 15000 });
    await page.type('#user', matricula);

    await page.waitForSelector('#password', { timeout: 15000 });
    await page.type('#password', password);

    // Aquí reemplazamos page.waitForTimeout(500) por setTimeout
    await new Promise(resolve => setTimeout(resolve, 500));

    await Promise.all([
      page.click('#Login'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
    ]);

    const urlActual = page.url();

    if (!urlActual.includes('profile.php')) {
      return { success: false };
    }

    const nombreCompleto = await page.$eval('h4.m-0', el => el.textContent?.trim() || '');
    if (!nombreCompleto) {
      throw new Error('No se pudo extraer el nombre del usuario.');
    }

    const partes = nombreCompleto.split(' ');
    const primerNombre = partes.length > 1 ? partes[1] : partes[0];

    return {
      success: true,
      nombreCompleto,
      primerNombre,
    };

  } catch (err) {
    console.error('Error en checkLogin:', err.message);
    throw new Error('Error al verificar login');
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = checkLogin;
