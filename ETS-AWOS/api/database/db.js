const mysql = require('mysql2/promise');

//Aqui va la base de datos cawn, al rato la cambiamos al vpn cawn
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'soporte_modular_2026',
  port: 3306
});

module.exports = pool;