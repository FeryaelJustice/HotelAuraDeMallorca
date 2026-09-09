// ==============================================================================
// SERVICIO CENTRALIZADO DE CORREO ELECTRONICO (mailService.js)
// Proposito: Gestionar envios transaccionales (SMTP Hostinger / Brevo API)
// con sanitizacion de direcciones, auto-recuperacion y diagnostico detallado.
// ==============================================================================
import nodemailer from "nodemailer";
import { BrevoClient } from "@getbrevo/brevo";
import dotenv from "dotenv";
import dns from "node:dns";

dotenv.config();

// Helper: Limpiar y normalizar valores de configuracion de .env
const cleanEnv = (val) => {
    if (!val) return "";
    let str = String(val).trim();
    if (
        (str.startsWith('"') && str.endsWith('"')) ||
        (str.startsWith("'") && str.endsWith("'"))
    ) {
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
    const senderEmail =
        cleanEnv(process.env.MAIL_SENDER_EMAIL) ||
        username ||
        "contact@feryaeljustice.dev";
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

// Constructor de transportador Nodemailer con parametros resilientes
export function createSmtpTransporter({
    host,
    port,
    isSecure,
    username,
    password,
}) {
    return nodemailer.createTransport({
        host: host || "smtp.hostinger.com",
        port: port,
        secure: isSecure,
        auth: {
            user: username,
            pass: password,
        },
        tls: {
            rejectUnauthorized: false,
            servername: host || "smtp.hostinger.com",
        },
        family: 4, // Fuerza IPv4 a nivel de socket
        lookup: (hostname, options, callback) => {
            // Resuelve estrictamente direcciones IPv4 para prevenir errores ENETUNREACH en contenedores (ej. Render/Docker)
            dns.lookup(hostname, { family: 4, all: false }, (err, address, family) => {
                callback(err, address, family);
            });
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
    });
}

// Obtener o inicializar el transportador Nodemailer principal
export function getTransporter() {
    const config = getMailConfig();

    if (!cachedTransporter) {
        cachedTransporter = createSmtpTransporter({
            host: config.host,
            port: config.port,
            isSecure: config.isSecure,
            username: config.username,
            password: config.password,
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
            console.warn(
                "[MAIL] No se pudo inicializar BrevoClient:",
                e.message,
            );
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
            if (
                (str.startsWith('"') && str.endsWith('"')) ||
                (str.startsWith("'") && str.endsWith("'"))
            ) {
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
        console.log(
            "[MAIL] Servicio de correo configurado con Brevo API (@getbrevo/brevo).",
        );
        return true;
    }

    if (
        !config.username ||
        !config.password ||
        config.password === "TU_PASSWORD_AQUI" ||
        config.password === "jasxbcqMTcQxrBtpsY"
    ) {
        console.warn(
            "[MAIL] Configure MAIL_USERNAME y MAIL_PASSWORD con credenciales reales para enviar correos por SMTP.",
        );
        return false;
    }

    const transporter = getTransporter();
    try {
        await transporter.verify();
        console.log(
            `[MAIL] Servidor SMTP autenticado y listo (${config.host}:${config.port} - secure: ${config.isSecure}).`,
        );
        return true;
    } catch (error) {
        console.warn(
            `[MAIL] Advertencia de conexion SMTP (${error.code || "AUTH"} - ${error.responseCode || "N/A"}): ${error.message}`,
        );
        if (error.code === "EAUTH" || error.responseCode === 535) {
            console.warn(
                "[MAIL] ATENCION: El servidor de Hostinger rechazo la autenticacion (Error 535).",
            );
            console.warn(
                "        1. Verifique que MAIL_USERNAME sea la direccion completa del buzon (ej. contacto@dominio.com).",
            );
            console.warn(
                "        2. Verifique que MAIL_PASSWORD sea la contrasena de ESE buzon en Hostinger Webmail, NO la del panel general.",
            );
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

            // Generar textContent obligatorio y no vacio para Brevo API v3
            let cleanText = text && String(text).trim().length > 0 ? String(text).trim() : "";
            if (!cleanText && html) {
                cleanText = String(html)
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
                    .replace(/<[^>]+>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();
            }
            if (!cleanText) {
                cleanText = subject || "Notificación de Hotel Aura de Mallorca";
            }

            const sendPayload = {
                subject: subject,
                textContent: cleanText,
                sender: { name: senderName, email: senderEmail },
                to: recipientList,
            };

            if (html && String(html).trim().length > 0) {
                sendPayload.htmlContent = html;
            }

            if (replyTo) {
                sendPayload.replyTo = typeof replyTo === "string" ? { email: replyTo } : replyTo;
            }

            const brevoResponse = await brevo.transactionalEmails.sendTransacEmail(sendPayload);

            const messageId =
                brevoResponse?.messageId ||
                brevoResponse?.body?.messageId ||
                (typeof brevoResponse === "string"
                    ? brevoResponse
                    : "brevo-sent");

            return {
                status: "success",
                provider: "brevo",
                messageId: messageId,
                raw: brevoResponse,
            };
        } catch (brevoErr) {
            console.warn(
                "[MAIL] Fallo el envio mediante Brevo API, intentando fallback SMTP:",
                brevoErr.message,
            );
        }
    }

    // Intento 2 / Principal: SMTP Nodemailer (Hostinger u otro)
    const mailOptions = {
        from: `"${senderName}" <${senderEmail}>`,
        to: recipients.join(", "),
        subject: subject,
        text: text || "",
        html: html || (text ? `<pre>${text}</pre>` : ""),
        replyTo: replyTo || undefined,
    };

    let transporter = getTransporter();
    try {
        const info = await transporter.sendMail(mailOptions);
        return {
            status: "success",
            provider: "smtp",
            port: config.port,
            messageId: info.messageId,
            raw: info,
        };
    } catch (smtpErr) {
        console.warn(
            `[MAIL] Error en puerto principal SMTP ${config.port} (${smtpErr.code || "ERR"}): ${smtpErr.message}`,
        );

        // Fallback automatico a puerto alternativo (465 SSL <-> 587 STARTTLS) si hay bloqueo de red o timeout
        const isNetworkTimeout =
            smtpErr.code === "ETIMEDOUT" ||
            smtpErr.code === "ESOCKETTIMEDOUT" ||
            smtpErr.code === "ECONNREFUSED" ||
            smtpErr.code === "EHOSTUNREACH" ||
            smtpErr.code === "ENETUNREACH" ||
            smtpErr.code === "ESOCKET" ||
            smtpErr.message?.includes("ENETUNREACH") ||
            smtpErr.message?.toLowerCase().includes("timeout");

        if (isNetworkTimeout) {
            const altPort = config.port === 465 ? 587 : 465;
            const altSecure = altPort === 465;
            console.log(
                `[MAIL] Probando puerto alternativo SMTP ${altPort} (secure: ${altSecure}) por error de red en ${config.port}...`,
            );

            try {
                const altTransporter = createSmtpTransporter({
                    host: config.host,
                    port: altPort,
                    isSecure: altSecure,
                    username: config.username,
                    password: config.password,
                });

                const altInfo = await altTransporter.sendMail(mailOptions);
                console.log(
                    `[MAIL] Correo enviado exitosamente a traves del puerto alternativo ${altPort}!`,
                );
                return {
                    status: "success",
                    provider: "smtp-fallback-port",
                    port: altPort,
                    messageId: altInfo.messageId,
                    raw: altInfo,
                };
            } catch (altErr) {
                console.error(
                    `[MAIL] Tambien fallo el puerto alternativo ${altPort} (${altErr.code || "ERR"}): ${altErr.message}`,
                );
            }
        }

        if (smtpErr.code === "ENETUNREACH" || smtpErr.message?.includes("ENETUNREACH")) {
            console.error(
                "[MAIL] AVISO ENTORNO RENDER/NUBE: Render bloquea las conexiones SMTP salientes directas (puertos 25, 465, 587). Para enviar correos desde Render sin bloqueos de red, añade BREVO_API_KEY en las variables de entorno de Render.",
            );
        }

        if (smtpErr.code === "EAUTH" || smtpErr.responseCode === 535) {
            console.error(
                "[MAIL] Hostinger rechazo el login SMTP (535 Authentication failed). Revisa la contrasena del buzon.",
            );
        }
        throw smtpErr;
    }
}
