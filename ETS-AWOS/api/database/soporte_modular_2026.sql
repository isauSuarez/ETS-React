SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS soporte_modular_2026
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_general_ci;

USE soporte_modular_2026;

CREATE TABLE IF NOT EXISTS plan (
    idPlan INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    maxConsultas SMALLINT UNSIGNED NOT NULL,
    maxRemotos SMALLINT UNSIGNED NOT NULL,
    maxPresenciales SMALLINT UNSIGNED NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cliente (
    idCliente INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombres VARCHAR(80) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(160) NOT NULL UNIQUE,
    telefono VARCHAR(20) NOT NULL,
    passwordHash VARCHAR(255) NOT NULL,
    fechaAlta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS empleado (
    idEmpleado INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombres VARCHAR(80) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(160) NOT NULL UNIQUE,
    telefono VARCHAR(20) NOT NULL,
    passwordHash VARCHAR(255) NOT NULL,
    rol ENUM('JEFE', 'DISPATCHER', 'TECNICO') NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    fechaAlta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- la vigencia empieza cuando el jefe activa la poliza cawn
CREATE TABLE IF NOT EXISTS poliza (
    idPoliza INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    idCliente INT UNSIGNED NOT NULL,
    idPlan INT UNSIGNED NOT NULL,
    nombreEmpresa VARCHAR(150) NOT NULL,
    direccionServicio VARCHAR(255) NOT NULL,
    estado ENUM('PENDIENTE', 'ACTIVA', 'CANCELADA')
        NOT NULL DEFAULT 'PENDIENTE',
    fechaSolicitud DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fechaInicio DATE NULL,
    fechaVencimiento DATE NULL,
    idEmpleadoActiva INT UNSIGNED NULL,
    fechaCancelacion DATETIME NULL,
    idEmpleadoCancela INT UNSIGNED NULL,

    FOREIGN KEY (idCliente) REFERENCES cliente (idCliente),
    FOREIGN KEY (idPlan) REFERENCES plan (idPlan),
    FOREIGN KEY (idEmpleadoActiva) REFERENCES empleado (idEmpleado),
    FOREIGN KEY (idEmpleadoCancela) REFERENCES empleado (idEmpleado)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ticket (
    idTicket INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    idPoliza INT UNSIGNED NOT NULL,
    idTecnicoAsignado INT UNSIGNED NULL,
    asunto VARCHAR(120) NOT NULL,
    descripcion TEXT NOT NULL,
    modalidad ENUM('CONSULTA', 'REMOTO', 'PRESENCIAL') NOT NULL,
    estado ENUM(
        'SIN_ASIGNAR', 'ASIGNADO', 'EN_ATENCION',
        'PENDIENTE_APROBACION', 'CERRADO', 'CANCELADO'
    ) NOT NULL DEFAULT 'SIN_ASIGNAR',
    imagenAdjunta VARCHAR(255) NULL,
    fechaCreacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fechaCierre DATETIME NULL,

    INDEX idx_ticket_cupo (idPoliza, modalidad, fechaCreacion),
    INDEX idx_ticket_bandeja (estado, fechaCreacion),
    INDEX idx_ticket_tecnico (idTecnicoAsignado, estado),

    FOREIGN KEY (idPoliza) REFERENCES poliza (idPoliza),
    FOREIGN KEY (idTecnicoAsignado) REFERENCES empleado (idEmpleado)
) ENGINE=InnoDB;

-- la imagen queda en la bd compartida para que se vea en las compus de todos cawn
CREATE TABLE IF NOT EXISTS ticket_imagen (
    idTicket INT UNSIGNED PRIMARY KEY,
    tipoMime VARCHAR(20) NOT NULL,
    contenido MEDIUMBLOB NOT NULL,

    FOREIGN KEY (idTicket) REFERENCES ticket (idTicket)
) ENGINE=InnoDB;

-- aqui queda quien lo atendio cuando el ticket regresa sin tecnico cawn
CREATE TABLE IF NOT EXISTS ticket_historial (
    idMovimiento INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    idTicket INT UNSIGNED NOT NULL,
    idClienteAutor INT UNSIGNED NULL,
    idEmpleadoAutor INT UNSIGNED NULL,
    idTecnicoRelacionado INT UNSIGNED NULL,
    accion ENUM(
        'CREADO', 'ASIGNADO', 'REASIGNADO', 'DESASIGNADO',
        'ATENCION_INICIADA', 'ENVIADO_A_APROBACION',
        'APROBADO', 'NO_SOLUCIONADO', 'CANCELADO'
    ) NOT NULL,
    comentario TEXT NULL,
    fechaMovimiento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (idTicket) REFERENCES ticket (idTicket),
    FOREIGN KEY (idClienteAutor) REFERENCES cliente (idCliente),
    FOREIGN KEY (idEmpleadoAutor) REFERENCES empleado (idEmpleado),
    FOREIGN KEY (idTecnicoRelacionado) REFERENCES empleado (idEmpleado),

    CONSTRAINT chk_historial_un_autor CHECK (
        (idClienteAutor IS NOT NULL AND idEmpleadoAutor IS NULL)
        OR (idClienteAutor IS NULL AND idEmpleadoAutor IS NOT NULL)
    )
) ENGINE=InnoDB;

INSERT INTO plan (nombre, maxConsultas, maxRemotos, maxPresenciales)
VALUES
    ('Básico', 4, 4, 2),
    ('Profesional', 8, 8, 4),
    ('Empresarial', 12, 12, 6)
ON DUPLICATE KEY UPDATE idPlan = idPlan;

-- si ya cargaron las cuentas de demo, deja sus datos como estan cawn
INSERT INTO empleado (nombres, apellidos, correo, telefono, passwordHash, rol)
VALUES
    ('Alex', 'Demo', 'jefe@soporte.test', '5550000001',
     '$2b$10$zVtkkCWU9svTKHB6sehsFuKFo5SSpBmxMFQA6xHP0riQ43Gy8Bh.6', 'JEFE'),
    ('Dani', 'Demo', 'dispatcher@soporte.test', '5550000002',
     '$2b$10$zUHftHxylp9abQOEOxb0n.sRgn9Lsi3SrfozID016F3S4VCRN.wWi', 'DISPATCHER'),
    ('Sam', 'Demo', 'tecnico@soporte.test', '5550000003',
     '$2b$10$KLtdIxrtr2zRF9UZXypkCOtzMUp7fRc3MGCgLlGTJ8ZXEQ/lxBD0O', 'TECNICO')
ON DUPLICATE KEY UPDATE idEmpleado = idEmpleado;
