var express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const autentificaCliente = require('../middleware/autentificaCliente');

router.use(autentificaCliente);

router.get('/', async (req, res) => {
  try {
    // si ya paso la fecha, se muestra vencida sin mover el estado guardado cawn
    const [polizas] = await db.query(
      `SELECT p.idPoliza, pl.nombre AS plan, p.nombreEmpresa, p.direccionServicio,
              CASE WHEN p.estado = 'ACTIVA' AND p.fechaVencimiento <= CURDATE()
                   THEN 'VENCIDA' ELSE p.estado END AS estado,
              DATE_FORMAT(p.fechaInicio, '%Y-%m-%d') AS fechaInicio,
              DATE_FORMAT(p.fechaVencimiento, '%Y-%m-%d') AS fechaVencimiento,
              pl.maxConsultas, pl.maxRemotos, pl.maxPresenciales,
              COUNT(CASE WHEN t.modalidad = 'CONSULTA' THEN 1 END) AS usadasConsultas,
              COUNT(CASE WHEN t.modalidad = 'REMOTO' THEN 1 END) AS usadosRemotos,
              COUNT(CASE WHEN t.modalidad = 'PRESENCIAL' THEN 1 END) AS usadosPresenciales
       FROM poliza AS p
       INNER JOIN plan AS pl ON pl.idPlan = p.idPlan
       LEFT JOIN ticket AS t ON t.idPoliza = p.idPoliza AND t.estado <> 'CANCELADO'
         AND t.fechaCreacion >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
         AND t.fechaCreacion < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
       WHERE p.idCliente = ?
       GROUP BY p.idPoliza, pl.nombre, p.nombreEmpresa, p.direccionServicio, p.estado,
                p.fechaInicio, p.fechaVencimiento, pl.maxConsultas, pl.maxRemotos, pl.maxPresenciales
       ORDER BY p.idPoliza DESC`,
      [req.cliente.idCliente]
    );

    res.json(polizas);
  } catch (error) {
    console.error('Error al consultar pólizas:', error.code);
    res.status(500).json({ mensaje: 'No se pudieron cargar tus pólizas.' });
  }
});

router.post('/', [
  body('idPlan', 'Selecciona un plan válido.').isInt({ min: 1, max: 4294967295 }),
  body('nombreEmpresa', 'Escribe el nombre de la empresa, hasta 150 caracteres.')
    .isString().bail().trim().isLength({ min: 1, max: 150 }),
  body('direccionServicio', 'Escribe la dirección de servicio, hasta 255 caracteres.')
    .isString().bail().trim().isLength({ min: 1, max: 255 })
], async (req, res) => {
  if (!req.is('application/json')) {
    return res.status(415).json({ mensaje: 'Envía la solicitud en JSON.' });
  }

  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ mensaje: errores.array()[0].msg });
  }

  const { idPlan, nombreEmpresa, direccionServicio } = req.body;

  try {
    const [planes] = await db.query('SELECT nombre, maxConsultas, maxRemotos, maxPresenciales FROM plan WHERE idPlan = ?', [Number(idPlan)]);
    if (planes.length === 0) {
      return res.status(404).json({ mensaje: 'El plan seleccionado ya no está disponible.' });
    }

    // el año empieza cuando el jefe la activa, por eso queda pendiente y sin fechas cawn
    const [resultado] = await db.query(
      `INSERT INTO poliza (idCliente, idPlan, nombreEmpresa, direccionServicio)
       VALUES (?, ?, ?, ?)`,
      [req.cliente.idCliente, Number(idPlan), nombreEmpresa, direccionServicio]
    );

    res.status(201).json({
      idPoliza: resultado.insertId,
      plan: planes[0].nombre,
      nombreEmpresa,
      direccionServicio,
      estado: 'PENDIENTE',
      fechaInicio: null,
      fechaVencimiento: null,
      maxConsultas: planes[0].maxConsultas,
      maxRemotos: planes[0].maxRemotos,
      maxPresenciales: planes[0].maxPresenciales,
      usadasConsultas: 0,
      usadosRemotos: 0,
      usadosPresenciales: 0
    });
  } catch (error) {
    console.error('Error al solicitar póliza:', error.code);
    res.status(500).json({ mensaje: 'No se pudo solicitar la póliza.' });
  }
});

module.exports = router;
