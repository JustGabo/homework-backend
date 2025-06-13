const express = require('express');
const router = express.Router();
const scrapeTareas = require('../scraper');
const supabase = require('../supabaseClient');

const validarUserId = async (user_id) => {
  const { data, error } = await supabase.auth.admin.getUserById(user_id);
  if (error || !data?.user) {
    throw new Error('El user_id proporcionado no es válido en Supabase.');
  }
};

const guardarTareasActualizadas = async (user_id, tareas) => {
  await supabase
    .from('tareas')
    .delete()
    .eq('user_id', user_id);

  const tareasFormateadas = tareas.map(t => ({
    user_id,
    tarea_id: t.id,
    titulo: t.titulo,
    info: t.info,
    materia: t.materia,
    profesor: t.profesor,
    seccion: t.seccion,
    tipo: t.tipo,
    estado: t.estado,
    fecha_entrega: t.fechaEntrega,
    puntuacion: t.puntuacion,
    descripcion: t.descripcion,
    actualizada_el: new Date(),
  }));

  const { error } = await supabase
    .from('tareas')
    .insert(tareasFormateadas);

  if (error) throw error;
};

router.post('/', async (req, res) => {
  const { matricula, password, user_id } = req.body;

  if (!matricula || !password || !user_id) {
    return res.status(400).json({
      success: false,
      message: 'Faltan campos requeridos: matricula, password o user_id.',
    });
  }

  try {
    await validarUserId(user_id);
    const tareas = await scrapeTareas(matricula, password);
    await guardarTareasActualizadas(user_id, tareas);
    res.json({ success: true, tareas });
  } catch (error) {
    console.error('Error en POST /tareas:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor',
    });
  }
});

module.exports = router;
