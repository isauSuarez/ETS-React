var express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const db = require('../database/db');
const jwt = require('jsonwebtoken');
const claveJwt = require('../config/jwt.local');

//Este es el endpoint del retgistro de clientes, con validaciones y hash de contraseña cawn
router.post('/registro', [
  body('nombres', 'Escribe un nombre de hasta 80 caracteres.')
    .isString().bail().trim().isLength({ min: 1, max: 80 }),
  body('apellidos', 'Escribe apellidos de hasta 100 caracteres.')
    .isString().bail().trim().isLength({ min: 1, max: 100 }),
  body('correo', 'Escribe un correo válido de hasta 160 caracteres.')
    .isString().bail().trim().isLength({ max: 160 }).bail().isEmail(),
  body('telefono', 'Escribe un teléfono de 7 a 20 caracteres.')
    .isString().bail().trim().isLength({ min: 7, max: 20 }),
  body('password', 'La contraseña debe tener al menos 8 caracteres.')
    .isString().bail().isLength({ min: 8 }).bail()
    .custom((password) => Buffer.byteLength(password, 'utf8') <= 72)
    .withMessage('La contraseña es demasiado larga.'),
    // la validacion de la contraseña es porque si es muy larga, bcrypt no la puede hashear y se rompe todo cawn

], async (req, res) => {
  const errores = validationResult(req);

  if (!errores.isEmpty()) {
    return res.status(400).json({ mensaje: errores.array()[0].msg });
  }

  const { nombres, apellidos, correo, telefono, password } = req.body;

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    // este es el cuero del sqlazo, que inserta el cliente en la base de datos cawn
    const [resultado] = await db.query(
      `INSERT INTO cliente (nombres, apellidos, correo, telefono, passwordHash)
       VALUES (?, ?, ?, ?, ?)`,
      [nombres, apellidos, correo.toLowerCase(), telefono, passwordHash]
    );

    res.status(201).json({
      mensaje: 'Cuenta creada correctamente.',
      idCliente: resultado.insertId
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'Ese correo ya está registrado.' });
    }
    // este dup entry es para que no se pueda registrar dos veces el mismo correo cawn
    //alrato se checa que pedo con el registro via google account cawn

    console.error('Error al registrar cliente:', error.code);
    res.status(500).json({ mensaje: 'No se pudo crear la cuenta.' });
  }
});

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
      'SELECT idCliente, nombres, passwordHash FROM cliente WHERE correo = ?',
      [correo.trim().toLowerCase()]
    );

    const cliente = filas[0];

    if (!cliente?.passwordHash || !(await bcrypt.compare(password, cliente.passwordHash))) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' });
    }

    const perfil = { idCliente: cliente.idCliente, nombres: cliente.nombres };
    const token = jwt.sign({ ...perfil, tipo: 'cliente' }, claveJwt, {
      algorithm: 'HS256',
      expiresIn: '2h'
    });

    res.cookie('tokenCliente', token, {
      ...opcionesCookie,
      maxAge: 2 * 60 * 60 * 1000
    });

    res.json({ cliente: perfil });
  } catch (error) {
    console.error('Error al iniciar sesión:', error.code);
    res.status(500).json({ mensaje: 'No se pudo iniciar sesión.' });
  }
});

router.get('/sesion', (req, res) => {
  res.set('Cache-Control', 'no-store');

  try {
    const token = jwt.verify(req.cookies.tokenCliente, claveJwt, {
      algorithms: ['HS256']
    });

    if (token.tipo !== 'cliente') {
      return res.status(401).json({ mensaje: 'Inicia sesión como cliente.' });
    }

    res.json({
      cliente: { idCliente: token.idCliente, nombres: token.nombres }
    });
  } catch {
    res.status(401).json({ mensaje: 'Inicia sesión como cliente.' });
  }
});

router.post('/cerrarsesion', (req, res) => {
  if (!req.is('application/json')) {
    return res.status(415).json({ mensaje: 'Envía la solicitud en JSON.' });
  }

  res.clearCookie('tokenCliente', opcionesCookie);
  res.status(204).end();
});

module.exports = router;