import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Optional custom env file path (e.g. ENV_FILE=.env.production)
const envFile = process.env.ENV_FILE || path.join(__dirname, "..", ".env");
if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
    console.log(`[RESET_DB] Loaded environment variables from: ${envFile}`);
} else {
    dotenv.config();
}

// Parse command line flags (--host, --port, --user, --password, --database, --ssl)
const args = process.argv.slice(2);
const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
};

const host = getArg("--host") || process.env.DB_URL || "127.0.0.1";
const port = Number(getArg("--port") || process.env.DB_PORT || 3306);
const user = getArg("--user") || process.env.DB_USER || "root";
const password = getArg("--password") || process.env.DB_PASSWORD || "";
const database = getArg("--database") || process.env.DB_NAME || "hotelaurademallorca";
const useSsl = getArg("--ssl") === "true" || process.env.DB_SSL === "true" || port === 4000;

console.log("[RESET_DB] Target Database Config:");
console.log(`  Host: ${host}`);
console.log(`  Port: ${port}`);
console.log(`  User: ${user}`);
console.log(`  Database: ${database}`);
console.log(`  SSL: ${useSsl ? "enabled (TLSv1.2)" : "disabled"}`);

const dbSqlPath = path.join(__dirname, "..", "..", "database", "db.sql");
if (!fs.existsSync(dbSqlPath)) {
    console.error(`[RESET_DB ERROR] db.sql not found at ${dbSqlPath}`);
    process.exit(1);
}

const connectionConfig = {
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true,
    ...(useSsl ? { ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } } : {}),
};

async function runReset() {
    let connection;
    try {
        console.log("[RESET_DB] Connecting to database...");
        connection = await mysql.createConnection(connectionConfig);
        console.log("[RESET_DB] Connected successfully!");

        // Step 1: Disable foreign key checks and drop known tables
        console.log("[RESET_DB] Dropping existing tables if they exist...");
        await connection.query("SET FOREIGN_KEY_CHECKS = 0;");
        const tablesToDrop = [
            "booking_service",
            "booking_guest",
            "service_media",
            "room_media",
            "plan_media",
            "user_media",
            "media",
            "review",
            "booking",
            "user_promotion",
            "promotion",
            "user_role",
            "role",
            "service",
            "room",
            "plan",
            "guest",
            "app_user"
        ];
        for (const tbl of tablesToDrop) {
            await connection.query(`DROP TABLE IF EXISTS \`${tbl}\`;`);
        }
        await connection.query("SET FOREIGN_KEY_CHECKS = 1;");
        console.log("[RESET_DB] Existing tables dropped cleanly.");

        // Step 2: Read db.sql
        console.log("[RESET_DB] Reading SQL schema and seed data from db.sql...");
        let sqlContent = fs.readFileSync(dbSqlPath, "utf-8");

        // Remove CREATE DATABASE / USE statements if they conflict with target DB
        sqlContent = sqlContent.replace(/CREATE DATABASE IF NOT EXISTS `?[a-zA-Z0-9_-]+`?;/gi, "");
        sqlContent = sqlContent.replace(/USE `?[a-zA-Z0-9_-]+`?;/gi, "");

        // Execute the entire SQL script
        console.log("[RESET_DB] Executing schema creation and seed data insertion...");
        await connection.query(sqlContent);

        console.log("[RESET_DB] SUCCESS! Database reset and seeded successfully.");
    } catch (error) {
        console.error("[RESET_DB ERROR]", error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log("[RESET_DB] Database connection closed.");
        }
    }
}

runReset();
