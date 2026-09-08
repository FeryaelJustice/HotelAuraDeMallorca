-- ==============================================================================
-- Hotel Aura de Mallorca - Definicion de Base de Datos y Esquema Relacional
-- Proposito: Gestion integral de usuarios, reservas, habitaciones, servicios,
-- pasarelas de pago, estados meteorologicos y roles de seguridad.
-- ==============================================================================

-- Creacion y seleccion de la base de datos principal
CREATE DATABASE IF NOT EXISTS hotelaurademallorca;

USE hotelaurademallorca;

-- Tabla: app_user
-- Que hace: Almacena las cuentas de usuario registradas en la plataforma.
-- Por que: Gestiona credenciales (bcrypt), tokens de sesion/verificacion/recuperacion,
-- y estados de activacion/bloqueo (por sanciones del sistema o intervencion admin).
CREATE TABLE app_user (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    user_name VARCHAR(255),
    user_surnames VARCHAR(255),
    user_email VARCHAR(255) NOT NULL UNIQUE,
    user_dni VARCHAR(10) NOT NULL UNIQUE,
    user_password VARCHAR(255),
    user_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_token_expiry TIMESTAMP NULL DEFAULT NULL,
    access_token VARCHAR(512) DEFAULT NULL,
    refresh_token VARCHAR(512) DEFAULT NULL,
    refresh_token_expiry TIMESTAMP NULL DEFAULT NULL,
    reset_token VARCHAR(255) DEFAULT NULL,
    reset_token_expiry TIMESTAMP NULL DEFAULT NULL,
    isEnabled BOOLEAN DEFAULT TRUE,
    enabledByAdmin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT unique_user UNIQUE (user_email, user_dni)
);

