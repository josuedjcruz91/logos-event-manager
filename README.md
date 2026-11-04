# Logos Event Manager

Aplicación académica de administración para Logos Producciones, empresa de producción de eventos en Costa Rica. Centraliza clientes, catálogo de servicios, eventos, empleados y proveedores, con asignaciones de recursos por evento. Está organizada para reutilizar su API como módulo de Logos Business Hub.

## Alcance y estado

- API REST Express con ES Modules, MVC y consultas parametrizadas mediante `mysql2/promise`.
- React + Vite + React Router, cinco pantallas CRUD, dashboard y detalle del evento.
- Formularios de creación y edición, eliminación con confirmación, notificaciones, búsqueda en la página visible y paginación de catálogos.
- Asignación, edición y retiro de servicios, empleados y proveedores de cada evento.
- Identidad tipográfica provisional en negro, dorado, blanco y grises. No representa un logotipo oficial.
- Sin autenticación, roles, JWT, ORM ni servicios externos de base de datos.

**La verificación con MySQL requiere configurar `backend/.env`.** El sistema no crea ni modifica estructuras. Antes de consultar datos inspecciona las tablas reales con `SHOW TABLES`, `DESCRIBE`, `SHOW CREATE TABLE`, `SHOW INDEX` e `INFORMATION_SCHEMA`. Si falta una tabla o no existe una clave apropiada, responde con un error y bloquea operaciones inseguras.

Los campos de las siete tablas no proporcionadas se obtienen del esquema real en tiempo de ejecución. No se asumieron columnas de negocio. `GET /api/schema` entrega metadatos para los formularios. `npm run schema:inspect` genera la documentación de las ocho tablas a partir de MySQL, sin leer filas privadas. Reinicia el backend después de cambios de esquema externos para limpiar la caché de metadatos.

## Tecnologías y arquitectura

Node.js 24, Express 5, MySQL 8, mysql2, dotenv, cors, React 19, React Router 7, Vite 8 y Lucide. Consulta las versiones exactas en los `package-lock.json`.

React constituye la **Vista**; los controllers procesan HTTP y aplican validaciones; los repositories constituyen el **Modelo**, con SQL directo sobre la base existente. No se necesita una carpeta `models`: ningún modelo crea tablas. Las rutas separan la URL de la lógica de aplicación. Más detalles en [arquitectura MVC](docs/arquitectura-mvc.md).

```text
logos-event-manager/
├── backend/
│   ├── src/
│   │   ├── config/          # Pool y entidades permitidas
│   │   ├── controllers/     # HTTP y validación
│   │   ├── repositories/    # Esquema, catálogos, relaciones y dashboard
│   │   ├── routes/
│   │   ├── middlewares/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── scripts/             # Inspección de solo lectura y sintaxis
│   ├── test/                # Pruebas aisladas, sin conexión a MySQL
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   └── styles/
│   └── .env.example
└── docs/
    ├── modelo-datos.md
    ├── arquitectura-mvc.md
    ├── pruebas-api.md
    └── Logos-Event-Manager.postman_collection.json
```

## Instalación en Windows

Requisitos: Node.js 24 y npm, MySQL activo y la base **existente** `logos_event_manager` con las ocho tablas. No ejecutar scripts de creación, migraciones ni sincronización de modelos.

Desde la raíz, en PowerShell:

```powershell
cd backend
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Si `.env` ya existe, consérvalo. Abre `backend/.env` localmente y configura:

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=REEMPLAZAR_LOCALMENTE
DB_NAME=logos_event_manager
PORT=3000
HOST=127.0.0.1
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
```

`DB_PASSWORD` debe definirse explícitamente. El marcador `REEMPLAZAR_LOCALMENTE` bloquea la conexión; no se supone contraseña vacía. Si MySQL está configurado deliberadamente sin contraseña, puedes definir `DB_PASSWORD=`. No compartas `.env` ni lo agregues a Git. Para uso cotidiano conviene un usuario MySQL con los permisos de lectura y CRUD necesarios sobre esta base, sin permisos para cambiar su estructura.

Verifica la conectividad y genera el modelo de datos:

```powershell
npm run schema:inspect
npm run dev
```

La API escucha en `http://127.0.0.1:3000`. La ruta `GET /api/health` ejecuta realmente `SELECT 1`; devuelve 503 controlado si falta configuración o MySQL no responde.

En otra terminal, desde la raíz:

```powershell
cd frontend
npm install
npm run dev
```

