var express = require('express');
const router = express.Router();
const { param, validationResult } = require('express-validator');
const db = require('../database/db');
const { autentificaEmpleado } = require('../middleware/autentificaEmpleado');

router.use(autentificaEmpleado);
router.use((req, res, next) => {
  if (req.empleado.rol !== 'JEFE') {
    return res.status(403).json({ mensaje: 'Solo el jefe puede administrar pólizas.' });
  }

  next();
});

router.get('/', async (req, res) => {
  try {
    const [polizas] = await db.query(
      `SELECT p.idPoliza, pl.nombre AS plan, c.correo AS correoCliente,
              p.nombreEmpresa, p.direccionServicio,
              CASE WHEN p.estado = 'ACTIVA' AND p.fechaVencimiento <= CURDATE()
                   THEN 'VENCIDA' ELSE p.estado END AS estado,
              DATE_FORMAT(p.fechaSolicitud, '%Y-%m-%d') AS fechaSolicitud,
              DATE_FORMAT(p.fechaVencimiento, '%Y-%m-%d') AS fechaVencimiento
       FROM poliza AS p
       INNER JOIN plan AS pl ON pl.idPlan = p.idPlan
       INNER JOIN cliente AS c ON c.idCliente = p.idCliente
       ORDER BY (p.estado = 'PENDIENTE') DESC, p.fechaSolicitud DESC, p.idPoliza DESC`
    );

    res.json(polizas);
  } catch (error) {
    console.error('Error al cargar pólizas del personal:', error.code);
    res.status(500).json({ mensaje: 'No se pudieron cargar las pólizas.' });
  }
});

const validarId = param('idPoliza', 'El folio de la póliza no es válido.')
  .isInt({ min: 1, max: 4294967295 });

router.patch('/:idPoliza/activar', validarId, async (req, res) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ mensaje: errores.array()[0].msg });
  }

  try {
    // solo agarra pendientes, asi dos clics no arrancan el año otra vez cawn
    const [resultado] = await db.query(
      `UPDATE poliza
       SET estado = 'ACTIVA', fechaInicio = CURDATE(),
           fechaVencimiento = DATE_ADD(CURDATE(), INTERVAL 1 YEAR), idEmpleadoActiva = ?
       WHERE idPoliza = ? AND estado = 'PENDIENTE'`,
      [req.empleado.idEmpleado, Number(req.params.idPoliza)]
    );

    if (resultado.affectedRows === 0) {
      return res.status(409).json({ mensaje: 'La póliza ya no está pendiente o no existe.' });
    }

    res.json({ mensaje: 'Póliza activada.' });
  } catch (error) {
    console.error('Error al activar póliza:', error.code);
    res.status(500).json({ mensaje: 'No se pudo activar la póliza.' });
  }
});

router.patch('/:idPoliza/cancelar', validarId, async (req, res) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ mensaje: errores.array()[0].msg });
  }

  try {
    const [resultado] = await db.query(
      `UPDATE poliza
       SET estado = 'CANCELADA', fechaCancelacion = NOW(), idEmpleadoCancela = ?
       WHERE idPoliza = ? AND estado = 'ACTIVA' AND fechaVencimiento > CURDATE()`,
      [req.empleado.idEmpleado, Number(req.params.idPoliza)]
    );

    if (resultado.affectedRows === 0) {
      return res.status(409).json({ mensaje: 'La póliza ya no está activa o no existe.' });
    }

    res.json({ mensaje: 'Póliza cancelada.' });
  } catch (error) {
    console.error('Error al cancelar póliza:', error.code);
    res.status(500).json({ mensaje: 'No se pudo cancelar la póliza.' });
  }
});

module.exports = router;
