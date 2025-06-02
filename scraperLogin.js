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

    // Establecer un user agent confiable
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36'
    );

    // Navegar a la página de login
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Llenar usuario y contraseña
    await page.waitForSelector('#user', { timeout: 15000 });
    await page.type('#user', matricula);

    await page.waitForSelector('#password', { timeout: 15000 });
    await page.type('#password', password);

    // Breve pausa antes del submit
    await page.waitForTimeout?.(500) || new Promise(r => setTimeout(r, 500));

    // Click y esperar navegación con estrategia confiable
    await Promise.all([
      page.click('#Login'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
    ]);

    const urlActual = page.url();

    // Verificar si el login fue exitoso
    if (!urlActual.includes('profile.php')) {
      return { success: false };
    }

    // Extraer el nombre completo del perfil
    const nombreCompleto = await page.$eval('h4.m-0', el => el.textContent?.trim() || '');

    if (!nombreCompleto) {
      throw new Error('No se pudo extraer el nombre del usuario.');
    }

    // Obtener primer nombre
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
