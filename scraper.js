const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const scrapeTareas = async (matricula, password) => {
  const LOGIN_URL = process.env.LOGIN_URL;
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      timeout: 60000,
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');

    // Ir al login
    await page.goto("https://login.oymas.edu.do/v2/", { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.type('#user', matricula);
    await page.type('#password', password);

    await Promise.all([
      page.click('#Login'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
    ]);

    await delay(1000); // Permite que cargue bien la interfaz

    // Verificación más confiable del login
    const loginFallido = await page.$('div.alert-danger, #Login[disabled]');
    if (loginFallido || !page.url().includes('profile.php')) {
      throw new Error('Login fallido, credenciales incorrectas o cuenta bloqueada.');
    }

    // Esperar menú de navegación
    await page.waitForSelector('ul.navigation-left li[data-item="oymas"]', { visible: true, timeout: 15000 });

    try {
      await page.hover('ul.navigation-left li[data-item="oymas"]');
    } catch {
      await page.evaluate(() => {
        const menuItem = document.querySelector('ul.navigation-left li[data-item="oymas"]');
        if (menuItem) {
          const event = new MouseEvent('mouseover', { bubbles: true, cancelable: true });
          menuItem.dispatchEvent(event);
        }
      });
    }

    await delay(1000);

    await Promise.all([
      page.evaluate(() => {
        const link = document.querySelector('ul.childNav a[href="/assignment.php"]');
        if (link) link.click();
      }),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
    ]);

    if (!page.url().includes('assignment.php')) {
      throw new Error('No se pudo acceder a la página de asignaciones.');
    }

    const tareas = await page.$$eval('.assignment-list ul.collectionViewItems li.assignment', items =>
      items.map(li => {
        const titulo = li.querySelector('a.ig-title')?.textContent.trim() || null;
        const info = li.querySelector('span[style*="font-size:11px"]')?.textContent.trim().replace(/\n/g, ' ') || null;

        const modulos = li.querySelector('div.ig-details__item.modules');
        let fechaEntrega = null;
        let puntuacion = null;
        let descripcion = null;
        const documentos = [];

        if (modulos) {
          const textoModulos = modulos.textContent.trim();

          const fechaMatch = textoModulos.match(/Fecha de entrega:\s*([^\|]+)/i);
          if (fechaMatch) fechaEntrega = fechaMatch[1].trim();

          const puntosMatch = textoModulos.match(/\bNo tiene puntuación\b/i);
          puntuacion = puntosMatch ? 'No tiene puntuación' : null;

          descripcion = modulos.querySelector('p')?.textContent.trim() || null;

          const links = modulos.querySelectorAll('a');
          links.forEach(a => {
            documentos.push({
              nombre: a.textContent.trim(),
              enlace: a.href,
            });
          });
        }

        return {
          titulo,
          info,
          fechaEntrega,
          puntuacion,
          descripcion,
          documentos,
        };
      })
    );

    return tareas;

  } catch (err) {
    console.error('Error en scrapeTareas:', err.message);
    throw new Error(err.message || 'Fallo al obtener tareas');
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.warn('Error al cerrar el navegador:', e.message);
      }
    }
  }
};

module.exports = scrapeTareas;
