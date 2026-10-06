# Análisis del Modelo de Datos - Hotel Aura de Mallorca

Este documento describe la estructura relacional, tablas, restricciones y lógica de persistencia contenida en `database/db.sql`.

> **AVISO IMPORTANTE**:
> El directorio `database/` y su contenido son de **estricta solo lectura**. No deben realizarse modificaciones directas en `database/db.sql` ni en sus archivos asociados.

---

## 1. Diagrama Entidad-Relacion y Relaciones

El modelo relacional garantiza la integridad referencial y modela el dominio del negocio hotelero:

```mermaid
erDiagram
    APP_USER ||--o{ USER_ROLE : tiene
    ROLE ||--o{ USER_ROLE : asignado
    APP_USER ||--o{ BOOKING : realiza
    PLAN ||--o{ BOOKING : contratado
    ROOM ||--o{ BOOKING : asignada
    BOOKING ||--o{ BOOKING_SERVICE : incluye
    SERVICE ||--o{ BOOKING_SERVICE : contratado
    BOOKING ||--o{ BOOKING_GUEST : hospeda
    GUEST ||--o{ BOOKING_GUEST : asignado
    BOOKING ||--o{ BOOKING_PROMOTION : aplica
    PROMOTION ||--o{ BOOKING_PROMOTION : aplicada
    APP_USER ||--o{ USER_PROMOTION : tiene
    PROMOTION ||--o{ USER_PROMOTION : asignada
    APP_USER ||--o{ USER_BOOKING_COUNT : cuenta
    BOOKING ||--o{ PAYMENT : liquidado
    PAYMENT_METHOD ||--o{ PAYMENT : mediante
    PAYMENT ||--o| PAYMENT_TRANSACTION : referencia
```

---

## 2. Descripción Detallada de Tablas

### 2.1. Usuarios, Roles y Seguridad
- **`app_user`**:
  - `id`: Identificador único (PK, autoincremental).
  - `user_name`, `user_surnames`, `user_email` (UNIQUE), `user_dni` (UNIQUE).
  - `user_password`: Hash bcrypt de la contraseña.
  - `user_verified`: Booleano para confirmación de email.
  - `verification_token`, `verification_token_expiry`: Token temporal de activacion.
  - `access_token`: Token JWT activo (1 dia) para validación cruzada.
  - `refresh_token`, `refresh_token_expiry`: Token JWT de larga duración (7 días) para renovación silenciosa de sesión.
  - `reset_token`, `reset_token_expiry`: Gestión de recuperación de clave (validez 10 minutos).
  - `isEnabled`: Flag de estado de cuenta. Se desactiva ante sanciones.
  - `enabledByAdmin`: Flag de doble aprobacion requerida para reactivacion tras suspension.
- **`role`**:
  - `id`: PK.
  - `name`: Enumeracion (`CLIENT`, `ADMIN`, `EMPLOYEE`).
- **`user_role`**:
  - Vincula `user_id` con `role_id` (claves foráneas con eliminación en cascada para usuario).

### 2.2. Huéspedes y Capacidad
- **`guest`**:
  - Informacion de los ocupantes de las habitaciones.
  - `isAdult`: `CHAR(1)` indicando si es mayor de edad.
  - `isSystemUser`: `CHAR(1)` indicando si el huesped es un usuario registrado en `app_user`.
- **`booking_guest`**:
  - Tabla asociativa N:M entre `booking` y `guest`.

### 2.3. Catálogo Hotelero
- **`plan`**:
  - Modalidades de estancia (`Basic` a 50.00 EUR, `VIP` a 150.00 EUR).
- **`room`**:
  - Habitaciones, nombres, tarifas base y ventanas de disponibilidad (`room_availability_start`, `room_availability_end`).
- **`service`**:
  - Servicios adicionales ofrecidos (spa, traslados, cenas gourmet), tarifas y disponibilidad.

### 2.4. Reservas y Operaciones
- **`booking`**:
  - Centraliza la reserva: vincula `user_id`, `plan_id`, `room_id`.
  - Fechas: `booking_start_date`, `booking_end_date`, `cancellation_deadline`.
  - `is_cancelled`: Booleano para marcar reservas canceladas.
  - **Restricciones CHECK**:
    - `valid_dates`: `CHECK (booking_start_date <= booking_end_date)`
    - `valid_cancellation`: `CHECK (cancellation_deadline < booking_start_date)`
- **`booking_service`**:
  - N:M entre `booking` y `service`.

### 2.5. Promociones y Fidelizacion
- **`promotion`**:
  - Código de cupón (`code` UNIQUE), importe de descuento (`discount_price`), fechas de validez.
- **`booking_promotion`**:
  - Registra que promoción se descontó en una reserva específica.
- **`user_promotion`**:
  - Asigna promociones directas a usuarios con control de uso único (`isUsed`).
- **`user_booking_count`**:
  - Contador de reservas completadas por usuario, utilizado para lógica de premios o castigos.

### 2.6. Meteorología Local
- **`weather`**:
  - `weather_date`: Fecha de la observación o previsión.
  - `weather_state`: Estado atmosferico (ej. `Rain`, `Clear`, `Clouds`).
  - Sirve como caché local para no saturar las cuotas de la API externa y permitir consultas rápidas en la comprobacion de reservas.

### 2.7. Pasarela y Transacciones de Pago
- **`payment_method`**:
  - Métodos configurados (tarjeta bancaria, pasarela digital, Stripe).
- **`payment`**:
  - Registro contable interno del importe abonado, fecha y relacion con `booking_id` y `user_id`.
- **`payment_transaction`**:
  - Almacena el `transaction_id` devuelto por Stripe u otra pasarela externa.

### 2.8. Gestión Multimedia
- **`media`**:
  - Tabla polimorfica para recursos (`type` ENUM `'image'/'video'`, `url`).
- **Tablas de asociacion**:
  - `user_media`, `service_media`, `room_media`, `plan_media`.
