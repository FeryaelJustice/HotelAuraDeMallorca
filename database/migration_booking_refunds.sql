-- ==============================================================================
-- MIGRATION SCRIPT: Add refund and cancellation audit columns
-- Proposito: Permitir la trazabilidad contable de cancelaciones y reembolsos de Stripe.
-- Compatible con TiDB, MariaDB y MySQL (sintaxis idempotente ADD COLUMN IF NOT EXISTS).
-- ==============================================================================

-- 1. Columna cancelled_at en tabla booking
ALTER TABLE `booking` 
ADD COLUMN IF NOT EXISTS `cancelled_at` TIMESTAMP NULL DEFAULT NULL AFTER `is_cancelled`;

-- 2. Columnas de auditoria de pagos y reembolsos en tabla payment
ALTER TABLE `payment` 
ADD COLUMN IF NOT EXISTS `payment_status` VARCHAR(50) NOT NULL DEFAULT 'PAID' AFTER `payment_method_id`;

ALTER TABLE `payment` 
ADD COLUMN IF NOT EXISTS `refund_amount` DECIMAL(10, 2) DEFAULT NULL AFTER `payment_status`;

ALTER TABLE `payment` 
ADD COLUMN IF NOT EXISTS `refund_date` TIMESTAMP NULL DEFAULT NULL AFTER `refund_amount`;

ALTER TABLE `payment` 
ADD COLUMN IF NOT EXISTS `refund_transaction_id` VARCHAR(255) DEFAULT NULL AFTER `refund_date`;