Abre **http://127.0.0.1:5173**. Vite redirige `/api` al backend local. No hace falta crear un `.env` en el frontend. Si cambias el puerto del backend, ajusta `target` en `frontend/vite.config.js`, o configura `VITE_API_URL=http://127.0.0.1:PUERTO/api` en `frontend/.env` y conserva el origen de Vite en CORS.

No se utiliza LocalStorage ni se cargan registros simulados en la aplicación. La interfaz muestra estados vacíos cuando MySQL devuelve listas vacías; una falla de conexión se presenta como error, nunca como cifras cero.

## Endpoints

Prefijo: `/api`. Todas las respuestas son JSON.

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/health` | Conectividad real mediante SELECT 1 |
| GET | `/schema` | Metadatos de las ocho tablas verificadas |
| GET | `/dashboard` | Conteos reales y hasta seis próximos eventos |
| GET | `/:entidad?limit=20&offset=0` | Lista y metadatos de paginación |
| GET | `/:entidad/:id` | Detalle |
| POST | `/:entidad` | Crear |
| PUT | `/:entidad/:id` | Editar: enviar campos editables completos |
| DELETE | `/:entidad/:id` | Eliminar según restricciones MySQL |
| GET | `/eventos/:id/recursos/:recurso` | Asignaciones de un evento |
| POST | `/eventos/:id/recursos/:recurso` | Asignar recurso |
| PUT | `/eventos/:id/recursos/:recurso` | Editar asignación con `{key, values}` |
| DELETE | `/eventos/:id/recursos/:recurso` | Retirar asignación con `{key}` |

`:entidad`: `clientes`, `servicios`, `eventos`, `empleados`, `proveedores`. `:recurso`: `servicios`, `empleados`, `proveedores`. Las claves de los objetos `key` son exactamente las PK que devuelve `/schema`, incluidas las compuestas. `id` siempre es el ID principal del evento, y el servidor resuelve su FK real.

Respuestas: `200` lectura/edición/eliminación; `201` creación; `400` validación/referencia inexistente; `404` registro o ruta ausente; `409` valor único duplicado, recurso duplicado, registro en uso o conflicto de concurrencia; `503` configuración, conectividad o esquema incompatible. Errores JSON: `{ "error": { "code": "...", "message": "...", "details": {} } }`. No se devuelven mensajes SQL privados ni credenciales.

El dashboard usa la fecha empresarial `America/Costa_Rica`. Solo presenta próximos eventos si identifica de forma inequívoca una columna de fecha de evento en el esquema; nunca utiliza la fecha de registro como sustituto. Los datos monetarios se conservan según su tipo MySQL; no se inventan ingresos ni se presupone una moneda.

## Pruebas

```powershell
cd backend
npm run check
npm test
```

Las pruebas usan fixtures identificados y dependencias aisladas. Verifican validación, contratos HTTP, parametrización, errores seguros, CORS, transacciones de asignación, duplicados y claves compuestas. No escriben en MySQL ni demuestran por sí solas conectividad real.

```powershell
cd frontend
npm run build
```

Consulta [pruebas de API y verificación pendiente](docs/pruebas-api.md). La colección Postman se usa manualmente, después de inspeccionar el esquema. No ejecutes un recorrido automático sobre datos reales. Cualquier prueba que cambie registros existentes requiere autorización; usa registros nuevos con el prefijo `PRUEBA_LOGOS_` y limpia exclusivamente esos registros cuando corresponda.

El frontend también incluye `npm test`: abre Edge, Chrome o Chromium instalado en modo sin ventana y verifica los flujos de interfaz con fixtures interceptados por HTTP, sin tocar MySQL. Si no encuentra un navegador, define `BROWSER_PATH` con su ejecutable. La prueba inicia y cierra su propio Vite en el puerto 5173; detén otra instancia de Vite antes de ejecutarla. Playwright Core no descarga navegadores.

## GitHub y uso local

`.gitignore` excluye dependencias, archivos `.env`, compilados, logs, llaves y archivos SQL que pudieran contener exportaciones privadas; mantiene `.env.example`. Revisa `git status` y el contenido de cada archivo antes de añadirlo. No se configura remoto, se hace push ni se publica el sistema.

El sistema está limitado a loopback y no tiene controles de acceso, conforme al alcance académico. Debe permanecer en desarrollo local. CORS limita el uso desde navegadores, pero no sustituye autenticación.

Referencias oficiales: [Express: errores](https://expressjs.com/en/5x/guide/error-handling/), [mysql2: pool](https://sidorares.github.io/node-mysql2/docs/examples/connections/create-pool), [Vite](https://vite.dev/guide/).
