const express = require('express');
const router = express.Router();
const scrapeTareas = require('../scraper');
const supabase = require('../supabaseClient'); // ✅ importar supabase

// ✅ Función para guardar las tareas en caché
const guardarTareasEnCache = async (matricula, tareas) => {
  const { data: existente, error: errExistente } = await supabase
    .from('tareas')
    .select('*')
    .eq('matricula', matricula)
    .maybeSingle();

  if (errExistente) throw errExistente;

  if (existente) {
    await supabase
      .from('tareas')
      .update({
        tareas,
        actualizado_el: new Date()
      })
      .eq('matricula', matricula);
  } else {
    await supabase
      .from('tareas')
      .insert([{ matricula, tareas }]);
  }
};

// ✅ Ruta POST para obtener tareas y guardarlas en Supabase
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

    // ✅ Guardar en cache después del scraping
    await guardarTareasEnCache(matricula, tareas);

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
