-- ==============================================================================
-- Hotel Aura de Mallorca - Script Idempotente de Sembrado y Actualizacion (Seed/Upsert)
-- Proposito: Carga y actualizacion garantizada de datos maestros (roles, planes,
-- habitaciones, servicios, imagenes y metodos de pago) sin duplicar registros.
-- Por que: Permite ejecutar el despliegue de base de datos repetidamente en entornos
-- de desarrollo, pruebas o produccion manteniendo la consistencia de IDs foraneos.
-- ==============================================================================

USE hotelaurademallorca;

-- 1. ROLES
-- Que hace: Inserta los tres roles de acceso del sistema (CLIENT, ADMIN, EMPLOYEE).
-- Por que: Requeridos para la asignacion de permisos en la autenticacion JWT.
INSERT INTO role (id, name)
VALUES 
    (1, 'CLIENT'),
    (2, 'ADMIN'),
    (3, 'EMPLOYEE')
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    updated_at = CURRENT_TIMESTAMP;

-- 2. PLANS
-- Que hace: Registra los planes de contratacion (Basic y VIP).
-- Por que: Proveen tarifas base complementarias a la reserva.
INSERT INTO plan (id, plan_name, plan_description, plan_price)
VALUES
    (1, 'Basic', 'Basic plan without extra services', 50.00),
    (2, 'VIP', 'VIP plan with all luxury services included', 150.00)
ON DUPLICATE KEY UPDATE
    plan_name = VALUES(plan_name),
    plan_description = VALUES(plan_description),
    plan_price = VALUES(plan_price),
    updated_at = CURRENT_TIMESTAMP;

-- 3. ROOMS (Active availability from 2024 through 2035)
INSERT INTO room (id, room_name, room_description, room_price, room_availability_start, room_availability_end)
VALUES
    (1, 'Standard Room', 'Standard room with sea view and private balcony', 80.00, '2024-01-01', '2035-12-31'),
    (2, 'VIP Suite', 'VIP suite with luxury services, ocean terrace and king-size bed', 200.00, '2024-01-01', '2035-12-31'),
    (3, 'Deluxe Ocean View', 'Spacious deluxe room facing the Mediterranean sea with private balcony', 130.00, '2024-01-01', '2035-12-31'),
    (4, 'Royal VIP Penthouse', 'Exclusive top-floor penthouse with private jacuzzi, butler service and panoramic terrace', 350.00, '2024-01-01', '2035-12-31'),
    (5, 'Family Comfort Room', 'Spacious family room with two king beds, kids area and quiet garden view', 160.00, '2024-01-01', '2035-12-31')
ON DUPLICATE KEY UPDATE
    room_name = VALUES(room_name),
    room_description = VALUES(room_description),
    room_price = VALUES(room_price),
    room_availability_start = VALUES(room_availability_start),
    room_availability_end = VALUES(room_availability_end),
    updated_at = CURRENT_TIMESTAMP;

-- 4. SERVICES (Active availability from 2024 through 2035)
INSERT INTO service (id, serv_name, serv_description, serv_price, serv_availability_start, serv_availability_end)
VALUES
    (1, 'Luxury Garden', 'Access to botanical relaxation garden and private cabanas', 20.00, '2024-01-01', '2035-12-31'),
    (2, 'Deluxe Pool', 'Exclusive heated infinity pool access with towel service', 30.00, '2024-01-01', '2035-12-31'),
    (3, 'High-speed Wi-Fi', 'Ultra high-speed optical fiber Wi-Fi throughout all hotel premises', 10.00, '2024-01-01', '2035-12-31'),
    (4, 'Spa & Wellness', 'Full access to thermal circuit, sauna, steam room and aromatherapy', 50.00, '2024-01-01', '2035-12-31'),
    (5, 'Fitness Center & Gym', 'Modern fitness room equipped with Technogym machines and personal trainer support', 15.00, '2024-01-01', '2035-12-31')
ON DUPLICATE KEY UPDATE
    serv_name = VALUES(serv_name),
    serv_description = VALUES(serv_description),
    serv_price = VALUES(serv_price),
    serv_availability_start = VALUES(serv_availability_start),
    serv_availability_end = VALUES(serv_availability_end),
    updated_at = CURRENT_TIMESTAMP;

-- 5. PAYMENT METHODS
INSERT INTO payment_method (id, payment_method_name)
VALUES
    (1, 'Stripe'),
    (2, 'Paypal')
ON DUPLICATE KEY UPDATE
    payment_method_name = VALUES(payment_method_name),
    updated_at = CURRENT_TIMESTAMP;

