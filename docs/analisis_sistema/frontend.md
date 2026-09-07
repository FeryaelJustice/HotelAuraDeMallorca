# Analisis Tecnico del Frontend - Hotel Aura de Mallorca

Este documento detalla la arquitectura de la aplicacion cliente (`frontend/`), sus vistas, modales, componentes y flujo de datos.

---

## 1. Pila Tecnologica

- **Framework**: React 19 con TypeScript.
- **Empaquetador y Servidor de Desarrollo**: Vite.
- **Enrutamiento**: React Router v7 (`react-router-dom`).
- **Libreria de Componentes y UI**: Bootstrap 5, `react-bootstrap`, `react-icons`, `@fortawesome/react-fontawesome`.
- **Formularios y Validaciones**: `sweetalert2` para dialogos informativos y confirmaciones, `react-google-recaptcha` para proteccion anti-spam.
- **Pasarela de Pagos**: `@stripe/react-stripe-js` y `@stripe/stripe-js`.
- **Internacionalizacion**: `i18next`, `react-i18next`, `i18next-browser-languagedetector`.
- **Manejo de Estado y Cookies**: `react-cookie` para gestion del token JWT y consentimiento RGPD.

---

## 2. Enrutamiento y Paginas Principales

El enrutamiento principal se define en `src/App.tsx`:

| Ruta | Componente | Descripcion |
|---|---|---|
| `/` | `Home` | Pagina de bienvenida con banners visuales, informacion general y accesos directos |
| `/services` | `Services` | Catalogo interactivo de servicios del hotel con modal de fotos |
| `/contact` | `Contact` | Formulario de contacto integrado con reCAPTCHA y envio via Nodemailer |
| `/userVerification/:token` | `UserVerify` | Pantalla receptora del enlace de verificacion de correo enviado en el registro |
| `/user-bookings` | `UserBookings` | Panel de consulta, cancelacion y duplicacion de reservas del usuario logueado |
| `/admin` | `Admin` | Panel administrativo para supervision de reservas, usuarios y servicios |
| `/privacy-policy` | `PrivacyPolicy` | Politica de privacidad |
| `/legal-notice` | `LegalNotice` | Aviso legal |
| `/cookies-policy` | `CookiePolicy` | Politica de cookies |
| `/terms-of-use` | `TermsOfUse` | Terminos de uso |
| `*` | `NotFound` | Pagina de error 404 para rutas no reconocidas |

---

## 3. Arquitectura Basada en Modales

Para optimizar la experiencia de usuario (UX) y evitar recargas o transiciones abruptas, los flujos criticos se implementaron en ventanas modales:

### 3.1. `BookingModal.tsx` (Asistente de Reserva)
Flujo guiado en 8 etapas secuenciales (`BookingSteps`):
1. **`StepPersonalData`**: Relleno de nombre, apellidos, correo y DNI. Si el usuario esta autenticado, los datos se autocompletan y bloquean.
2. **`StepPlan`**: Eleccion entre plan `Basic` o plan `VIP`.
3. **`StepChooseRoom`**: Seleccion de habitacion y calendario de fechas (check-in y check-out).
   - Valida disponibilidad contra el endpoint `/checkBookingAvailability`.
   - Consulta el servicio de meteorologia (`weatherAPI` / `/weather`). Si se pronostican lluvias severas para las fechas del plan, se notifica y previene la reserva no idonea.
4. **`StepChooseServices`**: Seleccion opcional de extras (spa, transfers, degustaciones).
5. **`StepFillGuests`**: Asignacion de ocupantes, especificando mayoria de edad y si forman parte de los usuarios registrados del sistema.
6. **`StepPromoCode`**: Aplicacion y validacion de cupones de descuento.
7. **`StepPaymentMethod`**: Procesamiento seguro con `StripeCheckoutForm` mediante `PaymentElement`.
8. **`StepConfirmation`**: Pantalla final con resumen detallado, ID de reserva y confirmacion de operacion.

### 3.2. `UserModal.tsx` (Gestion de Sesion y Cuenta)
Permite gestionar el ciclo de vida del usuario:
- Formulario de Inicio de Sesion clasico (email y contrasena).
- Registro con validaciones completas.
- **Registro rapido mediante codigo QR**: El usuario sube o escanea una imagen QR que contiene su informacion en formato JSON. Se envia en Base64 al backend, donde se decodifica con `jsQR`.
- Formulario de recuperacion de contrasena con envio de correo.
- Edicion de datos de perfil y carga de avatar (foto de perfil convertida a formato WebP).

### 3.3. `DuplicateBookingModal.tsx`
Permite a los usuarios recurrentes tomar los datos de una estancia previa (habitacion, plan, servicios) y replicarla seleccionando un nuevo periodo de estancia.

### 3.4. `ViewImageModal.tsx`
Modal emergente para previsualizar en alta definicion las fotografias de suites y servicios.

---

## 4. Servicios de Comunicacion (`src/services/`)

- **`serverAPI.js`**: Instancia central de Axios preconfigurada con `baseURL: API_URL`, cabeceras JSON y timeout de 5 segundos.
- **`weatherAPI.js`**: Instancia de Axios conectada a la API de OpenWeatherMap (y compatible con AccuWeather) para consultar previsiones climatologicas a 5 dias.
- **`consts.js`**: Define las constantes de entorno segun `process.env.NODE_ENV` (desarrollo local vs produccion con proxy).
