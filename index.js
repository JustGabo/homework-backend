const express = require('express');
require('dotenv').config();
const app = express();

const tareasRouter = require('./routes/tareas');
const loginRouter = require('./routes/login');
const syncBatchRouter = require('./routes/syncBatch'); // 🚀 agregas esto
const syncRouter = require('./routes/sync');
const sendDueDateReminders = require('./routes/sendDueDateReminders');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const cors = require('cors');
app.use(cors());

app.use('/login', loginRouter);
app.use('/tareas', tareasRouter);
app.use('/sync-batch', syncBatchRouter);  // 🚀 montas la nueva ruta
app.use('/sync', syncRouter);
app.use('/send-due-date-reminders', sendDueDateReminders);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});