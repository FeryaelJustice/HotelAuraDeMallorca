-- Create the database
CREATE DATABASE IF NOT EXISTS gestortraducciones;

USE gestortraducciones;

-- Create the table app_user
CREATE TABLE app_user (
    id INT PRIMARY KEY,
    user_name VARCHAR(60),
    user_surnames VARCHAR(255),
    user_email VARCHAR(255),
    user_password_hash VARCHAR(255),
    user_verified BOOLEAN
);

-- Create the table page
CREATE TABLE page (
    id INT PRIMARY KEY,
    page_name VARCHAR(30)
);

-- Create the table language
CREATE TABLE language (
    id INT PRIMARY KEY,
    language_code VARCHAR(6),
    language_name VARCHAR(30),
);

-- Create the table page_language
CREATE TABLE page_language (
    page_id INT,
    language_id,
    PRIMARY KEY (page_id, language_id),
    FOREIGN KEY (page_id) REFERENCES page(id),
    FOREIGN KEY (language_id) REFERENCES language(id)
);

-- Create the table section
CREATE TABLE section (
    id INT PRIMARY KEY,
    page_id INT,
    section_name VARCHAR(30),
    section_parent INT,
    FOREIGN KEY (page_id) REFERENCES page(id),
    FOREIGN KEY (section_parent) REFERENCES section(id)
);

-- Create the table literal
CREATE TABLE literal (
    id INT PRIMARY KEY,
    literal_text TEXT,
);

-- Create the table section_literal (Intermediate Table)
CREATE TABLE section_literal (
    section_id INT,
    literal_id INT,
    PRIMARY KEY (section_id, literal_id),
    FOREIGN KEY (section_id) REFERENCES section(id),
    FOREIGN KEY (literal_id) REFERENCES literal(id)
);

-- INSERTS of example data
INSERT INTO
    app_user (
        id,
        user_name,
        user_surnames,
        user_email,
        user_password_hash,
        user_verified
    )
VALUES
    (
        1,
        'Fer',
        'Gonzalez Serr',
        'fer@example.com',
        '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
        false
    );

-- Servicios asociados a reservas
INSERT INTO
    booking_service (booking_id, service_id)
VALUES
    (1, 1),
    (1, 2),
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

-- Payment (transacciones)
INSERT INTO
    payment (
        id,
        user_id,
        booking_id,
        payment_amount,
        payment_date
    )
VALUES
    (1, 1, 1, 50.00, '2023-10-23'),
    (2, 2, 2, 150.00, '2023-11-10');