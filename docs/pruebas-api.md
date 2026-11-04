# Pruebas de API

Base local: `http://127.0.0.1:3000/api`.

## Verificación automatizada

Desde `backend`, ejecuta `npm test` y `npm run check`. Desde `frontend`, ejecuta `npm run build`. Los tests HTTP levantan Express en un puerto efímero y utilizan repositorios aislados en memoria; no consultan ni alteran MySQL. Los fixtures de relaciones tienen nombres deliberadamente ficticios y no constituyen un esquema de producción.

La suite cubre el ciclo CRUD HTTP de clientes, validación de campos/IDs/longitudes/correo, errores 400/404/409/503, CORS, parametrización, protección de mensajes privados, bloqueo del evento, rollback, liberación de conexiones, duplicados y claves compuestas de asignaciones. La prueba de health comprueba que el código ejecuta `SELECT 1`; su dependencia aislada no demuestra conectividad con el servidor real.

## Conectividad y esquema: solo lectura

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/health
Invoke-RestMethod http://127.0.0.1:3000/api/schema
Invoke-RestMethod http://127.0.0.1:3000/api/clientes
```

Health con MySQL conectado:

```json
{ "data": { "status": "ok", "database": "connected" } }
```

Health sin configuración: HTTP 503, código `DB_NOT_CONFIGURED`. Servicio inaccesible o credenciales rechazadas: HTTP 503, código `DB_UNAVAILABLE`. No contiene la contraseña ni el mensaje SQL original.

`GET /clientes?limit=20&offset=0` devuelve:

```json
{ "data": [], "meta": { "total": 0, "limit": 20, "offset": 0 } }
```

Este es un ejemplo de base vacía; no constituye un resultado ejecutado.

## CRUD de clientes: pruebas manuales con registros nuevos

No utilizar IDs de personas reales. Crea exclusivamente registros identificables para la prueba. No modifiques registros existentes sin autorización del propietario. Para ejecutar solicitudes usa Postman o `Invoke-RestMethod` con `ContentType application/json`.

POST `/clientes` — esperado 201:

```json
{
  "nombre": "PRUEBA_LOGOS_CLIENTE",
  "telefono": "8888-0000",
  "correo": "prueba.logos@example.test",
  "notas": "Registro ficticio de prueba; no corresponde a una persona real."
}
```

Guarda el `id_cliente` de la respuesta. GET `/clientes/:id` — esperado 200.

PUT `/clientes/:id` — esperado 200:

```json
{
  "nombre": "PRUEBA_LOGOS_CLIENTE_EDITADO",
  "telefono": "8888-0001",
  "correo": "prueba.logos@example.test",
  "notas": "Actualización del registro ficticio recién creado."
}
```

Repetir un correo ya registrado — esperado 409. `POST {}` o correo inválido — esperado 400. ID `abc` — esperado 400. Un ID válido inexistente — esperado 404.

DELETE `/clientes/:id` — esperado 200 si no tiene referencias restrictivas. Si tiene relaciones que impiden la baja — esperado 409. No se elimina información relacionada manualmente para forzar la prueba. Si la FK define CASCADE se aplicará esa regla original; revisa `/schema` y `docs/modelo-datos.md` antes de pruebas destructivas.

## Otros CRUD

Las mismas cinco rutas existen para `/servicios`, `/eventos`, `/empleados` y `/proveedores`. Primero lee `/schema`, selecciona la tabla y utiliza exclusivamente `columns` con `editable: true`. Envía todos los campos obligatorios al crear o editar. En PUT omite las PK. Los valores de FK deben corresponder a registros reales; para pruebas, crea primero registros ficticios relacionados.

No se proporcionan payloads con columnas sin verificar. El frontend construye los formularios automáticamente con nombres, opciones ENUM, tipos y FK del esquema inspeccionado.

## Recursos del evento

Para cada recurso en `servicios`, `empleados`, `proveedores`:

| Método | Ruta | Cuerpo |
| --- | --- | --- |
| GET | `/eventos/:id/recursos/:recurso` | Ninguno |
| POST | `/eventos/:id/recursos/:recurso` | Campos editables de la tabla intermedia, sin la FK al evento |
| PUT | `/eventos/:id/recursos/:recurso` | `{ "key": { "PK_REAL": "VALOR" }, "values": { "CAMPO_REAL": "VALOR" } }` |
| DELETE | `/eventos/:id/recursos/:recurso` | `{ "key": { "PK_REAL": "VALOR" } }` |

`PK_REAL` y `CAMPO_REAL` son marcadores explicativos: reemplázalos con los campos inspeccionados. Para una clave compuesta, `key` incluye todas las columnas de `primaryKeys`. El servidor deduce y asigna la FK al evento a partir del `:id`; no debes enviarla en POST ni en values. En PUT se omiten también las PK de values.

Crear duplicados devuelve 409. Una FK inexistente devuelve 400. Una key incompleta devuelve 400. Una asignación perteneciente a otro evento no se modifica ni se retira y devuelve 404. Los campos de función, costo, cantidad u horario se editan solo si existen realmente.

## Postman

Importa `Logos-Event-Manager.postman_collection.json`. Configura `base_url` y lee primero health y schema. Hay solicitudes de consulta y carpetas de escritura **manual**. Los IDs empiezan vacíos; configúralos exclusivamente con registros nuevos identificables. Rellena los cuerpos de las otras entidades con los campos reales antes de enviar. No utilices Run collection contra datos reales.

## Estado de verificación real

La conexión y las operaciones CRUD sobre MySQL quedan pendientes hasta disponer de `backend/.env`. No se ha modificado ningún dato real. La documentación completa del esquema se genera con `npm run schema:inspect` después de configurar la conexión.

Resultados ejecutados el 4 de noviembre de 2026:

| Verificación | Resultado y alcance |
| --- | --- |
| Backend `npm test` | 17 pruebas aprobadas, 0 fallidas; dependencias aisladas, sin MySQL |
| Backend `npm run check` | Sintaxis JavaScript correcta |
| Backend `node src/server.js` | Inicia en `127.0.0.1:3000` |
| HTTP real `GET /api/health` | 503, JSON `DB_NOT_CONFIGURED`; confirma manejo controlado, no conectividad |
| HTTP real `GET /api/clientes` | 503, JSON `DB_NOT_CONFIGURED`; sin consultar registros |
| `npm run schema:inspect` | Salida controlada con configuración pendiente; ninguna escritura a MySQL |
| Frontend `npm test` | Edge sin ventana: dashboard, CRUD clientes, cancelar/confirmar eliminación, asignar/editar función/retirar empleado y navegación móvil aprobados con fixtures |
| Frontend `npm run build` | Compilación Vite satisfactoria |
| Git | Repositorio inicializado; `.env`, dependencias y `dist` ignorados; `.env.example` incluido entre archivos publicables |

El aislamiento de Windows bloqueó inicialmente procesos de Node/Vite (`EPERM`) y acceso a npm (`ENOTCACHED`). Se repitieron las operaciones con los permisos necesarios; los resultados satisfactorios de la tabla corresponden a esas ejecuciones posteriores.

Pendientes: inspección y documentación definitiva de las siete tablas no proporcionadas, conectividad real mediante SELECT 1, CRUD de las cinco entidades contra MySQL y sus restricciones reales, y asignaciones persistentes en las tres tablas intermedias. Ninguna prueba sobre repositorios o HTTP ficticios se presenta como una prueba de persistencia MySQL.
