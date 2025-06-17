// sync.js (en la raíz del proyecto, fuera de /routes/)
const axios = require('axios');

(async () => {
  try {
    const response = await axios.post('https://homework-backend-production.up.railway.app/sync-batch');
    console.log('✅ Sincronización por lote completada:', response.data);
  } catch (error) {
    console.error('❌ Error durante la sincronización:', error.message);
    process.exit(1); // importante para que Railway corte si hay error
  }
})();
