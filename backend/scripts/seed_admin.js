// ==============================================================================
// SCRIPT: seed_admin.js
// Proposito: Comando de inicializacion / seed para el usuario administrador
// Ejecuta: npm run db:seed o node scripts/seed_admin.js
// ==============================================================================
import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { ensureAdminUser, DEFAULT_ADMIN_EMAIL } from "../services/adminSeedService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno del backend
const envFile = process.env.ENV_FILE || path.join(__dirname, "..", ".env");
if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
    console.log(`[SEED_ADMIN] Loaded environment variables from: ${envFile}`);
} else {
    dotenv.config();
}

// Opciones de conexion a base de datos
const host = process.env.DB_URL || "127.0.0.1";
const port = Number(process.env.DB_PORT || 3306);
const user = process.env.DB_USER || "root";
const password = process.env.DB_PASSWORD || "";
const database = process.env.DB_NAME || "hotelaurademallorca";
const useSsl = process.env.DB_SSL === "true" || port === 4000;

console.log("[SEED_ADMIN] Target Database Config:");
console.log(`  Host: ${host}`);
console.log(`  Port: ${port}`);
console.log(`  User: ${user}`);
console.log(`  Database: ${database}`);
console.log(`  Target Admin Email: ${process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL}`);

async function runAdminSeed() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host,
            port,
            user,
            password,
            database,
            ...(useSsl ? { ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } } : {}),
        });

        console.log("[SEED_ADMIN] Conectado a la base de datos.");
        const result = await ensureAdminUser(connection);
        console.log(`[SEED_ADMIN] Operacion finalizada con exito (${result.action}).`);
    } catch (error) {
        console.error("[SEED_ADMIN ERROR] No se pudo sembrar el usuario administrador:", error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log("[SEED_ADMIN] Conexion a base de datos cerrada.");
        }
    }
}

runAdminSeed();
