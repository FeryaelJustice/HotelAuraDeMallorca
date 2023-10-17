-- Create the database
CREATE DATABASE IF NOT EXISTS hotelaurademallorca;

USE hotelaurademallorca;

-- Create the table app_user
CREATE TABLE app_user (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    user_name VARCHAR(255),
    user_surnames VARCHAR(255),
    user_email VARCHAR(255),
    user_password_hash VARCHAR(255),
    user_verified BOOLEAN
);

-- Create the table app_user
CREATE TABLE guest (
    id INT(11) PRIMARY KEY NOT NULL AUTO_INCREMENT,
    guest_name VARCHAR(255),
    guest_surnames VARCHAR(255),
    guest_email VARCHAR(255),
    isAdult CHAR(1) NOT NULL
);

-- Create the table role
CREATE TABLE role (
    id INT PRIMARY KEY,
    name ENUM('CLIENT', 'ADMIN', 'EMPLOYEE') NOT NULL
);

-- Create the table user_role
CREATE TABLE user_role (
    user_id INT,
    role_id INT,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES app_user(id),
    FOREIGN KEY (role_id) REFERENCES role(id)
);

-- Create the table plan
CREATE TABLE plan (
    id INT PRIMARY KEY,
    plan_name VARCHAR(255),
    plan_description TEXT,
    plan_price DECIMAL(10, 2)
);

-- Create the table room
CREATE TABLE room (
    id INT PRIMARY KEY,
    room_name VARCHAR(255),
    room_description TEXT,
    room_price DECIMAL(10, 2),
    room_availability_start DATE,
    room_availability_end DATE
);

-- Create the table service
CREATE TABLE service (
    id INT PRIMARY KEY,
    serv_name VARCHAR(255),
    serv_description TEXT,
    serv_price DECIMAL(10, 2),
    serv_availability_start DATE,
    serv_availability_end DATE
);

-- Create the table booking
CREATE TABLE booking (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    user_id INT,
    plan_id INT,
    room_id INT,
    booking_start_date DATE,
    booking_end_date DATE,
    FOREIGN KEY (user_id) REFERENCES app_user(id),
    FOREIGN KEY (plan_id) REFERENCES plan(id),
    FOREIGN KEY (room_id) REFERENCES room(id)
);

-- Create the table booking_service
CREATE TABLE booking_service (
    booking_id INT,
    service_id INT,
    PRIMARY KEY (booking_id, service_id),
    FOREIGN KEY (booking_id) REFERENCES booking(id),
    FOREIGN KEY (service_id) REFERENCES service(id)
);

-- Create the table booking_detail
CREATE TABLE booking_detail (
    booking_id INT,
    adults INT,
    children INT,
    PRIMARY KEY (booking_id),
    FOREIGN KEY (booking_id) REFERENCES booking(id)
);

-- Create the table booking_guests
CREATE TABLE booking_guest (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    booking_id INT,
    guest_id INT,
    FOREIGN KEY (booking_id) REFERENCES booking(id),
    FOREIGN KEY (guest_id) REFERENCES guest(id)
);

-- Create the table weather
CREATE TABLE weather (
    id INT PRIMARY KEY,
    weather_date DATE,
    weather_state VARCHAR(255),
    affected_service_id INT,
    FOREIGN KEY (affected_service_id) REFERENCES service(id)
);

-- Create the table payment method
CREATE TABLE payment_method (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    payment_method_name VARCHAR(255)
);

