export const entities = ['clientes', 'eventos', 'servicios', 'empleados', 'proveedores'];
export const singular = { clientes: 'cliente', eventos: 'evento', servicios: 'servicio', empleados: 'empleado', proveedores: 'proveedor' };
const labels = {
  id_cliente: 'Cliente', id_evento: 'Evento', id_servicio: 'Servicio', id_empleado: 'Empleado', id_proveedor: 'Proveedor',
  correo: 'Correo electrónico', telefono: 'Teléfono', descripcion: 'Descripción',
  especialidad_principal: 'Especialidad principal', funcion_asignada: 'Función asignada',
  creado_en: 'Fecha de registro', actualizado_en: 'Última actualización',
};
export function label(value) { return labels[value] || value.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase()); }
export function recordName(row, schema) {
  if (!row) return 'Registro';
  const name = Object.keys(row).find((key) => /^(nombre|titulo|nombre_evento|nombre_servicio|razon_social)$/.test(key));
  return name ? String(row[name]) : `${label(schema?.name || 'Registro')} #${row[schema?.primaryKeys?.[0]] ?? ''}`;
}
export function display(value, field) {
  if (value === null || value === undefined || value === '') return '—';
  if (field?.dataType === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return new Intl.DateTimeFormat('es-CR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
  }
  return String(value);
}
