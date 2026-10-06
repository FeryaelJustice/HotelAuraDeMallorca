# Análisis Técnico del Frontend - Hotel Aura de Mallorca

Este documento detalla la arquitectura de la aplicación cliente (`frontend/`), sus vistas, modales, componentes y flujo de datos.

---

## 1. Pila Tecnologica

- **Framework**: React 19 con TypeScript.
- **Empaquetador y Servidor de Desarrollo**: Vite.
- **Enrutamiento**: React Router v7 (`react-router-dom`).
- **Libreria de Componentes y UI**: Bootstrap 5, `react-bootstrap`, `react-icons`, `@fortawesome/react-fontawesome`.
- **Formularios y Validaciones**: `sweetalert2` para dialogos informativos y confirmaciones, `react-google-recaptcha` para proteccion anti-spam.
- **Pasarela de Pagos**: `@stripe/react-stripe-js` y `@stripe/stripe-js`.
- **Internacionalización**: `i18next`, `react-i18next`, `i18next-browser-languagedetector`.
- **Manejo de Estado y Cookies**: `react-cookie` para gestión del token JWT y consentimiento RGPD.

---

## 2. Enrutamiento y Páginas Principales

El enrutamiento principal se define en `src/App.tsx`:

| Ruta | Componente | Descripción |
|---|---|---|
| `/` | `Home` | Página de bienvenida con banners visuales, informacion general y accesos directos |
| `/services` | `Services` | Catálogo interactivo de servicios del hotel con modal de fotos |
| `/contact` | `Contact` | Formulario de contacto integrado con reCAPTCHA y envío vía Nodemailer |
| `/userVerification/:token` | `UserVerify` | Pantalla receptora del enlace de verificación de correo enviado en el registro |
| `/user-bookings` | `UserBookings` | Panel de consulta, cancelación y duplicacion de reservas del usuario logueado |
| `/admin` | `Admin` | Panel administrativo para supervision de reservas, usuarios y servicios |
| `/privacy-policy` | `PrivacyPolicy` | Política de privacidad |
| `/legal-notice` | `LegalNotice` | Aviso legal |
| `/cookies-policy` | `CookiePolicy` | Política de cookies |
| `/terms-of-use` | `TermsOfUse` | Términos de uso |
| `*` | `NotFound` | Página de error 404 para rutas no reconocidas |

---

## 3. Arquitectura Basada en Modales

Para optimizar la experiencia de usuario (UX) y evitar recargas o transiciones abruptas, los flujos criticos se implementaron en ventanas modales:

### 3.1. `BookingModal.tsx` (Asistente de Reserva)
Flujo guiado en 8 etapas secuenciales (`BookingSteps`):
1. **`StepPersonalData`**: Relleno de nombre, apellidos, correo y DNI. Si el usuario está autenticado, los datos se autocompletan y bloquean.
2. **`StepPlan`**: Eleccion entre plan `Basic` o plan `VIP`.
3. **`StepChooseRoom`**: Selección de habitación y calendario de fechas (check-in y check-out).
   - Valida disponibilidad contra el endpoint `/checkBookingAvailability`.
   - Consulta el servicio de meteorología (`weatherAPI` / `/weather`). Si se pronostican lluvias severas para las fechas del plan, se notifica y previene la reserva no idónea.
4. **`StepChooseServices`**: Selección opcional de extras (spa, transfers, degustaciones).
5. **`StepFillGuests`**: Asignación de ocupantes, especificando mayoría de edad y si forman parte de los usuarios registrados del sistema.
6. **`StepPromoCode`**: Aplicación y validación de cupones de descuento.
7. **`StepPaymentMethod`**: Procesamiento seguro con `StripeCheckoutForm` mediante `PaymentElement`.
8. **`StepConfirmation`**: Pantalla final con resumen detallado, ID de reserva y confirmación de operacion.

### 3.2. `UserModal.tsx` (Gestión de Sesión y Cuenta)
Permite gestionar el ciclo de vida del usuario:
- Formulario de Inicio de Sesión clasico (email y contraseña).
- Registro con validaciones completas.
- **Registro rápido mediante código QR**: El usuario sube o escanea una imagen QR que contiene su informacion en formato JSON. Se envia en Base64 al backend, donde se decodifica con `jsQR`.
- Formulario de recuperación de contraseña con envío de correo.
- Edición de datos de perfil y carga de avatar (foto de perfil convertida a formato WebP).

### 3.3. `DuplicateBookingModal.tsx`
Permite a los usuarios recurrentes tomar los datos de una estancia previa (habitación, plan, servicios) y replicarla seleccionando un nuevo período de estancia.

### 3.4. `ViewImageModal.tsx`
Modal emergente para previsualizar en alta definición las fotografías de suites y servicios.

---

## 4. Servicios de Comunicación (`src/services/`)

- **`serverAPI.js`**: Instancia central de Axios preconfigurada con `baseURL: API_URL`, cabeceras JSON y timeout de 5 segundos.
- **`weatherAPI.js`**: Instancia de Axios conectada a la API de OpenWeatherMap (y compatible con AccuWeather) para consultar previsiones climatológicas a 5 días.
- **`consts.js`**: Define las constantes de entorno segun `process.env.NODE_ENV` (desarrollo local vs produccion con proxy).
