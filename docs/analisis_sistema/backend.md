# Analisis Tecnico del Backend - Hotel Aura de Mallorca

Este documento describe la arquitectura interna, servicios, controladores y endpoints del servidor Node.js/Express (`backend/`).

---

## 1. Estructura y Tecnologias

- **Servidor Web**: Express 5.
- **Punto de Entrada**: `backend/index.js`.
- **Conexion a Base de Datos**: Pool de conexiones MySQL (`mysql.createPool`) con limite configurado a 300 conexiones, zona horaria `Europe/Madrid`.
- **Librerias Principales**:
  - `bcrypt`: Hashing seguro de contrasenas de usuarios.
  - `jsonwebtoken`: Emision y validacion de tokens JWT de sesion.
  - `multer`: Gestion de almacenamiento de imagenes de perfil (`public/media/img/users/profilepics/`).
  - `nodemailer`: Envio de correos de confirmacion de cuenta, reseteo de contrasenas y formulario de contacto.
  - `stripe`: Procesamiento de pagos para reservas basicas y VIP.
  - `jsqr` y `jimp`: Procesamiento y lectura de codigos QR desde imagenes en base64.
  - `compression`, `cors`, `cookie-parser`, `body-parser`: Middlewares de rendimiento, seguridad y utilidades HTTP.

