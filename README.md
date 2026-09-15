<div align="center">

# 🏨 Hotel Aura de Mallorca

### *Vive la magia de la isla en un rincón exclusivo.*

[![React](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite-61DAFB?logo=react&logoColor=black)](#frontend)
[![Express](https://img.shields.io/badge/Backend-Express%205%20%7C%20Node.js-000000?logo=express&logoColor=white)](#backend)
[![MySQL](https://img.shields.io/badge/Database-MariaDB%20%7C%20MySQL-4479A1?logo=mysql&logoColor=white)](#base-de-datos)
[![TypeScript](https://img.shields.io/badge/Type_Safety-TypeScript-3178C6?logo=typescript&logoColor=white)](#frontend)
[![Stripe](https://img.shields.io/badge/Payments-Stripe-635BFF?logo=stripe&logoColor=white)](#pasarela-de-pago)
[![Vercel Deployment](https://img.shields.io/badge/Live_Demo-Vercel-000000?logo=vercel&logoColor=white)](https://hotel-aura-de-mallorca.vercel.app/)

<br />

**🌐 Demo en Producción:** [hotel-aura-de-mallorca.vercel.app](https://hotel-aura-de-mallorca.vercel.app/)  
**📄 Documentación Completa:** [Presentación de Proyecto Web (PDF)](./docs/Presentacion%20Final/Presentacion%20Proyecto%20Web%20Aura%20de%20Mallorca.pdf)

<br />

<img src="./docs/Wireframe/Final/Home%20Page.png" alt="Vista Principal - Hotel Aura de Mallorca" width="850" style="border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); max-width: 100%; height: auto;" />

</div>

---

## 📖 Índice

- [Acerca del Proyecto](#-acerca-del-proyecto)
- [Características Principales](#-características-principales)
- [Arquitectura y Stack Tecnológico](#-arquitectura-y-stack-tecnológico)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [Gestor de Traducciones](#gestor-de-traducciones)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Variables de Entorno](#-variables-de-entorno)
- [Guía de Instalación y Despliegue](#-guía-de-instalación-y-despliegue)
  - [Desarrollo Local](#1-desarrollo-local)
  - [Despliegue en Servidor Linux (Apache + PM2)](#2-despliegue-en-servidor-linux-apache--pm2)
- [Diseño y Planificación](#-diseño-y-planificación)
- [Notas y Consideraciones Técnicas](#-notas-y-consideraciones-técnicas)
- [Autor](#-autor)

---

## 🌟 Acerca del Proyecto

**Hotel Aura de Mallorca** es una plataforma web integral de gestión y reservas hoteleras diseñada para ofrecer una experiencia prémium y fluida a los usuarios. Combina una interfaz moderna basada en modales interactivos con un backend robusto capaz de gestionar reservas, perfiles, transacciones seguras con Stripe y validaciones inteligentes en tiempo real.

Una de sus señas de identidad técnicas es la integración con una **API de meteorología en tiempo real**, que analiza y condiciona las recomendaciones o disponibilidades de reserva en función de la previsión climática local en Mallorca.

---

## ✨ Características Principales

### 🖥️ Experiencia de Usuario sin Fricción (Modales Interactivos)
Para evitar recargas innecesarias y saltos bruscos entre secciones, el sistema utiliza **modales contextuales**:
- **Gestión de Cuentas:** Modales ágiles para inicio de sesión, registro de nuevos clientes y edición de perfil.
- **Flujo Integral de Reserva (Booking Wizard):**
  1. **Datos Personales:** Detección de sesión activa con autorrelleno protegido frente a alteraciones no deseadas.
  2. **Selección de Plan:** Modalidad *VIP* o *Basic*.
  3. **Fechas de Estancia (Check-in / Check-out):** Validación con motor de disponibilidad y comprobación de pronóstico meteorológico.
  4. **Servicios Extras Adicionales:** Selección modular y personalizable de actividades y amenidades.
  5. **Gestión de Huéspedes:** Registro detallado de acompañantes y viajeros.
  6. **Pasarela de Pago Segura:** Procesamiento de pagos electrónicos mediante **Stripe**.
  7. **Confirmación Inmediata:** Resumen detallado con generación de comprobante y código QR.

### 🌐 Secciones Públicas de la Web
- **Inicio:** Presentación envolvente del hotel, atmósfera balear y accesos directos de reserva.
- **Servicios:** Catálogo interactivo de amenidades exclusivas con opción de reserva individualizada.
- **Contacto:** Formulario validado de comunicación directa entre el cliente y el equipo del hotel.
- **Comunidad / Extras:** Módulos opcionales pensados para feedback, fidelización y eventos.

---

## 🛠️ Arquitectura y Stack Tecnológico

```
┌─────────────────────────────────────────────────────────────┐
│                       Cliente Web                           │
│   React 19 + TypeScript + Vite + Bootstrap + i18next        │
└───────────────┬─────────────────────────────▲───────────────┘
                │ HTTP / REST                 │
                ▼                             │
┌─────────────────────────────────────────────┴───────────────┐
│                      Backend API                            │
│   Express 5 + Node.js + Helmet + Rate Limit + JWT           │
│   Integraciones: Stripe + Brevo/Mailer + Cloudinary + Clima │
└──────────────────────────────┬──────────────────────────────┘
                               │ Pool Connection
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Base de Datos Relacional                  │
│                      MariaDB / MySQL                        │
└─────────────────────────────────────────────────────────────┘
```

### Frontend
- **Framework & Build:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Estilos & UI:** [React Bootstrap 2](https://react-bootstrap.netlify.app/), [Bootstrap 5](https://getbootstrap.com/), [SweetAlert2](https://sweetalert2.github.io/)
- **Internacionalización:** [i18next](https://www.i18next.com/) con detección automática de idioma
- **Pasarela de Pago:** [@stripe/react-stripe-js](https://stripe.com/)
- **Utilidades UI:** `qrcode.react`, `react-calendar`, `react-parallax`, `react-cookie-consent`, `react-google-recaptcha`
- **Testing & QA:** [Vitest](https://vitest.dev/), Testing Library, ESLint

### Backend
- **Core Runtime:** [Node.js](https://nodejs.org/) con [Express 5](https://expressjs.com/) (ES Modules)
- **Seguridad & Rendimiento:** [Helmet](https://helmetjs.github.io/), `express-rate-limit`, `cors`, `compression`, `cookie-parser`
- **Autenticación:** Tokens [JWT](https://jwt.io/) y cifrado [bcryptjs](https://www.npmjs.com/package/bcryptjs)
- **Base de Datos:** Driver [mysql2](https://github.com/sidorares/node-mysql2)
- **Integraciones:** Pasarela de pago [Stripe API](https://stripe.com/docs/api), emails transaccionales con [Brevo](https://www.brevo.com/) & [Nodemailer](https://nodemailer.com/), almacenamiento en [Cloudinary](https://cloudinary.com/), lectura QR con `jsqr`.

### Gestor de Traducciones
- Subproyecto auxiliar en `translator/` desarrollado en **Laravel + Vue 3 + Vite** para la administración centralizada de cadenas multi-idioma.

---

## 📁 Estructura del Proyecto

```text
HotelAuraDeMallorca/
├── backend/            # Servidor API RESTful con Express y MySQL
│   ├── routes/         # Endpoints de reservas, usuarios, clima, pagos...
│   ├── scripts/        # Scripts de inicialización y migración (seed_admin, reset_db)
│   └── package.json
├── frontend/           # Aplicación cliente en React 19 + TypeScript + Vite
│   ├── src/            # Componentes, vistas, contextos de reserva y modales
│   └── package.json
├── translator/         # Gestor de traducciones (Laravel + Vue 3)
├── database/           # Scripts SQL y modelos relacionales
├── docs/               # Documentación, diagramas, presentaciones y wireframes
│   ├── Wireframe/      # Assets gráficos y capturas de diseño
│   └── Presentacion Final/
├── phpmyadmin-virtualhost.txt # Configuración modelo para Apache
└── README.md
```

---

## 🔐 Variables de Entorno

### Frontend (`frontend/.env`)
```ini
# URL pública del frontend (con HTTP/HTTPS según entorno)
FRONT_URL=https://hotelaurademallorca.com

# Ruta de los ficheros de traducción
TRANSLATIONS_DATA_URL=./

# URL del backend
API_URL=https://hotelaurademallorca.com
```

### Backend (`backend/.env`)
```ini
# URL base de los endpoints del backend
API_URL=https://hotelaurademallorca.com/api

# URL base del cliente para redirecciones
FRONT_URL=https://hotelaurademallorca.com

# Dominio autorizado para CORS (sin protocolo)
CORS_ORIGIN_FRONT_URL=hotelaurademallorca.com

# Conexión a la base de datos
DB_URL=127.0.0.1
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=hotel_aura_db

# Claves de terceros (Stripe, Clima, etc.)
STRIPE_SECRET_KEY=sk_test_...
```

---

## 🚀 Guía de Instalación y Despliegue

### 1. Desarrollo Local

#### Prerrequisitos
- Node.js (v18 o superior) y npm
- MySQL / MariaDB activo (o XAMPP)

#### Pasos:

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/HotelAuraDeMallorca.git
   cd HotelAuraDeMallorca
   ```

2. **Configurar y levantar el Backend:**
   ```bash
   cd backend
   npm install
   # Configura tu fichero .env a partir de las variables requeridas
   npm run dev
   ```

3. **Configurar y levantar el Frontend:**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

---

### 2. Despliegue en Servidor Linux (Apache + PM2)

#### Preparación del Sistema y Paquetes Base:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y openssh-server nodejs npm mariadb-server mariadb-client apache2 openssl net-tools ufw
sudo systemctl enable ssh mariadb apache2
sudo mysql_secure_installation
```

#### Módulos de Apache y PM2:
```bash
sudo a2enmod rewrite headers proxy proxy_http ssl
sudo systemctl restart apache2
sudo npm install -g pm2
sudo pm2 startup
```

#### Reglas de Firewall (UFW):
```bash
sudo systemctl enable ufw
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow ssh
```

> [!NOTE]
> **Mapeo con Reverse Proxy (ProxyPass):**  
> Para comunicar Apache con el servicio Node.js en producción, se configura una directiva:
> ```apache
> ProxyPass /api http://localhost:3000/api
> ProxyPassReverse /api http://localhost:3000/api
> ```
> De este modo, las solicitudes a `https://tudominio.com/api` se despachan transparentemente hacia el puerto `3000` gestionado por PM2.

#### Despliegue del Frontend y Backend:
1. Compilar el cliente:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
2. Publicar archivos en el directorio web:
   ```bash
   sudo mkdir -p /var/www/html/hotelaurademallorca
   sudo chown -R www-data:www-data /var/www/html/hotelaurademallorca
   sudo chmod -R 755 /var/www/html/hotelaurademallorca
   sudo cp -r dist/* /var/www/html/hotelaurademallorca/
   ```
3. Configurar el Backend con PM2:
   ```bash
   cd ../backend
   npm install --production
   sudo pm2 start index.js --name "hotel-aura-backend"
   sudo pm2 save
   ```
4. Configurar los VirtualHosts (`/etc/apache2/sites-available/`):
   - Crear `hotelaurademallorca.conf` (HTTP) y `hotelaurademallorca-ssl.conf` (HTTPS) basándose en las plantillas adjuntas en el repositorio.
   - Habilitar sitios y recargar:
     ```bash
     sudo a2ensite hotelaurademallorca.conf hotelaurademallorca-ssl.conf
     sudo systemctl reload apache2
     ```

---

## 🎨 Diseño y Planificación

- **Metodología Ágil:** Gestión de sprints y tableros con Trello (Kanban).
- **Planificación Temporal:** Estimación y seguimiento de hitos con diagramas de Gantt (**GanttProject**).
- **Prototipado UI/UX:** Wireframes de baja fidelidad y prototipo de alta fidelidad diseñados en **Figma**.
- **Accesibilidad:** Pruebas y validaciones de ratios de legibilidad y accesibilidad mediante [WebAIM Color Contrast Checker](https://webaim.org/resources/contrastchecker/).

---

## 📌 Notas y Consideraciones Técnicas

> [!TIP]
> **Pruebas Locales con Weather API:**  
> Si se presentan bloqueos por políticas de origen cruzado en modo de depuración local, se puede arrancar una sesión de prueba en Google Chrome:
> ```cmd
> "C:\Program Files\Google\Chrome\Application\chrome.exe" --disable-web-security --user-data-dir=%LOCALAPPDATA%\Google\chromeTemp
> ```

> [!IMPORTANT]
> **Sistema de Moderación y Cuentas de Usuario:**  
> Si un usuario resulta deshabilitado por el sistema de sanciones, la reactivación administrativa exige actualizar dos flags en la base de datos para completar la verificación de seguridad:
> 1. Establecer `isEnabled = true` en la tabla `app_user`.
> 2. Establecer `enabledByAdmin = 1` para validar la auditoría interna.

---

## 👤 Autor

- **Fernando GS** ([@FeryaelJustice](https://github.com/FeryaelJustice))
- **Email:** nano9gs@hotmail.es

---
<div align="center">
  <sub>Hotel Aura de Mallorca © Todos los derechos reservados.</sub>
</div>
