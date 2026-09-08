import dotenv from "dotenv";
import nodemailer from "nodemailer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

console.log("=== Diagnostico de Configuracion de Correo ===");
console.log("MAIL_HOST:", process.env.MAIL_HOST);
console.log("MAIL_PORT:", process.env.MAIL_PORT);
console.log("MAIL_SECURE:", process.env.MAIL_SECURE);
console.log("MAIL_USERNAME:", process.env.MAIL_USERNAME);
console.log("MAIL_PASSWORD:", process.env.MAIL_PASSWORD ? "******** (configurada)" : "NO CONFIGURADA");
console.log("MAIL_SENDER_EMAIL:", process.env.MAIL_SENDER_EMAIL);
console.log("BREVO_API_KEY:", process.env.BREVO_API_KEY ? "CONFIGURADA" : "NO CONFIGURADA");

const port = Number(process.env.MAIL_PORT) || 465;
const isSecure = process.env.MAIL_SECURE !== undefined 
    ? (process.env.MAIL_SECURE === "true" || process.env.MAIL_SECURE === true)
    : port === 465;

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.hostinger.com",
    port: port,
    secure: isSecure,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false,
        servername: process.env.MAIL_HOST || "smtp.hostinger.com",
    },
    family: 4,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
});

console.log("\nProbando verificacion SMTP con nodemailer...");
transporter.verify((error, success) => {
    if (error) {
        console.error("\n[X] Error al verificar conexion SMTP:", error);
        if (error.code === "EAUTH" || error.responseCode === 535) {
            console.error("-> Causa probable: Usuario o contrasena incorrectos para el buzon de Hostinger.");
            console.error("-> Nota: Asegurate de usar la contrasena del buzon de correo creado en Hostinger, no la contrasena general del panel de Hostinger.");
        } else if (error.code === "ETIMEDOUT" || error.code === "ECONNREFUSED") {
            console.error("-> Causa probable: Puerto bloqueado o host inaccesible.");
            console.error("-> Nota: Si el puerto 465 esta bloqueado por el cortafuegos, prueba con el puerto 587 (MAIL_PORT=587, MAIL_SECURE=false).");
        }
    } else {
        console.log("\n[OK] Conexion SMTP verificada exitosamente:", success);
    }
    process.exit(error ? 1 : 0);
});
