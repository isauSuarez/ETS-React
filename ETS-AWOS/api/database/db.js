const mysql = require('mysql2/promise');

// la base de todos esta con el isau, entra por tailscale cawn
const pool = mysql.createPool({
  host: '100.110.225.71',
  user: 'root',
  password: '',
  database: 'soporte_modular_2026',
  port: 3306
});

module.exports = pool;
