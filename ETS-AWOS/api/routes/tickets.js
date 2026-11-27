var express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const autentificaCliente = require('../middleware/autentificaCliente');
const { cargarImagen, leerImagen, borrarTemporal } = require('../libs/almacenTickets');

const cupos = { CONSULTA: 'maxConsultas', REMOTO: 'maxRemotos', PRESENCIAL: 'maxPresenciales' };

router.use(autentificaCliente);
router.param('idTicket', (req, res, next, idTicket) => {
  if (!/^\d+$/.test(idTicket) || Number(idTicket) < 1 || Number(idTicket) > 4294967295) {
    return res.status(400).json({ mensaje: 'El folio del ticket no es válido.' });
  }
  next();
});

router.get('/', async (req, res) => {
  try {
    const [tickets] = await db.query(
      `SELECT t.idTicket, t.idPoliza, p.nombreEmpresa, t.asunto, t.modalidad, t.estado,
              DATE_FORMAT(t.fechaCreacion, '%Y-%m-%d %H:%i') AS fechaCreacion
       FROM ticket AS t
       INNER JOIN poliza AS p ON p.idPoliza = t.idPoliza
       WHERE p.idCliente = ?
       ORDER BY t.idTicket DESC`,
      [req.cliente.idCliente]
    );
    res.json(tickets);
  } catch (error) {
    console.error('Error al consultar tickets:', error.code);
    res.status(500).json({ mensaje: 'No se pudieron cargar tus tickets.' });
  }
});

router.get('/:idTicket', async (req, res) => {
  try {
    const [tickets] = await db.query(
      `SELECT t.idTicket, t.idPoliza, p.nombreEmpresa, t.asunto, t.descripcion,
              t.modalidad, t.estado, t.imagenAdjunta,
              DATE_FORMAT(t.fechaCreacion, '%Y-%m-%d %H:%i') AS fechaCreacion,
              DATE_FORMAT(t.fechaCierre, '%Y-%m-%d %H:%i') AS fechaCierre
       FROM ticket AS t
       INNER JOIN poliza AS p ON p.idPoliza = t.idPoliza
       WHERE t.idTicket = ? AND p.idCliente = ?`,
      [req.params.idTicket, req.cliente.idCliente]
    );
    if (!tickets[0]) return res.status(404).json({ mensaje: 'Ticket no encontrado.' });

    const [historial] = await db.query(
      `SELECT h.accion, h.comentario,
              CONCAT_WS(' ', e.nombres, e.apellidos) AS tecnico,
              DATE_FORMAT(h.fechaMovimiento, '%Y-%m-%d %H:%i') AS fechaMovimiento
       FROM ticket_historial AS h
       LEFT JOIN empleado AS e ON e.idEmpleado = h.idTecnicoRelacionado
       WHERE h.idTicket = ?
         AND h.accion IN ('CREADO', 'ENVIADO_A_APROBACION', 'APROBADO', 'NO_SOLUCIONADO', 'CANCELADO')
       ORDER BY h.idMovimiento DESC`,
      [req.params.idTicket]
    );
    res.json({ ...tickets[0], historial });
  } catch (error) {
    console.error('Error al consultar ticket:', error.code);
    res.status(500).json({ mensaje: 'No se pudo cargar el ticket.' });
  }
});

router.get('/:idTicket/imagen', async (req, res) => {
  try {
    const [imagenes] = await db.query(
      `SELECT i.tipoMime, i.contenido
       FROM ticket_imagen AS i
       INNER JOIN ticket AS t ON t.idTicket = i.idTicket
       INNER JOIN poliza AS p ON p.idPoliza = t.idPoliza
       WHERE t.idTicket = ? AND p.idCliente = ?`,
      [req.params.idTicket, req.cliente.idCliente]
    );
    if (!imagenes[0]) return res.status(404).json({ mensaje: 'Imagen no encontrada.' });

    res.set('X-Content-Type-Options', 'nosniff');
    res.type(imagenes[0].tipoMime).send(imagenes[0].contenido);
  } catch (error) {
    console.error('Error al consultar la imagen:', error.code);
    res.status(500).json({ mensaje: 'No se pudo cargar la imagen.' });
  }
});

