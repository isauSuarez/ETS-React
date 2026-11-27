var express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { autentificaEmpleado, claveEmpleado } = require('../middleware/autentificaEmpleado');

const opcionesCookie = { httpOnly: true, sameSite: 'lax', path: '/' };

router.post('/iniciosesion', async (req, res) => {
  if (!req.is('application/json')) {
    return res.status(415).json({ mensaje: 'Envía los datos en JSON.' });
  }

  const { correo, password } = req.body ?? {};

  if (typeof correo !== 'string' || typeof password !== 'string' ||
      !correo.trim() || correo.trim().length > 160 ||
      !password || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ mensaje: 'Revisa el correo y la contraseña.' });
  }

  try {
    const [filas] = await db.query(
      'SELECT idEmpleado, nombres, rol, passwordHash FROM empleado WHERE correo = ? AND activo = 1',
      [correo.trim().toLowerCase()]
    );

    const datos = filas[0];

    if (!datos?.passwordHash || !(await bcrypt.compare(password, datos.passwordHash))) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' });
    }

    const empleado = { idEmpleado: datos.idEmpleado, nombres: datos.nombres, rol: datos.rol };
    const token = jwt.sign({ idEmpleado: empleado.idEmpleado, tipo: 'empleado' }, claveEmpleado, {
      algorithm: 'HS256',
      expiresIn: '2h'
    });

    res.cookie('tokenEmpleado', token, { ...opcionesCookie, maxAge: 2 * 60 * 60 * 1000 });
    res.json({ empleado });
  } catch (error) {
    console.error('Error al iniciar sesión del personal:', error.code);
    res.status(500).json({ mensaje: 'No se pudo iniciar sesión.' });
  }
});

router.get('/sesion', autentificaEmpleado, (req, res) => {
  res.json({ empleado: req.empleado });
});

router.post('/cerrarsesion', (req, res) => {
  if (!req.is('application/json')) {
    return res.status(415).json({ mensaje: 'Envía la solicitud en JSON.' });
  }

  res.clearCookie('tokenEmpleado', opcionesCookie);
  res.status(204).end();
});

module.exports = router;
