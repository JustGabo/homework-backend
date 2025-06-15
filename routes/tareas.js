const express = require('express');
const router = express.Router();
const scrapeTareas = require('../scraper');
const { supabasePublic, supabaseAdmin } = require('../supabaseClient');

const validarUserId = async (user_id) => {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(user_id);
  if (error) {
    console.error('Error validando user_id en Supabase:', error);
    throw new Error('Error validando el usuario en Supabase');
  }
  if (!data?.user) {
    throw new Error('El user_id proporcionado no existe en Supabase');
  }
};

const guardarTareasActualizadas = async (user_id, tareas) => {
  // Aquí puedes usar supabaseAdmin o supabasePublic según los permisos que necesites
  const { error: delError } = await supabaseAdmin.from('tareas').delete().eq('user_id', user_id);
  if (delError) throw delError;

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

  const { error: insertError } = await supabaseAdmin.from('tareas').insert(tareasFormateadas);
  if (insertError) throw insertError;
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
    console.error('Error en POST /tareas:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor',
    });
  }
});

module.exports = router;