router.post('/', cargarImagen, [
  body('idPoliza', 'Selecciona una póliza válida.').isInt({ min: 1, max: 4294967295 }),
  body('modalidad', 'Selecciona una modalidad válida.').isString().bail().isIn(Object.keys(cupos)),
  body('asunto', 'Escribe un asunto de hasta 120 caracteres.')
    .isString().bail().trim().isLength({ min: 1, max: 120 }),
  body('descripcion', 'Describe el problema en hasta 2000 caracteres.')
    .isString().bail().trim().isLength({ min: 1, max: 2000 })
], async (req, res) => {
  let conexion;
  try {
    const errores = validationResult(req);
    if (!errores.isEmpty()) return res.status(400).json({ mensaje: errores.array()[0].msg });

    const imagen = req.file ? await leerImagen(req.file) : null;
    if (req.file && !imagen) {
      return res.status(415).json({ mensaje: 'Adjunta una imagen JPG, PNG o WEBP.' });
    }

    const { idPoliza, modalidad, asunto, descripcion } = req.body;
    const { idCliente } = req.cliente;

    conexion = await db.getConnection();
    await conexion.beginTransaction();

    // amarra la poliza antes de contar, asi dos tickets no se chingan el ultimo cupo cawn
    const [polizas] = await conexion.query(
      `SELECT idPlan, estado,
              DATE_FORMAT(fechaInicio, '%Y-%m-%d') AS fechaInicio,
              DATE_FORMAT(fechaVencimiento, '%Y-%m-%d') AS fechaVencimiento
       FROM poliza WHERE idPoliza = ? AND idCliente = ? FOR UPDATE`,
      [idPoliza, idCliente]
    );
    const poliza = polizas[0];
    if (!poliza) return res.status(404).json({ mensaje: 'Póliza no encontrada.' });
    if (poliza.estado !== 'ACTIVA') {
      return res.status(409).json({ mensaje: 'El ticket necesita una póliza activa.' });
    }

    const [planes] = await conexion.query(
      `SELECT maxConsultas, maxRemotos, maxPresenciales,
              DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s') AS fechaCreacion,
              (SELECT COUNT(*) FROM ticket
               WHERE idPoliza = ? AND modalidad = ? AND estado <> 'CANCELADO'
                 AND fechaCreacion >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
                 AND fechaCreacion < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
              ) AS usados
       FROM plan WHERE idPlan = ?`,
      [idPoliza, modalidad, poliza.idPlan]
    );
    const plan = planes[0];
    const hoy = plan.fechaCreacion.slice(0, 10);
    if (!poliza.fechaInicio || !poliza.fechaVencimiento ||
        hoy < poliza.fechaInicio || hoy >= poliza.fechaVencimiento) {
      return res.status(409).json({ mensaje: 'La póliza está fuera de vigencia.' });
    }
    if (Number(plan.usados) >= plan[cupos[modalidad]]) {
      return res.status(409).json({ mensaje: 'Ya agotaste los eventos de esta modalidad para el mes.' });
    }

    const [resultado] = await conexion.query(
      `INSERT INTO ticket (idPoliza, asunto, descripcion, modalidad, fechaCreacion)
       VALUES (?, ?, ?, ?, ?)`,
      [idPoliza, asunto, descripcion, modalidad, plan.fechaCreacion]
    );
    const idTicket = resultado.insertId;
    await conexion.query(
      "INSERT INTO ticket_historial (idTicket, idClienteAutor, accion) VALUES (?, ?, 'CREADO')",
      [idTicket, idCliente]
    );

    if (imagen) {
      // deja el archivo en la bd para que se vea desde la api de cualquier compa cawn
      await conexion.query(
        'INSERT INTO ticket_imagen (idTicket, tipoMime, contenido) VALUES (?, ?, ?)',
        [idTicket, imagen.tipoMime, imagen.contenido]
      );
      await conexion.query('UPDATE ticket SET imagenAdjunta = ? WHERE idTicket = ?',
        ['ticket-' + idTicket, idTicket]);
    }

    await conexion.commit();
    res.status(201).json({ idTicket, mensaje: 'Ticket creado correctamente.' });
  } catch (error) {
    console.error('Error al crear ticket:', error.code);
    res.status(500).json({ mensaje: 'No se pudo crear el ticket.' });
  } finally {
    await liberarConexion(conexion);
    await borrarTemporal(req.file).catch((error) => console.error('Error al borrar archivo temporal:', error.code));
  }
});

