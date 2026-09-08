-- ==============================================================================
-- MIGRATION SCRIPT: Add indexes on guest table for deduplication
-- Proposito: Acelerar las consultas de deduplicacion de huespedes por email y por nombre + apellidos.
-- ==============================================================================

SET @dbname = DATABASE();

-- 1. Index idx_guest_email
SET @preparedStatement = (SELECT IF(
    (
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = @dbname
          AND TABLE_NAME = 'guest'
          AND INDEX_NAME = 'idx_guest_email'
    ) > 0,
    'SELECT "Index idx_guest_email already exists.";',
    'ALTER TABLE guest ADD INDEX idx_guest_email (guest_email);'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Index idx_guest_name_surnames
SET @preparedStatement = (SELECT IF(
    (
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = @dbname
          AND TABLE_NAME = 'guest'
          AND INDEX_NAME = 'idx_guest_name_surnames'
    ) > 0,
    'SELECT "Index idx_guest_name_surnames already exists.";',
    'ALTER TABLE guest ADD INDEX idx_guest_name_surnames (guest_name, guest_surnames);'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
