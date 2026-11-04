import { ENTITIES } from '../config/entities.js';
import { quote } from './schemaRepository.js';

export function createDashboardRepository(db, schemas) {
  return {
    async summary() {
      const counts = Object.fromEntries(await Promise.all(ENTITIES.map(async (name) => {
        await schemas.table(name);
        const [[row]] = await db().query(`SELECT COUNT(*) AS total FROM ${quote(name)}`);
        return [name, Number(row.total)];
      })));
      const events = await schemas.table('eventos');
      const candidates = events.columns.filter((c) => ['date', 'datetime', 'timestamp'].includes(c.dataType) && c.editable);
      const dateColumn = candidates.find((c) => /fecha.*(evento|inicio)|^(fecha|inicio)$/.test(c.name)) ?? (candidates.length === 1 ? candidates[0] : null);
      let upcoming = [];
      if (dateColumn) {
        // Fecha empresarial de Costa Rica, independiente del huso del servidor.
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        [upcoming] = await db().execute(`SELECT * FROM ${quote('eventos')} WHERE ${quote(dateColumn.name)} >= ? ORDER BY ${quote(dateColumn.name)} ASC LIMIT 6`, [today]);
      }
      return { counts, upcoming, dateColumn: dateColumn?.name ?? null };
    },
  };
}