### 1.1. Auditoria y Resolucion de Dependencias
- **Problema detectado**: En `package.json` aparecian dependencias innecesarias de modulos nativos (`fs`, `http`, `crypto`, `path`), dependencias ajenas a este proyecto (`pg`, `speakeasy`, etc.), y `bcrypt` provocaba fallos de compilacion nativa con pnpm en Windows (`ERR_PNPM_IGNORED_BUILDS`).
- **Resolucion aplicada**:
  1. **Modulos nativos eliminados de `package.json`**: Se eliminaron `fs`, `http`, `crypto` y `path`. En el codigo fuente ([`backend/index.js`](file:///c:/Users/nano9/OneDrive/Escritorio/Stuff/Professional/Business/FeryaelJustice/Developer/Projects/Web/HotelAuraDeMallorca/backend/index.js)), se utiliza la convencion estandar de Node.js `node:fs` y `node:path`.
  2. **Migracion de `bcrypt` a `bcryptjs`**: Se sustituyo por `bcryptjs`, eliminando la necesidad de compiladores C++ (`node-gyp`) y evitando fallos con pnpm en Windows.
  3. **Correccion de `backend/package.json`**: Se retiraron las librerias ajenas y la directiva `"type": "module"`, restaurando las dependencias requeridas por el servidor (`mysql`, `dotenv`, `stripe`, `jsqr`, `jimp`, `axios`, `moment-timezone`, `cookie-parser`, `body-parser`).
  4. **Instalacion verificada**: `pnpm install` ejecuta de forma limpia y rapida sin advertencias de deprecacion ni errores de build.
  5. **Integracion del SDK Oficial de Brevo (`@getbrevo/brevo`)**: Se anadio la libreria oficial de Brevo y la funcion unificada `sendEmailNotification` en [`backend/index.js`](file:///c:/Users/nano9/OneDrive/Escritorio/Stuff/Professional/Business/FeryaelJustice/Developer/Projects/Web/HotelAuraDeMallorca/backend/index.js). Cuando se define `BREVO_API_KEY`, los correos transaccionales se envian por HTTP API v3 evitando bloqueos SMTP (535 Authentication failed) o problemas de puertos. Si no esta presente, mantiene fallback automatico a Nodemailer.
  6. **Migracion a ES Modules (ESM)**: Se migraron todos los `require()` de [`backend/index.js`](file:///c:/Users/nano9/OneDrive/Escritorio/Stuff/Professional/Business/FeryaelJustice/Developer/Projects/Web/HotelAuraDeMallorca/backend/index.js) a sintaxis estandar `import`, configurando `"type": "module"` en `package.json`, emulando `__dirname` / `__filename` mediante `fileURLToPath(import.meta.url)` y adoptando la importacion de `Jimp` e instancia de `Stripe` acorde a los estandares de ESM.

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

## 3. Catalogo de Endpoints de la API REST

Los endpoints se montan bajo el enrutador de Express (`expressRouter`):

### 3.1. Gestion de Usuarios y Autenticacion
- `POST /checkUserExists`: Comprueba disponibilidad de email o DNI antes del registro.
- `POST /register`: Registro estandar con hash bcrypt, creacion de token de verificacion y envio de correo de bienvenida.
- `POST /registerWithQR`: Registro automatico procesando datos embebidos en una imagen QR.
- `POST /login`: Valida credenciales, comprueba estado activo y verificado, genera JWT y actualiza `access_token`.
- `POST /loginByToken`: Validacion automatica de sesion persistente.
- `POST /edituser`: Actualizacion de nombre, apellidos y datos de perfil (requiere `verifyUser`).
- `POST /editUserPassword`: Cambio de clave verificando el hash previo (requiere `verifyUser`).
- `POST /sendRecoverAccountMail`: Envio de correo con token temporal para restablecer acceso.
- `POST /recoverAccount`: Confirmacion de reseteo de contrasena mediante token.
- `DELETE /user`: Baja logica o eliminacion de cuenta (requiere `verifyUser`).
- `POST /getLoggedUserID`: Obtiene el ID del usuario correspondiente al token (requiere `verifyUser`).
- `GET /getUserRole/:id`: Retorna los roles asignados (`CLIENT`, `ADMIN`, `EMPLOYEE`).
- `GET /loggedUser/:id`: Informacion detallada del perfil del usuario logueado.
- `GET /checkUserIsVerified/:id`: Comprueba si el usuario verifico su email.
- `POST /uploadUserImg`: Subida y conversion de foto de perfil a `.webp` (requiere `verifyUser`).
- `POST /getUserImgByToken`: Recupera la ruta de la imagen de perfil asociada.
- `POST /user/verifyEmail/:token`: Valida el token recibido por email y activa al usuario (`user_verified = 1`).
- `GET /usersID`: Listado de identificadores de usuarios para administracion.

### 3.2. Habitaciones, Planes y Servicios
- `GET /rooms`: Lista habitaciones activas y su disponibilidad.
- `GET /room/:id`: Detalle especifico de una habitacion.
- `GET /roomsID`: Listado de IDs de habitaciones disponibles.
- `GET /plans`: Lista los planes ofertados (`Basic`, `VIP`) con precios y descripciones.
- `GET /plansID`: Listado de IDs de planes.
- `GET /services`: Catalogo de servicios adicionales (spa, excursiones, gastronomia).
- `GET /service/:id`: Detalle de un servicio individual.
- `POST /servicesImages`: Consulta de recursos multimedia asociados a servicios.
- `GET /paymentmethods`: Metodos de pago aceptados.

### 3.3. Reservas y Logica de Negocio
- `POST /checkBookingAvailability`: Comprueba si una habitacion esta libre en el rango de fechas solicitado, teniendo en cuenta desfase de zona horaria y reservas activas.
- `POST /createBooking`: Registra la reserva en la tabla `booking`, vinculando huespedes (`booking_guest`) y servicios adicionales (`booking_service`).
- `DELETE /booking/:bookingID`: Eliminacion o cancelacion de reserva por parte de administracion/usuario.
- `PUT /booking`: Modificacion de fechas y detalles de reserva existente.
- `PUT /cancelBookingByUser`: Cancelacion directa por parte del cliente, activando la flag `is_cancelled = 1`.
- `POST /duplicateBooking`: Clona una reserva previa con nuevas fechas (requiere `verifyUser`).
- `GET /bookings`: Listado maestro de reservas para administracion.
- `GET /bookingsByUser`: Lista de reservas pertenecientes al usuario autenticado.
- `POST /userPresentCheck`: Verifica si el titular esta incluido en el listado de huespedes.
- `POST /userPunishmentCheck`: Analiza el historial de cancelaciones del usuario. Si supera los limites establecidos, suspende la cuenta (`isEnabled = 0`).

### 3.4. Pagos y Stripe
- `POST /payment`: Registro del registro de cobro en tabla `payment`.
- `POST /paymentTransaction`: Vinculacion del identificador de transaccion externa con el cobro interno.
- `POST /purchase`: Generacion del `PaymentIntent` de Stripe con calculo de importe en centimos.
- `POST /cancel-payment`: Anulacion o reembolso del pago en Stripe.

### 3.5. Integracion de Clima
- `POST /insert-weather`: Insercion y actualizacion en lote de los registros meteorologicos obtenidos por el cliente.
- `GET /weather`: Lectura de previsiones registradas en base de datos para cotejo con fechas de reserva.

### 3.6. Promociones y Contacto
- `GET /promotions`: Lista de promociones activas.
- `GET /get-promo-discount/:id`: Consulta del importe de descuento aplicable.
- `POST /saveBookingWithPromoApplied`: Asocia el codigo promocional a la reserva en `booking_promotion`.
- `POST /getUserAssociatedPromos`: Promociones disponibles para un usuario especifico.
- `POST /getUserAssociatedPromoCode`: Obtiene codigo promocional vinculado.
- `POST /setUserPromoUsed`: Marca la promocion como canjeada (`isUsed = 1`).
- `POST /sendContactForm`: Envio de mensaje desde formulario de contacto a los administradores.
- `POST /captchaSiteVerify`: Validacion en servidor de Google reCAPTCHA.
