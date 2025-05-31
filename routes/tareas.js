const express = require('express');
const router = express.Router();
const scrapeTareas = require('../scraper');

router.post('/', async (req, res) => {
  const { matricula, password } = req.body;

  if (!matricula || !password) {
    return res.status(400).json({
      success: false,
      message: 'Faltan campos requeridos: matricula o password.',
    });
  }

  try {
    const tareas = await scrapeTareas(matricula, password);
    res.json({ success: true, tareas });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor',
    });
  }
});

module.exports = router;
