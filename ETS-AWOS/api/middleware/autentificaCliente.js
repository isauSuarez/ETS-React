const jwt = require('jsonwebtoken');
const claveJwt = require('../config/jwt.local');

function autentificaCliente(req, res, next) {
  res.set('Cache-Control', 'no-store');

  let token;
  try {
    token = jwt.verify(req.cookies.tokenCliente, claveJwt, {
      algorithms: ['HS256']
    });
  } catch {
    return res.status(401).json({ mensaje: 'Inicia sesión como cliente.' });
  }

  if (token.tipo !== 'cliente' || !Number.isInteger(token.idCliente) || token.idCliente < 1) {
    return res.status(401).json({ mensaje: 'Inicia sesión como cliente.' });
  }

  // el cliente sale de la cookie, si lo sacas del body se hacen pasar por otro cawn
  req.cliente = { idCliente: token.idCliente, nombres: token.nombres };
  next();
}

module.exports = autentificaCliente;
