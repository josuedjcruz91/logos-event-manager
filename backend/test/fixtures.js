// Únicamente fixtures para pruebas aisladas. No describen las siete tablas pendientes de inspección.
export const clientsSchema = {
  name: 'clientes', primaryKeys: ['id_cliente'], foreignKeys: [], uniqueKeys: [['id_cliente'], ['correo']],
  columns: [
    { name: 'id_cliente', type: 'int', dataType: 'int', primary: true, autoIncrement: true, nullable: false, default: null, editable: false },
    { name: 'nombre', type: 'varchar(150)', dataType: 'varchar', nullable: false, default: null, editable: true, maxLength: 150 },
    { name: 'telefono', type: 'varchar(25)', dataType: 'varchar', nullable: false, default: null, editable: true, maxLength: 25 },
    { name: 'correo', type: 'varchar(150)', dataType: 'varchar', nullable: true, default: null, editable: true, maxLength: 150 },
    { name: 'notas', type: 'text', dataType: 'text', nullable: true, default: null, editable: true, maxLength: 65535 },
    { name: 'creado_en', type: 'timestamp', dataType: 'timestamp', nullable: true, default: 'CURRENT_TIMESTAMP', editable: false },
  ],
};
