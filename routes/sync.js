const express = require('express');
const router = express.Router();
const scrapeTareas = require('../scraper');
const { supabasePublic, supabaseAdmin } = require('../supabaseClient');

const getCredentials = async (user_id) => {
  const { data, error } = await supabaseAdmin
    .from('user_academic_credentials')
    .select('matricula, password')
    .eq('user_id', user_id)
    .single();

  if (error || !data) throw new Error('No se pudieron obtener las credenciales');
  return data;
};

const guardarTareasActualizadas = async (user_id, tareas) => {
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

router.post('/:user_id', async (req, res) => {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({ success: false, message: 'Falta el user_id' });
  }

  try {
    const credentials = await getCredentials(user_id);
    const tareas = await scrapeTareas(credentials.matricula, credentials.password);
    await guardarTareasActualizadas(user_id, tareas);
    res.json({ success: true });
  } catch (error) {
    console.error('Error en /sync/:user_id:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
