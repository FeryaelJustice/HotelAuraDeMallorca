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

-- Create the table page_lang
CREATE TABLE app_page_lang (
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    app_page_id INT NOT NULL,
    lang_id INT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_page_id) REFERENCES app_page(id),
    FOREIGN KEY (lang_id) REFERENCES lang(id)
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
    UNIQUE KEY unique_code_page (code, page_id),
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
    ('Aura de Mallorca');

-- INSERTS en la tabla lang
INSERT INTO
    lang (lang_code, lang_name)
VALUES
    ('en', 'English'),
    ('es', 'Spanish'),
    ('ca', 'Catalan'),
    ('de', 'German');

-- INSERTS en la tabla page_lang
INSERT INTO
    app_page_lang (app_page_id, lang_id)
VALUES
    (1, 1),
    -- Homerti - English
    (1, 2),
    -- Homerti - Spanish
    (1, 3),
    -- Homerti - Catalan
    (1, 4),
    -- Homerti - German
    (2, 1),
    -- Vacalia - English
    (2, 2),
    -- Vacalia - Spanish
    (2, 3),
    -- Vacalia - Catalan
    (2, 4),
    -- Vacalia - German
    (3, 1),
    -- Aura de Mallorca - English
    (3, 2),
    -- Aura de Mallorca - Spanish
    (3, 3),
    -- Aura de Mallorca - Catalan
    (3, 4);

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
    );

-- INSERTS en la tabla literal
INSERT INTO
    literal (code, content, lang_code, section_id, page_id)
VALUES
    -- ENGLISH
    (
        'title',
        'Welcome to our website.',
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
        'title',
        'Welcome to our website.',
        'en',
        1,
        2
    ),
    (
        'header',
        'Learn more about us.',
        'en',
        2,
        2
    ),
    (
        'nav',
        'Contact us for inquiries.',
        'en',
        3,
        2
    ),
    (
        'title',
        'Welcome to our website.',
        'en',
        1,
        3
    ),
    (
        'header',
        'Learn more about us.',
        'en',
        2,
        3
    ),
    (
        'nav',
        'Contact us for inquiries.',
        'en',
        3,
        3
    ),
    -- ESPAÑOL
    (
        'titulo',
        'Welcome to our website.',
        'es',
        1,
        1
    ),
    (
        'encabezamiento',
        'Learn more about us.',
        'es',
        2,
        1
    ),
    (
        'navegacion',
        'Contact us for inquiries.',
        'es',
        3,
        1
    ),
    (
        'titulo',
        'Welcome to our website.',
        'es',
        1,
        2
    ),
    (
        'encabezamiento',
        'Learn more about us.',
        'es',
        2,
        2
    ),
    (
        'navegacion',
        'Contact us for inquiries.',
        'es',
        3,
        2
    ),
    (
        'titulo',
        'Welcome to our website.',
        'es',
        1,
        3
    ),
    (
        'encabezamiento',
        'Learn more about us.',
        'es',
        2,
        3
    ),
    (
        'navegacion',
        'Contact us for inquiries.',
        'es',
        3,
        3
    ),
    -- CATALAN
    (
        'titol',
        'Welcome to our website.',
        'ca',
        1,
        1
    ),
    (
        'encapcalament',
        'Learn more about us.',
        'ca',
        2,
        1
    ),
    (
        'navigacio',
        'Contact us for inquiries.',
        'ca',
        3,
        1
    ),
    (
        'titol',
        'Welcome to our website.',
        'ca',
        1,
        2
    ),
    (
        'encapcalament',
        'Learn more about us.',
        'ca',
        2,
        2
    ),
    (
        'navigacio',
        'Contact us for inquiries.',
        'ca',
        3,
        2
    ),
    (
        'titol',
        'Welcome to our website.',
        'ca',
        1,
        3
    ),
    (
        'encapcalament',
        'Learn more about us.',
        'ca',
        2,
        3
    ),
    (
        'navigacio',
        'Contact us for inquiries.',
        'ca',
        3,
        3
    ),
    -- ALEMAN
    (
        'titel',
        'Welcome to our website.',
        'de',
        1,
        1
    ),
    (
        'headerr',
        'Learn more about us.',
        'de',
        2,
        1
    ),
    (
        'navig',
        'Contact us for inquiries.',
        'de',
        3,
        1
    ),
    (
        'titel',
        'Welcome to our website.',
        'de',
        1,
        2
    ),
    (
        'headerr',
        'Learn more about us.',
        'de',
        2,
        2
    ),
    (
        'navig',
        'Contact us for inquiries.',
        'de',
        3,
        2
    ),
    (
        'titel',
        'Welcome to our website.',
        'de',
        1,
        3
    ),
    (
        'headerr',
        'Learn more about us.',
        'de',
        2,
        3
    ),
    (
        'navig',
        'Contact us for inquiries.',
        'de',
        3,
        3
    );