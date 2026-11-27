const { randomBytes } = require('node:crypto');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

// la sesion del personal tiene su propia clave y se vence si reinicias el server cawn
const claveEmpleado = randomBytes(32);

async function autentificaEmpleado(req, res, next) {
  res.set('Cache-Control', 'no-store');

  let token;
  try {
    token = jwt.verify(req.cookies.tokenEmpleado, claveEmpleado, {
      algorithms: ['HS256']
    });
  } catch {
    return res.status(401).json({ mensaje: 'Inicia sesión como parte del personal.' });
  }

  if (token.tipo !== 'empleado' || !Number.isInteger(token.idEmpleado) || token.idEmpleado < 1) {
    return res.status(401).json({ mensaje: 'Inicia sesión como parte del personal.' });
  }

  try {
    // checa el rol actual por si al compa lo cambiaron o dieron de baja cawn
    const [filas] = await db.query(
      'SELECT idEmpleado, nombres, rol FROM empleado WHERE idEmpleado = ? AND activo = 1',
      [token.idEmpleado]
    );

    if (!filas[0]) {
      return res.status(401).json({ mensaje: 'Tu cuenta de personal ya no está activa.' });
    }

    req.empleado = filas[0];
    next();
  } catch (error) {
    console.error('Error al consultar sesión del personal:', error.code);
    res.status(500).json({ mensaje: 'No se pudo consultar la sesión.' });
  }
}

module.exports = { autentificaEmpleado, claveEmpleado };
