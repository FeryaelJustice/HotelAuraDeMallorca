-- Create the database
CREATE DATABASE IF NOT EXISTS gestortraducciones;

USE gestortraducciones;

-- Create the table users
CREATE TABLE users (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    name VARCHAR(60),
    email VARCHAR(255),
    password VARCHAR(255),
    remember_token VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the table app_page
CREATE TABLE app_page (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    app_page_name VARCHAR(30),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the table lang
CREATE TABLE lang (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    lang_code VARCHAR(6),
    lang_name VARCHAR(30),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the table page_lang
CREATE TABLE app_page_lang (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    app_page_id INT,
    lang_id INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_page_id) REFERENCES app_page(id),
    FOREIGN KEY (lang_id) REFERENCES lang(id)
);

-- Create the table section
CREATE TABLE section (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    app_page_id INT,
    section_name VARCHAR(30),
    section_parent INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_page_id) REFERENCES app_page(id),
    FOREIGN KEY (section_parent) REFERENCES section(id)
);

-- Create the table literal
CREATE TABLE literal (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    literal_text TEXT,
    updated_at TIMESTAMP,
    created_at TIMESTAMP
);

-- Create the table section_literal (Intermediate Table)
CREATE TABLE section_literal (
    section_id INT,
    literal_id INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
        remember_token,
        updated_at,
        created_at
    )
VALUES
    (
        1,
        'Fer',
        'fer@example.com',
        '$2b$10$BW9pwcY1.mHWAlpCTVB7f.8lyaH/5Ad1y02JhFmvZo8JLGWq5STEC',
        '',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

-- INSERTS en la tabla app_page
INSERT INTO
    app_page (id, app_page_name, updated_at, created_at)
VALUES
    (
        1,
        'Homerti',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        2,
        'Vacalia',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        3,
        'Aura de Mallorca',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

-- INSERTS en la tabla lang
INSERT INTO
    lang (id, lang_code, lang_name, updated_at, created_at)
VALUES
    (
        1,
        'en',
        'English',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        2,
        'es',
        'Spanish',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        3,
        'ca',
        'Catalan',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        4,
        'de',
        'German',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

-- INSERTS en la tabla page_lang
INSERT INTO
    app_page_lang (id, app_page_id, lang_id, updated_at, created_at)
VALUES
    (1, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Homerti - English
    (2, 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Homerti - Spanish
    (3, 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Homerti - Catalan
    (4, 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Vacalia - English
    (5, 2, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Vacalia - Spanish
    (6, 2, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Vacalia - Spanish
    (7, 3, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Aura de Mallorca - Spanish
    (8, 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Aura de Mallorca - English
-- INSERTS en la tabla section
INSERT INTO
    section (
        id,
        app_page_id,
        section_name,
        section_parent,
        updated_at,
        created_at
    )
VALUES
    (
        1,
        1,
        'Title',
        NULL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        2,
        1,
        'Header',
        NULL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        3,
        1,
        'Nav',
        2,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        4,
        2,
        'Title',
        NULL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        5,
        2,
        'Header',
        NULL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        6,
        2,
        'Nav',
        5,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        7,
        3,
        'Title',
        NULL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        8,
        3,
        'Header',
        NULL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        9,
        3,
        'Nav',
        8,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        10,
        3,
        'Contact Section',
        NULL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

-- INSERTS en la tabla literal
INSERT INTO
    literal (id, literal_text, updated_at, created_at)
VALUES
    (
        1,
        'Welcome to our website.',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        2,
        'Learn more about us.',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        3,
        'Contact us for inquiries.',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

-- INSERTS en la tabla section_literal
INSERT INTO
    section_literal (section_id, literal_id, updated_at, created_at)
VALUES
    (1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Title - Welcome
    (2, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Header - Learn more
    (3, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Nav - Contact us
    (4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Title - Welcome
    (5, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Header - Welcome
    (6, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Nav - Welcome
    (7, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Title - Welcome
    (8, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Header - Welcome
    (9, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Nav - Welcome
    (10, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Contact Section - Contact us