-- Create the table payment (transaction)
CREATE TABLE payment (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    user_id INT,
    booking_id INT,
    payment_amount DECIMAL(10, 2),
    payment_date DATE,
    payment_method_id INT,
    FOREIGN KEY (user_id) REFERENCES app_user(id),
    FOREIGN KEY (booking_id) REFERENCES booking(id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_method(id)
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
        user_password_hash,
        user_verified
    )
VALUES
    (
        'John Doe',
        'Gonzalez Serr',
        'john@example.com',
        '$2b$10$BW9pwcY1.mHWAlpCTVB7f.8lyaH/5Ad1y02JhFmvZo8JLGWq5STEC',
        true
    ),
    (
        'Jane Smith',
        'Gonzalez Serr',
        'jane@example.com',
        '$2b$10$BW9pwcY1.mHWAlpCTVB7f.8lyaH/5Ad1y02JhFmvZo8JLGWq5STEC',
        false
    ),
    (
        'Fer',
        'Gonzalez Serr',
        'fer@example.com',
        '$2b$10$BW9pwcY1.mHWAlpCTVB7f.8lyaH/5Ad1y02JhFmvZo8JLGWq5STEC',
        false
    );

INSERT INTO
    guest (
        guest_name,
        guest_surnames,
        guest_email,
        isAdult
    )
VALUES
    (
        'John Doe',
        'Gonzalez Serr',
        'john@example.com',
        1
    ),
    (
        'Jane Smith',
        'Gonzalez Serr',
        'jane@example.com',
        0
    ),
    (
        'Fer',
        'Gonzalez Serr',
        'fer@example.com',
        1
    );

INSERT INTO
    role (id, name)
VALUES
    (1, 'CLIENT'),
    (2, 'ADMIN'),
    (3, 'EMPLOYEE');

INSERT INTO
    user_role (user_id, role_id)
VALUES
    (1, 2),
    (1, 3),
    (2, 1),
    (3, 1),
    (3, 2),
    (3, 3);

-- Planes
INSERT INTO
    plan (id, plan_name, plan_description, plan_price)
VALUES
    (
        1,
        'Basic',
        'Basic plan without extra services',
        50.00
    ),
    (
        2,
        'VIP',
        'VIP plan with all luxury services included',
        150.00
    );

-- Habitaciones
INSERT INTO
    room (
        id,
        room_name,
        room_description,
        room_price,
        room_availability_start,
        room_availability_end
    )
VALUES
    (
        1,
        'Standard Room',
        'Standard room with sea view',
        80.00,
        '2023-10-15',
        '2023-12-15'
    ),
    (
        2,
        'VIP Suite',
        'VIP suite with luxury services',
        200.00,
        '2023-10-01',
        '2023-12-31'
    );

-- Servicios
INSERT INTO
    service (
        id,
        serv_name,
        serv_description,
        serv_price,
        serv_availability_start,
        serv_availability_end
    )
VALUES
    (
        1,
        'Luxury Garden',
        'Premium garden services',
        20.00,
        '2023-10-15',
        '2023-12-15'
    ),
    (
        2,
        'Deluxe Pool',
        'Exclusive pool services',
        30.00,
        '2023-10-01',
        '2023-12-31'
    ),
    (
        3,
        'High-speed Wi-Fi',
        'High-speed Wi-Fi connection',
        10.00,
        '2023-10-01',
        '2023-12-31'
    );

-- Reservas
INSERT INTO
    booking (
        id,
        user_id,
        plan_id,
        room_id,
        booking_start_date,
        booking_end_date
    )
VALUES
    (1, 1, 1, 1, '2023-10-20', '2023-10-25'),
    (2, 2, 2, 2, '2023-11-01', '2023-11-10');

-- Servicios asociados a reservas
INSERT INTO
    booking_service (booking_id, service_id)
VALUES
    (1, 1),
    (1, 2),
    (2, 3);

-- Detalles asociados a reservas, como los adultos y niños que hay
INSERT INTO
    booking_detail (booking_id, adults, children)
VALUES
    (1, 2, 1),
    (2, 2, 2);

-- Guests asociados a reservas, como los adultos y niños que hay
INSERT INTO
    booking_guest (booking_id, guest_id)
VALUES
    (1, 1),
    (1, 2),
    (1, 3),
    (2, 3);

-- Condiciones meteorológicas
INSERT INTO
    weather (
        id,
        weather_date,
        weather_state,
        affected_service_id
    )
VALUES
    (1, '2023-10-22', 'Sunny', 1),
    (2, '2023-11-05', 'Rainy', 3);

-- Payment methods
INSERT INTO
    payment_method (id, payment_method_name)
VALUES
    (1, 'Stripe');

-- Payment (transacciones)
INSERT INTO
    payment (
        id,
        user_id,
        booking_id,
        payment_amount,
        payment_date,
        payment_method_id
    )
VALUES
    (1, 1, 1, 50.00, '2023-10-23', 1),
    (2, 2, 2, 150.00, '2023-11-10', 1);

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