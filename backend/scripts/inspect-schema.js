import { writeFile } from 'node:fs/promises';
import { getPool, closePool } from '../src/config/database.js';
import { createSchemaRepository } from '../src/repositories/schemaRepository.js';

const cell = (value) => String(value ?? 'NULL').replaceAll('|', '\\|').replaceAll('\n', ' ');
try {
  const schemas = await createSchemaRepository(getPool).all();
  let markdown = '# Modelo de datos verificado\n\n';
  markdown += `Inspección de solo lectura: ${new Date().toISOString()}. Base existente; sin migraciones, creación ni cambios de estructura. Este documento contiene estructura, nunca filas de negocio.\n\n`;
  markdown += 'Fuente: SHOW TABLES, DESCRIBE, SHOW CREATE TABLE, SHOW INDEX e INFORMATION_SCHEMA. Los nombres y tipos siguientes proceden de MySQL.\n\n';
  for (const schema of schemas) {
    markdown += `## ${schema.name}\n\n| Atributo | Tipo | Nulo | PK | Predeterminado | FK | Extra |\n| --- | --- | --- | --- | --- | --- | --- |\n`;
    for (const column of schema.columns) {
      markdown += `| ${cell(column.name)} | ${cell(column.type)} | ${column.nullable ? 'Sí' : 'No'} | ${column.primary ? 'Sí' : ''} | ${cell(column.default)} | ${column.references ? `${cell(column.references.table)}.${cell(column.references.column)}` : '—'} | ${cell(column.extra)} |\n`;
    }
    markdown += `\nClaves únicas: ${schema.uniqueKeys.map((keys) => `(${keys.join(', ')})`).join('; ')}.\n\n`;
    markdown += `\`\`\`sql\n${schema.definition}\n\`\`\`\n\n`;
  }
  markdown += '## Relaciones y responsabilidades\n\nLas claves foráneas documentadas arriba son las relaciones verificadas. Las tablas evento_servicio, evento_empleado y evento_proveedor administran asignaciones mediante las FK reales. Las claves primarias pueden ser compuestas; la API utiliza un objeto key para identificarlas sin ambigüedad.\n\nLa especialidad principal del empleado describe su capacidad general. La función asignada dentro de evento_empleado describe el trabajo en esa producción; el formulario incluye únicamente los campos existentes. Los costos, cantidades y horarios se muestran si MySQL los define.\n';
  await writeFile(new URL('../../docs/modelo-datos.md', import.meta.url), markdown, 'utf8');
  console.log(`Esquema verificado: ${schemas.map((schema) => schema.name).join(', ')}. Documento: docs/modelo-datos.md.`);
} catch (error) {
  console.error(error.code === 'DB_NOT_CONFIGURED' ? error.message : 'No se pudo inspeccionar MySQL. Revisa el servicio, los permisos y backend/.env. No se mostraron credenciales ni se modificó la base.');
  process.exitCode = 1;
} finally { await closePool(); }
