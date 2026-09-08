// ==============================================================================
// SERVICIO CENTRALIZADO DE CORREO ELECTRONICO (mailService.js)
// Proposito: Gestionar envios transaccionales (SMTP Hostinger / Brevo API)
// con sanitizacion de direcciones, auto-recuperacion y diagnostico detallado.
// ==============================================================================
import nodemailer from "nodemailer";
import { BrevoClient } from "@getbrevo/brevo";
import dotenv from "dotenv";

dotenv.config();

// Helper: Limpiar y normalizar valores de configuracion de .env
const cleanEnv = (val) => {
    if (!val) return "";
    let str = String(val).trim();
    if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
        str = str.slice(1, -1).trim();
    }
    return str;
};

// Configuracion SMTP
const getMailConfig = () => {
    const host = cleanEnv(process.env.MAIL_HOST) || "smtp.hostinger.com";
    const port = Number(cleanEnv(process.env.MAIL_PORT)) || 465;
    const secureEnv = cleanEnv(process.env.MAIL_SECURE);
    const isSecure = secureEnv !== "" ? secureEnv === "true" : port === 465;
    const username = cleanEnv(process.env.MAIL_USERNAME);
    const password = cleanEnv(process.env.MAIL_PASSWORD);
    const senderEmail = cleanEnv(process.env.MAIL_SENDER_EMAIL) || username || "contact@feryaeljustice.dev";
    const appName = cleanEnv(process.env.APP_NAME) || "Hotel Aura de Mallorca";
    const brevoApiKey = cleanEnv(process.env.BREVO_API_KEY);

    return {
        host,
        port,
        isSecure,
        username,
        password,
        senderEmail,
        appName,
        brevoApiKey,
    };
};

let cachedTransporter = null;
let brevoClient = null;

// Inicializacion o actualizacion del transporte Nodemailer
export function getTransporter() {
    const config = getMailConfig();
    
    if (!cachedTransporter) {
        cachedTransporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.isSecure,
            auth: {
                user: config.username,
                pass: config.password,
            },
            tls: {
                rejectUnauthorized: false,
                servername: config.host,
            },
            family: 4, // Fuerza IPv4 para evitar timeouts en ciertos proveedores
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
        });
    }
    return cachedTransporter;
}

// Inicializacion del cliente Brevo
export function getBrevoClient() {
    const config = getMailConfig();
    if (config.brevoApiKey && !brevoClient) {
        try {
            brevoClient = new BrevoClient({ apiKey: config.brevoApiKey });
        } catch (e) {
            console.warn("[MAIL] No se pudo inicializar BrevoClient:", e.message);
            brevoClient = null;
        }
    }
    return brevoClient;
}

// Helper: Sanitizar destinatarios (evita errores sintacticos en arrays o strings con comillas extra)
export function sanitizeRecipients(recipients) {
    if (!recipients) return [];
    const list = Array.isArray(recipients) ? recipients : [recipients];
    const cleaned = [];

    for (const item of list) {
        if (!item) continue;
        if (typeof item === "string") {
            let str = item.trim();
            // Remover comillas envolventes dobles o simples
            if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
                str = str.slice(1, -1).trim();
            }
            if (str) cleaned.push(str);
        } else if (typeof item === "object" && item.email) {
            cleaned.push(item.email.trim());
        }
    }
    return cleaned;
}

// Verificacion de conectividad SMTP
export async function verifyMailService() {
    const config = getMailConfig();

    if (config.brevoApiKey) {
        console.log("[MAIL] Servicio de correo configurado con Brevo API (@getbrevo/brevo).");
        return true;
    }

    if (!config.username || !config.password || config.password === "TU_PASSWORD_AQUI" || config.password === "jasxbcqMTcQxrBtpsY") {
        console.warn("[MAIL] Configure MAIL_USERNAME y MAIL_PASSWORD con credenciales reales para enviar correos por SMTP.");
        return false;
    }

    const transporter = getTransporter();
    try {
        await transporter.verify();
        console.log(`[MAIL] Servidor SMTP autenticado y listo (${config.host}:${config.port} - secure: ${config.isSecure}).`);
        return true;
    } catch (error) {
        console.warn(`[MAIL] Advertencia de conexion SMTP (${error.code || "AUTH"} - ${error.responseCode || "N/A"}): ${error.message}`);
        if (error.code === "EAUTH" || error.responseCode === 535) {
            console.warn("[MAIL] ATENCION: El servidor de Hostinger rechazo la autenticacion (Error 535).");
            console.warn("        1. Verifique que MAIL_USERNAME sea la direccion completa del buzon (ej. contacto@dominio.com).");
            console.warn("        2. Verifique que MAIL_PASSWORD sea la contrasena de ESE buzon en Hostinger Webmail, NO la del panel general.");
        }
        return false;
    }
}

// Funcion principal universal de envio de correos
export async function sendEmailNotification({
    to,
    subject,
    html,
    text,
    fromName,
    fromEmail,
    replyTo,
}) {
    const config = getMailConfig();
    const senderName = fromName || config.appName;
    // CRITICO: En SMTP autenticado de Hostinger, el remitente envelope (from) debe coincidir con el buzon autenticado.
    const senderEmail = config.senderEmail;
    const recipients = sanitizeRecipients(to);

    if (recipients.length === 0) {
        throw new Error("[MAIL] No se especificaron destinatarios validos.");
    }

    const brevo = getBrevoClient();

    // Intento 1: Brevo API v3 (si esta configurada)
    if (brevo && config.brevoApiKey) {
        try {
            const recipientList = recipients.map((dest) => {
                const match = dest.match(/<([^>]+)>/);
                const clean = match ? match[1] : dest;
                return { email: clean };
            });

            const brevoResponse = await brevo.transactionalEmails.sendTransacEmail({
                subject: subject,
                htmlContent: html || `<pre>${text || ""}</pre>`,
                textContent: text || "",
                sender: { name: senderName, email: senderEmail },
                to: recipientList,
                replyTo: replyTo ? (typeof replyTo === "string" ? { email: replyTo } : replyTo) : undefined,
            });

            const messageId =
                brevoResponse?.messageId ||
                brevoResponse?.body?.messageId ||
                (typeof brevoResponse === "string" ? brevoResponse : "brevo-sent");

            return {
                status: "success",
                provider: "brevo",
                messageId: messageId,
                raw: brevoResponse,
            };
        } catch (brevoErr) {
            console.warn("[MAIL] Fallo el envio mediante Brevo API, intentando fallback SMTP:", brevoErr.message);
        }
    }

    // Intento 2 / Principal: SMTP Nodemailer (Hostinger u otro)
    const transporter = getTransporter();
    try {
        const mailOptions = {
            from: `"${senderName}" <${senderEmail}>`,
            to: recipients.join(", "),
            subject: subject,
            text: text || "",
            html: html || (text ? `<pre>${text}</pre>` : ""),
            replyTo: replyTo || undefined,
        };

        const info = await transporter.sendMail(mailOptions);
        return {
            status: "success",
            provider: "smtp",
            messageId: info.messageId,
            raw: info,
        };
    } catch (smtpErr) {
        console.error(`[MAIL] Error critico enviando correo via SMTP (${smtpErr.code || "ERR"}): ${smtpErr.message}`);
        if (smtpErr.code === "EAUTH" || smtpErr.responseCode === 535) {
            console.error("[MAIL] Hostinger rechazo el login SMTP (535 Authentication failed). Revisa la contrasena del buzon.");
        }
        throw smtpErr;
    }
}
