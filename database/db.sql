-- Create the database
CREATE DATABASE IF NOT EXISTS hotelaurademallorca;

USE hotelaurademallorca;

-- Create the table app_user
CREATE TABLE app_user (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    user_name VARCHAR(255),
    user_surnames VARCHAR(255),
    user_email VARCHAR(255) NOT NULL UNIQUE,
    user_dni VARCHAR(10) NOT NULL UNIQUE,
    user_password VARCHAR(255),
    user_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_token_expiry TIMESTAMP,
    access_token VARCHAR(255) DEFAULT NULL,
    reset_token VARCHAR(255) DEFAULT NULL,
    reset_token_expiry TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    isEnabled BOOLEAN DEFAULT TRUE,
    enabledByAdmin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT unique_user UNIQUE (user_email, user_dni)
);

-- Create the table app_user
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

-- Create the table role
CREATE TABLE role (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    name ENUM('CLIENT', 'ADMIN', 'EMPLOYEE') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create the table user_role
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

-- Create the table plan
CREATE TABLE plan (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    plan_name VARCHAR(255),
    plan_description TEXT,
    plan_price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create the table room
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

-- Create the table service
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

-- Create the table booking
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

-- Create the table booking_service
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

-- Create the table booking_guests
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

-- Create the table promotions
CREATE TABLE promotion (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    code VARCHAR(255) UNIQUE NOT NULL,
    discount_price DECIMAL(5, 2) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE
);

-- Create the table booking_promotion
CREATE TABLE booking_promotion (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    booking_id INT,
    promotion_id INT,
    FOREIGN KEY (booking_id) REFERENCES booking(id) ON DELETE CASCADE,
    FOREIGN KEY (promotion_id) REFERENCES promotion(id) ON DELETE
    SET
        NULL
);

-- Create the table user_booking_count
CREATE TABLE user_booking_count (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    user_id INT,
    booking_count INT DEFAULT 0,
    UNIQUE KEY (user_id),
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
);

-- Create the table user_promotion (link user to promotions to check validity only for that user)
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

-- Create the table weather
CREATE TABLE weather (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    weather_date DATE,
    weather_state VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create the table payment method
CREATE TABLE payment_method (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    payment_method_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create the table payment (transaction)
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

-- Create the table payment_transaction (link payments to real transactions from payment platforms)
CREATE TABLE payment_transaction (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    payment_id INT DEFAULT NULL,
    transaction_id VARCHAR(255) DEFAULT NULL
);

-- MEDIAS
CREATE TABLE media (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    type ENUM ('image', 'video') DEFAULT 'image' NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_media (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    media_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
);

CREATE TABLE service_media (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    service_id INT NOT NULL,
    media_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES service(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
);

CREATE TABLE room_media (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    room_id INT NOT NULL,
    media_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES room(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
);

CREATE TABLE plan_media (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    plan_id INT NOT NULL,
    media_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plan(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
);

-- RESTRICTIONS
ALTER TABLE
    `app_user`
ADD
    UNIQUE INDEX `user_id_UNIQUE` (`id` ASC);

ALTER TABLE
    `guest`
ADD
    UNIQUE INDEX `guest_id_UNIQUE` (`id` ASC);

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
        '2023-10-15',
        '2023-12-31'
    ),
    (
        'VIP Suite',
        'VIP suite with luxury services',
        200.00,
        '2023-12-01',
        '2024-03-31'
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
        '2023-10-27',
        '2023-12-31'
    ),
    (
        'Deluxe Pool',
        'Exclusive pool services',
        30.00,
        '2023-11-01',
        '2024-01-06'
    ),
    (
        'High-speed Wi-Fi',
        'High-speed Wi-Fi connection',
        10.00,
        '2023-12-01',
        '2024-02-28'
    ),
    (
        'Spa',
        'A luxury spa inside the hotel',
        50.00,
        '2023-12-11',
        '2024-03-06'
    ),
    (
        'Gym',
        'Awesome gym to stay healthy during your stay',
        5.00,
        '2023-11-18',
        '2024-04-23'
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
    payment_method (payment_method_name)
VALUES
    ('Stripe');

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
    (2, 12);

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
        end_date
    )
VALUES
    (
        'BLACKFRIDAY',
        20.00,
        'Black Friday',
        'Exclusive Black Friday discount!',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL 4 DAY
    ),
    (
        'SUMMER2023',
        15.00,
        'Summer Discount',
        'Get 15% off on your stay!',
        CURRENT_DATE + INTERVAL 10 DAY,
        CURRENT_DATE + INTERVAL 14 DAY
    ),
    (
        'WEEKENDGETAWAY',
        10.00,
        'Weekend Getaway',
        'Enjoy a 10% discount for weekend stays!',
        CURRENT_DATE + INTERVAL 12 DAY,
        CURRENT_DATE + INTERVAL 16 DAY
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
-- Cancellation date on booking
DELIMITER / / CREATE TRIGGER before_booking_insert BEFORE
INSERT
    ON booking FOR EACH ROW BEGIN
SET
    NEW.cancellation_deadline = NEW.created_at + INTERVAL 24 HOUR;

IF NEW.cancellation_deadline >= NEW.booking_start_date THEN SIGNAL SQLSTATE '45000'
SET
    MESSAGE_TEXT = 'La fecha límite de cancelación debe ser anterior a la fecha de inicio de la reserva';

END IF;

END;

/ /