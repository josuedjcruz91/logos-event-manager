import { AppError } from '../utils/AppError.js';

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let safe = error instanceof AppError ? error : null;
  if (!safe && error.type === 'entity.parse.failed') safe = new AppError(400, 'INVALID_JSON', 'El cuerpo JSON no es válido.');
  if (!safe && error.type === 'entity.too.large') safe = new AppError(413, 'BODY_TOO_LARGE', 'La solicitud supera el límite permitido.');
  if (!safe && error.code === 'ER_DUP_ENTRY') safe = new AppError(409, 'DUPLICATE', 'Ya existe un registro con ese valor único o una asignación duplicada.');
  if (!safe && error.code === 'ER_ROW_IS_REFERENCED_2') safe = new AppError(409, 'IN_USE', 'No se puede eliminar: existen registros relacionados.');
  if (!safe && error.code === 'ER_NO_REFERENCED_ROW_2') safe = new AppError(400, 'INVALID_REFERENCE', 'El registro relacionado seleccionado no existe.');
  if (!safe && ['ER_BAD_NULL_ERROR', 'ER_DATA_TOO_LONG', 'ER_TRUNCATED_WRONG_VALUE', 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD', 'WARN_DATA_TRUNCATED', 'ER_CHECK_CONSTRAINT_VIOLATED', 'ER_WARN_DATA_OUT_OF_RANGE', 'ER_NO_DEFAULT_FOR_FIELD'].includes(error.code)) safe = new AppError(400, 'INVALID_DATA', 'Los datos no cumplen las restricciones de la tabla.');
  if (!safe && ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'PROTOCOL_CONNECTION_LOST', 'ER_CON_COUNT_ERROR', 'ER_DBACCESS_DENIED_ERROR'].includes(error.code)) safe = new AppError(503, 'DB_UNAVAILABLE', 'MySQL no está disponible. Revisa el servicio y la configuración local.');
  if (!safe && ['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(error.code)) safe = new AppError(409, 'RETRY_OPERATION', 'Otro proceso está modificando estos registros. Intenta nuevamente.');
  safe ??= new AppError(500, 'INTERNAL_ERROR', 'No se pudo completar la operación.');
  // No registrar mensajes SQL, cuerpos ni objetos de conexión: pueden contener datos privados.
  if (safe.status >= 500) console.error(`[API] ${req.method} ${req.path.split('?')[0]} ${safe.code}`);
  res.status(safe.status).json({ error: { code: safe.code, message: safe.message, ...(safe.details ? { details: safe.details } : {}) } });
}
