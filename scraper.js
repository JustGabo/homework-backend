const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry wrapper para reintentar en caso de error temporal
const scrapeTareas = async (matricula, password, retries = 2) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await _scrapeTareas(matricula, password);
    } catch (err) {
      console.warn(`[scrapeTareas] Intento ${i + 1} fallido: ${err.message}`);
      if (i === retries - 1) throw err;
      await delay(3000); // espera antes del próximo intento
    }
  }
};

const _scrapeTareas = async (matricula, password) => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      timeout: 60000,
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    
    const LOGIN_URL = process.env.LOGIN_URL;
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.type('#user', matricula);
    await page.type('#password', password);

    await Promise.all([
      page.click('#Login'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
    ]);

    await delay(1000);

    const loginFallido = await page.$('div.alert-danger, #Login[disabled]');
    if (loginFallido || !page.url().includes('profile.php')) {
      throw new Error('Login fallido, credenciales incorrectas o cuenta bloqueada.');
    }

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
      items.map((li, index) => {
        const titulo = li.querySelector('a.ig-title')?.textContent.trim() || null;
        const info = li.querySelector('span[style*="font-size:11px"]')?.textContent.trim().replace(/\n/g, ' ') || null;

        const materia = li.querySelector('.ig-details__item.subject span')?.textContent.trim() || null;
        const profesor = li.querySelector('.ig-details__item.professor span')?.textContent.trim() || null;
        const seccion = li.querySelector('.ig-details__item.section span')?.textContent.trim() || null;
        const tipo = li.querySelector('.ig-details__item.type span')?.textContent.trim() || null;
        const estado = li.querySelector('.ig-details__item.status span')?.textContent.trim() || null;

        const modulos = li.querySelector('div.ig-details__item.modules');
        let fechaEntrega = null;
        let puntuacion = null;
        let descripcion = null;

        if (modulos) {
          const textoModulos = modulos.textContent.trim();

          const fechaMatch = textoModulos.match(/Fecha de entrega:\s*([0-9\-]+)/i);
          if (fechaMatch) fechaEntrega = fechaMatch[1].trim();

          const puntosMatch = textoModulos.match(/\|\s*(\d+)\s*puntos?/i);
          puntuacion = puntosMatch ? puntosMatch[1].trim() : 'No tiene puntuación';

          const parrafos = modulos.querySelectorAll('p');
          descripcion = Array.from(parrafos).map(p => p.textContent.trim()).filter(p => p.length > 0).join('\n');
        }

        return {
          id: `${index}-${titulo?.slice(0, 30)}`,
          titulo,
          info,
          materia,
          profesor,
          seccion,
          tipo,
          estado,
          fechaEntrega,
          puntuacion,
          descripcion,
        };
      })
    );

    if (!Array.isArray(tareas) || tareas.length === 0) {
      throw new Error('No se encontraron tareas. Posible error en el scraping.');
    }

    return tareas;

  } catch (err) {
    console.error('[scrapeTareas] Error crítico:', err.message);
    console.error(err.stack);
    throw new Error(err.message || 'Fallo al obtener tareas');
  } finally {
    if (browser) await browser.close().catch(() => null);
  }
};

module.exports = scrapeTareas;
