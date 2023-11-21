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
    (2, 'Nav', 5),
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
    (3, 'Nav', 8),
    (
        3,
        'Contact Section',
        NULL
    ),
    (4, 'Title', NULL),
    (4, 'Header', NULL),
    (4, 'Nav', 12),
    (4, 'Contact Section', NULL);

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
        'title',
        'Welcome.',
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
        'Contact us for inquiries.',
        'en',
        3,
        1
    ),
    (
        'app_name',
        'Vacalia',
        'en',
        4,
        2
    ),
    (
        'title',
        'Welcome.',
        'en',
        4,
        2
    ),
    (
        'header',
        'Learn more about us.',
        'en',
        5,
        2
    ),
    (
        'nav',
        'Contact us for inquiries.',
        'en',
        6,
        2
    ),
    (
        'app_name',
        'Aura de Mallorca',
        'en',
        7,
        3
    ),
    (
        'title',
        'Welcome.',
        'en',
        7,
        3
    ),
    (
        'header',
        'Learn more about us.',
        'en',
        8,
        3
    ),
    (
        'nav',
        'Contact us for inquiries.',
        'en',
        9,
        3
    ),
    (
        'contact',
        'Contact us.',
        'en',
        10,
        3
    ),
    (
        'app_name',
        'Intranet Vacalia',
        'en',
        11,
        4
    ),
    (
        'title',
        'Welcome.',
        'en',
        11,
        4
    ),
    (
        'header',
        'Learn more about us.',
        'en',
        12,
        4
    ),
    (
        'nav',
        'Contact us for inquiries.',
        'en',
        13,
        4
    ),
    (
        'contact',
        'Contact us.',
        'en',
        10,
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
        'titulo',
        'Bienvenido.',
        'es',
        1,
        1
    ),
    (
        'encabezamiento',
        'Saber más sobre nosotros.',
        'es',
        2,
        1
    ),
    (
        'navegacion',
        'Contáctanos.',
        'es',
        3,
        1
    ),
    (
        'app_name',
        'Vacalia',
        'es',
        4,
        2
    ),
    (
        'titulo',
        'Bienvenido.',
        'es',
        4,
        2
    ),
    (
        'encabezamiento',
        'Saber más sobre nosotros.',
        'es',
        5,
        2
    ),
    (
        'navegacion',
        'Contáctanos',
        'es',
        6,
        2
    ),
    (
        'app_name',
        'Aura de Mallorca',
        'es',
        7,
        3
    ),
    (
        'titulo',
        'Bienvenido.',
        'es',
        7,
        3
    ),
    (
        'encabezamiento',
        'Saber más sobre nosotros.',
        'es',
        8,
        3
    ),
    (
        'navegacion',
        'Contáctanos.',
        'es',
        9,
        3
    ),
    (
        'contacto',
        'Contactanos.',
        'es',
        10,
        3
    ),
    (
        'app_name',
        'Intranet Vacalia',
        'es',
        11,
        4
    ),
    (
        'title',
        'Bienvenido.',
        'es',
        11,
        4
    ),
    (
        'header',
        'Saber más sobre nosotros.',
        'es',
        12,
        4
    ),
    (
        'nav',
        'Contáctanos.',
        'es',
        13,
        4
    ),
    (
        'contacto',
        'Contactanos.',
        'es',
        14,
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
        'titol',
        'Benvingut.',
        'ca',
        1,
        1
    ),
    (
        'encapcalament',
        'Sebre més sobre nosaltres.',
        'ca',
        2,
        1
    ),
    (
        'navigacio',
        'Contacteu-nos.',
        'ca',
        3,
        1
    ),
    (
        'app_name',
        'Vacalia',
        'ca',
        4,
        2
    ),
    (
        'titol',
        'Benvingut.',
        'ca',
        4,
        2
    ),
    (
        'encapcalament',
        'Sebre més sobre nosaltres.',
        'ca',
        5,
        2
    ),
    (
        'navigacio',
        'Contacteu-nos.',
        'ca',
        6,
        2
    ),
    (
        'app_name',
        'Aura de Mallorca',
        'ca',
        7,
        3
    ),
    (
        'titol',
        'Benvingut.',
        'ca',
        7,
        3
    ),
    (
        'encapcalament',
        'Sebre més sobre nosaltres.',
        'ca',
        8,
        3
    ),
    (
        'navigacio',
        'Contacteu-nos.',
        'ca',
        9,
        3
    ),
    (
        'contacte',
        'Contacteu-nos.',
        'ca',
        10,
        3
    ),
    (
        'app_name',
        'Intranet Vacalia',
        'ca',
        11,
        4
    ),
    (
        'title',
        'Benvingut.',
        'ca',
        11,
        4
    ),
    (
        'header',
        'Sebre més sobre nosaltres.',
        'ca',
        12,
        4
    ),
    (
        'nav',
        'Contacteu-nos.',
        'ca',
        13,
        4
    ),
    (
        'contacte',
        'Contacteu-nos.',
        'ca',
        14,
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
        'titel',
        'Willkommen.',
        'de',
        1,
        1
    ),
    (
        'headerr',
        'Lerne mehr über uns.',
        'de',
        2,
        1
    ),
    (
        'navig',
        'Kontaktieren Sie uns für Anfragen.',
        'de',
        3,
        1
    ),
    (
        'app_name',
        'Vacalia',
        'de',
        4,
        2
    ),
    (
        'titel',
        'Willkommen.',
        'de',
        4,
        2
    ),
    (
        'headerr',
        'Lerne mehr über uns.',
        'de',
        5,
        2
    ),
    (
        'navig',
        'Kontaktieren Sie uns für Anfragen.',
        'de',
        6,
        2
    ),
    (
        'app_name',
        'Aura de Mallorca',
        'de',
        7,
        3
    ),
    (
        'titel',
        'Willkommen.',
        'de',
        8,
        3
    ),
    (
        'headerr',
        'Lerne mehr über uns.',
        'de',
        9,
        3
    ),
    (
        'navig',
        'Kontaktieren Sie uns für Anfragen.',
        'de',
        10,
        3
    ),
    (
        'kontakt',
        'Kontaktiere uns.',
        'de',
        10,
        3
    ),
    (
        'app_name',
        'Intranet Vacalia',
        'de',
        11,
        4
    ),
    (
        'title',
        'Willkommen.',
        'de',
        11,
        4
    ),
    (
        'header',
        'Lerne mehr über uns.',
        'de',
        12,
        4
    ),
    (
        'nav',
        'Kontaktieren Sie uns für Anfragen.',
        'de',
        13,
        4
    ),
    (
        'kontakt',
        'Kontaktiere uns.',
        'de',
        14,
        4
    );