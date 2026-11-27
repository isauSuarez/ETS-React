const multer = require('multer');
const fs = require('fs-extra');
const os = require('node:os');

const maxImagen = 3 * 1024 * 1024;
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: maxImagen, fields: 5, files: 1, parts: 7, fieldSize: 8192 }
}).single('imagen');

function cargarImagen(req, res, next) {
  if (req.is('application/json')) return next();
  if (!req.is('multipart/form-data') || req.get('X-ETS-Portal') !== 'cliente') {
    return res.status(415).json({ mensaje: 'Envía el ticket en el formato del portal.' });
  }

  upload(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ mensaje: 'La imagen debe pesar hasta 3 MB.' });
    }
    res.status(400).json({ mensaje: 'Solo puedes adjuntar una imagen por ticket.' });
  });
}

async function leerImagen(archivo) {
  const contenido = await fs.readFile(archivo.path);
  let tipoMime;

  // checa los primeros bytes, la extension del archivo se puede inventar cawn
  if (contenido.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    tipoMime = 'image/jpeg';
  } else if (contenido.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
    tipoMime = 'image/png';
  } else if (contenido.toString('ascii', 0, 4) === 'RIFF' &&
             contenido.toString('ascii', 8, 12) === 'WEBP') {
    tipoMime = 'image/webp';
  }

  return tipoMime ? { tipoMime, contenido } : null;
}

async function borrarTemporal(archivo) {
  if (archivo) await fs.remove(archivo.path);
}

module.exports = { cargarImagen, leerImagen, borrarTemporal };
