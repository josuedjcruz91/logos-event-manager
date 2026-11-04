import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'node:url';
import { AppError } from '../utils/AppError.js';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
let pool;

export function getPool() {
  if (pool) return pool;
  const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  if (required.some((key) => process.env[key] === undefined || (key !== 'DB_PASSWORD' && !process.env[key])) || process.env.DB_PASSWORD === 'REEMPLAZAR_LOCALMENTE') {
    throw new AppError(503, 'DB_NOT_CONFIGURED', 'Configura backend/.env con los datos de MySQL. La contraseña debe definirse explícitamente.');
  }
  const port = Number(process.env.DB_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new AppError(503, 'DB_NOT_CONFIGURED', 'DB_PORT debe ser un puerto válido.');
  pool = mysql.createPool({
    host: process.env.DB_HOST, port, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    waitForConnections: true, connectionLimit: 10, queueLimit: 100,
    connectTimeout: 5000, dateStrings: true, supportBigNumbers: true,
    bigNumberStrings: true, multipleStatements: false, charset: 'utf8mb4',
  });
  return pool;
}

export async function closePool() {
  if (pool) await pool.end();
  pool = undefined;
}
