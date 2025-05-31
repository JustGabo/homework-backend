const express = require('express');
const router = express.Router();
const checkLogin = require('../scraperLogin');

router.post('/', async (req, res) => {
  const { matricula, password } = req.body;

  if (!matricula || !password) {
    return res.status(400).json({
      success: false,
      message: 'Faltan campos requeridos: matricula o password.',
    });
  }

  try {
    const success = await checkLogin(matricula, password);
    if (success) {
      res.json({ success: true, message: 'Login correcto' });
    } else {
      res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

module.exports = router;
