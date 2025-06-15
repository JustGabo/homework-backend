const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const scrapeTareas = require('../scraper');

// Configuración de lote
const BATCH_SIZE = 5;
const DELAY_BETWEEN_BATCHES_MS = 30000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- Función que sincroniza 1 usuario completo (recibe objeto con matricula/password/user_id)
async function sincronizarUsuarioPorCredenciales({ user_id, matricula, password }) {
  try {
    const tareas = await scrapeTareas(matricula, password);

    await supabaseAdmin.from('tareas').delete().eq('user_id', user_id);

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

    const { error } = await supabaseAdmin.from('tareas').insert(tareasFormateadas);
    if (error) throw error;

    console.log(`✅ Usuario ${user_id} sincronizado`);
  } catch (err) {
    console.error(`❌ Error sincronizando user ${user_id}:`, err.message);
  }
}

// --- BATCH: Sincroniza todos los usuarios desde la tabla user_academic_credentials
router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_academic_credentials')
      .select('user_id, matricula, password');

    if (error) throw error;

    console.log(`🔄 Total usuarios con matricula: ${data.length}`);

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(user => {
        return sincronizarUsuarioPorCredenciales({
          user_id: user.user_id,
          matricula: user.matricula,
          password: user.password,
        });
      }));
      console.log(`🕒 Esperando ${DELAY_BETWEEN_BATCHES_MS / 1000} segundos...`);
      await delay(DELAY_BETWEEN_BATCHES_MS);
    }

    res.json({ success: true, message: 'Sincronización por lote completada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- INDIVIDUAL: Sincroniza un usuario por su user_id
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
