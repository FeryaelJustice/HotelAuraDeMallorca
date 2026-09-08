# Guia de Despliegue y Variables de Entorno - Hotel Aura de Mallorca

Este documento recopila la configuracion ambiental, topologia de red y el proceso de despliegue en servidores Linux con Apache y Node.js.

---

## 1. Matriz de Variables de Entorno

### 1.1. Backend (`backend/.env`)
| Variable | Descripcion | Ejemplo |
|---|---|---|
| `API_URL` | URL publica base de la API (con HTTPS y `/api`) | `https://hotelaurademallorca.com/api` |
| `FRONT_URL` | URL publica del frontend | `http://hotelaurademallorca.com` |
| `CORS_ORIGIN_FRONT_URL` | Dominio permitido en CORS (sin protocolo) | `hotelaurademallorca.com` |
| `DB_URL` | Host del motor MySQL / MariaDB | `127.0.0.1` |
| `DB_USER` | Usuario de base de datos | `root` o `admin` |
| `DB_PASSWORD` | Contrasena de la base de datos | `xxxx` |
| `DB_NAME` | Nombre de la base de datos | `hotelaurademallorca` |
| `DB_PORT` | Puerto de escucha de MySQL | `3306` |
| `DB_TIMEZONE` | Zona horaria para consultas SQL | `+02:00` |
| `STRIPE_PRIVATE_KEY` | Clave secreta de Stripe | `sk_test_...` |
| `STRIPE_PUBLIC_KEY` | Clave publica de Stripe | `pk_test_...` |
| `BREVO_API_KEY` | Clave de API oficial de Brevo (v3) | `xkeysib-...` |
| `MAIL_HOST` | Host del servidor SMTP | `smtp-relay.brevo.com` |
| `MAIL_PORT` | Puerto de escucha del servidor SMTP | `587` |
| `MAIL_USERNAME` | Cuenta SMTP / usuario de Brevo | `nano9gs@hotmail.es` |
| `MAIL_PASSWORD` | Credencial de autenticacion SMTP | `...` |
| `MAIL_SENDER_EMAIL` | Remitente verificado en Brevo | `contact@feryaeljustice.dev` |
| `MAIL_CONTACT_RECEIVERS` | Lista de destinatarios del formulario | Array JSON con direcciones |
| `APP_NAME` | Nombre visible en cabeceras de correos | `Hotel Aura de Mallorca` |

### 1.2. Frontend (`frontend/.env`)
| Variable | Descripcion | Ejemplo |
|---|---|---|
| `FRONT_URL` | Direccion raiz de la aplicacion cliente | `http://hotelaurademallorca.com` |
| `TRANSLATIONS_DATA_URL` | Ruta o URL de almacenamiento de i18n | `https://hotelaurademallorca.com` |
| `FRONT_ASSETS_URL` | URL de recursos estaticos | `https://hotelaurademallorca.com/assets` |
| `API_URL` | URL base para peticiones Axios | `https://hotelaurademallorca.com` |
| `reCAPTCHA_SITE_KEY` | Clave de sitio para Google reCAPTCHA v2 | `abc...` |
| `reCAPTCHA_SECRET_KEY` | Clave secreta para verificacion de captcha | `def...` |
| `STRIPE_PUBLISHABLE_KEY`| Clave publicable de Stripe para frontend | `pk_test_...` |
| `APP_NAME` | Nombre de la aplicacion | `Hotel Aura de Mallorca` |
| `OPENWEATHERMAP_API_KEY`| Token de API para OpenWeatherMap | `...` |
| `OPENWEATHERMAP_BASE_URL`| Endpoint base de OpenWeatherMap | `https://api.openweathermap.org/` |
| `ACCUWEATHER_API_KEY`   | Token alternativo AccuWeather | `...` |
| `ACCUWEATHER_BASE_URL`  | Endpoint alternativo AccuWeather | `http://dataservice.accuweather.com` |

---

## 2. Arquitectura de Despliegue en Linux (Apache + PM2)

### 2.1. Configuracion de Reverse Proxy en Apache
El servidor Apache atiende peticiones en el puerto 80/443, sirviendo los estaticos del frontend (`dist/`) y canalizando las peticiones de la API hacia Node.js en el puerto 3000:

```apache
# ProxyPass en VirtualHost SSL
<VirtualHost *:443>
    ServerName hotelaurademallorca.com
    DocumentRoot /var/www/html/hotelaurademallorca

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/hotelaurademallorca.crt
    SSLCertificateKeyFile /etc/ssl/private/hotelaurademallorca.key

    ProxyRequests Off
    ProxyPreserveHost On
    ProxyPass /api http://localhost:3000/api
    ProxyPassReverse /api http://localhost:3000/api

    <Directory /var/www/html/hotelaurademallorca>
        Options Indexes FollowSymLinks MultiViews
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

### 2.2. Gestion de Procesos con PM2
El servidor Express se ejecuta bajo PM2 para garantizar resiliencia y reinicio automatico:
```bash
cd /var/www/html/hotelaurademallorca/backend
pm2 start index.js --name "hotel-aura-backend"
pm2 save
pm2 startup
```

### 2.3. Resolucion Local DNS y Hosts
Para entornos de prueba o maquinas virtuales locales:
- En `/etc/hosts` (Linux):
  ```text
  127.0.0.1 hotelaurademallorca.com
  ```
- En `C:\Windows\System32\drivers\etc\hosts` (Windows anfitrion):
  ```text
  <IP_DE_LA_VM> hotelaurademallorca.com
  ```
