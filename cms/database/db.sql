-- Create the database
CREATE DATABASE IF NOT EXISTS gestortraducciones;

USE gestortraducciones;

-- Create the table users
CREATE TABLE users (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    name VARCHAR(60),
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
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

-- Create the table section
CREATE TABLE section (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    app_page_id INT NOT NULL,
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
    code VARCHAR(255) NOT NULL,
    content TEXT,
    lang_code VARCHAR(3) NOT NULL,
    section_id INT NOT NULL,
    page_id INT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_code_page_lang (code, page_id, lang_code),
    FOREIGN KEY (section_id) REFERENCES section(id),
    FOREIGN KEY (page_id) REFERENCES app_page(id)
);

-- INSERTS of example data
INSERT INTO
    users (
        name,
        email,
        password,
        remember_token
    )
VALUES
    (
        'Fer',
        'fer@example.com',
        '$2b$10$BW9pwcY1.mHWAlpCTVB7f.8lyaH/5Ad1y02JhFmvZo8JLGWq5STEC',
        ''
    );

-- INSERTS en la tabla app_page
INSERT INTO
    app_page (app_page_name)
VALUES
    ('Homerti'),
    ('Vacalia'),
    ('Aura de Mallorca'),
    ('Intranet Vacalia');

-- INSERTS en la tabla lang
INSERT INTO
    lang (lang_code, lang_name)
VALUES
    ('en', 'English'),
    ('es', 'Spanish'),
    ('ca', 'Catalan'),
    ('de', 'German');

-- Aura de Mallorca - German
-- INSERTS en la tabla section
INSERT INTO
    section (
        app_page_id,
        section_name,
        section_parent
    )
VALUES
    (
        1,
        'Title',
        NULL
    ),
    (
        1,
        'Header',
        NULL
    ),
    (1, 'Nav', 2),
    (1, 'Body', NULL),
    (1, 'Contact', NULL),
    (
        2,
        'Title',
        NULL
    ),
    (
        2,
        'Header',
        NULL
    ),
    (2, 'Nav', 7),
    (2, 'Body', NULL),
    (2, 'Contact', NULL),
    (
        3,
        'Title',
        NULL
    ),
    (
        3,
        'Header',
        NULL
    ),
    (3, 'Nav', 11),
    (3, 'Body', NULL),
    (3, 'Contact', NULL),
    (4, 'Title', NULL),
    (4, 'Header', NULL),
    (4, 'Nav', 16),
    (4, 'Body', NULL),
    (4, 'Contact', NULL)
;

-- INSERTS en la tabla literal
INSERT INTO
    literal (code, content, lang_code, section_id, page_id)
VALUES
    -- ENGLISH
    (
        'app_name',
        'Homerti',
        'en',
        1,
        1
    ),
    (
        'header',
        'Learn more about us.',
        'en',
        2,
        1
    ),
    (
        'nav',
        'Navigate.',
        'en',
        3,
        1
    ),
    (
        'title',
        'Welcome.',
        'en',
        4,
        1
    ),
    (
        'contact',
        'Contact us for inquiries.',
        'en',
        5,
        1
    ),
    (
        'app_name',
        'Vacalia',
        'en',
        6,
        2
    ),
    (
        'header',
        'Learn more about us.',
        'en',
        7,
        2
    ),
    (
        'nav',
        'Navigate.',
        'en',
        8,
        2
    ),
    (
        'title',
        'Welcome.',
        'en',
        9,
        2
    ),
    (
        'contact',
        'Contact us for inquiries.',
        'en',
        10,
        2
    ),
    (
        'app_name',
        'Aura de Mallorca',
        'en',
        11,
        3
    ),
    (
        'header',
        'Learn more about us.',
        'en',
        12,
        3
    ),
    (
        'nav',
        'Navigate.',
        'en',
        13,
        3
    ),
    (
        'title',
        'Welcome.',
        'en',
        14,
        3
    ),
    (
        'contact',
        'Contact us for inquiries.',
        'en',
        15,
        3
    ),
    (
        'app_name',
        'Intranet Vacalia',
        'en',
        16,
        4
    ),
    (
        'header',
        'Learn more about us.',
        'en',
        17,
        4
    ),
    (
        'nav',
        'Navigate.',
        'en',
        18,
        4
    ),
    (
        'title',
        'Welcome.',
        'en',
        19,
        4
    ),
    (
        'contact',
        'Contact us for inquiries.',
        'en',
        20,
        4
    ),
    -- ESPAÑOL
    (
        'app_name',
        'Homerti',
        'es',
        1,
        1
    ),
    (
        'header',
        'Saber más sobre nosotros.',
        'es',
        2,
        1
    ),
    (
        'nav',
        'Navega.',
        'es',
        3,
        1
    ),
    (
        'title',
        'Bienvenido.',
        'es',
        4,
        1
    ),
    (
        'contact',
        'Contactanos.',
        'es',
        5,
        1
    ),
    (
        'app_name',
        'Vacalia',
        'es',
        6,
        2
    ),
    (
        'header',
        'Saber más sobre nosotros.',
        'es',
        7,
        2
    ),
    (
        'nav',
        'Navega',
        'es',
        8,
        2
    ),
    (
        'title',
        'Bienvenido.',
        'es',
        9,
        2
    ),
    (
        'contact',
        'Contactanos.',
        'es',
        10,
        2
    ),
    (
        'app_name',
        'Aura de Mallorca',
        'es',
        11,
        3
    ),
    (
        'header',
        'Saber más sobre nosotros.',
        'es',
        12,
        3
    ),
    (
        'nav',
        'Navega.',
        'es',
        13,
        3
    ),
    (
        'title',
        'Bienvenido.',
        'es',
        14,
        3
    ),
    (
        'contact',
        'Contactanos.',
        'es',
        15,
        3
    ),
    (
        'app_name',
        'Intranet Vacalia',
        'es',
        16,
        4
    ),
    (
        'header',
        'Saber más sobre nosotros.',
        'es',
        17,
        4
    ),
    (
        'nav',
        'Navega.',
        'es',
        18,
        4
    ),
    (
        'title',
        'Bienvenido.',
        'es',
        19,
        4
    ),
    (
        'contact',
        'Contactanos.',
        'es',
        20,
        4
    ),
    -- CATALAN
    (
        'app_name',
        'Homerti',
        'ca',
        1,
        1
    ),
    (
        'header',
        'Sebre més sobre nosaltres.',
        'ca',
        2,
        1
    ),
    (
        'nav',
        'Naviga.',
        'ca',
        3,
        1
    ),
    (
        'title',
        'Benvingut.',
        'ca',
        4,
        1
    ),
    (
        'contact',
        'Contacteu-nos.',
        'ca',
        5,
        1
    ),
    (
        'app_name',
        'Vacalia',
        'ca',
        6,
        2
    ),
    (
        'header',
        'Sebre més sobre nosaltres.',
        'ca',
        7,
        2
    ),
    (
        'nav',
        'Naviga.',
        'ca',
        8,
        2
    ),
    (
        'title',
        'Benvingut.',
        'ca',
        9,
        2
    ),
    (
        'contact',
        'Contacteu-nos.',
        'ca',
        10,
        2
    ),
    (
        'app_name',
        'Aura de Mallorca',
        'ca',
        11,
        3
    ),
    (
        'header',
        'Sebre més sobre nosaltres.',
        'ca',
        12,
        3
    ),
    (
        'nav',
        'Naviga.',
        'ca',
        13,
        3
    ),
    (
        'title',
        'Benvingut.',
        'ca',
        14,
        3
    ),
    (
        'contact',
        'Contacteu-nos.',
        'ca',
        15,
        3
    ),
    (
        'app_name',
        'Intranet Vacalia',
        'ca',
        16,
        4
    ),
    (
        'header',
        'Sebre més sobre nosaltres.',
        'ca',
        17,
        4
    ),
    (
        'nav',
        'Naviga.',
        'ca',
        18,
        4
    ),
    (
        'title',
        'Benvingut.',
        'ca',
        19,
        4
    ),
    (
        'contact',
        'Contacteu-nos.',
        'ca',
        20,
        4
    ),
    -- ALEMAN
    (
        'app_name',
        'Homerti',
        'de',
        1,
        1
    ),
    (
        'header',
        'Lerne mehr über uns.',
        'de',
        2,
        1
    ),
    (
        'navig',
        'Navigieren.',
        'de',
        3,
        1
    ),
    (
        'title',
        'Willkommen.',
        'de',
        4,
        1
    ),
    (
        'contact',
        'Kontaktiere uns.',
        'de',
        5,
        1
    ),
    (
        'app_name',
        'Vacalia',
        'de',
        6,
        2
    ),
    (
        'header',
        'Lerne mehr über uns.',
        'de',
        7,
        2
    ),
    (
        'navig',
        'Navigieren.',
        'de',
        8,
        2
    ),
    (
        'title',
        'Willkommen.',
        'de',
        9,
        2
    ),
    (
        'contact',
        'Kontaktiere uns.',
        'de',
        10,
        2
    ),
    (
        'app_name',
        'Aura de Mallorca',
        'de',
        11,
        3
    ),
    (
        'header',
        'Lerne mehr über uns.',
        'de',
        12,
        3
    ),
    (
        'navig',
        'Navigieren.',
        'de',
        13,
        3
    ),
    (
        'title',
        'Willkommen.',
        'de',
        14,
        3
    ),
    (
        'contact',
        'Kontaktiere uns.',
        'de',
        15,
        3
    ),
    (
        'app_name',
        'Intranet Vacalia',
        'de',
        16,
        4
    ),
    (
        'header',
        'Lerne mehr über uns.',
        'de',
        17,
        4
    ),
    (
        'nav',
        'Navigieren.',
        'de',
        18,
        4
    ),
    (
        'title',
        'Willkommen.',
        'de',
        19,
        4
    ),
    (
        'contact',
        'Kontaktiere uns.',
        'de',
        20,
        4
    )
;