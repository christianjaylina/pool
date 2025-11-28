// src/config/db.js
const mysql = require('mysql2');
require('dotenv').config();

// Create the connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Moriarty24150', // **REMEMBER TO CHANGE THIS**
    database: process.env.DB_NAME || 'pool_reservation_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Export the pool promise wrapper for use in controllers/routes
module.exports = pool.promise();