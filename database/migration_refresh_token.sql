-- ==============================================================================
-- Hotel Aura de Mallorca - Script de Migracion: Refresh Token y Fechas de Expiracion
-- Proposito: Actualizar el esquema existente de `app_user` en produccion (phpMyAdmin / MySQL)
-- sin perdida de datos ni necesidad de recrear la tabla.
-- ==============================================================================

USE hotelaurademallorca;

-- 1. Modificar longitud de access_token para soportar JWT extensos
ALTER TABLE `app_user` 
MODIFY COLUMN `access_token` VARCHAR(512) DEFAULT NULL;

-- 2. Anadir columnas para refresh_token y refresh_token_expiry
ALTER TABLE `app_user` 
ADD COLUMN `refresh_token` VARCHAR(512) DEFAULT NULL AFTER `access_token`,
ADD COLUMN `refresh_token_expiry` TIMESTAMP NULL DEFAULT NULL AFTER `refresh_token`;

-- 3. Ajustar defaults de expiraciones existentes a NULL (evitando valores inconsistentes)
ALTER TABLE `app_user`
MODIFY COLUMN `verification_token_expiry` TIMESTAMP NULL DEFAULT NULL,
MODIFY COLUMN `reset_token_expiry` TIMESTAMP NULL DEFAULT NULL;

-- 4. Anadir indice de rendimiento para busquedas rapidas por refresh_token
ALTER TABLE `app_user` 
ADD INDEX `idx_app_user_refresh_token` (`refresh_token`(255));

-- 5. Ajustar indice de access_token si existia previamente
-- Si da advertencia porque ya existe idx_app_user_access_token, se puede ejecutar:
-- ALTER TABLE `app_user` DROP INDEX `idx_app_user_access_token`, ADD INDEX `idx_app_user_access_token` (`access_token`(255));
