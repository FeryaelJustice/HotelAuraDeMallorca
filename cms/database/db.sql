-- Create the database
CREATE DATABASE IF NOT EXISTS gestortraducciones;

USE gestortraducciones;

-- Create the table users
CREATE TABLE users (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    name VARCHAR(60),
    email VARCHAR(255),
    password VARCHAR(255),
    updated_at VARCHAR(255),
    created_at TIMESTAMP,
    remember_token VARCHAR(255)
);

-- Create the table app_page
CREATE TABLE app_page (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    app_page_name VARCHAR(30)
);

-- Create the table lang
CREATE TABLE lang (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    lang_code VARCHAR(6),
    lang_name VARCHAR(30)
);

-- Create the table page_lang
CREATE TABLE app_page_lang (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    app_page_id INT,
    lang_id INT,
    FOREIGN KEY (app_page_id) REFERENCES app_page(id),
    FOREIGN KEY (lang_id) REFERENCES lang(id)
);

-- Create the table section
CREATE TABLE section (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    app_page_id INT,
    section_name VARCHAR(30),
    section_parent INT,
    FOREIGN KEY (app_page_id) REFERENCES app_page(id),
    FOREIGN KEY (section_parent) REFERENCES section(id)
);

-- Create the table literal
CREATE TABLE literal (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    literal_text TEXT
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
    users (
        id,
        name,
        email,
        password,
        updated_at,
        created_at,
        remember_token
    )
VALUES
    (
        1,
        'Fer',
        'fer@example.com',
        '$2b$10$BW9pwcY1.mHWAlpCTVB7f.8lyaH/5Ad1y02JhFmvZo8JLGWq5STEC',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        ''
    );

-- INSERTS en la tabla app_page
INSERT INTO
    app_page (id, app_page_name)
VALUES
    (1, 'Homerti'),
    (2, 'Vacalia'),
    (3, 'Aura de Mallorca');

-- INSERTS en la tabla lang
INSERT INTO
    lang (id, lang_code, lang_name)
VALUES
    (1, 'en', 'English'),
    (2, 'es', 'Spanish'),
    (3, 'ca', 'Catalan'),
    (4, 'de', 'German');

-- INSERTS en la tabla page_lang
INSERT INTO
    app_page_lang (id, app_page_id, lang_id)
VALUES
    (1, 1, 1),
    -- Homerti - English
    (2, 1, 2),
    -- Homerti - Spanish
    (3, 1, 3),
    -- Homerti - Catalan
    (4, 2, 1),
    -- Vacalia - English
    (5, 2, 2),
    -- Vacalia - Spanish
    (6, 2, 3),
    -- Vacalia - Spanish
    (7, 3, 2),
    -- Aura de Mallorca - Spanish
    (8, 3, 1);

-- Aura de Mallorca - English
-- INSERTS en la tabla section
INSERT INTO
    section (id, app_page_id, section_name, section_parent)
VALUES
    (1, 1, 'Title', NULL),
    (2, 1, 'Header', NULL),
    (3, 1, 'Nav', 2),
    (4, 2, 'Title', NULL),
    (5, 2, 'Header', NULL),
    (6, 2, 'Nav', 5),
    (7, 3, 'Title', NULL),
    (8, 3, 'Header', NULL),
    (9, 3, 'Nav', 8),
    (10, 3, 'Contact Section', NULL);

-- INSERTS en la tabla literal
INSERT INTO
    literal (id, literal_text)
VALUES
    (1, 'Welcome to our website.'),
    (2, 'Learn more about us.'),
    (3, 'Contact us for inquiries.');

-- INSERTS en la tabla section_literal
INSERT INTO
    section_literal (section_id, literal_id)
VALUES
    (1, 1),
    -- Title - Welcome
    (2, 2),
    -- Header - Learn more
    (3, 3),
    -- Nav - Contact us
    (4, 1),
    -- Title - Welcome
    (5, 2),
    -- Header - Welcome
    (6, 3),
    -- Nav - Welcome
    (7, 1),
    -- Title - Welcome
    (8, 2),
    -- Header - Welcome
    (9, 3),
    -- Nav - Welcome
    (10, 3);

-- Contact Section - Contact us