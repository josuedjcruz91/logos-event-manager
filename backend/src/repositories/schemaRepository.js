import { TABLES } from '../config/entities.js';
import { AppError } from '../utils/AppError.js';

// Identificadores únicamente del catálogo verificado; valores siempre parametrizados.
export function quote(identifier) {
  if (typeof identifier !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new AppError(503, 'UNSUPPORTED_SCHEMA', 'El esquema contiene un identificador no compatible.');
  }
  return `\`${identifier}\``;
}

export function createSchemaRepository(db) {
  const cache = new Map();
  async function table(name) {
    if (!TABLES.includes(name)) throw new AppError(404, 'NOT_FOUND', 'Entidad no encontrada.');
    if (cache.has(name)) return cache.get(name);
    const [tables] = await db().query('SHOW TABLES');
    if (!tables.some((row) => Object.values(row).includes(name))) {
      throw new AppError(503, 'SCHEMA_MISSING', `No existe la tabla requerida: ${name}. No se creará automáticamente.`);
    }
    const [description] = await db().query(`DESCRIBE ${quote(name)}`);
    const [definition] = await db().query(`SHOW CREATE TABLE ${quote(name)}`);
    const [attributes] = await db().execute(
      'SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION', [name]);
    const [foreignKeys] = await db().execute(
      'SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME, CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL', [name]);
    const [indexes] = await db().query(`SHOW INDEX FROM ${quote(name)}`);
    const columns = description.map((item) => {
      quote(item.Field);
      const attribute = attributes.find((a) => a.COLUMN_NAME === item.Field);
      const foreign = foreignKeys.find((f) => f.COLUMN_NAME === item.Field);
      const generated = /auto_increment|(?:virtual|stored) generated/i.test(item.Extra);
      const automaticDate = /^(timestamp|datetime)/i.test(item.Type) && /current_timestamp/i.test(String(item.Default));
      return {
        name: item.Field, type: item.Type, dataType: attribute?.DATA_TYPE,
        nullable: item.Null === 'YES', primary: item.Key === 'PRI',
        autoIncrement: /auto_increment/i.test(item.Extra), default: item.Default,
        extra: item.Extra, editable: !generated && !automaticDate,
        maxLength: attribute?.CHARACTER_MAXIMUM_LENGTH,
        precision: attribute?.NUMERIC_PRECISION, scale: attribute?.NUMERIC_SCALE,
        options: /^enum\(/i.test(item.Type) ? [...item.Type.matchAll(/'((?:[^'\\]|\\.|'')*)'/g)].map((m) => m[1].replace(/''/g, "'").replace(/\\(.)/g, '$1')) : null,
        references: foreign ? { table: foreign.REFERENCED_TABLE_NAME, column: foreign.REFERENCED_COLUMN_NAME } : null,
      };
    });
    const result = {
      name, columns, primaryKeys: columns.filter((c) => c.primary).map((c) => c.name),
      foreignKeys: foreignKeys.map((f) => ({ column: f.COLUMN_NAME, table: f.REFERENCED_TABLE_NAME, target: f.REFERENCED_COLUMN_NAME })),
      uniqueKeys: Object.values(indexes.filter((i) => i.Non_unique === 0).reduce((acc, i) => {
        (acc[i.Key_name] ??= []).push({ column: i.Column_name, order: i.Seq_in_index }); return acc;
      }, {})).map((key) => key.sort((a, b) => a.order - b.order).map((i) => i.column)),
      definition: definition[0]['Create Table'],
    };
    if (result.primaryKeys.length === 0) throw new AppError(503, 'UNSUPPORTED_SCHEMA', `La tabla ${name} no tiene clave primaria; se bloquean escrituras inseguras.`);
    cache.set(name, result);
    return result;
  }
  return { table, all: () => Promise.all(TABLES.map(table)), clear: () => cache.clear() };
}
