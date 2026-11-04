# Arquitectura MVC

## Recorrido de una solicitud

1. Una página React presenta datos y un formulario de los campos que entrega `/api/schema`.
2. `services/api.js` envía HTTP JSON a Express. Vite utiliza un proxy local en desarrollo.
3. `routes/api.js` determina el controlador y restringe las entidades permitidas.
4. El controller valida el ID, el objeto JSON y sus campos contra los metadatos reales. Nunca acepta columnas desconocidas ni campos generados.
5. El repository inspecciona primero el esquema existente, construye SQL con identificadores verificados y utiliza placeholders `?` para cada valor.
6. `config/database.js` proporciona un pool `mysql2/promise`. La base almacena los registros y aplica FK, UNIQUE y demás restricciones.
7. El controlador devuelve `{data, meta?}`. El middleware transforma errores en JSON seguro. React actualiza la lista y muestra una notificación de éxito solo después de una respuesta satisfactoria.

## Responsabilidades

| Capa | Ubicación | Función |
| --- | --- | --- |
| Modelo / datos | `backend/src/repositories/` | Inspección, consultas SQL, persistencia, conteos y transacciones |
| Vista | `frontend/src/` | Dashboard, navegación, formularios, tablas, detalle y confirmaciones |
| Controlador | `backend/src/controllers/` | Entrada HTTP, validación, códigos de respuesta |
| Rutas | `backend/src/routes/` | Definición REST y entidades permitidas |
| Infraestructura | `config/`, `middlewares/`, `utils/` | Pool, entorno, errores y validaciones compartidas |

Los repositories cumplen el papel de Modelo. No hay ORM ni una carpeta `models` con definiciones que creen tablas. La inspección devuelve descripciones del esquema, nunca cambios a este.

## Esquema verificado y formularios

Solo se permiten las cinco entidades y las tres tablas intermedias solicitadas. Antes de cualquier consulta de negocio se consulta la estructura real. Los metadatos se guardan en memoria durante la ejecución; una falla de inspección no se guarda. Las PK, FK, tipos, longitudes, ENUM, precisión decimal y valores predeterminados proceden de MySQL. Los identificadores se validan y delimitan; nunca se interpolan identificadores enviados directamente por el usuario.

La implementación compartida de CRUD evita duplicar SQL y mantiene las cinco entidades separadas mediante rutas, metadatos y tablas específicas. Las entidades principales requieren una PK simple. Las asignaciones admiten PK compuesta y requieren una FK inequívoca hacia eventos y otra hacia el recurso correspondiente. Un esquema distinto produce un error explícito en lugar de una relación supuesta.

Los formularios excluyen campos autogenerados y de auditoría automáticos. Los campos FK se seleccionan desde registros reales del catálogo. Los campos de costo, clasificación, especialidad, función, cantidades y horarios aparecen únicamente si existen en la tabla inspeccionada.

## Integridad de asignaciones

Cada creación o edición de una asignación obtiene una conexión del pool, abre una transacción y bloquea el evento con `SELECT ... FOR UPDATE`. La creación comprueba duplicados para ese evento y recurso. MySQL mantiene las restricciones reales. Un error hace rollback y la conexión siempre se libera. Las ediciones y eliminaciones incluyen la clave de la asignación y la FK del evento, evitando modificar una asignación de otro evento.

La especialidad general de un empleado permanece en `empleados`. Su función particular se guarda en el campo real disponible en `evento_empleado`. No se copia ni se sobrescribe la especialidad para asignar una función.

Las eliminaciones de entidades respetan las reglas FK de MySQL, incluido CASCADE si está definido en el esquema original. La aplicación no elimina relaciones manualmente para forzar una baja. La interfaz advierte sobre estas reglas antes de confirmar.

## Límites deliberados

Sin login ni roles. Pool con diez conexiones, cola limitada, solicitudes JSON limitadas y CORS de desarrollo. API y Vite escuchan en loopback. No se registran cuerpos, errores SQL completos ni credenciales. El dashboard hace conteos sobre tablas existentes; no incorpora tablas auxiliares ni estadísticas inventadas.
