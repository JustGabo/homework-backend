const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const scrapeTareas = require('../scraper');
const deepEqual = require('fast-deep-equal');

const BATCH_SIZE = 5;
const DELAY_BETWEEN_BATCHES_MS = 30000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

async function sincronizarUsuarioPorCredenciales({ user_id, matricula, password }) {
  try {
    const tareasScrapeadas = await scrapeTareas(matricula, password);

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

  } catch (err) {
    console.error(`❌ Error sincronizando user ${user_id}:`, err.message);
  }
}

router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_academic_credentials')
      .select('user_id, matricula, password');

    if (error) throw error;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(user => {
        return sincronizarUsuarioPorCredenciales({
          user_id: user.user_id,
          matricula: user.matricula,
          password: user.password,
        });
      }));
      await delay(DELAY_BETWEEN_BATCHES_MS);
    }

    res.json({ success: true, message: 'Sincronización por lote completada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:user_id', async (req, res) => {
  const { user_id } = req.params;

  try {
    const { data: credenciales, error } = await supabaseAdmin
      .from('user_academic_credentials')
      .select('matricula, password')
      .eq('user_id', user_id)
      .single();

    if (error || !credenciales) {
      return res.status(404).json({ success: false, message: 'Credenciales no encontradas para el usuario' });
    }

    await sincronizarUsuarioPorCredenciales({
      user_id,
      matricula: credenciales.matricula,
      password: credenciales.password,
    });

    res.json({ success: true, message: `Sincronización completada para ${user_id}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
