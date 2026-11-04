import { AppError } from './AppError.js';

export function numericId(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || BigInt(value) > 18446744073709551615n) {
    throw new AppError(400, 'INVALID_ID', 'El ID debe ser un entero positivo válido.');
  }
  return String(value);
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(`${value}T00:00:00Z`);
  return year >= 1000 && date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

export function validateBody(schema, body, { partial = false, locked = [] } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AppError(400, 'VALIDATION_ERROR', 'Envía un objeto JSON.');
  const fields = schema.columns.filter((c) => c.editable && !locked.includes(c.name));
  const errors = {};
  const output = {};
  for (const key of Object.keys(body)) {
    if (!fields.some((c) => c.name === key)) errors[key] = 'Campo desconocido o de solo lectura.';
  }
  for (const field of fields) {
    let value = body[field.name];
    const required = !field.nullable && field.default === null;
    if (value === undefined) {
      if (!partial && required) errors[field.name] = 'Este campo es obligatorio.';
      continue;
    }
    if (typeof value === 'string') value = value.trim();
    if (value === '' && field.nullable) value = null;
    if (value === null) {
      if (!field.nullable) errors[field.name] = 'Este campo no puede estar vacío.';
      else output[field.name] = null;
      continue;
    }
    if (typeof value === 'object' || typeof value === 'boolean' || !['string', 'number'].includes(typeof value)) {
      errors[field.name] = 'Valor no válido.'; continue;
    }
    const string = String(value);
    const type = field.dataType ?? field.type.split('(')[0].toLowerCase();
    if (required && string === '') errors[field.name] = 'Este campo es obligatorio.';
    if (field.maxLength && [...string].length > Number(field.maxLength)) errors[field.name] = `Máximo ${field.maxLength} caracteres.`;
    if (field.options && !field.options.includes(string)) errors[field.name] = 'Selecciona una opción válida.';
    if (/^(tinyint|smallint|mediumint|int|bigint|integer)$/.test(type)) {
      if (!/^-?\d+$/.test(string)) errors[field.name] = 'Debe ser un número entero.';
      else {
        const bits = { tinyint: 8n, smallint: 16n, mediumint: 24n, int: 32n, integer: 32n, bigint: 64n }[type];
        const unsigned = /unsigned/i.test(field.type);
        const min = unsigned ? 0n : -(2n ** (bits - 1n));
        const max = unsigned ? 2n ** bits - 1n : 2n ** (bits - 1n) - 1n;
        if (BigInt(string) < min || BigInt(string) > max) errors[field.name] = 'Número fuera del rango permitido.';
      }
    }
    if (/^(decimal|numeric|float|double|real)$/.test(type)) {
      if (!/^-?\d+(?:\.\d+)?$/.test(string) || !Number.isFinite(Number(string))) errors[field.name] = 'Debe ser un número decimal válido.';
      else if (/^(decimal|numeric)$/.test(type)) {
        const [integer, fraction = ''] = string.replace(/^-/, '').split('.');
        if (fraction.length > Number(field.scale) || integer.replace(/^0+/, '').length > Number(field.precision) - Number(field.scale)) errors[field.name] = 'El valor supera la precisión del campo.';
      }
      if (/unsigned/i.test(field.type) && Number(string) < 0) errors[field.name] = 'El valor no puede ser negativo.';
    }
    if (type === 'date' && !validDate(string)) errors[field.name] = 'Fecha no válida.';
    if (['datetime', 'timestamp'].includes(type)) {
      value = string.replace('T', ' ');
      if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?$/.test(value) || !validDate(value.slice(0, 10)) || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value.slice(11))) errors[field.name] = 'Fecha y hora no válidas.';
    }
    if (type === 'time' && !/^-?\d{1,3}:[0-5]\d(?::[0-5]\d)?$/.test(string)) errors[field.name] = 'Horario no válido (HH:MM:SS).';
    if (field.references && /int/.test(type) && !/^[1-9]\d*$/.test(string)) errors[field.name] = 'Selecciona un registro válido.';
    if (/(correo|email)/i.test(field.name) && string && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(string)) errors[field.name] = 'Correo electrónico no válido.';
    output[field.name] = value;
  }
  if (Object.keys(errors).length) throw new AppError(400, 'VALIDATION_ERROR', 'Revisa los campos del formulario.', errors);
  if (!Object.keys(output).length) throw new AppError(400, 'VALIDATION_ERROR', 'Envía al menos un campo editable.');
  return output;
}
