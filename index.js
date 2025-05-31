require('dotenv').config();
const express = require('express');
const app = express();


const tareasRouter = require('./routes/tareas');
const loginRouter = require('./routes/login');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const cors = require('cors');
app.use(cors());

app.use('/login', loginRouter);   // ✅ nueva ruta
app.use('/tareas', tareasRouter); // ✏️ ya estaba

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
