# Análisis Técnico del Backend - Hotel Aura de Mallorca

Este documento describe la arquitectura interna, servicios, controladores y endpoints del servidor Node.js/Express (`backend/`).

---

## 1. Estructura y Tecnologias

- **Servidor Web**: Express 5.
- **Punto de Entrada**: `backend/index.js`.
- **Conexión a Base de Datos**: Pool de conexiones MySQL (`mysql.createPool`) con límite configurado a 300 conexiones, zona horaria `Europe/Madrid`.
- **Librerias Principales**:
  - `bcrypt`: Hashing seguro de contraseñas de usuarios.
  - `jsonwebtoken`: Emisión y validación de tokens JWT de sesión.
  - `multer`: Gestión de almacenamiento de imágenes de perfil (`public/media/img/users/profilepics/`).
  - `nodemailer`: Envío de correos de confirmación de cuenta, reseteo de contraseñas y formulario de contacto.
  - `stripe`: Procesamiento de pagos para reservas basicas y VIP.
  - `jsqr` y `jimp`: Procesamiento y lectura de códigos QR desde imágenes en base64.
  - `compression`, `cors`, `cookie-parser`, `body-parser`: Middlewares de rendimiento, seguridad y utilidades HTTP.

### 1.1. Auditoria y Resolución de Dependencias
- **Problema detectado**: En `package.json` aparecían dependencias innecesarias de módulos nativos (`fs`, `http`, `crypto`, `path`), dependencias ajenas a este proyecto (`pg`, `speakeasy`, etc.), y `bcrypt` provocaba fallos de compilación nativa con pnpm en Windows (`ERR_PNPM_IGNORED_BUILDS`).
- **Resolución aplicada**:
  1. **Módulos nativos eliminados de `package.json`**: Se eliminaron `fs`, `http`, `crypto` y `path`. En el código fuente ([`backend/index.js`](file:///c:/Users/nano9/OneDrive/Escritorio/Stuff/Professional/Business/FeryaelJustice/Developer/Projects/Web/HotelAuraDeMallorca/backend/index.js)), se utiliza la convención estándar de Node.js `node:fs` y `node:path`.
  2. **Migración de `bcrypt` a `bcryptjs`**: Se sustituyó por `bcryptjs`, eliminando la necesidad de compiladores C++ (`node-gyp`) y evitando fallos con pnpm en Windows.
  3. **Correccion de `backend/package.json`**: Se retiraron las librerias ajenas y la directiva `"type": "module"`, restaurando las dependencias requeridas por el servidor (`mysql`, `dotenv`, `stripe`, `jsqr`, `jimp`, `axios`, `moment-timezone`, `cookie-parser`, `body-parser`).
  4. **Instalación verificada**: `pnpm install` ejecuta de forma limpia y rápida sin advertencias de deprecación ni errores de build.
  5. **Servicio Unificado de Notificaciones por Correo (`sendEmailNotification`)**: La aplicación cuenta con un servicio unificado en [`backend/index.js`](file:///c:/Users/nano9/OneDrive/Escritorio/Stuff/Professional/Business/FeryaelJustice/Developer/Projects/Web/HotelAuraDeMallorca/backend/index.js) configurado con Nodemailer para conectar con el servidor SMTP propio de Hostinger (`smtp.hostinger.com:465` con SSL), utilizando el buzón autenticado `contact@feryaeljustice.dev`. Dispone de soporte optativo para Brevo HTTP API si se define `BREVO_API_KEY`.
  6. **Migración a ES Modules (ESM)**: Se migraron todos los `require()` de [`backend/index.js`](file:///c:/Users/nano9/OneDrive/Escritorio/Stuff/Professional/Business/FeryaelJustice/Developer/Projects/Web/HotelAuraDeMallorca/backend/index.js) a sintaxis estándar `import`, configurando `"type": "module"` en `package.json`, emulando `__dirname` / `__filename` mediante `fileURLToPath(import.meta.url)` y adoptando la importacion de `Jimp` e instancia de `Stripe` acorde a los estándares de ESM.

---

## 2. Middlewares Clave

### 2.1. `verifyUser`
1. Extrae el token desde `req.headers.authorization` o `req.body.token`.
2. Verifica la firma con `jwt.verify`.
3. Consulta la base de datos para confirmar que `access_token = token`, `isEnabled = 1` y `user_verified = 1`.
4. Inyecta `req.id` y `req.dni` en el objeto de peticion para uso en controladores protegidos.

### 2.2. `decodeBase64Image`
1. Recibe la cadena `imagePicQR` en base64 enviada por el cliente.
2. Utiliza `Jimp` para leer el buffer de la imagen.
3. Extrae dimensiones (`width`, `height`) y la matriz de pixeles (`pixelData`), dejandolos accesibles para `jsQR`.

---

## 3. Catálogo de Endpoints de la API REST

Los endpoints se montan bajo el enrutador de Express (`expressRouter`):

### 3.1. Gestión de Usuarios y Autenticación
- `POST /checkUserExists`: Comprueba disponibilidad de email o DNI antes del registro.
- `POST /register`: Registro estándar con hash bcrypt, creación de token de verificación y envío de correo de bienvenida.
- `POST /registerWithQR`: Registro automático procesando datos embebidos en una imagen QR.
- `POST /login`: Valida credenciales, comprueba estado activo y verificado, genera par de JWT (access y refresh) y actualiza tokens en BD.
- `POST /loginByToken`: Validación automática de sesión persistente.
- `POST /refreshToken`: Renueva el par de tokens (access token 1d y refresh token 7d) usando un refresh token valido.
- `POST /logout`: Inválida tokens de sesión (`access_token` y `refresh_token`) en base de datos.
- `POST /edituser`: Actualización de nombre, apellidos y datos de perfil (requiere `verifyUser`).
- `POST /editUserPassword`: Cambio de clave verificando el hash previo (requiere `verifyUser`).
- `POST /sendRecoverAccountMail`: Envío de correo con token temporal para restablecer acceso.
- `POST /recoverAccount`: Confirmación de reseteo de contraseña mediante token.
- `DELETE /user`: Baja lógica o eliminación de cuenta (requiere `verifyUser`).
- `POST /getLoggedUserID`: Obtiene el ID del usuario correspondiente al token (requiere `verifyUser`).
- `GET /getUserRole/:id`: Retorna los roles asignados (`CLIENT`, `ADMIN`, `EMPLOYEE`).
- `GET /loggedUser/:id`: Informacion detallada del perfil del usuario logueado.
- `GET /checkUserIsVerified/:id`: Comprueba si el usuario verifico su email.
- `POST /uploadUserImg`: Subida y conversion de foto de perfil a `.webp` (requiere `verifyUser`).
- `POST /getUserImgByToken`: Recupera la ruta de la imagen de perfil asociada.
- `POST /user/verifyEmail/:token`: Valida el token recibido por email y activa al usuario (`user_verified = 1`).
- `GET /usersID`: Listado de identificadores de usuarios para administración.

### 3.2. Habitaciones, Planes y Servicios
- `GET /rooms`: Lista habitaciones activas y su disponibilidad.
- `GET /room/:id`: Detalle específico de una habitación.
- `GET /roomsID`: Listado de IDs de habitaciones disponibles.
- `GET /plans`: Lista los planes ofertados (`Basic`, `VIP`) con precios y descripciones.
- `GET /plansID`: Listado de IDs de planes.
- `GET /services`: Catálogo de servicios adicionales (spa, excursiones, gastronomía).
- `GET /service/:id`: Detalle de un servicio individual.
- `POST /servicesImages`: Consulta de recursos multimedia asociados a servicios.
- `GET /paymentmethods`: Métodos de pago aceptados.

### 3.3. Reservas y Lógica de Negocio
- `POST /checkBookingAvailability`: Comprueba si una habitación está libre en el rango de fechas solicitado, teniendo en cuenta desfase de zona horaria y reservas activas.
- `POST /createBooking`: Registra la reserva en la tabla `booking`, vinculando huéspedes (`booking_guest`) y servicios adicionales (`booking_service`).
- `DELETE /booking/:bookingID`: Eliminación o cancelación de reserva por parte de administración/usuario.
- `PUT /booking`: Modificacion de fechas y detalles de reserva existente.
- `PUT /cancelBookingByUser`: Cancelación directa por parte del cliente, activando la flag `is_cancelled = 1`.
- `POST /duplicateBooking`: Clona una reserva previa con nuevas fechas (requiere `verifyUser`).
- `GET /bookings`: Listado maestro de reservas para administración.
- `GET /bookingsByUser`: Lista de reservas pertenecientes al usuario autenticado.
- `POST /userPresentCheck`: Verifica si el titular está incluido en el listado de huéspedes.
- `POST /userPunishmentCheck`: Analiza el historial de cancelaciones del usuario. Si supera los límites establecidos, suspende la cuenta (`isEnabled = 0`).

### 3.4. Pagos y Stripe
- `POST /payment`: Registro del registro de cobro en tabla `payment`.
- `POST /paymentTransaction`: Vinculación del identificador de transacción externa con el cobro interno.
- `POST /purchase`: Generacion del `PaymentIntent` de Stripe con calculo de importe en centimos.
- `POST /cancel-payment`: Anulacion o reembolso del pago en Stripe.

### 3.5. Integración de Clima
- `POST /insert-weather`: Inserción y actualización en lote de los registros meteorológicos obtenidos por el cliente.
- `GET /weather`: Lectura de previsiones registradas en base de datos para cotejo con fechas de reserva.

### 3.6. Promociones y Contacto
- `GET /promotions`: Lista de promociones activas.
- `GET /get-promo-discount/:id`: Consulta del importe de descuento aplicable.
- `POST /saveBookingWithPromoApplied`: Asocia el código promocional a la reserva en `booking_promotion`.
- `POST /getUserAssociatedPromos`: Promociones disponibles para un usuario específico.
- `POST /getUserAssociatedPromoCode`: Obtiene código promocional vinculado.
- `POST /setUserPromoUsed`: Marca la promoción como canjeada (`isUsed = 1`).
- `POST /sendContactForm`: Envío de mensaje desde formulario de contacto a los administradores.
- `POST /captchaSiteVerify`: Validación en servidor de Google reCAPTCHA.
