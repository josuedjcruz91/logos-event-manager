export const ENTITIES = ['clientes', 'servicios', 'eventos', 'empleados', 'proveedores'];
export const RELATIONS = {
  servicios: 'evento_servicio', empleados: 'evento_empleado', proveedores: 'evento_proveedor',
};
export const TABLES = [...ENTITIES, ...Object.values(RELATIONS)];
