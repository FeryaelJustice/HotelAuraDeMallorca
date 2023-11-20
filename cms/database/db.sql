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
        'app_name',
        'Vacalia',
        'en',
        1,
        2
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
        'app_name',
        'Aura de Mallorca',
        'en',
        1,
        3
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
    (
        'app_name',
        'Intranet Vacalia',
        'en',
        1,
        4
    ),
    (
        'title',
        'Welcome to our website.',
        'en',
        1,
        4
    ),
    (
        'header',
        'Learn more about us.',
        'en',
        2,
        4
    ),
    (
        'nav',
        'Contact us for inquiries.',
        'en',
        3,
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
        'app_name',
        'Vacalia',
        'es',
        1,
        2
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
        'app_name',
        'Aura de Mallorca',
        'es',
        1,
        3
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
    (
        'app_name',
        'Intranet Vacalia',
        'es',
        1,
        4
    ),
    (
        'title',
        'Welcome to our website.',
        'es',
        1,
        4
    ),
    (
        'header',
        'Learn more about us.',
        'es',
        2,
        4
    ),
    (
        'nav',
        'Contact us for inquiries.',
        'es',
        3,
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
        'app_name',
        'Vacalia',
        'ca',
        1,
        2
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
        'app_name',
        'Aura de Mallorca',
        'ca',
        1,
        3
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
    (
        'app_name',
        'Intranet Vacalia',
        'ca',
        1,
        4
    ),
    (
        'title',
        'Welcome to our website.',
        'ca',
        1,
        4
    ),
    (
        'header',
        'Learn more about us.',
        'ca',
        2,
        4
    ),
    (
        'nav',
        'Contact us for inquiries.',
        'ca',
        3,
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
        'app_name',
        'Vacalia',
        'de',
        1,
        2
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
        'app_name',
        'Aura de Mallorca',
        'de',
        1,
        3
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
    ),
    (
        'app_name',
        'Intranet Vacalia',
        'de',
        1,
        4
    ),
    (
        'title',
        'Welcome to our website.',
        'de',
        1,
        4
    ),
    (
        'header',
        'Learn more about us.',
        'de',
        2,
        4
    ),
    (
        'nav',
        'Contact us for inquiries.',
        'de',
        3,
        4
    );