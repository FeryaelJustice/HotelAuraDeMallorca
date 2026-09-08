// ==============================================================================
// MODULO: adminSeedService.js
// Proposito: Creacion y sincronizacion idempotente del usuario administrador
// maestro mediante variables de entorno (ADMIN_EMAIL, ADMIN_PASSWORD) y bcrypt.
// ==============================================================================
import bcrypt from "bcryptjs";

// Credenciales por defecto seguras (fallback si no estan definidas en .env)
export const DEFAULT_ADMIN_EMAIL = "admin@hotelaurademallorca.com";
export const DEFAULT_ADMIN_PASSWORD = "AuraAdmin!Secure2026_x#";

/**
 * Asegura la existencia del rol ADMIN en la tabla `role`.
 * Devuelve el id del rol ADMIN.
 */
async function ensureAdminRoleId(conn) {
    const [roles] = await conn.query("SELECT id FROM role WHERE name = 'ADMIN' LIMIT 1");
    if (roles && roles.length > 0) {
        return roles[0].id;
    }
    // Si no existe, insertar rol ADMIN con id recomendado 2
    const [insertResult] = await conn.query(
        "INSERT INTO role (id, name) VALUES (2, 'ADMIN') ON DUPLICATE KEY UPDATE name = 'ADMIN'"
    );
    return insertResult.insertId || 2;
}

/**
 * Sincroniza o crea el usuario administrador.
 * Se ejecuta una sola comprobacion de base de datos en arranque o vía comando seed.
 * Prioriza ADMIN_EMAIL y ADMIN_PASSWORD de process.env.
 * Si alguno no coincide exactamente (o no existe el usuario), genera el hash bcrypt
 * y realiza el INSERT o UPDATE garantizando que el usuario siempre pueda iniciar sesion.
 *
 * @param {import('mysql2/promise').Connection | import('mysql2').Pool} dbTarget
 */
export async function ensureAdminUser(dbTarget) {
    const adminEmail = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim();
    const adminPassword = (process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD).trim();

    // Normalizar acceso a queries en formato promesa
    const isPromiseCapable = typeof dbTarget.promise === "function";
    const conn = isPromiseCapable ? dbTarget.promise() : dbTarget;

    try {
        const adminRoleId = await ensureAdminRoleId(conn);

        // 1. Comprobar si existe el usuario administrador por email
        const [users] = await conn.query(
            "SELECT id, user_name, user_email, user_password, user_verified, isEnabled FROM app_user WHERE user_email = ? LIMIT 1",
            [adminEmail]
        );

        if (!users || users.length === 0) {
            // Caso 1: No existe el usuario -> Crear con bcrypt
            console.log(`[ADMIN SEED] Creando usuario administrador para ${adminEmail}...`);
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            const [insertUser] = await conn.query(
                `INSERT INTO app_user (
                    user_name,
                    user_surnames,
                    user_email,
                    user_dni,
                    user_password,
                    user_verified,
                    isEnabled,
                    enabledByAdmin
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    "Admin",
                    "Hotel Aura de Mallorca",
                    adminEmail,
                    "00000000A",
                    hashedPassword,
                    1,
                    1,
                    1
                ]
            );

            const newUserId = insertUser.insertId;

            // Asignar rol ADMIN en user_role
            await conn.query(
                "INSERT INTO user_role (user_id, role_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE role_id = VALUES(role_id)",
                [newUserId, adminRoleId]
            );

            console.log(`[ADMIN SEED] Usuario administrador creado exitosamente (ID: ${newUserId}, Email: ${adminEmail}).`);
            return { action: "created", userId: newUserId, email: adminEmail };
        }

        const existingUser = users[0];
        const userId = existingUser.id;

        // 2. Si ya existe, verificar si la contraseña coincide con el hash almacenado
        let passwordMatches = false;
        if (existingUser.user_password) {
            try {
                passwordMatches = await bcrypt.compare(adminPassword, existingUser.user_password);
            } catch (err) {
                passwordMatches = false;
            }
        }

        const needsUpdate =
            !passwordMatches ||
            existingUser.user_verified !== 1 ||
            existingUser.isEnabled !== 1;

        if (needsUpdate) {
            console.log(`[ADMIN SEED] Actualizando credenciales/estado de administrador para ${adminEmail}...`);
            const newHashedPassword = await bcrypt.hash(adminPassword, 10);

            await conn.query(
                `UPDATE app_user 
                 SET user_password = ?,
                     user_verified = 1,
                     isEnabled = 1,
                     enabledByAdmin = 1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [newHashedPassword, userId]
            );

            // Asegurar rol ADMIN
            await conn.query(
                "INSERT INTO user_role (user_id, role_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE role_id = VALUES(role_id)",
                [userId, adminRoleId]
            );

            console.log(`[ADMIN SEED] Credenciales de administrador sincronizadas correctamente con el entorno.`);
            return { action: "updated", userId, email: adminEmail };
        }

        // Si ya existe y la contraseña/estado ya están exactamente sincronizados, asegurar únicamente el rol
        await conn.query(
            "INSERT INTO user_role (user_id, role_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE role_id = VALUES(role_id)",
            [userId, adminRoleId]
        );

        console.log(`[ADMIN SEED] Administrador verificado y listo (${adminEmail}).`);
        return { action: "verified", userId, email: adminEmail };
    } catch (error) {
        console.error("[ADMIN SEED ERROR] Error sincronizando usuario administrador:", error);
        throw error;
    }
}
