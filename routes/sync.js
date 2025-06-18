const express = require('express');
const router = express.Router();
const scrapeTareas = require('../scraper');
const { supabasePublic, supabaseAdmin } = require('../supabaseClient');
const deepEqual = require('fast-deep-equal');

const getCredentials = async (user_id) => {
  const { data, error } = await supabaseAdmin
    .from('user_academic_credentials')
    .select('matricula, password')
    .eq('user_id', user_id)
    .single();

  if (error || !data) throw new Error('No se pudieron obtener las credenciales');
  return data;
};

const detectarCambios = (tareasPrevias, tareasNuevas) => {
  const prevMap = new Map(tareasPrevias.map(t => [t.tarea_id, t]));
  const nuevasMap = new Map(tareasNuevas.map(t => [t.tarea_id, t]));

  const nuevas = [];
  const actualizadas = [];
  const eliminadas = [];

  for (const nueva of tareasNuevas) {
    const previa = prevMap.get(nueva.tarea_id);
    if (!previa) {
      nuevas.push(nueva);
    } else {
      const haCambiado = !deepEqual({ ...nueva }, { ...previa });
      if (haCambiado) actualizadas.push(nueva);
    }
  }

  for (const previa of tareasPrevias) {
    if (!nuevasMap.has(previa.tarea_id)) {
      eliminadas.push(previa);
    }
  }

  return { nuevas, actualizadas, eliminadas };
};

const sincronizarCambios = async (user_id, nuevas, actualizadas, eliminadas) => {
  const tareasToInsert = nuevas.map(t => ({ ...t, user_id, actualizada_el: new Date() }));
  const tareasToUpdate = actualizadas.map(t => ({ ...t, user_id, actualizada_el: new Date() }));

  if (tareasToInsert.length > 0) {
    await supabaseAdmin.from('tareas').insert(tareasToInsert);
  }

  for (const tarea of tareasToUpdate) {
    await supabaseAdmin
      .from('tareas')
      .update(tarea)
      .eq('user_id', user_id)
      .eq('tarea_id', tarea.tarea_id);
  }

  for (const tarea of eliminadas) {
    await supabaseAdmin
      .from('tareas')
      .delete()
      .eq('user_id', user_id)
      .eq('tarea_id', tarea.tarea_id);
  }
};

const guardarTareasActualizadas = async (user_id, tareasScrapeadas) => {
  const tareasFormateadas = tareasScrapeadas
    .filter(t => t.id)
    .map(t => ({
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
    }));

  const { data: tareasPrevias, error: fetchError } = await supabaseAdmin
    .from('tareas')
    .select('*')
    .eq('user_id', user_id);

  if (fetchError) throw fetchError;

  const { nuevas, actualizadas, eliminadas } = detectarCambios(tareasPrevias || [], tareasFormateadas);
  await sincronizarCambios(user_id, nuevas, actualizadas, eliminadas);
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
