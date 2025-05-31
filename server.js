const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

app.post('/tareas', async (req, res) => {
  const { matricula, password } = req.body;

  // Validar entrada
  if (!matricula || !password) {
    return res.status(400).json({ success: false, message: 'Faltan campos requeridos: matricula o password.' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Ir al sitio de login
    await page.goto('https://login.oymas.edu.do/v2/', { waitUntil: 'domcontentloaded', timeout: 0 });

    // Ingresar credenciales
    await page.waitForSelector('#user', { timeout: 15000 });
    await page.type('#user', matricula);
    await page.type('#password', password);

    // Click en login y esperar navegación
    await page.waitForSelector('#Login', { visible: true, timeout: 15000 });
    await Promise.all([
      page.click('#Login'),
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
    ]);

    // Validar si el login fue exitoso
    if (!page.url().includes('profile.php')) {
      return res.status(401).json({ success: false, message: 'Login fallido, credenciales incorrectas.' });
    }

    // Navegar al módulo de tareas
    await page.waitForSelector('ul.navigation-left li[data-item="oymas"]', { visible: true, timeout: 15000 });

    // Hover o evento manual sobre el menú
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

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Click en la opción de tareas
    await page.waitForSelector('ul.childNav a[href="/assignment.php"]', { visible: true, timeout: 15000 });
    await Promise.all([
      page.evaluate(() => {
        const link = document.querySelector('ul.childNav a[href="/assignment.php"]');
        if (link) link.click();
      }),
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
    ]);

    // Validar si se accedió a la página de tareas
    if (!page.url().includes('assignment.php')) {
      return res.status(404).json({ success: false, message: 'No se pudo acceder a la página de asignaciones.' });
    }

    // Extraer las tareas
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
              enlace: a.href
            });
          });
        }

        return {
          titulo,
          info,
          fechaEntrega,
          puntuacion,
          descripcion,
          documentos
        };
      })
    );

    res.json({ success: true, tareas });

  } catch (error) {
    console.error('Error en scraping:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