-- Tabla: guest
-- Que hace: Registra huespedes individuales vinculados a una estancia.
-- Por que: Permite distinguir entre adultos y menores, y desacopla los ocupantes
-- fisicos de la habitacion respecto a si poseen o no cuenta de usuario en el sistema.
CREATE TABLE guest (
    id INT(11) PRIMARY KEY NOT NULL AUTO_INCREMENT,
    guest_name VARCHAR(255),
    guest_surnames VARCHAR(255),
    guest_email VARCHAR(255),
    isAdult CHAR(1) NOT NULL,
    isSystemUser CHAR(1) NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla: role
-- Que hace: Catalogo de roles de autorizacion disponibles en la aplicacion.
-- Por que: Aplica control de acceso basado en roles (RBAC: CLIENT, ADMIN, EMPLOYEE).
CREATE TABLE role (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    name ENUM('CLIENT', 'ADMIN', 'EMPLOYEE') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla: user_role
-- Que hace: Tabla intermedia de relacion muchos a muchos entre usuarios y roles.
-- Por que: Permite asignar uno o multiples permisos de acceso a cada usuario del sistema.
CREATE TABLE user_role (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    user_id INT,
    role_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE
    SET
        NULL,
        CONSTRAINT unique_user_role UNIQUE (user_id, role_id)
);

-- Tabla: plan
-- Que hace: Define los regimenes de alojamiento (ej. Solo Alojamiento, Todo Incluido / VIP).
-- Por que: Establece la tarifa base complementaria segun la experiencia seleccionada.
CREATE TABLE plan (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    plan_name VARCHAR(255),
    plan_description TEXT,
    plan_price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla: room
-- Que hace: Catalogo de habitaciones fisicas del complejo hotelero.
-- Por que: Registra tarifas por noche, descripcion y rango de fechas de operatividad.
CREATE TABLE room (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    room_name VARCHAR(255),
    room_description TEXT,
    room_price DECIMAL(10, 2),
    room_availability_start DATE,
    room_availability_end DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla: service
-- Que hace: Servicios adicionales contratables (Spa, Gimnasio, Piscina Climatizada, etc.).
-- Por que: Permite personalizar la estancia anadiendo extras tasados por reserva.
CREATE TABLE service (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    serv_name VARCHAR(255),
    serv_description TEXT,
    serv_price DECIMAL(10, 2),
    serv_availability_start DATE,
    serv_availability_end DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla: booking
-- Que hace: Entidad central que formaliza una reserva de habitacion y plan.
-- Por que: Gestiona el periodo de estancia, limites de cancelacion gratuita,
-- estado de cancelacion (`is_cancelled`) y validaciones de rango temporal.
CREATE TABLE booking (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    user_id INT,
    plan_id INT,
    room_id INT,
    booking_start_date DATE NOT NULL,
    booking_end_date DATE NOT NULL,
    cancellation_deadline DATE,
    is_cancelled BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE
    SET
        NULL,
        FOREIGN KEY (plan_id) REFERENCES plan(id) ON DELETE
    SET
        NULL,
        FOREIGN KEY (room_id) REFERENCES room(id) ON DELETE
    SET
        NULL,
        CONSTRAINT valid_dates CHECK (booking_start_date <= booking_end_date),
        CONSTRAINT valid_cancellation CHECK (cancellation_deadline < booking_start_date)
);

-- Tabla: booking_service
-- Que hace: Relacion muchos a muchos entre reservas y servicios adicionales contratados.
-- Por que: Permite asociar multiples amenidades a una misma reserva.
CREATE TABLE booking_service (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    booking_id INT,
    service_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES booking(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES service(id) ON DELETE
    SET
        NULL
);

-- Tabla: booking_guest
-- Que hace: Vincula los huespedes alojados a una reserva especifica.
-- Por que: Permite auditoria de ocupantes por habitacion para recepcion y seguridad.
CREATE TABLE booking_guest (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    booking_id INT,
    guest_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES booking(id) ON DELETE CASCADE,
    FOREIGN KEY (guest_id) REFERENCES guest(id) ON DELETE
    SET
        NULL
);

-- Tabla: promotion
-- Que hace: Cupones y codigos de descuento temporales.
-- Por que: Permite aplicar rebajas promocionales en el calculo de precio final.
CREATE TABLE promotion (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    code VARCHAR(255) UNIQUE NOT NULL,
    discount_price DECIMAL(5, 2) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    is_visible BOOLEAN DEFAULT TRUE
);

-- -- Tabla: booking_promotion
-- Que hace: Asocia descuentos aplicados a una reserva concreta.
-- Por que: Preserva la trazabilidad de la promocion disfrutada en la transaccion.
CREATE TABLE booking_promotion (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    booking_id INT,
    promotion_id INT,
    FOREIGN KEY (booking_id) REFERENCES booking(id) ON DELETE CASCADE,
    FOREIGN KEY (promotion_id) REFERENCES promotion(id) ON DELETE
    SET
        NULL
);

-- Tabla: user_booking_count
-- Que hace: Contador acumulado de reservas finalizadas por usuario.
-- Por que: Facilita estadisticas de fidelizacion y politicas de trato preferente.
CREATE TABLE user_booking_count (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    user_id INT,
    booking_count INT DEFAULT 0,
    UNIQUE KEY (user_id),
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
);

-- Tabla: user_promotion
-- Que hace: Control de asignacion y canje de promociones por usuario individual.
-- Por que: Evita que un mismo usuario canjee cupones de un solo uso en reiteradas ocasiones.
CREATE TABLE user_promotion (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    user_id INT,
    promotion_id INT,
    isUsed BOOLEAN DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    FOREIGN KEY (promotion_id) REFERENCES promotion(id) ON DELETE
    SET
        NULL
);

-- Tabla: weather
-- Que hace: Historico y predicciones meteorologicas de Mallorca.
-- Por que: Permite enriquecer la experiencia de usuario y coordinar servicios exteriores.
CREATE TABLE weather (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    weather_date DATE,
    weather_state VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla: payment_method
-- Que hace: Catalogo de metodos de pago aceptados (Tarjeta / Stripe, Efectivo, etc.).
-- Por que: Clasifica la modalidad financiera utilizada en la liquidacion de la reserva.
CREATE TABLE payment_method (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    payment_method_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla: payment
-- Que hace: Registro financiero del pago asociado a una reserva y usuario.
-- Por que: Permite conciliacion contable de importes cobrados y fechas de liquidacion.
CREATE TABLE payment (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    user_id INT,
    booking_id INT,
    payment_amount DECIMAL(10, 2),
    payment_date DATE,
    payment_method_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE
    SET
        NULL,
        FOREIGN KEY (booking_id) REFERENCES booking(id) ON DELETE
    SET
        NULL,
        FOREIGN KEY (payment_method_id) REFERENCES payment_method(id) ON DELETE
    SET
        NULL
);

-- Tabla: payment_transaction
-- Que hace: Vincula un pago interno con el identificador unico de pasarela externa (ej. Stripe PaymentIntent).
-- Por que: Garantiza auditoria de transacciones bancarias y gestion de reembolsos/disputas.
CREATE TABLE payment_transaction (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    payment_id INT DEFAULT NULL,
    transaction_id VARCHAR(255) DEFAULT NULL
);

-- MEDIAS (Tablas de gestion de archivos multimedia: imagenes y videos de entidades)
-- Que hace: Cataloga URLs y metadatos de recursos visuales del hotel.
-- Por que: Desacopla la persistencia de medios de las entidades de negocio.
CREATE TABLE media (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    type ENUM ('image', 'video') DEFAULT 'image' NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Relacion: Imagenes de perfil de usuario
CREATE TABLE user_media (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    media_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
);

-- Relacion: Imagenes ilustrativas de servicios
CREATE TABLE service_media (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    service_id INT NOT NULL,
    media_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES service(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
);

-- Relacion: Imagenes ilustrativas de habitaciones
CREATE TABLE room_media (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    room_id INT NOT NULL,
    media_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES room(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
);

-- Relacion: Imagenes ilustrativas de planes
CREATE TABLE plan_media (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    plan_id INT NOT NULL,
    media_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plan(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
);

-- PERFORMANCE INDEXES & CONSTRAINTS
-- Optimize user lookups by auth tokens
ALTER TABLE `app_user` ADD INDEX `idx_app_user_access_token` (`access_token`(255));
ALTER TABLE `app_user` ADD INDEX `idx_app_user_refresh_token` (`refresh_token`(255));
ALTER TABLE `app_user` ADD INDEX `idx_app_user_reset_token` (`reset_token`);
ALTER TABLE `app_user` ADD INDEX `idx_app_user_verification_token` (`verification_token`);

-- Optimize booking availability lookups
ALTER TABLE `booking` ADD INDEX `idx_booking_availability` (`booking_start_date`, `booking_end_date`, `is_cancelled`);

-- INSERTS of example data
INSERT INTO
    app_user (
        user_name,
        user_surnames,
        user_email,
        user_dni,
        user_password,
        user_verified,
        verification_token,
        verification_token_expiry
    )
VALUES
    (
        'John Doe',
        'Gonzalez Serr',
        'john@example.com',
        '34843234A',
        '$2b$10$BW9pwcY1.mHWAlpCTVB7f.8lyaH/5Ad1y02JhFmvZo8JLGWq5STEC',
        true,
        NULL,
        CURRENT_TIMESTAMP
    ),
    (
        'Jane Smith',
        'Gonzalez Serr',
        'jane@example.com',
        '654853234F',
        '$2b$10$BW9pwcY1.mHWAlpCTVB7f.8lyaH/5Ad1y02JhFmvZo8JLGWq5STEC',
        true,
        NULL,
        CURRENT_TIMESTAMP
    ),
    (
        'Fer',
        'Gonzalez Serr',
        'fer@example.com',
        '43480312Z',
        '$2b$10$BW9pwcY1.mHWAlpCTVB7f.8lyaH/5Ad1y02JhFmvZo8JLGWq5STEC',
        true,
        NULL,
        CURRENT_TIMESTAMP
    );

-- isSystemUser: indica si el guest existe en el sistema como app_user
INSERT INTO
    guest (
        guest_name,
        guest_surnames,
        guest_email,
        isAdult,
        isSystemUser
    )
VALUES
    (
        'John Doe',
        'Gonzalez Serr',
        'john@example.com',
        1,
        1
    ),
    (
        'Jane Smith',
        'Gonzalez Serr',
        'jane@example.com',
        0,
        1
    ),
    (
        'Fer',
        'Gonzalez Serr',
        'fer@example.com',
        1,
        1
    );

INSERT INTO
    role (name)
VALUES
    ('CLIENT'),
    ('ADMIN'),
    ('EMPLOYEE');

INSERT INTO
    user_role (user_id, role_id)
VALUES
    (1, 3),
    (2, 1),
    (3, 2);

-- Planes
INSERT INTO
    plan (plan_name, plan_description, plan_price)
VALUES
    (
        'Basic',
        'Basic plan without extra services',
        50.00
    ),
    (
        'VIP',
        'VIP plan with all luxury services included',
        150.00
    );

-- Habitaciones
INSERT INTO
    room (
        room_name,
        room_description,
        room_price,
        room_availability_start,
        room_availability_end
    )
VALUES
    (
        'Standard Room',
        'Standard room with sea view',
        80.00,
        '2024-01-01',
        '2035-12-31'
    ),
    (
        'VIP Suite',
        'VIP suite with luxury services',
        200.00,
        '2024-01-01',
        '2035-12-31'
    ),
    (
        'Deluxe Ocean View',
        'Spacious deluxe room facing the Mediterranean sea with private balcony',
        130.00,
        '2024-01-01',
        '2035-12-31'
    ),
    (
        'Royal VIP Penthouse',
        'Exclusive top-floor penthouse with private jacuzzi, butler service and panoramic terrace',
        350.00,
        '2024-01-01',
        '2035-12-31'
    ),
    (
        'Family Comfort Room',
        'Spacious family room with two king beds, kids area and quiet garden view',
        160.00,
        '2024-01-01',
        '2035-12-31'
    );

-- Servicios
INSERT INTO
    service (
        serv_name,
        serv_description,
        serv_price,
        serv_availability_start,
        serv_availability_end
    )
VALUES
    (
        'Luxury Garden',
        'Premium garden services',
        20.00,
        '2024-01-01',
        '2035-12-31'
    ),
    (
        'Deluxe Pool',
        'Exclusive pool services',
        30.00,
        '2024-01-01',
        '2035-12-31'
    ),
    (
        'High-speed Wi-Fi',
        'High-speed Wi-Fi connection',
        10.00,
        '2024-01-01',
        '2035-12-31'
    ),
    (
        'Spa',
        'A luxury spa inside the hotel',
        50.00,
        '2024-01-01',
        '2035-12-31'
    ),
    (
        'Gym',
        'Awesome gym to stay healthy during your stay',
        5.00,
        '2024-01-01',
        '2035-12-31'
    );

-- Reservas
INSERT INTO
    booking (
        user_id,
        plan_id,
        room_id,
        booking_start_date,
        booking_end_date,
        cancellation_deadline,
        is_cancelled
    )
VALUES
    (
        1,
        1,
        1,
        CURDATE() + INTERVAL 2 DAY,
        CURDATE() + INTERVAL 2 DAY,
        CURDATE() + INTERVAL 1 DAY,
        0
    ),
    (
        2,
        1,
        2,
        CURDATE() + INTERVAL 16 DAY,
        CURDATE() + INTERVAL 18 DAY,
        CURDATE() + INTERVAL 1 DAY,
        0
    ),
    (
        3,
        1,
        1,
        CURDATE() + INTERVAL 30 DAY,
        CURDATE() + INTERVAL 31 DAY,
        CURDATE() + INTERVAL 28 DAY,
        0
    );

-- Servicios asociados a reservas
INSERT INTO
    booking_service (booking_id, service_id)
VALUES
    (1, 1),
    (1, 2),
    (2, 3),
    (3, 5);

-- Guests asociados a reservas, como los adultos y niños que hay
INSERT INTO
    booking_guest (booking_id, guest_id)
VALUES
    (1, 1),
    (1, 2),
    (2, 2),
    (3, 3);

-- Condiciones meteorológicas
INSERT INTO
    weather (
        weather_date,
        weather_state
    )
VALUES
    (CURDATE() + INTERVAL 3 DAY, 'Sunny'),
    (CURDATE() + INTERVAL 4 DAY, 'Clouds'),
    (CURDATE() + INTERVAL 5 DAY, 'Rain'),
    (CURDATE() + INTERVAL 6 DAY, 'Rain'),
    (CURDATE() + INTERVAL 7 DAY, 'Rain'),
    (CURDATE() + INTERVAL 8 DAY, 'Sunny');

-- Payment methods
INSERT INTO
    payment_method (id, payment_method_name)
VALUES
    (1, 'Stripe'),
    (2, 'Hotel Reception');

-- Payment (transacciones)
/*
 INSERT INTO
 payment (
 user_id,
 booking_id,
 payment_amount,
 payment_date,
 payment_method_id
 )
 VALUES
 (1, 1, 50.00, '2023-10-23', 1);
 */
-- MEDIAS
INSERT INTO
    media (type, url)
VALUES
    ('image', 'media/img/home-main.webp'),
    ('image', 'media/img/home-secondary.webp'),
    ('image', 'media/img/home-tertiary.webp'),
    ('image', 'media/img/services.webp'),
    ('image', 'media/img/contact.webp'),
    ('image', 'media/img/garden.webp'),
    ('image', 'media/img/swimming-pool.webp'),
    ('image', 'media/img/wifi.webp'),
    ('image', 'media/img/spa.webp'),
    ('image', 'media/img/gym.webp'),
    ('image', 'media/img/room.webp'),
    ('image', 'media/img/room-vip.webp'),
    ('image', 'media/img/plan-basic.webp'),
    ('image', 'media/img/plan-vip.webp'),
    ('image', 'media/img/defaultImage.webp');

/*
 INSERT INTO
 user_media (user_id, media_id)
 VALUES
 (1, 1),
 (2, 1),
 (3, 1);
 */
INSERT INTO
    service_media (service_id, media_id)
VALUES
    (1, 6),
    (2, 7),
    (3, 8),
    (4, 9),
    (5, 10);

INSERT INTO
    room_media (room_id, media_id)
VALUES
    (1, 11),
    (2, 12),
    (3, 11),
    (4, 12),
    (5, 11);

INSERT INTO
    plan_media (plan_id, media_id)
VALUES
    (1, 13),
    (2, 14);

-- Insert promotion
INSERT INTO
    promotion (
        code,
        discount_price,
        name,
        description,
        start_date,
        end_date,
        is_active,
        is_visible
    )
VALUES
    (
        'BLACKFRIDAY',
        20.00,
        'Black Friday Deluxe',
        'Descuento especial exclusivo para estancias de fin de temporada con desayuno incluido.',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL 30 DAY,
        TRUE,
        TRUE
    ),
    (
        'SUMMERVIP',
        15.00,
        'Summer VIP Experience',
        'Rebaja del 15% para reservas anticipadas de verano en cualquiera de nuestras suites.',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL 60 DAY,
        TRUE,
        TRUE
    ),
    (
        'WEEKENDGETAWAY',
        10.00,
        'Escapada de Fin de Semana',
        'Disfruta de un 10% de descuento en estancias de fin de semana con acceso a spa.',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL 45 DAY,
        TRUE,
        TRUE
    ),
    (
        'AURACLIENTEFIDELIDAD',
        25.00,
        'Club Fidelidad Secreto',
        'Cupón exclusivo comunicado directamente por el hotel para huéspedes fieles. Válido pero no listado públicamente.',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL 90 DAY,
        TRUE,
        FALSE
    );

-- Insert promotion
INSERT INTO
    booking_promotion (
        booking_id,
        promotion_id
    )
VALUES
    (1, 1),
    (2, 1),
    (3, 1);

-- PROCEDIMIENTOS
/*
 DELIMITER //
 CREATE PROCEDURE ResetAutoIncrement()
 BEGIN
 DECLARE maxId INT;
 SELECT MAX(id) INTO maxId FROM app_user;
 SET maxId = IFNULL(maxId + 1, 1);
 UPDATE app_user SET AUTO_INCREMENT = maxId;
 END; //
 */
-- TRIGGERS
-- Cancellation date on booking (hasta 3 dias antes del inicio de la estancia)
DELIMITER / /
CREATE TRIGGER before_booking_insert BEFORE
INSERT
    ON booking FOR EACH ROW BEGIN
IF NEW.cancellation_deadline IS NULL THEN
    SET NEW.cancellation_deadline = NEW.booking_start_date - INTERVAL 3 DAY;
END IF;
IF NEW.cancellation_deadline >= NEW.booking_start_date THEN SIGNAL SQLSTATE '45000'
SET
    MESSAGE_TEXT = 'La fecha limite de cancelacion debe ser anterior a la fecha de inicio de la reserva';
END IF;
END;
/ /