-- 6. MEDIA ASSETS
INSERT INTO media (id, type, url)
VALUES
    (1, 'image', 'media/img/home-main.webp'),
    (2, 'image', 'media/img/home-secondary.webp'),
    (3, 'image', 'media/img/home-tertiary.webp'),
    (4, 'image', 'media/img/services.webp'),
    (5, 'image', 'media/img/contact.webp'),
    (6, 'image', 'media/img/garden.webp'),
    (7, 'image', 'media/img/swimming-pool.webp'),
    (8, 'image', 'media/img/wifi.webp'),
    (9, 'image', 'media/img/spa.webp'),
    (10, 'image', 'media/img/gym.webp'),
    (11, 'image', 'media/img/room.webp'),
    (12, 'image', 'media/img/room-vip.webp'),
    (13, 'image', 'media/img/plan-basic.webp'),
    (14, 'image', 'media/img/plan-vip.webp'),
    (15, 'image', 'media/img/defaultImage.webp')
ON DUPLICATE KEY UPDATE
    type = VALUES(type),
    url = VALUES(url),
    updated_at = CURRENT_TIMESTAMP;

-- 7. SERVICE MEDIA ASSOCIATIONS
INSERT INTO service_media (id, service_id, media_id)
VALUES
    (1, 1, 6),
    (2, 2, 7),
    (3, 3, 8),
    (4, 4, 9),
    (5, 5, 10)
ON DUPLICATE KEY UPDATE
    service_id = VALUES(service_id),
    media_id = VALUES(media_id),
    updated_at = CURRENT_TIMESTAMP;

-- 8. ROOM MEDIA ASSOCIATIONS
INSERT INTO room_media (id, room_id, media_id)
VALUES
    (1, 1, 11),
    (2, 2, 12),
    (3, 3, 11),
    (4, 4, 12),
    (5, 5, 11)
ON DUPLICATE KEY UPDATE
    room_id = VALUES(room_id),
    media_id = VALUES(media_id),
    updated_at = CURRENT_TIMESTAMP;

-- 9. PLAN MEDIA ASSOCIATIONS
INSERT INTO plan_media (id, plan_id, media_id)
VALUES
    (1, 1, 13),
    (2, 2, 14)
ON DUPLICATE KEY UPDATE
    plan_id = VALUES(plan_id),
    media_id = VALUES(media_id),
    updated_at = CURRENT_TIMESTAMP;

-- 10. PROMOTIONS
INSERT INTO promotion (id, code, discount_price, name, description, start_date, end_date, is_active, is_visible)
VALUES
    (1, 'WELCOME10', 10.00, 'Welcome Promo', 'Enjoy 10% discount on your reservation', '2024-01-01', '2035-12-31', 1, 1),
    (2, 'SUMMERVIP', 15.00, 'Summer VIP', 'Special 15% discount for early season bookings', '2024-01-01', '2035-12-31', 1, 1),
    (3, 'AURA20', 20.00, 'Aura Special', '20% off on all luxury rooms', '2024-01-01', '2035-12-31', 1, 1),
    (4, 'SUMMER2026', 30.00, 'Summer discount', 'Get 30% off on your stay!', '2026-06-21', '2026-09-21', 1, 1)
ON DUPLICATE KEY UPDATE
    code = VALUES(code),
    discount_price = VALUES(discount_price),
    name = VALUES(name),
    description = VALUES(description),
    start_date = VALUES(start_date),
    end_date = VALUES(end_date),
    is_active = VALUES(is_active),
    is_visible = VALUES(is_visible);

-- 11. USUARIO ADMINISTRADOR Y ROLES
-- Que hace: Siembra un usuario administrador maestro verificado y habilitado con rol ADMIN.
-- Por que: Permite el acceso directo al panel administrativo (/admin) y a la validacion de reservas.
-- Nota: Password hasheado para 'AuraAdmin2026!'
INSERT INTO app_user (
    id,
    user_name,
    user_surnames,
    user_email,
    user_dni,
    user_password,
    user_verified,
    isEnabled,
    enabledByAdmin
)
VALUES (
    100,
    'Admin',
    'Hotel Aura de Mallorca',
    'admin@hotelaurademallorca.com',
    '00000000A',
    '$2b$10$jENBkLrmGXlThHQ77MMHQey9fQNBdCm3JjUfuJv.jTjWFzYrc0dt6',
    TRUE,
    TRUE,
    TRUE
)
ON DUPLICATE KEY UPDATE
    user_name = VALUES(user_name),
    user_email = VALUES(user_email),
    user_password = VALUES(user_password),
    user_verified = TRUE,
    isEnabled = TRUE,
    updated_at = CURRENT_TIMESTAMP;

-- Asignacion de rol ADMIN (role_id = 2) al usuario administrador
INSERT INTO user_role (id, user_id, role_id)
VALUES (100, 100, 2)
ON DUPLICATE KEY UPDATE
    role_id = 2,
    updated_at = CURRENT_TIMESTAMP;

