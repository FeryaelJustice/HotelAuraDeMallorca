import dotenv from "dotenv";
import nodemailer from "nodemailer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const hostsToTest = [
    { host: "smtp.hostinger.com", port: 465, secure: true },
    { host: "smtp.hostinger.com", port: 587, secure: false },
    { host: "smtp.titan.email", port: 465, secure: true },
    { host: "smtp.titan.email", port: 587, secure: false },
];

const user = process.env.MAIL_USERNAME;
const pass = process.env.MAIL_PASSWORD;

console.log(`Verificando credenciales para usuario: [${user}]`);
console.log(`Longitud del password: ${pass ? pass.length : 0} caracteres`);

async function testConfigurations() {
    for (const config of hostsToTest) {
        console.log(`\n--- Probando ${config.host}:${config.port} (secure: ${config.secure}) ---`);
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: { user, pass },
            tls: { rejectUnauthorized: false },
            family: 4,
            connectionTimeout: 7000,
        });

        try {
            const res = await transporter.verify();
            console.log(`[EXITO] Conectado y autenticado correctamente en ${config.host}:${config.port}!`);
            return;
        } catch (err) {
            console.log(`[FALLO] ${config.host}:${config.port} -> ${err.message} (code: ${err.code}, responseCode: ${err.responseCode})`);
        }
    }
}

testConfigurations().then(() => {
    console.log("\nFin de las pruebas de conectividad.");
});