router.patch('/:idTicket', [
  body('accion', 'Selecciona una respuesta válida.')
    .isString().bail().isIn(['SOLUCIONADO', 'NO_SOLUCIONADO', 'CANCELAR']),
  body('comentario', 'Escribe un comentario de hasta 500 caracteres.')
    .optional().isString().bail().trim().isLength({ max: 500 })
], async (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ mensaje: 'Envía los datos en JSON.' });

  const errores = validationResult(req);
  if (!errores.isEmpty()) return res.status(400).json({ mensaje: errores.array()[0].msg });

  const { accion, comentario } = req.body;
  const { idTicket } = req.params;
  const { idCliente } = req.cliente;
  let conexion;

  try {
    conexion = await db.getConnection();
    await conexion.beginTransaction();

    const [tickets] = await conexion.query(
      `SELECT t.estado, t.idTecnicoAsignado
       FROM ticket AS t
       INNER JOIN poliza AS p ON p.idPoliza = t.idPoliza
       WHERE t.idTicket = ? AND p.idCliente = ? FOR UPDATE`,
      [idTicket, idCliente]
    );
    const ticket = tickets[0];
    if (!ticket) return res.status(404).json({ mensaje: 'Ticket no encontrado.' });

    const estadoRequerido = accion === 'CANCELAR' ? 'SIN_ASIGNAR' : 'PENDIENTE_APROBACION';
    if (ticket.estado !== estadoRequerido) {
      return res.status(409).json({ mensaje: 'El estado del ticket ya cambió. Actualiza el detalle.' });
    }

    const cambios = {
      SOLUCIONADO: { estado: 'CERRADO', historial: 'APROBADO', mensaje: 'Ticket cerrado.' },
      NO_SOLUCIONADO: { estado: 'SIN_ASIGNAR', historial: 'NO_SOLUCIONADO', mensaje: 'El ticket volvió a la bandeja del dispatcher.' },
      CANCELAR: { estado: 'CANCELADO', historial: 'CANCELADO', mensaje: 'Ticket cancelado.' }
    };
    const cambio = cambios[accion];

    // conserva el tecnico en el historial aunque ya lo quitemos del ticket cawn
    await conexion.query(
      `INSERT INTO ticket_historial
         (idTicket, idClienteAutor, idTecnicoRelacionado, accion, comentario)
       VALUES (?, ?, ?, ?, ?)`,
      [idTicket, idCliente, ticket.idTecnicoAsignado, cambio.historial, comentario || null]
    );
    await conexion.query(
      `UPDATE ticket
       SET estado = ?, fechaCierre = IF(? = 'CERRADO', NOW(), NULL),
           idTecnicoAsignado = IF(? = 'SIN_ASIGNAR', NULL, idTecnicoAsignado)
       WHERE idTicket = ?`,
      [cambio.estado, cambio.estado, cambio.estado, idTicket]
    );

    await conexion.commit();
    res.json({ estado: cambio.estado, mensaje: cambio.mensaje });
  } catch (error) {
    console.error('Error al actualizar ticket:', error.code);
    res.status(500).json({ mensaje: 'No se pudo actualizar el ticket.' });
  } finally {
    await liberarConexion(conexion);
  }
});

async function liberarConexion(conexion) {
  if (!conexion) return;
  try {
    await conexion.rollback();
    conexion.release();
  } catch (error) {
    conexion.destroy();
    console.error('Error al liberar la conexión:', error.code);
  }
}

module.exports = router;
