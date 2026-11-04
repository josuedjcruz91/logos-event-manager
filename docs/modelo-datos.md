# Modelo de datos verificado

Inspección de solo lectura: 2026-11-04T20:21:45.494Z. Base existente; sin migraciones, creación ni cambios de estructura. Este documento contiene estructura, nunca filas de negocio.

Fuente: SHOW TABLES, DESCRIBE, SHOW CREATE TABLE, SHOW INDEX e INFORMATION_SCHEMA. Los nombres y tipos siguientes proceden de MySQL.

## clientes

| Atributo | Tipo | Nulo | PK | Predeterminado | FK | Extra |
| --- | --- | --- | --- | --- | --- | --- |
| id_cliente | int | No | Sí | NULL | — | auto_increment |
| nombre | varchar(150) | No |  | NULL | — |  |
| telefono | varchar(25) | No |  | NULL | — |  |
| correo | varchar(150) | Sí |  | NULL | — |  |
| notas | text | Sí |  | NULL | — |  |
| creado_en | timestamp | No |  | CURRENT_TIMESTAMP | — | DEFAULT_GENERATED |

Claves únicas: (id_cliente); (correo).

```sql
CREATE TABLE `clientes` (
  `id_cliente` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `correo` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notas` text COLLATE utf8mb4_unicode_ci,
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cliente`),
  UNIQUE KEY `correo` (`correo`),
  CONSTRAINT `chk_cliente_nombre` CHECK ((char_length(trim(`nombre`)) > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

## servicios

| Atributo | Tipo | Nulo | PK | Predeterminado | FK | Extra |
| --- | --- | --- | --- | --- | --- | --- |
| id_servicio | int | No | Sí | NULL | — | auto_increment |
| nombre | varchar(150) | No |  | NULL | — |  |
| descripcion | text | Sí |  | NULL | — |  |
| tipo_servicio | enum('propio','subcontratado','mixto') | No |  | NULL | — |  |
| precio_base_crc | bigint | No |  | 0 | — |  |
| activo | tinyint(1) | No |  | 1 | — |  |

Claves únicas: (id_servicio); (nombre).

```sql
CREATE TABLE `servicios` (
  `id_servicio` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `tipo_servicio` enum('propio','subcontratado','mixto') COLLATE utf8mb4_unicode_ci NOT NULL,
  `precio_base_crc` bigint NOT NULL DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_servicio`),
  UNIQUE KEY `nombre` (`nombre`),
  CONSTRAINT `chk_servicio_precio` CHECK ((`precio_base_crc` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

## eventos

| Atributo | Tipo | Nulo | PK | Predeterminado | FK | Extra |
| --- | --- | --- | --- | --- | --- | --- |
| id_evento | int | No | Sí | NULL | — | auto_increment |
| id_cliente | int | No |  | NULL | clientes.id_cliente |  |
| nombre | varchar(150) | No |  | NULL | — |  |
| tipo_evento | varchar(100) | No |  | NULL | — |  |
| fecha_evento | date | No |  | NULL | — |  |
| hora_inicio | time | No |  | NULL | — |  |
| hora_fin | time | Sí |  | NULL | — |  |
| ubicacion | varchar(255) | No |  | NULL | — |  |
| estado | enum('pendiente','confirmado','realizado','cancelado') | No |  | pendiente | — |  |
| notas | text | Sí |  | NULL | — |  |

Claves únicas: (id_evento).

```sql
CREATE TABLE `eventos` (
  `id_evento` int NOT NULL AUTO_INCREMENT,
  `id_cliente` int NOT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_evento` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_evento` date NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time DEFAULT NULL,
  `ubicacion` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('pendiente','confirmado','realizado','cancelado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `notas` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_evento`),
  KEY `idx_eventos_cliente` (`id_cliente`),
  KEY `idx_eventos_fecha` (`fecha_evento`),
  CONSTRAINT `fk_eventos_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

## empleados

| Atributo | Tipo | Nulo | PK | Predeterminado | FK | Extra |
| --- | --- | --- | --- | --- | --- | --- |
| id_empleado | int | No | Sí | NULL | — | auto_increment |
| nombre | varchar(150) | No |  | NULL | — |  |
| telefono | varchar(25) | No |  | NULL | — |  |
| correo | varchar(150) | Sí |  | NULL | — |  |
| especialidad_principal | varchar(100) | No |  | NULL | — |  |
| tarifa_base_crc | bigint | No |  | 0 | — |  |
| estado | enum('activo','inactivo') | No |  | activo | — |  |
| observaciones | text | Sí |  | NULL | — |  |

Claves únicas: (id_empleado); (correo).

```sql
CREATE TABLE `empleados` (
  `id_empleado` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `correo` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `especialidad_principal` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tarifa_base_crc` bigint NOT NULL DEFAULT '0',
  `estado` enum('activo','inactivo') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activo',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_empleado`),
  UNIQUE KEY `correo` (`correo`),
  CONSTRAINT `chk_empleado_tarifa` CHECK ((`tarifa_base_crc` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

## proveedores

| Atributo | Tipo | Nulo | PK | Predeterminado | FK | Extra |
| --- | --- | --- | --- | --- | --- | --- |
| id_proveedor | int | No | Sí | NULL | — | auto_increment |
| nombre | varchar(150) | No |  | NULL | — |  |
| contacto | varchar(150) | Sí |  | NULL | — |  |
| telefono | varchar(25) | No |  | NULL | — |  |
| correo | varchar(150) | Sí |  | NULL | — |  |
| especialidad | varchar(100) | No |  | NULL | — |  |
| estado | enum('activo','inactivo') | No |  | activo | — |  |
| notas | text | Sí |  | NULL | — |  |

Claves únicas: (id_proveedor).

```sql
CREATE TABLE `proveedores` (
  `id_proveedor` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contacto` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `correo` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `especialidad` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('activo','inactivo') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activo',
  `notas` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_proveedor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

## evento_servicio

| Atributo | Tipo | Nulo | PK | Predeterminado | FK | Extra |
| --- | --- | --- | --- | --- | --- | --- |
| id_evento_servicio | int | No | Sí | NULL | — | auto_increment |
| id_evento | int | No |  | NULL | eventos.id_evento |  |
| id_servicio | int | No |  | NULL | servicios.id_servicio |  |
| cantidad | int | No |  | 1 | — |  |
| precio_unitario_crc | bigint | No |  | NULL | — |  |
| observaciones | text | Sí |  | NULL | — |  |

Claves únicas: (id_evento_servicio); (id_evento, id_servicio).

```sql
CREATE TABLE `evento_servicio` (
  `id_evento_servicio` int NOT NULL AUTO_INCREMENT,
  `id_evento` int NOT NULL,
  `id_servicio` int NOT NULL,
  `cantidad` int NOT NULL DEFAULT '1',
  `precio_unitario_crc` bigint NOT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_evento_servicio`),
  UNIQUE KEY `uq_evento_servicio` (`id_evento`,`id_servicio`),
  KEY `idx_es_servicio` (`id_servicio`),
  CONSTRAINT `fk_es_evento` FOREIGN KEY (`id_evento`) REFERENCES `eventos` (`id_evento`) ON DELETE CASCADE,
  CONSTRAINT `fk_es_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `servicios` (`id_servicio`) ON DELETE RESTRICT,
  CONSTRAINT `chk_es_cantidad` CHECK ((`cantidad` > 0)),
  CONSTRAINT `chk_es_precio` CHECK ((`precio_unitario_crc` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

## evento_empleado

| Atributo | Tipo | Nulo | PK | Predeterminado | FK | Extra |
| --- | --- | --- | --- | --- | --- | --- |
| id_evento_empleado | int | No | Sí | NULL | — | auto_increment |
| id_evento | int | No |  | NULL | eventos.id_evento |  |
| id_empleado | int | No |  | NULL | empleados.id_empleado |  |
| funcion_asignada | varchar(100) | No |  | NULL | — |  |
| hora_entrada | time | Sí |  | NULL | — |  |
| hora_salida | time | Sí |  | NULL | — |  |
| pago_acordado_crc | bigint | No |  | 0 | — |  |
| observaciones | text | Sí |  | NULL | — |  |

Claves únicas: (id_evento_empleado); (id_evento, id_empleado).

```sql
CREATE TABLE `evento_empleado` (
  `id_evento_empleado` int NOT NULL AUTO_INCREMENT,
  `id_evento` int NOT NULL,
  `id_empleado` int NOT NULL,
  `funcion_asignada` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hora_entrada` time DEFAULT NULL,
  `hora_salida` time DEFAULT NULL,
  `pago_acordado_crc` bigint NOT NULL DEFAULT '0',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_evento_empleado`),
  UNIQUE KEY `uq_evento_empleado` (`id_evento`,`id_empleado`),
  KEY `idx_ee_empleado` (`id_empleado`),
  CONSTRAINT `fk_ee_empleado` FOREIGN KEY (`id_empleado`) REFERENCES `empleados` (`id_empleado`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ee_evento` FOREIGN KEY (`id_evento`) REFERENCES `eventos` (`id_evento`) ON DELETE CASCADE,
  CONSTRAINT `chk_ee_pago` CHECK ((`pago_acordado_crc` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

## evento_proveedor

| Atributo | Tipo | Nulo | PK | Predeterminado | FK | Extra |
| --- | --- | --- | --- | --- | --- | --- |
| id_evento_proveedor | int | No | Sí | NULL | — | auto_increment |
| id_evento | int | No |  | NULL | eventos.id_evento |  |
| id_proveedor | int | No |  | NULL | proveedores.id_proveedor |  |
| concepto_contratado | varchar(200) | No |  | NULL | — |  |
| costo_acordado_crc | bigint | No |  | 0 | — |  |
| estado | enum('pendiente','confirmado','pagado','cancelado') | No |  | pendiente | — |  |
| observaciones | text | Sí |  | NULL | — |  |

Claves únicas: (id_evento_proveedor).

```sql
CREATE TABLE `evento_proveedor` (
  `id_evento_proveedor` int NOT NULL AUTO_INCREMENT,
  `id_evento` int NOT NULL,
  `id_proveedor` int NOT NULL,
  `concepto_contratado` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `costo_acordado_crc` bigint NOT NULL DEFAULT '0',
  `estado` enum('pendiente','confirmado','pagado','cancelado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_evento_proveedor`),
  KEY `idx_ep_proveedor` (`id_proveedor`),
  KEY `fk_ep_evento` (`id_evento`),
  CONSTRAINT `fk_ep_evento` FOREIGN KEY (`id_evento`) REFERENCES `eventos` (`id_evento`) ON DELETE CASCADE,
  CONSTRAINT `fk_ep_proveedor` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedores` (`id_proveedor`) ON DELETE RESTRICT,
  CONSTRAINT `chk_ep_costo` CHECK ((`costo_acordado_crc` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

## Relaciones y responsabilidades

Las claves foráneas documentadas arriba son las relaciones verificadas. Las tablas evento_servicio, evento_empleado y evento_proveedor administran asignaciones mediante las FK reales. Las claves primarias pueden ser compuestas; la API utiliza un objeto key para identificarlas sin ambigüedad.

La especialidad principal del empleado describe su capacidad general. La función asignada dentro de evento_empleado describe el trabajo en esa producción; el formulario incluye únicamente los campos existentes. Los costos, cantidades y horarios se muestran si MySQL los define.
