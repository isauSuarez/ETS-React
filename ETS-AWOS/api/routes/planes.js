const express = require('express');
const db = require('../database/db');

const router = express.Router();


// metodo get y consulta sqlazo para traer los planes, con sus maximos de servicios cawn
router.get('/', async (req, res) => {
  try {
    const [planes] = await db.execute(`
      SELECT idPlan, nombre, maxConsultas, maxRemotos, maxPresenciales
      FROM plan
      ORDER BY idPlan
    `);
    //el sqlazo termina en order by para que se vean bellakos cawn
    res.json(planes);
  } catch (error) {
    console.error('Error al consultar planes:', error.code);
    res.status(500).json({ mensaje: 'No se pudo cargar los planes disponibles.' });
  }
});

module.exports = router;