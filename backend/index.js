// ==============================================================================
// DEPENDENCIES & RUNTIME CONFIGURATION
// Proposito: Servidor API REST principal para Hotel Aura de Mallorca.
// Gestiona autenticacion JWT, reservas, transacciones con Stripe, notificaciones
// por email (Brevo/SMTP), meteorologia y subida de archivos multimedia.
// ==============================================================================
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import bcrypt from "bcryptjs";
import mysql from "mysql2";
import cookieParser from "cookie-parser";
import compression from "compression";
import moment from "moment-timezone";
import nodemailer from "nodemailer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import dotenv from "dotenv";
import Stripe from "stripe";
import jsQR from "jsqr";
import { Jimp } from "jimp";
import axios from "axios";
import jwt from "jsonwebtoken";
import { BrevoClient } from "@getbrevo/brevo";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

// CONFIGURACION CLOUDINARY
// Que hace: Inicializa el cliente para almacenamiento de archivos en la nube.
// Por que: Permite persistir avatares y multimedia en entornos efimeros (ej. Vercel, Docker).
if (process.env.CLOUDINARY_URL) {
    cloudinary.config();
} else if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enrutador modular para prefijo /api
const expressRouter = express.Router();
moment.tz.setDefault("Europe/Madrid");
const dateFormat = "YYYY-MM-DD";
const fileExtensionRegex = /\.[^.]+$/;

// Rutas estaticas de almacenamiento local de multimedia
const rutaMedia = "media/";
const rutaImgs = rutaMedia + "img/";
const rutaProfilePics = rutaImgs + "users/profilepics/";

// Almacenamiento Multer en disco (modo fallback / desarrollo local)
// Que hace: Guarda fisicamente la imagen en disco saneando el nombre con DNI.
// Por que: Evita vulnerabilidades de Path Traversal y asegura nombres deterministas.
const multerStorageForUserPic = multer.diskStorage({
    destination: function (req, file, cb) {
        const pathDest = path.join(__dirname, "public", rutaProfilePics);
        fs.mkdirSync(pathDest, { recursive: true });
        return cb(null, pathDest);
    },
    filename: function (req, file, cb) {
        const rawName =
            (req && req.dni
                ? req.dni
                : file.originalname.replace(fileExtensionRegex, "")) || "user";
        const sanitized = rawName.replace(/[^a-zA-Z0-9_-]/g, "");
        return cb(null, `${sanitized || "profile"}.webp`);
    },
});

// Filtro de tipos de imagen autorizados para Multer
const multerImageFileFilter = function (req, file, cb) {
    const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/jpg",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "Invalid file format. Only JPEG, PNG and WEBP are allowed.",
            ),
        );
    }
};

const uploadWithMulterDisk = multer({
    storage: multerStorageForUserPic,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB max
    },
    fileFilter: multerImageFileFilter,
});

const uploadWithMulterMemory = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB max
    },
    fileFilter: multerImageFileFilter,
});

// Middleware dinamico de subida de avatar
// Que hace: Enruta a Cloudinary (memoria) o disco segun NEEDS_CLOUDINARY_FOR_MEDIA.
// Por que: Permite cambiar de almacenamiento sin modificar controladores de ruta.
const uploadUserPicMiddleware = (req, res, next) => {
    if (process.env.NEEDS_CLOUDINARY_FOR_MEDIA === "1") {
        return uploadWithMulterMemory.single("image")(req, res, next);
    }
    return uploadWithMulterDisk.single("image")(req, res, next);
};

// Helper para streaming de buffer a Cloudinary
// Que hace: Sube un buffer binario a Cloudinary y devuelve una promesa.
// Por que: Facilita conversion automatica a WebP y control de sobreescritura.
const uploadBufferToCloudinary = (buffer, publicId) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "hotel_aura/users/profilepics",
                public_id: publicId,
                overwrite: true,
                resource_type: "image",
                format: "webp",
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }
                resolve(result);
            },
        );
        stream.end(buffer);
    });
};

// Instancia de pasarela de pago Stripe
const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);

// Middleware decodeBase64Image
// Que hace: Decodifica cadenas Base64 de imagenes QR utilizando Jimp.
// Por que: Permite extraer dimensiones y mapa de bits para lectura de datos QR.
const decodeBase64Image = async (req, res, next) => {
    if (req.body && req.body.imagePicQR) {
        const base64ImageString = req.body.imagePicQR;
        const buffer = Buffer.from(base64ImageString.substring(22), "base64");

        const decodedImage = await Jimp.read(buffer);
        // Obtener dimensiones y datos de pixeles para escaneo
        const width = decodedImage.getWidth();
        const height = decodedImage.getHeight();
        const pixelData = decodedImage.bitmap.data;

        req.imageData = { width, height, pixelData };
        req.imageWidth = width;
        req.imageHeight = height;

        next();
    } else {
        res.status(400).json({ message: "No image found" });
    }
};

// INIT SERVER
const app = express();
app.set("trust proxy", 1);

// SEGURIDAD HTTP (Helmet)
// Que hace: Agrega encabezados HTTP seguros (X-Content-Type-Options, Frameguard, etc.).
// Por que: Mitiga ataques XSS, clickjacking y MIME sniffing sin bloquear CDNs externos.
app.use(
    helmet({
        contentSecurityPolicy: false, // Evita romper CDNs externos, Stripe y Google reCAPTCHA
        crossOriginResourcePolicy: { policy: "cross-origin" }, // Permite servir multimedia al frontend
    }),
);

// PARSEO DE PETICIONES HTTP
// Que hace: Procesa cuerpos de peticion JSON y URL-encoded con limite de 10MB.
// Por que: Requerido para procesar datos de reservas y cargas en base64 de codigos QR.
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(bodyParser.json({ limit: "10mb" }));

// LIMITADORES DE TASA (Rate Limiting)
// Que hace: Control de frecuencia de peticiones para prevenir ataques DDoS y fuerza bruta.
// Por que: Protege la disponibilidad del servidor y la seguridad de cuentas de usuario.
const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 180, // Limite de 180 peticiones por minuto por IP
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(generalLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Ventana de 15 minutos
    max: 20, // Maximo 20 intentos de autenticacion cada 15 minutos
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: "error",
        message:
            "Demasiados intentos de autenticacion. Por favor, reintente en 15 minutos.",
    },
});

// CONTROL DE ACCESO CORS
// Que hace: Valida el origen de las peticiones entrantes contra una lista blanca.
// Por que: Garantiza que solo aplicaciones autorizadas (SPA de produccion/desarrollo) accedan al API.
const allowedOrigins = [
    process.env.FRONT_URL,
    process.env.CORS_ORIGIN_FRONT_URL
        ? `https://${process.env.CORS_ORIGIN_FRONT_URL}`
        : null,
    process.env.CORS_ORIGIN_FRONT_URL
        ? `http://${process.env.CORS_ORIGIN_FRONT_URL}`
        : null,
    "https://hotel-aura-de-mallorca.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]
    .filter(Boolean)
    .map((origin) => origin.trim().replace(/^["']|["']$/g, ""));

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        let isVercel = false;
        try {
            isVercel = /\.vercel\.app$/.test(new URL(origin).hostname);
        } catch {
            isVercel = false;
        }
        if (
            allowedOrigins.indexOf(origin) !== -1 ||
            isVercel ||
            process.env.NODE_ENV !== "production"
        ) {
            return callback(null, true);
        }
        return callback(new Error("CORS policy: Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Compresion Gzip y parseo de cookies de sesion
app.use(cookieParser());
app.use(compression());

// Servir archivos estaticos de multimedia publica
app.use(express.static(path.join(__dirname, "public")));

// CONFIGURACION Y POOL DE BASE DE DATOS (MySQL2)
// Que hace: Mantiene un grupo de hasta 100 conexiones reciclables con la base de datos.
// Por que: Optimiza el rendimiento evitando el coste de establecer un handshake TCP en cada peticion.
const dbConfig = {
    host: process.env.DB_URL || "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "hotelaurademallorca",
    connectionLimit: 100,
    connectTimeout: 30000,
    port: Number(process.env.DB_PORT) || 3306,
    timezone: process.env.DB_TIMEZONE || "+02:00",
    ...(process.env.DB_SSL === "true" || process.env.DB_PORT == 4000
        ? { ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } }
        : {}),
};

const pool = mysql.createPool(dbConfig);

// Verificacion y actualizacion defensiva del esquema en arranque
pool.query(
    "INSERT IGNORE INTO payment_method (id, payment_method_name) VALUES (1, 'Stripe'), (2, 'Hotel Reception')",
    (err) => {
        if (err)
            console.warn(
                "[DB INIT] Advertencia en comprobacion de payment_method:",
                err.message,
            );
    },
);

pool.query("SHOW COLUMNS FROM promotion LIKE 'is_active'", (err, rows) => {
    if (!err && rows && rows.length === 0) {
        pool.query(
            "ALTER TABLE promotion ADD COLUMN is_active BOOLEAN DEFAULT TRUE, ADD COLUMN is_visible BOOLEAN DEFAULT TRUE",
            (alterErr) => {
                if (alterErr) {
                    console.warn(
                        "[DB INIT] No se pudieron anadir columnas is_active / is_visible a promotion:",
                        alterErr.message,
                    );
                } else {
                    console.log(
                        "[DB INIT] Columnas is_active e is_visible anadidas exitosamente a promotion.",
                    );
                }
            },
        );
    }
});

// Clave secreta para firma y verificacion de JSON Web Tokens (JWT)
const jwtSecretKey =
    process.env.JWT_SECRET || "hotel-aura-secure-jwt-secret-key";
if (!process.env.JWT_SECRET) {
    console.warn(
        "[SECURITY WARNING] JWT_SECRET is not configured in .env. Using fallback.",
    );
}

// Helper: Extraccion de token JWT
// Que hace: Inspecciona cabecera Authorization (Bearer), cookies HTTP o cuerpo de la peticion.
// Por que: Provee flexibilidad para clientes que usan almacenamiento en cookies o estado en memoria.
const extractTokenFromReq = (req) => {
    let token = "";
    if (req.headers && req.headers.authorization) {
        const header = req.headers.authorization;
        token = header.startsWith("Bearer ") ? header.slice(7) : header;
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    } else if (req.body && req.body.token) {
        token = req.body.token;
    }
    return token ? token.trim() : "";
};

// Middleware: verifyUser
// Que hace: Valida la firma del token JWT y comprueba en base de datos si el usuario esta verificado y activo.
// Por que: Bloquea accesos no autorizados, sesiones caducadas o cuentas inhabilitadas por penalizacion.
const verifyUser = (req, res, next) => {
    const token = extractTokenFromReq(req);
    if (!token) {
        return res.status(401).json({
            status: "error",
            message: "You are not authenticated, forbidden.",
        });
    }

    jwt.verify(token, jwtSecretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({
                status: "error",
                message: "Token is not valid or expired, forbidden.",
            });
        }

        // Consulta combinada de usuario y rol en una sola operacion
        const sql = `
            SELECT u.id, u.user_dni, u.user_verified, r.name as role_name 
            FROM app_user u 
            LEFT JOIN user_role ur ON ur.user_id = u.id 
            LEFT JOIN role r ON r.id = ur.role_id 
            WHERE (u.access_token = ? OR u.id = ?) AND u.isEnabled = 1
        `;
        req.dbConnectionPool.query(
            sql,
            [token, decoded.userID || 0],
            (queryErr, result) => {
                if (queryErr) {
                    console.error("Token verification DB error:", queryErr);
                    return res.status(500).json({
                        status: "error",
                        message: "Database error verifying credentials.",
                    });
                }

                if (result && result.length > 0) {
                    if (result[0].user_verified == 1) {
                        req.id = decoded.userID || result[0].id;
                        req.dni = result[0].user_dni;
                        req.userRole = result[0].role_name || "CLIENT";
                        next();
                    } else {
                        return res.status(403).json({
                            status: "error",
                            message:
                                "Token is valid, but user is not verified.",
                        });
                    }
                } else {
                    return res.status(401).json({
                        status: "error",
                        message: "Session is invalid or expired, forbidden.",
                    });
                }
            },
        );
    });
};

// Middleware: verifyAdmin
// Que hace: Comprueba que el usuario autenticado posea rol 'ADMIN' o 'EMPLOYEE'.
// Por que: Impide que clientes estandar accedan a cancelaciones directas, métricas o gestion de usuarios.
const verifyAdmin = (req, res, next) => {
    verifyUser(req, res, () => {
        if (req.userRole === "ADMIN" || req.userRole === "EMPLOYEE") {
            next();
        } else {
            return res.status(403).json({
                status: "error",
                message: "Access denied: Administrator privileges required.",
            });
        }
    });
};

// Hashing for passwords
const salt = 10; // password hashing

// MAILS
const brevoClient = process.env.BREVO_API_KEY
    ? new BrevoClient({ apiKey: process.env.BREVO_API_KEY })
    : null;

const mailHost = process.env.MAIL_HOST || "smtp.hostinger.com";
const mailPort = Number(process.env.MAIL_PORT) || 465;
const mailSecure =
    process.env.MAIL_SECURE !== undefined
        ? process.env.MAIL_SECURE === "true"
        : mailPort === 465;

const transporterConfig = {
    host: mailHost,
    port: mailPort,
    secure: mailSecure,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
};

const transporter = nodemailer.createTransport(transporterConfig);

if (process.env.BREVO_API_KEY) {
    console.log(
        "[MAIL] Servicio de correo activo con la libreria oficial de Brevo (@getbrevo/brevo).",
    );
} else if (
    process.env.MAIL_USERNAME &&
    process.env.MAIL_PASSWORD &&
    process.env.MAIL_PASSWORD !== "jasxbcqMTcQxrBtpsY"
) {
    transporter.verify((error, success) => {
        if (error) {
            console.warn(
                `[MAIL] Advertencia SMTP (${error.code || "AUTH"}): ${error.message}`,
            );
            console.warn(
                "[MAIL] Verifique MAIL_USERNAME y MAIL_PASSWORD en backend/.env o en el panel de despliegue.",
            );
        } else {
            console.log(
                `[MAIL] Servidor SMTP listo y autenticado (${mailHost}:${mailPort} - ${success}).`,
            );
        }
    });
} else {
    console.log(
        "[MAIL] Configure MAIL_USERNAME y MAIL_PASSWORD en backend/.env o panel de despliegue para enviar correos por SMTP.",
    );
}

// SERVICIO DE NOTIFICACIONES POR CORREO (sendEmailNotification)
// Que hace: Despacha correos transaccionales usando Brevo API v3 (prioritario) o SMTP Nodemailer (fallback).
// Por que: Asegura alta entregabilidad de confirmaciones de reserva, verificacion y recuperacion de contrasena.
async function sendEmailNotification({
    to,
    subject,
    html,
    text,
    fromName,
    fromEmail,
    replyTo,
}) {
    const senderEmail =
        fromEmail ||
        process.env.MAIL_SENDER_EMAIL ||
        "contact@feryaeljustice.dev";
    const senderName =
        fromName || process.env.APP_NAME || "Hotel Aura de Mallorca";

    if (brevoClient && process.env.BREVO_API_KEY) {
        // Envio mediante API HTTP oficial de Brevo v3
        const recipientList = (Array.isArray(to) ? to : [to]).map((dest) => {
            if (typeof dest === "string") {
                const match = dest.match(/<([^>]+)>/);
                const emailClean = match
                    ? match[1]
                    : dest.replace(/['"]/g, "").trim();
                return { email: emailClean };
            }
            return dest;
        });

        const brevoResponse =
            await brevoClient.transactionalEmails.sendTransacEmail({
                subject: subject,
                htmlContent: html,
                textContent: text || "",
                sender: { name: senderName, email: senderEmail },
                to: recipientList,
                replyTo: replyTo
                    ? typeof replyTo === "string"
                        ? { email: replyTo }
                        : replyTo
                    : undefined,
            });

        const messageId =
            brevoResponse?.messageId ||
            brevoResponse?.body?.messageId ||
            (typeof brevoResponse === "string" ? brevoResponse : null);

        return {
            ...brevoResponse,
            messageId: messageId,
        };
    } else {
        // Fallback a Nodemailer (SMTP)
        return await transporter.sendMail({
            from: `"${senderName}" <${senderEmail}>`,
            to: Array.isArray(to) ? to.join(", ") : to,
            subject: subject,
            text: text,
            html: html,
            replyTo: replyTo,
        });
    }
}

// ENRUTAMIENTO PRINCIPAL
// Asigna el enrutador modular a la raiz /api
app.use("/api/", expressRouter);

// MIDDLEWARE: GESTION DEL CICLO DE VIDA DE CONEXION A LA BASE DE DATOS
// Que hace: Adquiere una conexion dedicada del pool por peticion y la envuelve en un Proxy.
// Por que: Previene fugas de conexion (connection leaks) al garantizar su liberacion en 'finish' o 'close'.
expressRouter.use((req, res, next) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error("Error acquiring connection from pool:", err);
            return res
                .status(500)
                .send({ status: "error", message: "Internal server error" });
        }
        let isReleased = false;
        const safeRelease = () => {
            if (!isReleased) {
                isReleased = true;
                try {
                    connection.release();
                } catch (e) {
                    console.error("Error releasing connection:", e);
                }
            }
        };
        res.on("finish", safeRelease);
        res.on("close", safeRelease);

        req.dbConnection = connection;
        req.dbConnectionPool = new Proxy(connection, {
            get(target, prop) {
                if (prop === "release") {
                    return () => {
                        // Defer release to response finish or close
                    };
                }
                if (prop === "query") {
                    return function (...args) {
                        const lastArg = args[args.length - 1];
                        if (typeof lastArg === "function") {
                            return target.query(...args);
                        }
                        return target.promise().query(...args);
                    };
                }
                if (prop === "beginTransaction") {
                    return function (...args) {
                        const lastArg = args[args.length - 1];
                        if (typeof lastArg === "function") {
                            return target.beginTransaction(...args);
                        }
                        return target.promise().beginTransaction();
                    };
                }
                if (prop === "commit") {
                    return function (...args) {
                        const lastArg = args[args.length - 1];
                        if (typeof lastArg === "function") {
                            return target.commit(...args);
                        }
                        return target.promise().commit();
                    };
                }
                if (prop === "rollback") {
                    return function (...args) {
                        const lastArg = args[args.length - 1];
                        if (typeof lastArg === "function") {
                            return target.rollback(...args);
                        }
                        return target.promise().rollback();
                    };
                }
                const val = target[prop];
                return typeof val === "function" ? val.bind(target) : val;
            },
        });
        next();
    });
});

// ==============================================================================
// MODULO DE GESTION DE USUARIOS Y AUTENTICACION
// ==============================================================================

// Endpoint: POST /api/checkUserExists
// Que hace: Verifica de forma reactiva si un email o DNI ya figuran en la base de datos.
// Por que: Permite validacion en tiempo real en el frontend antes de enviar el formulario de registro.
expressRouter.post("/checkUserExists", (req, res) => {
    try {
        const { email, dni } = req.body;
        req.dbConnectionPool.query(
            "SELECT id FROM app_user WHERE user_email = ? OR user_dni = ?",
            [email, dni],
            (err, results) => {
                if (err) {
                    return res.status(500).json({
                        status: "error",
                        message: "Error checking for existing users",
                    });
                }
                if (results && results.length > 0) {
                    return res.status(409).json({
                        status: "error",
                        message:
                            "Existing user found in DB, use another email or dni!",
                    });
                } else {
                    return res
                        .status(200)
                        .json({ status: "success", message: "User available" });
                }
            },
        );
    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: "Error checking for existing users",
        });
    }
});

// Endpoint: POST /api/register
// Que hace: Registra un nuevo usuario con contrasena hasheada con bcrypt (cost 10),
// asigna el rol CLIENT (id=1), emite un token JWT de 24 horas y despacha el correo de activacion.
// Por que: Punto de entrada estandar para nuevos clientes del hotel con verificacion por doble opt-in.
expressRouter.post("/register", authLimiter, (req, res) => {
    try {
        const data = req.body;
        if (!data || !data.email || !data.dni || !data.password) {
            return res.status(400).json({
                status: "error",
                message: "Missing required registration fields",
            });
        }
        if (data.password.length < 8) {
            return res.status(400).json({
                status: "error",
                message: "Password must be at least 8 characters long",
            });
        }
        const checkSQL =
            "SELECT * FROM app_user WHERE user_email = ? OR user_dni = ?";
        const checkValues = [data.email, data.dni];
        req.dbConnectionPool.query(checkSQL, checkValues, (err, resultss) => {
            if (err) {
                return res.status(500).json({
                    status: "error",
                    message: "Error checking for existing emails and dni",
                });
            }
            if (resultss.length > 0) {
                return res.status(409).json({
                    status: "error",
                    message:
                        "Existing email OR DNI found in DB, use another email or DNI!",
                });
            } else {
                const sql =
                    "INSERT INTO app_user (user_name, user_surnames, user_email, user_dni, user_password) VALUES (?, ?, ?, ?, ?)";

                bcrypt.hash(data.password, salt, (err, hash) => {
                    const values = [
                        data.name,
                        data.surnames,
                        data.email,
                        data.dni,
                        hash,
                    ];
                    req.dbConnectionPool.query(
                        sql,
                        values,
                        (error, results) => {
                            if (error) {
                                console.error(
                                    "Registration insert error:",
                                    error,
                                );
                                return res.status(500).json({
                                    status: "error",
                                    message: "Error creating account on server",
                                });
                            }
                            let userID = results.insertId;
                            let jwtToken = jwt.sign({ userID }, jwtSecretKey, {
                                expiresIn: "1d",
                            });

                            // Always assign CLIENT role (1) to prevent privilege escalation
                            req.dbConnectionPool.query(
                                "INSERT INTO user_role (user_id, role_id) VALUES (?, 1)",
                                [userID],
                                (roleErr) => {
                                    if (roleErr) {
                                        console.error(
                                            "Error setting client role:",
                                            roleErr,
                                        );
                                    }
                                },
                            );

                            req.dbConnectionPool.query(
                                "UPDATE app_user SET access_token = ? WHERE id = ?",
                                [jwtToken, userID],
                                (err) => {
                                    if (err) {
                                        console.error(err);
                                    }
                                },
                            );

                            sendConfirmationEmail(req.dbConnectionPool, userID)
                                .then((json) => {
                                    return res.status(200).json({
                                        status: "success",
                                        message: json.message,
                                        cookieJWT: jwtToken,
                                        insertId: userID,
                                    });
                                })
                                .catch((jsonError) => {
                                    return res.status(201).json({
                                        status: "success",
                                        message: jsonError,
                                        cookieJWT: jwtToken,
                                        insertId: userID,
                                    });
                                });
                        },
                    );
                });
            }
        });
    } catch (error) {
        return res
            .status(500)
            .send({ status: "error", message: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
});

// Endpoint: POST /api/registerWithQR
// Que hace: Procesa una imagen que contiene un codigo QR codificado en Base64, extrae los
// datos del usuario via jsQR, realiza hash de contrasena y crea la cuenta en base de datos.
// Por que: Provee registro de alta velocidad para eventos o mostradores fisicos de recepcion.
expressRouter.post("/registerWithQR", decodeBase64Image, async (req, res) => {
    try {
        if (req.imageData && req.imageWidth && req.imageHeight) {
            // Decode the QR code from the binary data
            const qrCodeData = jsQR(
                req.imageData.pixelData,
                req.imageWidth,
                req.imageHeight,
            );

            if (qrCodeData) {
                // Extracted data from the QR code
                const extractedData = JSON.parse(qrCodeData.data);
                const checkSQL =
                    "SELECT * FROM app_user WHERE user_email = ? OR user_dni = ?";
                const checkValues = [
                    extractedData.user_email,
                    extractedData.user_dni,
                ];
                req.dbConnectionPool.query(
                    checkSQL,
                    checkValues,
                    (err, resultss) => {
                        if (err) {
                            return res.status(500).json({
                                status: "error",
                                message: "Error checking for existing emails",
                            });
                        }
                        if (resultss.length > 0) {
                            return res.status(500).json({
                                status: "error",
                                message:
                                    "Existing email found in DB, use another email!",
                            });
                        } else {
                            const query =
                                "INSERT INTO app_user (user_name, user_surnames, user_email, user_dni, user_password, user_verified) VALUES (?, ?, ?, ?, ?, ?)";
                            bcrypt.hash(
                                extractedData.user_password,
                                salt,
                                (err, hash) => {
                                    const values = [
                                        extractedData.user_name,
                                        extractedData.user_surnames,
                                        extractedData.user_email,
                                        extractedData.user_dni,
                                        hash,
                                        extractedData.user_verified,
                                    ];
                                    req.dbConnectionPool.query(
                                        query,
                                        values,
                                        (err, result) => {
                                            if (err) {
                                                console.error(err);
                                                return res.status(500).json({
                                                    status: "error",
                                                    message:
                                                        "Error on inserting in db",
                                                });
                                            }
                                            if (result) {
                                                let userID = result.insertId;
                                                let jwtToken = jwt.sign(
                                                    { userID },
                                                    jwtSecretKey,
                                                    { expiresIn: "1d" },
                                                );

                                                // Insert default picture to user
                                                // req.dbConnectionPool.query('INSERT INTO user_media (user_id, media_id) VALUES (?, ?)', [userID, 1], (err) => {
                                                //     if (err) {
                                                //         console.error(err)
                                                //     }
                                                // })

                                                // Insert user role to user (client by default: 1)
                                                req.dbConnectionPool.query(
                                                    "INSERT INTO user_role (user_id, role_id) VALUES (?,?)",
                                                    [userID, 1],
                                                    (err) => {
                                                        if (err) {
                                                            console.error(err);
                                                        }
                                                    },
                                                );

                                                req.dbConnectionPool.query(
                                                    "UPDATE app_user SET access_token = ? WHERE id = ?",
                                                    [jwtToken, userID],
                                                    (err) => {
                                                        if (err) {
                                                            console.error(err);
                                                        }
                                                    },
                                                );

                                                sendConfirmationEmail(
                                                    req.dbConnectionPool,
                                                    userID,
                                                )
                                                    .then((json) => {
                                                        console.log(json);
                                                        return res
                                                            .status(200)
                                                            .json({
                                                                status: "success",
                                                                message:
                                                                    json.message,
                                                                cookieJWT:
                                                                    jwtToken,
                                                                insertId:
                                                                    userID,
                                                            });
                                                    })
                                                    .catch((jsonError) => {
                                                        return res
                                                            .status(201)
                                                            .json({
                                                                status: "success",
                                                                message:
                                                                    jsonError,
                                                                cookieJWT:
                                                                    jwtToken,
                                                                insertId:
                                                                    userID,
                                                            });
                                                    });
                                            } else {
                                                return res.status(500).json({
                                                    status: "error",
                                                    message:
                                                        "Error on getting insert in db",
                                                });
                                            }
                                        },
                                    );
                                },
                            );
                        }
                    },
                );
            } else {
                res.status(400).json({
                    message: "No QR code found in the image",
                });
            }
        } else {
            res.status(400).json({ message: "No image found" });
        }
    } catch (error) {
        return res
            .status(500)
            .send({ status: "error", message: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
});

// Endpoint: POST /api/login
// Que hace: Autentica credenciales (email y password), verifica el hash bcrypt, comprueba
// el estado activo (`isEnabled = 1`) y verificado (`user_verified = 1`), emitiendo un nuevo JWT.
// Por que: Punto principal de inicio de sesion para clientes y administradores.
expressRouter.post("/login", authLimiter, (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                status: "error",
                message: "Email and password are required.",
            });
        }
        const sql =
            "SELECT * FROM app_user WHERE user_email = ? AND isEnabled = 1";
        req.dbConnectionPool.query(sql, [email], (error, results) => {
            if (error) {
                console.error("Login DB query error:", error);
                return res.status(500).json({
                    status: "error",
                    message: "Internal server error during login",
                });
            }
            if (!results || results.length === 0) {
                return res.status(401).json({
                    status: "error",
                    message: "Invalid email or password",
                });
            }

            const user = results[0];
            bcrypt.compare(password, user.user_password, (bcryptErr, match) => {
                if (bcryptErr || !match) {
                    return res.status(401).json({
                        status: "error",
                        message: "Invalid email or password",
                    });
                }

                if (user.user_verified !== 1) {
                    return res.status(403).json({
                        status: "error",
                        message:
                            "User account is not verified. Please check your email.",
                    });
                }

                // Emision de token JWT fresco de 24 horas
                const userID = user.id;
                const freshToken = jwt.sign({ userID }, jwtSecretKey, {
                    expiresIn: "1d",
                });

                req.dbConnectionPool.query(
                    "UPDATE app_user SET access_token = ? WHERE id = ?",
                    [freshToken, userID],
                    (updateErr) => {
                        if (updateErr) {
                            console.error(
                                "Error updating user access token:",
                                updateErr,
                            );
                        }
                        return res.status(200).json({
                            status: "success",
                            message: "Login successful",
                            cookieJWT: freshToken,
                            result: {
                                id: user.id,
                                name: user.user_name,
                                email: user.user_email,
                                dni: user.user_dni,
                            },
                        });
                    },
                );
            });
        });
    } catch (error) {
        return res
            .status(500)
            .json({ status: "error", message: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
});

// Endpoint: POST /api/loginByToken
// Que hace: Restablece sesion automaticamente validando el token JWT recibido en cookies o headers.
// Por que: Permite mantener la sesion abierta tras recargar la pagina en la aplicacion frontend.
expressRouter.post("/loginByToken", authLimiter, (req, res) => {
    try {
        const token = extractTokenFromReq(req);
        if (!token) {
            return res
                .status(401)
                .json({ status: "error", message: "Token not provided" });
        }

        jwt.verify(token, jwtSecretKey, (jwtErr, decoded) => {
            if (jwtErr) {
                return res
                    .status(401)
                    .json({
                        status: "error",
                        message: "Token expired or invalid",
                    });
            }

            const sql =
                "SELECT id, user_name, user_email, user_dni, user_verified FROM app_user WHERE access_token = ? AND isEnabled = 1";
            req.dbConnectionPool.query(sql, [token], (error, results) => {
                if (error) {
                    console.error("Login by token DB error:", error);
                    return res.status(500).json({
                        status: "error",
                        message: "Internal server error",
                    });
                }
                if (results && results.length > 0) {
                    const user = results[0];
                    if (user.user_verified === 1) {
                        return res.status(200).json({
                            status: "success",
                            message: "Token valid",
                            cookieJWT: token,
                            result: {
                                id: user.id,
                                name: user.user_name,
                                email: user.user_email,
                                dni: user.user_dni,
                            },
                        });
                    } else {
                        return res.status(403).json({
                            status: "error",
                            message: "User not verified",
                        });
                    }
                } else {
                    return res
                        .status(401)
                        .json({
                            status: "error",
                            message: "Session expired or invalid",
                        });
                }
            });
        });
    } catch (error) {
        return res
            .status(500)
            .json({ status: "error", message: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
});

// Endpoint: POST /api/edituser
// Que hace: Modifica el nombre y apellidos de un usuario autenticado.
// Por que: Permite al cliente mantener sus datos personales actualizados desde su perfil.
expressRouter.post("/edituser", verifyUser, (req, res) => {
    try {
        let userID = req.id;
        let data = req.body;
        if (!data || !data.name || !data.surnames) {
            return res.status(400).send({
                status: "error",
                message: "Name and surnames are required",
            });
        }
        let sql =
            "UPDATE app_user SET user_name = ?, user_surnames = ? WHERE id = ?";
        let values = [data.name, data.surnames, userID];
        req.dbConnectionPool.query(sql, values, (error) => {
            if (error) {
                console.error("Error updating user profile:", error);
                return res.status(500).send({
                    status: "error",
                    message: "Internal server error",
                });
            }
            return res.status(200).send({
                status: "success",
                message: "User updated successfully",
            });
        });
    } catch (error) {
        console.error("Exception updating user profile:", error);
        return res
            .status(500)
            .send({ status: "error", message: "Internal server error" });
    }
});

// Endpoint: POST /api/editUserPassword
// Que hace: Hashea con bcrypt y actualiza la contrasena del usuario autenticado.
// Por que: Se aísla en un endpoint independiente por seguridad para exigir verificación explícita.
expressRouter.post("/editUserPassword", verifyUser, async (req, res) => {
    try {
        const userID = req.id;
        const password = req.body.password;
        if (!password) {
            return res
                .status(400)
                .send({ status: "error", message: "Password is required" });
        }
        const encryptedPassword = await bcrypt.hash(password, salt);
        let sql = "UPDATE app_user SET user_password = ? WHERE id = ?";
        let values = [encryptedPassword, userID];
        await req.dbConnectionPool.query(sql, values);
        return res.status(200).send({
            status: "success",
            message: "User updated successfully",
        });
    } catch (error) {
        console.error("Exception updating user password:", error);
        return res.status(500).send({
            status: "error",
            message: "Internal server error: " + error,
        });
    }
});

// Endpoint: POST /api/sendRecoverAccountMail
// Que hace: Genera un token temporal de restablecimiento (valido 10 minutos) y lo envia por correo.
// Por que: Proceso de autorrecuperacion de contrasena protegiendo la enumeracion de cuentas.
expressRouter.post("/sendRecoverAccountMail", authLimiter, (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res
                .status(400)
                .json({ status: "error", message: "Email is required." });
        }

        // Busqueda de usuario sin filtrar respuesta para prevenir enumeracion
        findUserByEmail(req.dbConnectionPool, email)
            .then((user) => {
                if (!user) {
                    return res.status(200).json({
                        status: "success",
                        message:
                            "If that email is registered, a password reset token has been sent.",
                    });
                }

                sendRecoverPasswordEmail(
                    req.dbConnectionPool,
                    user.id,
                    user.user_email,
                )
                    .then((_) => {
                        return res.status(200).json({
                            status: "success",
                            message:
                                "If that email is registered, a password reset token has been sent.",
                        });
                    })
                    .catch((err) => {
                        console.error("Error sending recovery email:", err);
                        return res
                            .status(500)
                            .send({
                                status: "error",
                                message: "Error sending recovery email.",
                            });
                    });
            })
            .catch((err) => {
                console.error("findUserByEmail error:", err);
                return res.status(200).json({
                    status: "success",
                    message:
                        "If that email is registered, a password reset token has been sent.",
                });
            });
    } catch (error) {
        console.error("sendRecoverAccountMail error:", error);
        return res
            .status(500)
            .json({ status: "error", message: "Internal server error." });
    } finally {
        req.dbConnectionPool.release();
    }
});

// Endpoint: POST /api/recoverAccount
// Que hace: Valida el token de recuperacion contra su fecha de expiracion y establece la nueva contrasena.
// Por que: Completa el ciclo seguro de recuperacion de clave olvidada.
expressRouter.post("/recoverAccount", authLimiter, (req, res) => {
    try {
        const { token, email, password } = req.body;
        if (!token || !email || !password) {
            return res.status(400).json({
                status: "error",
                message: "Token, email, and new password are required.",
            });
        }
        if (password.length < 8) {
            return res.status(400).json({
                status: "error",
                message: "Password must be at least 8 characters long.",
            });
        }

        // Find the user by email and reset token
        req.dbConnectionPool.query(
            "SELECT id, reset_token_expiry FROM app_user WHERE user_email = ? AND reset_token = ?",
            [email, token],
            async (err, results) => {
                if (err) {
                    console.error("recoverAccount DB error:", err);
                    return res.status(500).json({
                        status: "error",
                        message: "Internal server error.",
                    });
                }
                if (results && results.length > 0) {
                    const id = results[0].id;
                    const resetTokenExpiry = new Date(
                        results[0].reset_token_expiry,
                    );
                    const now = new Date();

                    if (now < resetTokenExpiry) {
                        const encryptedPassword = await bcrypt.hash(
                            password,
                            salt,
                        );
                        req.dbConnectionPool.query(
                            "UPDATE app_user SET user_password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?",
                            [encryptedPassword, id],
                            (updateErr) => {
                                if (updateErr) {
                                    console.error(
                                        "Error updating recovered password:",
                                        updateErr,
                                    );
                                    return res.status(500).json({
                                        status: "error",
                                        message: "Error updating password.",
                                    });
                                }
                                return res.status(200).json({
                                    status: "success",
                                    message:
                                        "Account recovered, password changed successfully!",
                                });
                            },
                        );
                    } else {
                        return res.status(400).json({
                            status: "error",
                            message: "Reset token expired",
                        });
                    }
                } else {
                    return res.status(400).json({
                        status: "error",
                        message: "Code is invalid or expired!",
                    });
                }
            },
        );
    } catch (error) {
        console.error("recoverAccount error:", error);
        return res
            .status(500)
            .json({ status: "error", message: "Internal server error." });
    } finally {
        req.dbConnectionPool.release();
    }
});

function findUserByEmail(connection, email) {
    return new Promise(async (resolve, reject) => {
        try {
            const sql = "SELECT * FROM app_user WHERE user_email = ?";
            connection.query(sql, [email], (err, response) => {
                if (err) {
                    console.log("Error finding user by email:", err);
                    reject(err);
                }

                // Assuming the query returns an array of rows
                if (response.length > 0) {
                    resolve(response[0]); // Resolving with the first user found
                } else {
                    reject("User not found");
                }
            });
        } catch (error) {
            console.log("Error finding user by email:", error);
            reject(error);
        }
    });
}

expressRouter.delete("/user", verifyUser, (req, res) => {
    const userID = req.id;
    deleteBookingByUserID(userID, req.dbConnectionPool)
        .then(() => deletePaymentByUserID(userID, req.dbConnectionPool))
        .then(() => deleteUserRoleByUserID(userID, req.dbConnectionPool))
        .then(() => deleteUserMediaByUserID(userID, req.dbConnectionPool))
        .then(() => deleteUserByUserID(userID, req.dbConnectionPool))
        .then(() => {
            req.dbConnectionPool.release();
            return res
                .status(200)
                .send({ status: "success", message: `User ${userID} deleted` });
        })
        .catch((error) => {
            console.error(error);
            return res
                .status(500)
                .send({ status: "error", message: "Internal server error" });
        });
});

// get logged user ID by jwt
expressRouter.post("/getLoggedUserID", verifyUser, (req, res) => {
    return res
        .status(200)
        .json({ status: "success", message: "Token valid.", userID: req.id });
});

expressRouter.get("/getUserRole/:id", verifyUser, (req, res) => {
    try {
        const targetID = parseInt(req.params.id, 10);
        if (
            req.id !== targetID &&
            req.userRole !== "ADMIN" &&
            req.userRole !== "EMPLOYEE"
        ) {
            return res.status(403).json({
                status: "error",
                message:
                    "Access denied: You are not authorized to view this user's role.",
            });
        }

        req.dbConnectionPool.query(
            "SELECT r.* FROM role r INNER JOIN user_role ur ON ur.role_id = r.id WHERE ur.user_id = ?",
            [targetID],
            (err, results) => {
                if (err) {
                    return res.status(500).json({
                        status: "error",
                        message: "Error connecting to database",
                    });
                }
                if (results.length > 0) {
                    return res.status(200).send({
                        status: "success",
                        message: "User role found",
                        data: results[0],
                    });
                } else {
                    return res.status(404).send({
                        status: "error",
                        message: "No user role exists with that user id",
                    });
                }
            },
        );
    } catch (error) {
        return res
            .status(500)
            .send({ status: "error", message: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
});

// get current logged user data with ownership/admin verification
expressRouter.get("/loggedUser/:id", verifyUser, (req, res) => {
    try {
        const targetID = parseInt(req.params.id, 10);
        if (
            req.id !== targetID &&
            req.userRole !== "ADMIN" &&
            req.userRole !== "EMPLOYEE"
        ) {
            return res.status(403).json({
                status: "error",
                message:
                    "Access denied: You are not authorized to view this profile.",
            });
        }

        const sql =
            "SELECT id, user_name, user_surnames, user_email, user_dni, isEnabled, user_verified, created_at, updated_at FROM app_user WHERE id = ? AND isEnabled = 1";
        req.dbConnectionPool.query(sql, [targetID], (error, results) => {
            if (error) {
                console.error("loggedUser query error:", error);
                return res.status(500).json({
                    status: "error",
                    message: "Error connecting to database",
                });
            }
            if (results.length > 0) {
                return res.status(200).send({
                    status: "success",
                    message: "User found",
                    data: results[0],
                });
            } else {
                return res.status(404).send({
                    status: "error",
                    message: "No user exists with that id",
                });
            }
        });
    } catch (error) {
        return res
            .status(500)
            .send({ status: "error", message: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
});

expressRouter.get("/checkUserIsVerified/:id", verifyUser, (req, res) => {
    try {
        req.dbConnectionPool.query(
            "SELECT user_verified FROM app_user WHERE id = ?",
            [req.params.id],
            (error, results) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({
                        status: "error",
                        message: "Error on connecting db",
                    });
                }
                if (results.length > 0) {
                    if (results[0].user_verified === 1) {
                        return res.status(200).send({
                            status: "success",
                            message: "User verified",
                        });
                    } else {
                        return res.status(200).send({
                            status: "error",
                            message: "User not verified",
                        });
                    }
                } else {
                    return res.status(500).send({
                        status: "error",
                        message: "No user exists with that id",
                    });
                }
            },
        );
    } catch (error) {
        return res
            .status(500)
            .send({ status: "error", message: "Error checking user verified" });
    } finally {
        req.dbConnectionPool.release();
    }
});

// Endpoint: POST /api/uploadUserImg
// Que hace: Procesa la foto de perfil subida por el usuario (mediante Cloudinary o disco local),
// elimina referencias a imagenes anteriores en base de datos y crea un registro nuevo en media/user_media.
// Por que: Permite personalizar la experiencia de usuario y persistir el avatar de forma segura.
expressRouter.post(
    "/uploadUserImg",
    verifyUser,
    uploadUserPicMiddleware,
    async (req, res) => {
        const userID = req.id;

        function deleteUserMediaPromise(userID, connection) {
            return new Promise((resolve, reject) => {
                connection.query(
                    "SELECT media_id FROM user_media WHERE user_id = ?",
                    [userID],
                    (error, results) => {
                        if (error) {
                            return reject(error);
                        }

                        if (results && results.length > 0) {
                            const mediaIds = results.map((r) => r.media_id);
                            connection.query(
                                "DELETE FROM media WHERE id IN (?)",
                                [mediaIds],
                                (delError) => {
                                    if (delError) {
                                        return reject(delError);
                                    }
                                    resolve();
                                },
                            );
                        } else {
                            resolve();
                        }
                    },
                );
            });
        }

        // Insert the new media and user_media records.
        function insertMediaAndUserMediaPromise(mediaUrl, userID, connection) {
            return new Promise((resolve, reject) => {
                try {
                    connection.query(
                        "INSERT INTO media (type, url) VALUES (?, ?)",
                        ["image", mediaUrl],
                        (err, result) => {
                            if (err) {
                                return reject(err);
                            }

                            try {
                                const newMediaID = result.insertId;
                                connection.query(
                                    "INSERT INTO user_media (user_id, media_id) VALUES (?, ?)",
                                    [userID, newMediaID],
                                    (error) => {
                                        if (error) {
                                            return reject(error);
                                        }
                                        resolve();
                                    },
                                );
                            } catch (error) {
                                reject(error);
                            }
                        },
                    );
                } catch (error) {
                    reject(error);
                }
            });
        }

        try {
            if (!req.file) {
                return res.status(200).json({
                    status: "success",
                    message: `Image not changed, not uploaded.`,
                });
            }

            let mediaUrl = "";
            let uploadedFilename = "";

            if (process.env.NEEDS_CLOUDINARY_FOR_MEDIA === "1") {
                // Primary: Cloudinary cloud storage
                const rawName =
                    (req && req.dni
                        ? req.dni
                        : (req.file.originalname || "").replace(
                              fileExtensionRegex,
                              "",
                          )) || `user_${userID}`;
                const sanitized = rawName.replace(/[^a-zA-Z0-9_-]/g, "");
                const publicId = sanitized || `user_${userID}`;

                const cloudinaryResult = await uploadBufferToCloudinary(
                    req.file.buffer,
                    publicId,
                );
                mediaUrl = cloudinaryResult.secure_url;
                uploadedFilename = `${publicId}.webp`;
            } else {
                // Fallback: Local disk storage
                uploadedFilename = req.file.filename;
                mediaUrl = rutaProfilePics + uploadedFilename;
            }

            await deleteUserMediaPromise(userID, req.dbConnectionPool);
            await insertMediaAndUserMediaPromise(
                mediaUrl,
                userID,
                req.dbConnectionPool,
            );

            return res.status(200).json({
                status: "success",
                message: `Image ${uploadedFilename} successfully uploaded`,
                url: mediaUrl,
            });
        } catch (error) {
            console.error("[UPLOAD ERROR]", error);
            return res.status(500).json({
                status: "error",
                message: "Error processing image upload",
            });
        }
    },
);

expressRouter.post("/getUserImgByToken", verifyUser, (req, res) => {
    try {
        let userID = req.id;
        req.dbConnectionPool.query(
            "SELECT url FROM media INNER JOIN user_media ON user_media.media_id = media.id WHERE user_media.user_id = ?",
            [userID],
            (err, results) => {
                if (err) {
                    return res.status(500).send({
                        status: "error",
                        message: "Internal server error",
                    });
                }
                return res
                    .status(200)
                    .send({ status: "success", fileURL: results[0] });
            },
        );
    } catch (error) {
        return res
            .status(500)
            .send({ status: "error", message: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
});

async function sendConfirmationEmail(connection, userId) {
    return new Promise(async (resolve, reject) => {
        // Generate a random confirmation token
        const confirmationToken = generateRandomToken();

        // Set the expiry date to 1 hour from now
        const verificationTokenExpiry = new Date();
        verificationTokenExpiry.setHours(
            verificationTokenExpiry.getHours() + 1,
        );

        // Update the user record with the confirmation token and expiry
        await updateUserVerificationData(
            connection,
            userId,
            confirmationToken,
            verificationTokenExpiry,
        );

        // Form the verification URL
        const verificationUrl = `${process.env.FRONT_URL}/userVerification/${confirmationToken}`;

        getUserById(connection, userId)
            .then(async (userRes) => {
                // Send the email
                const info = await sendEmailNotification({
                    to: userRes.user_email,
                    subject: "Email Confirmation",
                    html: `<html><body>Click the following link to verify your email: <a href="${verificationUrl}">${verificationUrl}</a></body></html>`,
                });

                console.log("Message sent: %s", info.messageId);

                resolve({
                    status: "success",
                    message: "Email confirmation sent!",
                });
            })
            .catch((err) => {
                console.error(err);
                reject({ status: "error", message: "Email couldn't be sent!" });
            });
    });
}

async function sendRecoverPasswordEmail(connection, userId, userEmail) {
    return new Promise(async (resolve, reject) => {
        try {
            if (userEmail) {
                // Generate a random confirmation token
                const resetToken = generateRandomToken();

                const resetTokenExpiry = new Date();
                resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);
                resetTokenExpiry.setMinutes(resetTokenExpiry.getMinutes() + 10);

                await connection.beginTransaction();

                await connection.query(
                    "UPDATE app_user SET reset_token = ?, reset_token_expiry = ? WHERE id = ?",
                    [resetToken, resetTokenExpiry, userId],
                );
                await connection.commit();

                // Send the email
                const info = await sendEmailNotification({
                    to: userEmail,
                    subject: "Recover your account",
                    html: `<html><body>Paste the following token in the field to reset your password: ${resetToken}</body></html>`,
                });

                console.log("Message sent: %s", info.messageId);

                resolve();
            } else {
                reject();
            }
        } catch (error) {
            await connection.rollback();
            reject(error);
        }
    });
}

// Functions to generate random tokens
function generateRandomToken() {
    return (
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15)
    );
}
// Function to update user verification data
const updateUserVerificationData = (
    connection,
    userId,
    verificationToken,
    verificationTokenExpiry,
) => {
    return new Promise((resolve, reject) => {
        try {
            const query =
                "UPDATE app_user SET verification_token = ?, verification_token_expiry = ? WHERE id = ?";
            connection.query(
                query,
                [verificationToken, verificationTokenExpiry, userId],
                (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                },
            );
        } catch (error) {
            reject(error);
        }
    });
};

expressRouter.post("/user/verifyEmail/:token", async function (req, res) {
    try {
        const { token } = req.params;
        // Find the user by verification token
        const user = await getUserByVerificationToken(
            req.dbConnectionPool,
            token,
        );

        // Check if the user exists and the token hasn't expired
        if (!user || user.verification_token_expiry < new Date()) {
            return res.status(400).json({
                status: "error",
                message: "Invalid or expired token.",
            });
        }

        // Update user verification status
        await updateUserVerificationStatus(req.dbConnectionPool, user.id, true);

        // Clear verification token and expiry
        await clearVerificationToken(req.dbConnectionPool, user.id);

        // let jwtToken = jwt.sign({ userID: user.id }, jwtSecretKey, { expiresIn: '1d' })
        return res.status(200).json({
            status: "success",
            message: "Email verified successfully.",
            jwt: user.access_token,
        });
    } catch (error) {
        return res
            .status(500)
            .json({ status: "error", message: "Internal Server Error" });
    } finally {
        req.dbConnectionPool.release();
    }
});

// Utilities for verifying user
// Function to get a user by verification token
const getUserByVerificationToken = (connection, token) => {
    return new Promise((resolve, reject) => {
        try {
            const query = "SELECT * FROM app_user WHERE verification_token = ?";
            connection.query(query, [token], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results.length > 0 ? results[0] : null);
                }
            });
        } catch (error) {
            reject(error);
        }
    });
};

// Function to update user verification status
const updateUserVerificationStatus = (connection, userId, status) => {
    return new Promise((resolve, reject) => {
        try {
            const query = "UPDATE app_user SET user_verified = ? WHERE id = ?";
            connection.query(query, [status, userId], (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        } catch (error) {
            reject(error);
        }
    });
};

// Function to clear verification token and expiry
const clearVerificationToken = (connection, userId) => {
    return new Promise((resolve, reject) => {
        try {
            const query =
                "UPDATE app_user SET verification_token = NULL, verification_token_expiry = NULL WHERE id = ?";
            connection.query(query, [userId], (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        } catch (error) {
            reject(error);
        }
    });
};

// Function to get user data by ID
const getUserById = (connection, userId) => {
    return new Promise((resolve, reject) => {
        try {
            const query = "SELECT * FROM app_user WHERE id = ?";
            connection.query(query, [userId], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    // Check if a user was found
                    if (results && results.length > 0) {
                        resolve(results[0]); // Assuming there is only one user with the given ID
                    } else {
                        resolve(null); // No user found with the given ID
                    }
                }
            });
        } catch (error) {
            reject(error);
        }
    });
};

// Function to get user role by ID
const getUserRoleById = (connection, userId) => {
    return new Promise((resolve, reject) => {
        try {
            const query =
                "SELECT r.name FROM user_role ur INNER JOIN role r ON r.id = ur.role_id WHERE ur.user_id = ?";
            connection.query(query, [userId], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    // Check if a user was found
                    if (results && results.length > 0) {
                        resolve(results[0]); // Assuming there is only one user with the given ID
                    } else {
                        resolve(null); // No user found with the given ID
                    }
                }
            });
        } catch (error) {
            reject(error);
        }
    });
};

expressRouter.get("/usersID", verifyAdmin, (req, res) => {
    try {
        req.dbConnectionPool.query(
            "SELECT id, user_name, user_surnames, user_email, user_dni FROM app_user ORDER BY id ASC",
            (error, results) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({
                        status: "error",
                        message: "Error on connecting db",
                    });
                }
                return res.status(200).json({
                    status: "success",
                    message: "successful",
                    data: results,
                });
            },
        );
    } catch (error) {
        res.status(500).send({
            status: "error",
            message: "Internal server error",
        });
    } finally {
        req.dbConnectionPool.release();
    }
});

// CONTACT FORM
expressRouter.post("/sendContactForm", async (req, res) => {
    try {
        let formData = req.body;
        let receivers = [];
        try {
            receivers = JSON.parse(process.env.MAIL_CONTACT_RECEIVERS || "[]");
        } catch (e) {
            receivers = [
                process.env.MAIL_CONTACT_RECEIVERS ||
                    process.env.MAIL_SENDER_EMAIL ||
                    "contact@feryaeljustice.dev",
            ];
        }

        const info = await sendEmailNotification({
            fromName: formData.email,
            replyTo: formData.email,
            to: receivers,
            subject: formData.subject,
            text: formData.message,
            html: "<pre>" + formData.message + "</pre>",
        });
        console.log("Message sent: %s", info.messageId);
        return res
            .status(200)
            .send({ status: "success", message: "Your message was sent!" });
    } catch (error) {
        console.error("[MAIL] Error al enviar correo de contacto:", error);
        return res
            .status(500)
            .send({ status: "error", message: "Message couldn't be sent!" });
    } finally {
        req.dbConnectionPool.release();
    }
});

// ==============================================================================
// MODULO DE CATALOGOS: HABITACIONES Y PLANES
// ==============================================================================

// Endpoint: GET /api/rooms
// Que hace: Recupera el listado completo de habitaciones, resuelve sus imagenes asociadas
// desde la tabla media/room_media y normaliza sus rangos de disponibilidad activa.
// Por que: Suministra el catalogo principal para la navegacion y seleccion en el modal de reserva.
expressRouter.get("/rooms", (req, res) => {
    try {
        let sql = "SELECT * FROM room";
        req.dbConnectionPool.query(sql, [], (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({
                    status: "error",
                    message: "Error on connecting db",
                });
            }
            if (results.length > 0) {
                // Results
                // Get medias
                let roomsMedias = [];
                const promises = [];

                for (let room of results) {
                    const planMediaQuery = new Promise((resolve, reject) => {
                        const roomID = room.id;
                        req.dbConnectionPool.query(
                            "SELECT media_id FROM room_media WHERE room_id = ?",
                            [roomID],
                            (error, results) => {
                                if (error) {
                                    reject(error);
                                } else {
                                    if (results && results.length > 0) {
                                        req.dbConnectionPool.query(
                                            "SELECT url FROM media WHERE id = ?",
                                            [results[0].media_id],
                                            (error, mediaResults) => {
                                                if (error) {
                                                    reject(error);
                                                } else {
                                                    roomsMedias.push({
                                                        roomID: roomID,
                                                        mediaURL:
                                                            mediaResults[0].url,
                                                    });
                                                    resolve();
                                                }
                                            },
                                        );
                                    } else {
                                        resolve("no rooms media");
                                    }
                                }
                            },
                        );
                    });
                    promises.push(planMediaQuery);
                }
                Promise.all(promises)
                    .then(() => {
                        const combinedArray = results.map((result) => {
                            const mediaObject = roomsMedias.find(
                                (media) => media.roomID === result.id,
                            );
                            // Normalize availability dates: if null or in the past (before current year), update to valid range 2024-2035
                            const nowYear = new Date().getFullYear();
                            let startVal = result.room_availability_start;
                            let endVal = result.room_availability_end;
                            const parseYear = (d) =>
                                d ? new Date(d).getFullYear() : 0;
                            if (!startVal || parseYear(startVal) < nowYear) {
                                startVal = "2024-01-01T00:00:00.000Z";
                            }
                            if (!endVal || parseYear(endVal) < nowYear + 1) {
                                endVal = "2035-12-31T23:59:59.000Z";
                            }

                            return {
                                ...result,
                                room_availability_start: startVal,
                                room_availability_end: endVal,
                                imageURL: mediaObject
                                    ? mediaObject.mediaURL
                                    : result.imageURL || "media/img/room.webp",
                            };
                        });
                        // Return rooms
                        return res.status(200).send({
                            status: "success",
                            message: "Rooms found",
                            data: combinedArray,
                        });
                    })
                    .catch((error) => {
                        console.error(error);
                        return res.status(500).send({
                            status: "error",
                            message: "Error in processing data",
                        });
                    });
            } else {
                return res
                    .status(500)
                    .send({ status: "error", message: "No rooms found" });
            }
        });
    } catch (error) {
        res.status(500).send({
            status: "error",
            message: "Internal server error",
        });
    } finally {
        req.dbConnectionPool.release();
    }
});

expressRouter.get("/room/:id", (req, res) => {
    try {
        let id = req.params.id;
        let sql = "SELECT * FROM room WHERE id = ?";
        let values = [id];
        req.dbConnectionPool.query(sql, [values], (error, results) => {
            if (error) {
                console.error(error);
                return res
                    .status(500)
                    .json({ status: "error", message: "Error on querying db" });
            }
            if (results.length > 0) {
                return res.status(200).send({
                    status: "success",
                    message: "Rooms found",
                    data: results,
                });
            } else {
                return res
                    .status(500)
                    .send({ status: "error", message: "No rooms found" });
            }
        });
    } catch (error) {
        res.status(500).send({
            status: "error",
            message: "Internal server error",
        });
    } finally {
        req.dbConnectionPool.release();
    }
});

expressRouter.get("/roomsID", (req, res) => {
    try {
        req.dbConnectionPool.query("SELECT id FROM room", (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({
                    status: "error",
                    message: "Error on connecting db",
                });
            }
            return res.status(200).json({
                status: "success",
                message: "successful",
                data: results,
            });
        });
    } catch (error) {
        res.status(500).send({
            status: "error",
            message: "Internal server error",
        });
    } finally {
        req.dbConnectionPool.release();
    }
});

// PLANS
expressRouter.get("/plans", (req, res) => {
    try {
        let sql = "SELECT * FROM plan";
        req.dbConnectionPool.query(sql, [], (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({
                    status: "error",
                    message: "Error on connecting db",
                });
            }
            if (results.length > 0) {
                // Results
                // Get medias
                let plansMedias = [];
                const promises = [];

                for (let plan of results) {
                    const planMediaQuery = new Promise((resolve, reject) => {
                        const planID = plan.id;
                        req.dbConnectionPool.query(
                            "SELECT media_id FROM plan_media WHERE plan_id = ?",
                            [planID],
                            (error, results) => {
                                if (error) {
                                    reject(error);
                                } else {
                                    if (results && results.length > 0) {
                                        req.dbConnectionPool.query(
                                            "SELECT url FROM media WHERE id = ?",
                                            [results[0].media_id],
                                            (error, mediaResults) => {
                                                if (error) {
                                                    reject(error);
                                                } else {
                                                    plansMedias.push({
                                                        planID: planID,
                                                        mediaURL:
                                                            mediaResults[0].url,
                                                    });
                                                    resolve();
                                                }
                                            },
                                        );
                                    } else {
                                        resolve("no plans media");
                                    }
                                }
                            },
                        );
                    });
                    promises.push(planMediaQuery);
                }
                Promise.all(promises)
                    .then(() => {
                        const combinedArray = results.map((result) => {
                            // Find the corresponding media object based on planID
                            const mediaObject = plansMedias.find(
                                (media) => media.planID === result.id,
                            );

                            // If a matching media object is found, add its properties to the result
                            if (mediaObject) {
                                return {
                                    ...result,
                                    imageURL: mediaObject.mediaURL,
                                };
                            }

                            // If no matching media object is found, return the result as is
                            return result;
                        });
                        // Return services
                        return res.status(200).send({
                            status: "success",
                            message: "Plans found",
                            data: combinedArray,
                        });
                    })
                    .catch((error) => {
                        console.error(error);
                        return res.status(500).send({
                            status: "error",
                            message: "Error in processing data",
                        });
                    });
            } else {
                return res
                    .status(500)
                    .send({ status: "error", message: "No plans found" });
            }
        });
    } catch (error) {
        res.status(500).send({
            status: "error",
            message: "Internal server error",
        });
    } finally {
        req.dbConnectionPool.release();
    }
});

expressRouter.get("/plansID", (req, res) => {
    try {
        req.dbConnectionPool.query("SELECT id FROM plan", (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({
                    status: "error",
                    message: "Error on connecting db",
                });
            }
            return res.status(200).json({
                status: "success",
                message: "successful",
                data: results,
            });
        });
    } catch (error) {
        res.status(500).send({
            status: "error",
            message: "Internal server error",
        });
    } finally {
        req.dbConnectionPool.release();
    }
});

// SERVICES
expressRouter.get("/services", (req, res) => {
    try {
        let sql = "SELECT * FROM service";
        req.dbConnectionPool.query(sql, [], (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({
                    status: "error",
                    message: "Error on connecting db",
                });
            }
            if (results.length > 0) {
                // Results
                // Get medias
                let servicesMedias = [];
                const promises = [];

                for (let service of results) {
                    const serviceMediaQuery = new Promise((resolve, reject) => {
                        const serviceID = service.id;
                        req.dbConnectionPool.query(
                            "SELECT media_id FROM service_media WHERE service_id = ?",
                            [serviceID],
                            (error, results) => {
                                if (error) {
                                    reject(error);
                                } else {
                                    if (results && results.length > 0) {
                                        req.dbConnectionPool.query(
                                            "SELECT url FROM media WHERE id = ?",
                                            [results[0].media_id],
                                            (error, mediaResults) => {
                                                if (error) {
                                                    reject(error);
                                                } else {
                                                    servicesMedias.push({
                                                        serviceID: serviceID,
                                                        mediaURL:
                                                            mediaResults[0].url,
                                                    });
                                                    resolve();
                                                }
                                            },
                                        );
                                    } else {
                                        resolve("no services media");
                                    }
                                }
                            },
                        );
                    });
                    promises.push(serviceMediaQuery);
                }
                Promise.all(promises)
                    .then(() => {
                        const combinedArray = results.map((result) => {
                            // Find the corresponding media object based on serviceID
                            const mediaObject = servicesMedias.find(
                                (media) => media.serviceID === result.id,
                            );

                            const nowYear = new Date().getFullYear();
                            let startVal = result.serv_availability_start;
                            let endVal = result.serv_availability_end;
                            const parseYear = (d) =>
                                d ? new Date(d).getFullYear() : 0;
                            if (!startVal || parseYear(startVal) < nowYear) {
                                startVal = "2024-01-01T00:00:00.000Z";
                            }
                            if (!endVal || parseYear(endVal) < nowYear + 1) {
                                endVal = "2035-12-31T23:59:59.000Z";
                            }

                            return {
                                ...result,
                                serv_availability_start: startVal,
                                serv_availability_end: endVal,
                                imageURL: mediaObject
                                    ? mediaObject.mediaURL
                                    : result.imageURL ||
                                      "media/img/services.webp",
                            };
                        });
                        // Return services
                        return res.status(200).send({
                            status: "success",
                            message: "Services found",
                            data: combinedArray,
                        });
                    })
                    .catch((error) => {
                        console.error(error);
                        return res.status(500).send({
                            status: "error",
                            message: "Error in processing data",
                        });
                    });
            } else {
                return res
                    .status(500)
                    .send({ status: "error", message: "No services found" });
            }
        });
    } catch (error) {
        return res
            .status(500)
            .send({ status: "error", message: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
});

expressRouter.get("/service/:id", (req, res) => {
    try {
        let id = req.params.id;
        let sql = "SELECT * FROM service  WHERE id = ?";
        let values = [id];
        req.dbConnectionPool.query(sql, [values], (error, results) => {
            if (error) {
                console.error(error);
                return res
                    .status(500)
                    .json({ status: "error", message: "Error on querying db" });
            }
            if (results.length > 0) {
                return res.status(200).send({
                    status: "success",
                    message: "Services found",
                    data: results,
                });
            } else {
                return res
                    .status(500)
                    .send({ status: "error", message: "No services found" });
            }
        });
    } catch (error) {
        return res
            .status(500)
            .send({ status: "error", message: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
});

expressRouter.post("/servicesImages", (req, res) => {
    try {
        const services = req.body.services;
        let servicesMedias = [];
        const promises = [];

        for (let service of services) {
            const serviceMediaQuery = new Promise((resolve, reject) => {
                const serviceID = service.id;
                req.dbConnectionPool.query(
                    "SELECT media_id FROM service_media WHERE service_id = ?",
                    [serviceID],
                    (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            if (results && results.length > 0) {
                                req.dbConnectionPool.query(
                                    "SELECT url FROM media WHERE id = ?",
                                    [results[0].media_id],
                                    (error, mediaResults) => {
                                        if (error) {
                                            reject(error);
                                        } else {
                                            servicesMedias.push({
                                                serviceID: serviceID,
                                                mediaURL: mediaResults[0].url,
                                            });
                                            resolve();
                                        }
                                    },
                                );
                            } else {
                                resolve("no services media");
                            }
                        }
                    },
                );
            });
            promises.push(serviceMediaQuery);
        }
        Promise.all(promises)
            .then(() => {
                return res.status(200).send({
                    status: "success",
                    message: "Services medias found",
                    data: servicesMedias,
                });
            })
            .catch((error) => {
                console.error(error);
                return res.status(500).send({
                    status: "error",
                    message: "Error in processing data",
                });
            })
            .finally(() => {
                //
            });
    } catch (error) {
        return res
            .status(500)
            .send({ status: "error", message: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
});

// PAYMENT METHODS
expressRouter.get("/paymentmethods", (req, res) => {
    try {
        let sql = "SELECT * FROM payment_method";
        req.dbConnectionPool.query(sql, [], (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({
                    status: "error",
                    message: "Error on connecting db",
                });
            }
            if (results.length > 0) {
                return res.status(200).send({
                    status: "success",
                    message: "Payment methods found",
                    data: results,
                });
            } else {
                return res.status(500).send({
                    status: "error",
                    message: "No payment methods found",
                });
            }
        });
    } catch (error) {
        return res
            .status(500)
            .send({ status: "error", message: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
});

// ==============================================================================
// MODULO DE DISPONIBILIDAD Y OCUPACION DE RESERVAS
// ==============================================================================

// Endpoint: GET /api/bookingOccupancy
// Que hace: Retorna todas las reservas activas no canceladas (`is_cancelled = 0`)
// desde la fecha actual para mapear fechas no disponibles en el calendario.
// Por que: Permite al componente react-calendar en frontend deshabilitar dias ocupados en tiempo real.
expressRouter.get("/bookingOccupancy", (req, res) => {
    try {
        const sql = `
            SELECT b.id, b.room_id, r.room_name, 
                   DATE_FORMAT(b.booking_start_date, '%Y-%m-%d') as booking_start_date, 
                   DATE_FORMAT(b.booking_end_date, '%Y-%m-%d') as booking_end_date
            FROM booking b
            JOIN room r ON r.id = b.room_id
            WHERE b.is_cancelled = 0
              AND b.booking_end_date >= CURDATE()
            ORDER BY b.booking_start_date ASC
        `;
        req.dbConnectionPool.query(sql, [], (err, results) => {
            if (err) {
                console.error("Error fetching booking occupancy:", err);
                return res.status(500).json({
                    status: "error",
                    message: "Database error fetching occupancy",
                });
            }
            return res.status(200).json({
                status: "success",
                data: results || [],
            });
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    } finally {
        req.dbConnectionPool.release();
    }
});

// Endpoint: POST /api/checkBookingAvailability
// Que hace: Verifica colisiones de fechas de reservas activas para una habitacion especifica
// o devuelve las habitaciones completamente libres durante el rango de fechas solicitado.
// Por que: Regla de negocio critica que evita el overbooking / doble reserva simultanea.
expressRouter.post("/checkBookingAvailability", (req, res) => {
    try {
        const { start_date, end_date } = req.body;
        const roomID = req.body.roomID || req.body.roomId;

        const formatDateStr = (d) => {
            if (!d) return null;
            if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
                return d;
            }
            try {
                const m = moment(d).tz("Europe/Madrid");
                if (m.isValid()) return m.format("YYYY-MM-DD");
            } catch (e) {}
            const dateObj = new Date(d);
            if (isNaN(dateObj.getTime())) return null;
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, "0");
            const day = String(dateObj.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        };

        const startDate = formatDateStr(start_date);
        const endDate = formatDateStr(end_date);

        if (!startDate || !endDate) {
            req.dbConnectionPool.release();
            return res.status(400).json({
                status: "error",
                message: "Valid start_date and end_date are required",
            });
        }

        const isStrictRange = startDate < endDate;

        if (roomID) {
            // Check specific room availability and overlap
            req.dbConnectionPool.query(
                "SELECT id, room_name, room_availability_start, room_availability_end FROM room WHERE id = ?",
                [roomID],
                (roomErr, roomResults) => {
                    if (roomErr) {
                        console.error("Error querying room:", roomErr);
                        req.dbConnectionPool.release();
                        return res.status(500).json({
                            status: "error",
                            message: "Error on connecting db",
                        });
                    }

                    if (!roomResults || roomResults.length === 0) {
                        req.dbConnectionPool.release();
                        return res.status(200).json({
                            status: "success",
                            isAvailable: false,
                            message: "Room not found",
                        });
                    }

                    const room = roomResults[0];
                    let rStart = formatDateStr(room.room_availability_start);
                    let rEnd = formatDateStr(room.room_availability_end);
                    const nowYearStr = `${new Date().getFullYear()}-01-01`;
                    if (!rStart || rStart < nowYearStr) {
                        rStart = "2024-01-01";
                    }
                    if (!rEnd || rEnd < nowYearStr) {
                        rEnd = "2035-12-31";
                    }

                    if (
                        (rStart && startDate < rStart) ||
                        (rEnd && endDate > rEnd)
                    ) {
                        req.dbConnectionPool.release();
                        return res.status(200).json({
                            status: "success",
                            isAvailable: false,
                            message: "No rooms available on those dates",
                        });
                    }

                    const overlapSql = isStrictRange
                        ? `
                            SELECT id, booking_start_date, booking_end_date 
                            FROM booking 
                            WHERE room_id = ? 
                              AND is_cancelled = 0 
                              AND booking_start_date < ? 
                              AND booking_end_date > ?
                        `
                        : `
                            SELECT id, booking_start_date, booking_end_date 
                            FROM booking 
                            WHERE room_id = ? 
                              AND is_cancelled = 0 
                              AND booking_start_date <= ? 
                              AND booking_end_date >= ?
                        `;

                    req.dbConnectionPool.query(
                        overlapSql,
                        [roomID, endDate, startDate],
                        (overlapErr, overlapResults) => {
                            if (overlapErr) {
                                console.error(
                                    "Error checking overlap:",
                                    overlapErr,
                                );
                                req.dbConnectionPool.release();
                                return res.status(500).json({
                                    status: "error",
                                    message:
                                        "Error checking room booking overlap",
                                });
                            }

                            if (overlapResults && overlapResults.length > 0) {
                                req.dbConnectionPool.release();
                                return res.status(200).json({
                                    status: "success",
                                    isAvailable: false,
                                    message:
                                        "Cannot book these dates; they're occupied",
                                });
                            }

                            req.dbConnectionPool.release();
                            return res.status(200).json({
                                status: "success",
                                isAvailable: true,
                                message: "OK, room is available",
                            });
                        },
                    );
                },
            );
        } else {
            // General availability check across any room
            const generalSql = isStrictRange
                ? `
                    SELECT r.id 
                    FROM room r 
                    WHERE (r.room_availability_start IS NULL OR ? >= r.room_availability_start)
                      AND (r.room_availability_end IS NULL OR ? <= r.room_availability_end)
                      AND r.id NOT IN (
                          SELECT b.room_id 
                          FROM booking b 
                          WHERE b.is_cancelled = 0 
                            AND b.booking_start_date < ? 
                            AND b.booking_end_date > ?
                      )
                `
                : `
                    SELECT r.id 
                    FROM room r 
                    WHERE (r.room_availability_start IS NULL OR ? >= r.room_availability_start)
                      AND (r.room_availability_end IS NULL OR ? <= r.room_availability_end)
                      AND r.id NOT IN (
                          SELECT b.room_id 
                          FROM booking b 
                          WHERE b.is_cancelled = 0 
                            AND b.booking_start_date <= ? 
                            AND b.booking_end_date >= ?
                      )
                `;

            req.dbConnectionPool.query(
                generalSql,
                [startDate, endDate, endDate, startDate],
                (err, results) => {
                    if (err) {
                        console.error(err);
                        req.dbConnectionPool.release();
                        return res.status(500).json({
                            status: "error",
                            message: "Error on connecting db",
                        });
                    }

                    if (results && results.length > 0) {
                        req.dbConnectionPool.release();
                        return res.status(200).json({
                            status: "success",
                            isAvailable: true,
                            message: "Rooms available",
                        });
                    }

                    req.dbConnectionPool.release();
                    return res.status(200).json({
                        status: "success",
                        isAvailable: false,
                        message: "No rooms available on those dates",
                    });
                },
            );
        }
    } catch (error) {
        req.dbConnectionPool.release();
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
            error: error.message || error,
        });
    }
});

// BOOKING
expressRouter.delete("/booking/:bookingID", verifyAdmin, (req, res) => {
    try {
        // Delete booking, only for admins
        const bookingId = req.params.bookingID;

        req.dbConnectionPool.beginTransaction(async (err) => {
            if (err) {
                req.dbConnectionPool.rollback();
                return res.status(500).send({
                    status: "error",
                    message: "Internal server error",
                });
            }
            req.dbConnectionPool.query(
                "DELETE FROM booking WHERE id = ?",
                [bookingId],
                (err) => {
                    if (err) {
                        req.dbConnectionPool.rollback();
                        return res.status(500).send({
                            status: "error",
                            message: "Internal server error",
                        });
                    }

                    req.dbConnectionPool.commit((err) => {
                        if (err) {
                            req.dbConnectionPool.rollback();
                        }
                        return res.status(200).send({
                            status: "success",
                            message: "Successfully deleted!",
                        });
                    });
                },
            );
        });
    } catch (error) {
        return res.status(500).send({
            status: "error",
            message: "Internal server error",
            message: error,
        });
    } finally {
        req.dbConnectionPool.release();
    }
});

expressRouter.put("/booking", verifyUser, (req, res) => {
    try {
        // Update booking (only for admins)
        const userID = req.id;
        const booking = req.body;

        const startDateAsDate = new Date(booking.startDate);
        startDateAsDate.setDate(startDateAsDate.getDate() + 1);
        const endDateAsDate = new Date(booking.endDate);
        endDateAsDate.setDate(endDateAsDate.getDate() + 1);
        const startDate = startDateAsDate
            .toISOString()
            .slice(0, 11)
            .replace("T", " ");
        const endDate = endDateAsDate
            .toISOString()
            .slice(0, 11)
            .replace("T", " ");

        getUserRoleById(req.dbConnectionPool, userID)
            .then((userRole) => {
                if (
                    userRole &&
                    (userRole.name == "ADMIN" || userRole.name == "EMPLOYEE")
                ) {
                    req.dbConnectionPool.beginTransaction(async (err) => {
                        if (err) {
                            req.dbConnectionPool.rollback();
                            return res.status(500).send({
                                status: "error",
                                message: "Internal server error",
                            });
                        }
                        req.dbConnectionPool.query(
                            "UPDATE booking SET user_id = ?, plan_id = ?, room_id = ?, booking_start_date = ?, booking_end_date = ? WHERE id = ?",
                            [
                                booking.userID,
                                booking.planID,
                                booking.roomID,
                                startDate,
                                endDate,
                                booking.id,
                            ],
                            (err) => {
                                if (err) {
                                    req.dbConnectionPool.rollback();
                                    return res.status(500).send({
                                        status: "error",
                                        message: "Internal server error",
                                    });
                                }

                                req.dbConnectionPool.commit((err) => {
                                    if (err) {
                                        req.dbConnectionPool.rollback();
                                    }
                                    return res.status(200).send({
                                        status: "success",
                                        message: "Successfully updated!",
                                    });
                                });
                            },
                        );
                    });
                }
            })
            .catch((err) => {
                return res.status(500).send({
                    status: "error",
                    message: "Internal server error: " + err,
                });
            });
    } catch (error) {
        return res.status(500).send({
            status: "error",
            message: "Internal server error",
            message: error,
        });
    } finally {
        req.dbConnectionPool.release();
    }
});

expressRouter.put("/cancelBookingByUser", verifyUser, (req, res) => {
    try {
        const bookingID = req.body.bookingID;

        req.dbConnectionPool.query(
            "SELECT cancellation_deadline FROM booking WHERE id =  ?",
            [bookingID],
            (err, results) => {
                if (err) {
                    return res.status(500).send({
                        status: "error",
                        message: "Internal server error",
                    });
                }
                if (results) {
                    const deadline = new Date(results[0].cancellation_deadline);
                    const currentDate = new Date();
                    // Compare dates
                    if (deadline < currentDate) {
                        return res.status(500).send({
                            status: "error",
                            message: "Deadline to cancel this booking is over",
                        });
                    }

                    req.dbConnectionPool.beginTransaction(async (err) => {
                        if (err) {
                            req.dbConnectionPool.rollback();
                            return res.status(500).send({
                                status: "error",
                                message: "Internal server error",
                            });
                        }
                        req.dbConnectionPool.query(
                            "UPDATE booking SET is_cancelled = true WHERE id = ?",
                            [bookingID],
                            (err) => {
                                if (err) {
                                    req.dbConnectionPool.rollback();
                                    return res.status(500).send({
                                        status: "error",
                                        message: "Internal server error",
                                    });
                                }

                                req.dbConnectionPool.commit((err) => {
                                    if (err) {
                                        req.dbConnectionPool.rollback();
                                    }
                                    return res.status(200).send({
                                        status: "success",
                                        message: "Successfully updated!",
                                    });
                                });
                            },
                        );
                    });
                } else {
                    return res.status(500).send({
                        status: "error",
                        message: "Internal server error",
                    });
                }
            },
        );
    } catch (error) {
        return res.status(500).send({
            status: "error",
            message: "Internal server error",
            message: error,
        });
    } finally {
        req.dbConnectionPool.release();
    }
});

expressRouter.post("/duplicateBooking", verifyUser, (req, res) => {
    const booking = req.body;
    const startDateAsDate = new Date(booking.startDate);
    startDateAsDate.setDate(startDateAsDate.getDate() + 1);
    const endDateAsDate = new Date(booking.endDate);
    endDateAsDate.setDate(endDateAsDate.getDate() + 1);
    const startDate = startDateAsDate
        .toISOString()
        .slice(0, 11)
        .replace("T", " ");
    const endDate = endDateAsDate.toISOString().slice(0, 11).replace("T", " ");

    req.dbConnectionPool.query(
        "SELECT is_cancelled FROM booking WHERE id = ?",
        [booking.id],
        (err, results) => {
            if (err) {
                return res.status(500).send({
                    status: "error",
                    message: "Internal server error",
                });
            }

            if (results[0].is_cancelled === 0) {
                return res.status(400).send({
                    status: "error",
                    message: "This booking is active",
                });
            }

            req.dbConnectionPool.beginTransaction((err) => {
                if (err) {
                    req.dbConnectionPool.rollback();
                    return res.status(500).send({
                        status: "error",
                        message: "Internal server error",
                    });
                }
                const sql =
                    "UPDATE booking SET booking_start_date = ?, booking_end_date = ?, cancellation_deadline = DATE_ADD(CURDATE(), INTERVAL 1 DAY),is_cancelled = 0 WHERE id = ?";
                req.dbConnectionPool.query(
                    sql,
                    [startDate, endDate, booking.id],
                    (err) => {
                        if (err) {
                            req.dbConnectionPool.rollback();
                            return res.status(500).send({
                                status: "error",
                                message: "Internal server error: " + err,
                            });
                        }
                        req.dbConnectionPool.commit();
                        return res.status(200).send({
                            status: "200",
                            message: "Successfully updated!",
                        });
                    },
                );
            });
        },
    );
});

// Endpoint: POST /api/createBooking
// Que hace: Orquesta en una transaccion la creacion de huespedes (guest), insercion de la reserva principal (booking),
// vinculacion de servicios extras (booking_service), relacion de huespedes (booking_guest) y actualiza el contador del usuario.
// Por que: Punto culminante del flujo de contratacion donde se asegura la integridad referencial completa de la estancia.
expressRouter.post("/createBooking", async (req, res) => {
    try {
        const data = req.body;
        const { booking, selectedServicesIDs, guests } = data;
        // Filtrar services por los que estan a true solo
        const servicesIDs = Object.keys(selectedServicesIDs)
            .filter((key) => selectedServicesIDs[key])
            .map(Number);

        // Create or select guests
        const guestIds = await createOrSelectGuests(
            guests,
            req.dbConnectionPool,
        );

        // Create a booking
        const bookingId = await createBooking(
            booking,
            guestIds,
            servicesIDs,
            req.dbConnectionPool,
        );

        if (bookingId) {
            await addBookingCountToUser(booking.userID, req.dbConnectionPool);
        }

        return res.status(200).send({ status: "success", insertId: bookingId });
    } catch (error) {
        return res.status(500).send({
            status: "error",
            message: `Internal server error: ${error}`,
        });
    } finally {
        req.dbConnectionPool.release();
    }
});

// Helper: Contador acumulado de reservas finalizadas por usuario
// Que hace: Incrementa atomicamente el campo booking_count en user_booking_count.
// Por que: Soporta el programa de fidelizacion y verificacion de regalos.
async function addBookingCountToUser(userID, connectionPool) {
    try {
        const query =
            "INSERT INTO user_booking_count (user_id, booking_count) VALUES (?, 1) ON DUPLICATE KEY UPDATE booking_count = booking_count + 1";
        const values = [userID];
        await connectionPool.query(query, values);
    } catch (error) {
        throw error;
    }
}

// Endpoint: POST /api/userPresentCheck
// Que hace: Comprueba si el usuario ha completado 5 reservas o mas; de ser asi y no poseer
// una promocion vigente, genera un cupon exclusivo del 50% de descuento valido por 7 dias.
// Por que: Recompensa la fidelidad del cliente con incentivos de conversion directa.
expressRouter.post("/userPresentCheck", verifyUser, (req, res) => {
    let userID = req.body.userID;
    try {
        // Get the count of bookings for the user
        req.dbConnectionPool.query(
            "SELECT COUNT(*) as count FROM booking WHERE user_id = ?",
            [userID],
            async (error, results) => {
                if (error) {
                    return res
                        .status(500)
                        .json({ status: "Internal Server Error" });
                }
                const bookingCount = results[0].count;

                // Update the booking count in user_booking_count table
                await req.dbConnectionPool.query(
                    "INSERT INTO user_booking_count (user_id, booking_count) VALUES (?, ?) ON DUPLICATE KEY UPDATE booking_count = ?",
                    [userID, bookingCount, bookingCount],
                );

                // Check if the booking count is 5 or more (logic of generate promotion for user)
                if (bookingCount >= 5) {
                    req.dbConnectionPool.query(
                        "SELECT COUNT(*) as count FROM user_promotion WHERE user_id = ? AND isUsed = 0",
                        [userID],
                        (error, results) => {
                            if (error) {
                                return res.status(500).json({
                                    status: "error",
                                    message: "Internal server error: " + error,
                                });
                            }
                            if (results && results[0].count > 0) {
                                return res.status(200).json({
                                    status: "success",
                                    message:
                                        "User already has a unique promo code associated",
                                });
                            } else {
                                // Generate a new promotion
                                const promoCode = generateUniquePromoCode();
                                const discountPrice = 50; // 50% discount
                                const promoName =
                                    "Unique 50% discount promotion only for you!";
                                const promoDescription =
                                    "This 50% discount is only for you and it's valid only from today to 7 days from now!";
                                const startDate = new Date(); // Current date
                                const endDate = new Date();
                                endDate.setDate(endDate.getDate() + 7); // 7 days from today

                                // Insert the new promotion into the promotion table
                                req.dbConnectionPool.query(
                                    "INSERT INTO promotion (code, discount_price, name, description, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)",
                                    [
                                        promoCode,
                                        discountPrice,
                                        promoName,
                                        promoDescription,
                                        startDate,
                                        endDate,
                                    ],
                                    (error, result) => {
                                        if (error) {
                                            return res.status(500).json({
                                                status: "Internal Server Error",
                                            });
                                        }
                                        const promotionId = result.insertId;

                                        // Link the generated promo to the user in the user_promotion table
                                        req.dbConnectionPool.query(
                                            "INSERT INTO user_promotion (user_id, promotion_id) VALUES (?, ?)",
                                            [userID, promotionId],
                                            (error) => {
                                                if (error) {
                                                    return res
                                                        .status(500)
                                                        .json({
                                                            status:
                                                                "Internal Server Error: " +
                                                                error,
                                                        });
                                                }
                                                return res.status(200).json({
                                                    status: "success",
                                                    message:
                                                        "Booking count updated successfully",
                                                    promotion: {
                                                        promoCode,
                                                        discountPrice,
                                                        promoName,
                                                        promoDescription,
                                                        startDate,
                                                        endDate,
                                                        promotionId,
                                                    },
                                                });
                                            },
                                        );
                                    },
                                );
                            }
                        },
                    );
                } else {
                    return res.status(200).json({
                        status: "success",
                        message: "Booking count updated successfully",
                    });
                }
            },
        );
    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: "Internal server error: " + error,
        });
    }
});

// Endpoint: POST /api/userPunishmentCheck
// Que hace: Examina si un usuario acumula 2 o mas cancelaciones de reserva; en caso afirmativo
// y si no ha sido perdonado/rehabilitado por un administrador (`enabledByAdmin = 0`), inhabilita su cuenta (`isEnabled = 0`).
// Por que: Mecanismo de proteccion contra fraudes, abusos de disponibilidad y cancelaciones reiteradas.
expressRouter.post("/userPunishmentCheck", (req, res) => {
    let userID = req.body.userID;
    try {
        req.dbConnectionPool.beginTransaction((err) => {
            if (err) {
                req.dbConnectionPool.rollback();
                return res.status(500).json({
                    status: "error",
                    message: "Internal server error: " + err,
                });
            }

            req.dbConnectionPool.query(
                "SELECT COUNT(*) as count FROM booking WHERE user_id = ? AND is_cancelled = 1",
                [userID],
                (error, results) => {
                    if (error) {
                        req.dbConnectionPool.rollback();
                        return res
                            .status(500)
                            .json({ status: "Internal Server Error" });
                    }
                    const bookingCount = results[0].count;

                    // Punishment to the user if the case
                    if (bookingCount >= 2) {
                        req.dbConnectionPool.query(
                            "SELECT enabledByAdmin FROM app_user WHERE id = ?",
                            [userID],
                            (err, results) => {
                                if (err) {
                                    req.dbConnectionPool.rollback();
                                    return res.status(500).json({
                                        status: "Internal Server Error",
                                    });
                                }

                                const enabledByAdmin =
                                    results[0].enabledByAdmin;
                                if (!enabledByAdmin) {
                                    req.dbConnectionPool.query(
                                        "UPDATE app_user SET isEnabled = 0 WHERE id = ?",
                                        [userID],
                                        async (err) => {
                                            if (err) {
                                                await req.dbConnectionPool.rollback();
                                                return res.status(500).json({
                                                    status: "Internal Server Error",
                                                });
                                            }

                                            await req.dbConnectionPool.commit();

                                            return res.status(200).json({
                                                status: "success",
                                                message:
                                                    "User punishment checked successfully and user was disabled",
                                                disabled: true,
                                            });
                                        },
                                    );
                                } else {
                                    return res.status(200).json({
                                        status: "success",
                                        message:
                                            "User punishment checked successfully, but not punished due to it was reactivated by admin",
                                    });
                                }
                            },
                        );
                    } else {
                        return res.status(200).json({
                            status: "success",
                            message: "User punishment checked successfully",
                        });
                    }
                },
            );
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: "Internal server error: " + error,
        });
    }
});

function generateUniquePromoCode() {
    const prefix = "PROMO";
    const randomComponent = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
    const suffix = new Date().getTime().toString(36).toUpperCase();

    return `${prefix}-${randomComponent}-${suffix}`;
}

// Booking functions
async function createOrSelectGuests(guests, connection) {
    try {
        if (!guests || !Array.isArray(guests) || guests.length === 0) {
            return [];
        }
        const existingGuests = guests.filter(
            (guest) => guest.id !== null && guest.id !== undefined,
        );
        const existingGuestIds = existingGuests.map((guest) => guest.id);

        const [guestIdMap, guestsToInsert] = await Promise.all([
            selectGuestIds(existingGuestIds, connection),
            insertGuests(
                guests.filter(
                    (guest) => guest.id === null || guest.id === undefined,
                ),
                connection,
            ),
        ]);

        const uniqueGuestIds = Array.from(
            new Set(guestIdMap.concat(guestsToInsert)),
        );
        return uniqueGuestIds;
    } catch (error) {
        console.error("Error in createOrSelectGuests:", error);
        throw error;
    }
}

function selectGuestIds(existingGuestIds, connection) {
    return new Promise((resolve, reject) => {
        try {
            if (!existingGuestIds || existingGuestIds.length === 0) {
                resolve([]);
                return;
            }
            const query = "SELECT id FROM guest WHERE id IN (?)";
            connection.query(query, [existingGuestIds], (err, results) => {
                if (err) {
                    console.error("Error selecting guests:", err);
                    reject(`Error selecting guests: ${err.message || err}`);
                } else {
                    resolve(results.map((result) => result.id));
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

function insertGuests(guestsToInsert, connection) {
    return new Promise((resolve, reject) => {
        try {
            if (!guestsToInsert || guestsToInsert.length === 0) {
                resolve([]);
                return;
            }

            const values = guestsToInsert.map((guest) => [
                guest.id || null,
                guest.name || "",
                guest.surnames || "",
                guest.email || null,
                guest.isAdult ? "1" : "0",
                guest.isSystemUser ? "1" : "0",
            ]);
            const query =
                "INSERT INTO guest (id, guest_name, guest_surnames, guest_email, isAdult, isSystemUser) VALUES ?";
            connection.query(query, [values], (err, result) => {
                if (err) {
                    console.error("Error creating guests:", err);
                    reject(`Error creating guests: ${err.message || err}`);
                } else {
                    const count = guestsToInsert.length;
                    const firstId = result.insertId;
                    const insertedIds = Array.from(
                        { length: count },
                        (_, i) => firstId + i,
                    );
                    resolve(insertedIds);
                }
            });
        } catch (error) {
            console.error("Catch in insertGuests:", error);
            reject(error);
        }
    });
}

async function createBooking(booking, guestIds, servicesIDs, connection) {
    return new Promise((resolve, reject) => {
        try {
            const startDate = moment(booking.startDate).format(dateFormat);
            const endDate = moment(booking.endDate).format(dateFormat);
            const query =
                "INSERT INTO booking (user_id, plan_id, room_id, booking_start_date, booking_end_date) VALUES (?, ?, ?, ?, ?)";
            const values = [
                booking.userID,
                booking.planID,
                booking.roomID,
                startDate,
                endDate,
            ];
            connection.beginTransaction(async (err) => {
                if (err) {
                    connection.rollback(() =>
                        reject("Transaction start error"),
                    );
                    return;
                }

                connection.query(query, values, async (err, result) => {
                    if (err) {
                        connection.rollback(() =>
                            reject(`Error creating booking: ${err}`),
                        );
                        return;
                    }

                    const bookingId = result.insertId;

                    try {
                        await insertBookingServices(
                            connection,
                            bookingId,
                            servicesIDs,
                        );
                        await insertBookingGuests(
                            connection,
                            bookingId,
                            guestIds,
                        );

                        connection.commit((commitErr) => {
                            if (commitErr) {
                                connection.rollback(() =>
                                    reject("Transaction commit error"),
                                );
                                return;
                            }
                            resolve(bookingId);
                        });
                    } catch (subErr) {
                        connection.rollback(() =>
                            reject(
                                `Error inserting related booking details: ${subErr}`,
                            ),
                        );
                    }
                });
            });
        } catch (error) {
            reject(error);
        }
    });
}

function insertBookingServices(connection, bookingId, servicesIDs) {
    try {
        if (
            !servicesIDs ||
            !Array.isArray(servicesIDs) ||
            servicesIDs.length === 0
        ) {
            return Promise.resolve();
        }
        const query =
            "INSERT INTO booking_service (booking_id, service_id) VALUES ?";
        const values = servicesIDs.map((serviceID) => [bookingId, serviceID]);
        return connection.query(query, [values]);
    } catch (error) {
        console.error("Error in insertBookingServices:", error);
        throw error;
    }
}

function insertBookingGuests(connection, bookingId, guestIds) {
    try {
        if (!guestIds || !Array.isArray(guestIds) || guestIds.length === 0) {
            return Promise.resolve();
        }
        const query =
            "INSERT INTO booking_guest (booking_id, guest_id) VALUES ?";
        const values = guestIds.map((guestId) => [bookingId, guestId]);
        return connection.query(query, [values]);
    } catch (error) {
        console.error("Error in insertBookingGuests:", error);
        throw error;
    }
}

expressRouter.get("/bookings", verifyAdmin, (req, res) => {
    try {
        const sql = `
            SELECT 
                b.id,
                b.user_id,
                b.plan_id,
                b.room_id,
                b.booking_start_date,
                b.booking_end_date,
                b.cancellation_deadline,
                b.is_cancelled,
                b.created_at,
                u.user_name,
                u.user_surnames,
                u.user_email,
                u.user_dni,
                r.room_name,
                r.room_price,
                p.plan_name,
                p.plan_price
            FROM booking b
            LEFT JOIN app_user u ON u.id = b.user_id
            LEFT JOIN room r ON r.id = b.room_id
            LEFT JOIN plan p ON p.id = b.plan_id
            ORDER BY b.id DESC
        `;
        req.dbConnectionPool.query(sql, (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send({
                    status: "error",
                    message: "Internal server error",
                });
            }
            return res.status(200).send({
                status: "success",
                message: "successful",
                data: results,
            });
        });
    } catch (error) {
        return res
            .status(500)
            .send({ status: "error", message: "Internal server error" });
    }
});

// Endpoint: GET /api/bookingByLocator/:locator
// Que hace: Busca una reserva por su localizador escaneado (ej: AURA-BK-14) o ID numerico directo.
// Por que: Permite a recepcion / admin validar y cargar los datos de huespedes, habitacion y estado en un solo paso.
expressRouter.get("/bookingByLocator/:locator", verifyAdmin, (req, res) => {
    try {
        const rawLocator = String(req.params.locator || "").trim();
        let bookingId = null;

        // Si viene en formato localizador industrial AURA-BK-<id> o AURA-BK-<id>-...
        const match = rawLocator.match(/AURA-BK-(\d+)/i);
        if (match) {
            bookingId = parseInt(match[1], 10);
        } else if (/^\d+$/.test(rawLocator)) {
            bookingId = parseInt(rawLocator, 10);
        }

        if (!bookingId || isNaN(bookingId)) {
            return res.status(400).json({
                status: "error",
                message: "Formato de localizador o identificador de reserva no valido.",
            });
        }

        const sql = `
            SELECT 
                b.id as booking_id,
                b.user_id,
                b.plan_id,
                b.room_id,
                b.booking_start_date,
                b.booking_end_date,
                b.cancellation_deadline,
                b.is_cancelled,
                b.created_at,
                u.user_name,
                u.user_surnames,
                u.user_email,
                u.user_dni,
                r.room_name,
                r.room_price,
                p.plan_name,
                p.plan_price,
                pay.id as payment_id,
                pay.payment_amount,
                pay.payment_method_id,
                pm.payment_method_name
            FROM booking b
            LEFT JOIN app_user u ON u.id = b.user_id
            LEFT JOIN room r ON r.id = b.room_id
            LEFT JOIN plan p ON p.id = b.plan_id
            LEFT JOIN payment pay ON pay.booking_id = b.id
            LEFT JOIN payment_method pm ON pm.id = pay.payment_method_id
            WHERE b.id = ?
        `;

        req.dbConnectionPool.query(sql, [bookingId], (err, results) => {
            if (err) {
                console.error("Error looking up booking by locator:", err);
                return res.status(500).json({
                    status: "error",
                    message: "Error interno al consultar la reserva.",
                });
            }

            if (!results || results.length === 0) {
                return res.status(404).json({
                    status: "error",
                    message: `No se encontro ninguna reserva con el localizador #${bookingId}.`,
                });
            }

            const bookingData = results[0];

            // Obtener huespedes vinculados a la reserva
            const guestsSql = `
                SELECT g.id, g.guest_name, g.guest_surnames, g.guest_email, g.isAdult, g.isSystemUser
                FROM guest g
                INNER JOIN booking_guest bg ON bg.guest_id = g.id
                WHERE bg.booking_id = ?
            `;

            req.dbConnectionPool.query(guestsSql, [bookingId], (guestErr, guestRows) => {
                if (guestErr) {
                    console.error("Error looking up booking guests:", guestErr);
                }

                // Obtener servicios vinculados a la reserva
                const servicesSql = `
                    SELECT s.id, s.serv_name, s.serv_price
                    FROM service s
                    INNER JOIN booking_service bs ON bs.service_id = s.id
                    WHERE bs.booking_id = ?
                `;

                req.dbConnectionPool.query(servicesSql, [bookingId], (servErr, servRows) => {
                    return res.status(200).json({
                        status: "success",
                        message: "Reserva localizada correctamente",
                        data: {
                            ...bookingData,
                            guests: guestRows || [],
                            services: servRows || [],
                            locator: `AURA-BK-${bookingId}`,
                        },
                    });
                });
            });
        });
    } catch (error) {
        console.error("Catch in /bookingByLocator:", error);
        return res.status(500).json({
            status: "error",
            message: "Error interno del servidor.",
        });
    } finally {
        req.dbConnectionPool.release();
    }
});


expressRouter.get("/bookingsByUser", verifyUser, (req, res) => {
    try {
        // AND is_cancelled = 0
        req.dbConnectionPool.query(
            "SELECT * FROM booking WHERE user_id = ?",
            [req.id],
            (err, results) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send({
                        status: "error",
                        message: "Internal server error",
                    });
                }
                return res.status(200).send({
                    status: "success",
                    message: "successful",
                    data: results,
                });
            },
        );
    } catch (error) {
        return res
            .status(500)
            .send({ status: "error", message: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
});

// ==============================================================================
// MODULO DE PAGOS Y TRANSACCIONES FINANCIERAS (STRIPE)
// ==============================================================================

// Endpoint: POST /api/payment
// Que hace: Registra el abono formal de una reserva vinculando usuario, reserva, monto y fecha.
// Por que: Permite auditoria y liquidacion interna de la reserva dentro del sistema.
expressRouter.post("/payment", (req, res) => {
    try {
        const data = req.body;
        let sql =
            "INSERT INTO payment (user_id, booking_id, payment_amount, payment_date, payment_method_id) VALUES (?, ?, ?, ?, ?)";
        // Create a Date object from the original string
        const dateObject = new Date(data.date);
        // Format the date as 'YYYY-MM-DD'
        const formattedDate = dateObject.toISOString().split("T")[0];
        let values = [
            data.userID,
            data.bookingID,
            data.amount,
            formattedDate,
            data.paymentMethodID,
        ];
        req.dbConnectionPool.query(sql, values, (error, result) => {
            if (error) {
                console.error(error);
                return res.status(500).send({
                    status: "error",
                    message: "Internal server error",
                });
            }
            return res
                .status(200)
                .send({ status: "success", insertId: result.insertId });
        });
    } catch (error) {
        return res
            .status(500)
            .send({ status: "error", message: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
});

// Endpoint: POST /api/paymentTransaction
// Que hace: Almacena la asociacion entre el id de pago interno y el id de transaccion de pasarela.
// Por que: Garantiza la trazabilidad contable con la plataforma de pagos externa.
expressRouter.post("/paymentTransaction", (req, res) => {
    try {
        const data = req.body;
        req.dbConnectionPool.query(
            "INSERT INTO payment_transaction (payment_id, transaction_id) VALUES (?, ?)",
            [data.payment_id, data.transaction_id],
            (error, result) => {
                if (error) {
                    return res.status(500).send({
                        status: "error",
                        message: "Internal server error",
                    });
                }
                return res
                    .status(200)
                    .send({ status: "success", insertId: result.insertId });
            },
        );
    } catch (error) {
        return res
            .status(500)
            .send({ status: "error", message: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
});

// Endpoint: POST /api/purchase (Stripe PaymentIntent)
// Que hace: Crea una intencion de pago en Stripe (PaymentIntent) en centimos y devuelve el client_secret.
// Por que: Permite al cliente frontend inicializar de forma segura Stripe Elements sin manipular claves secretas.
expressRouter.post("/purchase", async (req, res) => {
    try {
        const { data } = req.body;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: data.amount,
            currency: data.currency,
            description: "Hotel booking",
            payment_method_types: ["card"],
        });

        const { client_secret } = paymentIntent;

        return res.status(200).json({
            status: "success",
            message: "stripe",
            client_secret: client_secret,
        });
    } catch (error) {
        return res.status(200).json({
            status: "error",
            message: "stripe",
            message: error,
            client_secret: null,
        });
    } finally {
        req.dbConnectionPool.release();
    }
});

// Endpoint: POST /api/cancel-payment
// Que hace: Cancela una intencion de pago no completada en Stripe a traves de su client_secret.
// Por que: Libera autorizaciones bancarias pendientes si el usuario cancela el checkout en el modal.
expressRouter.post("/cancel-payment", async (req, res) => {
    try {
        const { client_secret } = req.body;

        // Retrieve the Payment Intent using the client_secret
        const paymentIntent = await stripe.paymentIntents.retrieve(null, {
            client_secret,
        });

        // Cancel the Payment Intent
        const canceledPaymentIntent = await stripe.paymentIntents.cancel(
            paymentIntent.id,
        );

        return res.status(200).json({
            status: "success",
            message: "Payment Intent canceled",
            canceledPaymentIntent,
        });
    } catch (error) {
        return res.status(200).json({
            status: "error",
            message: "Error canceling Payment Intent",
            error,
        });
    } finally {
        req.dbConnectionPool.release();
    }
});

// DELETES FUNCTIONS
// By user ID
function deleteUserByUserID(userID, connection) {
    return new Promise((resolve, reject) => {
        try {
            const sql = "DELETE FROM app_user WHERE id = ?";
            const values = [userID];
            connection.query(sql, values, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

function deleteBookingByUserID(userID, connection) {
    return new Promise((resolve, reject) => {
        try {
            const sql = "DELETE FROM booking WHERE user_id = ?";
            const values = [userID];

            connection.query(sql, values, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

function deletePaymentByUserID(userID, connection) {
    return new Promise((resolve, reject) => {
        try {
            const sql = "DELETE FROM payment WHERE user_id = ?";
            const values = [userID];

            connection.query(sql, values, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        } catch (error) {
            return res
                .status(500)
                .send({ status: "error", message: "Internal server error" });
        }
    });
}

function deleteUserRoleByUserID(userID, connection) {
    return new Promise((resolve, reject) => {
        try {
            const sql = "DELETE FROM user_role WHERE user_id = ?";
            const values = [userID];

            connection.query(sql, values, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        } catch (error) {
            return res
                .status(500)
                .send({ status: "error", message: "Internal server error" });
        }
    });
}

function deleteUserMediaByUserID(userID, connection) {
    return new Promise((resolve, reject) => {
        try {
            const sql = "DELETE FROM user_media WHERE user_id = ?";
            const values = [userID];

            connection.query(sql, values, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        } catch (error) {
            return res
                .status(500)
                .send({ status: "error", message: "Internal server error" });
        }
    });
}

// Google ReCAPTCHA
// Verify site
expressRouter.post("/captchaSiteVerify", authLimiter, async (req, res) => {
    try {
        const { response } = req.body;
        // The secret key must ONLY be read from server environment variables
        const captchaSecret = process.env.reCAPTCHA_SECRET_KEY;
        if (!captchaSecret) {
            console.error(
                "reCAPTCHA server secret key is not set in environment",
            );
            return res
                .status(500)
                .json({
                    success: false,
                    message: "reCAPTCHA server misconfiguration",
                });
        }

        const reCaptchaURLEndpoint =
            "https://www.google.com/recaptcha/api/siteverify";
        const verificationResponse = await axios.post(
            reCaptchaURLEndpoint,
            null,
            {
                params: {
                    secret: captchaSecret,
                    response,
                },
            },
        );

        if (verificationResponse.data && verificationResponse.data.success) {
            res.status(200).json({ success: true });
        } else {
            res.status(400).json({
                success: false,
                errors: verificationResponse.data
                    ? verificationResponse.data["error-codes"]
                    : null,
            });
        }
    } catch (error) {
        console.error("reCAPTCHA verification error:", error.message || error);
        res.status(500).json({ success: false });
    } finally {
        req.dbConnectionPool.release();
    }
});

// WEATHER
// Insert weather
expressRouter.post("/insert-weather", async (req, res) => {
    try {
        const weatherData = req.body.list;

        // Extract unique dates from the weather data
        const uniqueDates = Array.from(
            new Set(weatherData.map((data) => data.dt_txt.split(" ")[0])),
        );

        // Initialize remainingQueries counter
        let remainingQueries = uniqueDates.length;
        let existingDataIsFound = false;

        // Start a transaction
        req.dbConnectionPool.beginTransaction((err) => {
            if (err) {
                return res
                    .status(500)
                    .json({ status: "error", message: err.message });
            }
        });

        // Iterate through weather data and insert into the database
        for (const date of uniqueDates) {
            const rainOccurrence = weatherData.find((data) => {
                const dataDate = data.dt_txt.split(" ")[0];
                return dataDate === date && data.weather[0].main === "Rain";
            });

            if (rainOccurrence) {
                // Get date from the ocurrence
                const parsedDate = new Date(rainOccurrence.dt_txt);
                // Set correct hours due to tz difference
                parsedDate.setHours(parsedDate.getHours() + 1);
                if (parsedDate.toISOString().split("T")[1].split(":")[0] != 0) {
                    // Check if hour is different from 00 midnight
                    parsedDate.setHours(1); // 1 because of timezone that does -1h
                    parsedDate.setMinutes(0);
                    parsedDate.setSeconds(0);
                }
                const state = rainOccurrence.weather[0].main;

                // Check if the date doesn't exist in the database before inserting
                const existingData = await new Promise((resolve, reject) => {
                    req.dbConnectionPool.query(
                        "SELECT * FROM weather WHERE weather_date = ?",
                        [parsedDate],
                        (error, result) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(result);
                            }
                        },
                    );
                });

                if (existingData.length === 0) {
                    await new Promise((resolve, reject) => {
                        req.dbConnectionPool.query(
                            "INSERT INTO weather (weather_date, weather_state) VALUES (?, ?)",
                            [parsedDate, state],
                            (error) => {
                                if (error) {
                                    remainingQueries--;
                                    reject(error);
                                } else {
                                    remainingQueries--;
                                    resolve();
                                }
                            },
                        );
                    });
                } else {
                    for (const data of existingData) {
                        await new Promise((resolve, reject) => {
                            req.dbConnectionPool.query(
                                "UPDATE weather SET weather_state = ? WHERE id = ?",
                                ["Rain", data.id],
                                (error) => {
                                    if (error) {
                                        remainingQueries--;
                                        reject(error);
                                    } else {
                                        remainingQueries--;
                                        resolve();
                                    }
                                },
                            );
                        });
                    }
                }
            } else {
                // Handle cases where no 'RAIN' occurrence for the day
                const firstOccurrence = weatherData.find((data) => {
                    const dataDate = data.dt_txt.split(" ")[0];
                    return dataDate === date;
                });

                if (firstOccurrence) {
                    const parsedDate = new Date(firstOccurrence.dt_txt);
                    // Set correct hours due to tz difference
                    parsedDate.setHours(parsedDate.getHours() + 1);
                    if (
                        parsedDate.toISOString().split("T")[1].split(":")[0] !=
                        0
                    ) {
                        // Check if hour is different from 00 midnight
                        parsedDate.setHours(1); // 1 because of timezone that does -1h
                        parsedDate.setMinutes(0);
                        parsedDate.setSeconds(0);
                    }
                    const state = firstOccurrence.weather[0].main;

                    try {
                        // Check if the date doesn't exist in the database before inserting
                        const existingData = await new Promise(
                            (resolve, reject) => {
                                req.dbConnectionPool.query(
                                    "SELECT * FROM weather WHERE weather_date = ?",
                                    [parsedDate],
                                    (error, result) => {
                                        if (error) {
                                            reject(error);
                                        } else {
                                            resolve(result);
                                        }
                                    },
                                );
                            },
                        );

                        if (existingData.length === 0) {
                            await new Promise((resolve, reject) => {
                                req.dbConnectionPool.query(
                                    "INSERT INTO weather (weather_date, weather_state) VALUES (?, ?)",
                                    [parsedDate, state],
                                    (error) => {
                                        if (error) {
                                            remainingQueries--;
                                            reject(error);
                                        } else {
                                            remainingQueries--;
                                            resolve();
                                        }
                                    },
                                );
                            });
                        } else {
                            remainingQueries--;
                            existingDataIsFound = true;
                        }
                    } catch (error) {
                        remainingQueries--;
                        if (remainingQueries === 0) {
                            return res.status(500).send({
                                status: "error",
                                message: "Internal server error",
                            });
                        }
                    }
                } else {
                    remainingQueries--;
                }
            }

            if (remainingQueries === 0) {
                await new Promise((resolve, reject) => {
                    req.dbConnectionPool.commit((err) => {
                        if (err) {
                            req.dbConnectionPool.rollback(() => {
                                reject({
                                    status: "error",
                                    message: "Internal server error",
                                });
                            });
                        } else {
                            resolve();
                        }
                    });
                });
                if (!existingDataIsFound) {
                    return res.status(200).send({
                        status: "success",
                        message: "Weather data inserted successfully",
                    });
                } else {
                    return res.status(200).send({
                        status: "success",
                        message:
                            "Weather data inserted successfully with existing weather data days found.",
                    });
                }
            }
        }
    } catch (error) {
        return res
            .status(500)
            .send({ status: "error", message: "Internal server error" });
    } finally {
        if (req.dbConnectionPool) {
            req.dbConnectionPool.release();
        }
    }
});
// Get weather data
expressRouter.get("/weather", (req, res) => {
    req.dbConnectionPool.query("SELECT * FROM weather", (err, results) => {
        if (err) {
            return res
                .status(500)
                .send({ status: "error", message: "Internal server error" });
        }
        return res.status(200).send({ status: "success", data: results });
    });
});

// PROMOTIONS
// Get promos: soporta ?visible=true para seccion publica web
expressRouter.get("/promotions", (req, res) => {
    const onlyVisible =
        req.query.visible === "true" || req.query.visible === "1";
    let sql =
        "SELECT * FROM promotion WHERE (is_active IS NULL OR is_active = 1)";
    if (onlyVisible) {
        sql += " AND (is_visible IS NULL OR is_visible = 1)";
    }
    sql +=
        " AND (end_date IS NULL OR end_date >= CURDATE()) ORDER BY discount_price DESC";

    req.dbConnectionPool.query(sql, (err, results) => {
        if (err) {
            req.dbConnectionPool.query(
                "SELECT * FROM promotion",
                (fallbackErr, fallbackResults) => {
                    if (fallbackErr) {
                        return res
                            .status(500)
                            .send({
                                status: "error",
                                message: "Internal server error",
                            });
                    }
                    return res
                        .status(200)
                        .send({ status: "success", data: fallbackResults });
                },
            );
            return;
        }
        return res.status(200).send({ status: "success", data: results });
    });
});

// Endpoint para validar cualquier cupon activo (visible o privado de palabra)
expressRouter.post("/checkPromoCode", (req, res) => {
    const code = req.body && req.body.code ? String(req.body.code).trim() : "";
    if (!code) {
        return res
            .status(400)
            .json({
                status: "error",
                message: "El código de promoción es requerido",
            });
    }
    const sql =
        "SELECT * FROM promotion WHERE UPPER(TRIM(code)) = UPPER(?) AND (is_active IS NULL OR is_active = 1) AND (start_date IS NULL OR start_date <= CURDATE()) AND (end_date IS NULL OR end_date >= CURDATE())";
    req.dbConnectionPool.query(sql, [code], (err, results) => {
        if (err) {
            console.error("Error verificando cupon:", err);
            return res
                .status(500)
                .json({ status: "error", message: "Error en base de datos" });
        }
        if (results && results.length > 0) {
            return res
                .status(200)
                .json({
                    status: "success",
                    valid: true,
                    promotion: results[0],
                });
        }
        return res
            .status(200)
            .json({
                status: "success",
                valid: false,
                message: "Cupón no encontrado, expirado o inactivo",
            });
    });
});
expressRouter.get("/get-promo-discount/:id", (req, res) => {
    let promoID = req.params.id;
    req.dbConnectionPool.query(
        "SELECT discount_price FROM promotion WHERE id = ?",
        [promoID],
        (err, results) => {
            if (err) {
                return res.status(500).send({
                    status: "error",
                    message: "Internal server error",
                });
            }
            return res.status(200).send({
                status: "success",
                data: { discount: results[0].discount_price },
            });
        },
    );
});
expressRouter.post("/saveBookingWithPromoApplied", (req, res) => {
    let promoID = req.body.promoID;
    let bookingID = req.body.bookingID;
    req.dbConnectionPool.query(
        "INSERT INTO booking_promotion (booking_id, promotion_id) VALUES (?, ?)",
        [bookingID, promoID],
        (err, result) => {
            if (err) {
                return res.status(500).send({
                    status: "error",
                    message: "Internal server error",
                });
            }
            return res.status(200).send({
                status: "success",
                data: { insertedID: result.insertId },
            });
        },
    );
});
expressRouter.post("/getUserAssociatedPromos", (req, res) => {
    let userID = req.body.userID;
    req.dbConnectionPool.query(
        "SELECT * FROM user_promotion WHERE user_id = ?",
        [userID],
        (err, results) => {
            if (err) {
                return res.status(500).send({
                    status: "error",
                    message: "Internal server error",
                });
            }
            return res.status(200).send({ status: "success", results });
        },
    );
});
expressRouter.post("/getUserAssociatedPromoCode", (req, res) => {
    let userID = req.body.userID;
    if (!userID) {
        return res.status(200).send({ status: "success", results: [] });
    }
    req.dbConnectionPool.query(
        "SELECT * FROM user_promotion INNER JOIN promotion ON user_promotion.promotion_id = promotion.id WHERE user_id = ? AND isUsed = 0",
        [userID],
        (err, results) => {
            if (err) {
                console.error(
                    "Error fetching user associated promo code:",
                    err,
                );
                return res.status(500).send({
                    status: "error",
                    message: "Internal server error",
                });
            }
            return res
                .status(200)
                .send({ status: "success", results: results || [] });
        },
    );
});
expressRouter.post("/setUserPromoUsed", verifyUser, (req, res) => {
    let promoID = req.body.promoID;
    let userID = req.body.userID;
    req.dbConnectionPool.query(
        "UPDATE user_promotion SET isUsed = 1 WHERE user_id = ? AND promotion_id = ?",
        [userID, promoID],
        (err) => {
            if (err) {
                return res.status(500).send({
                    status: "error",
                    message: "Internal server error",
                });
            }
            return res.status(200).send({ status: "success" });
        },
    );
});

// Listen SERVER (DEFAULT NODE PORT RUN OR 3000)
const appPort = process.env.PORT || 3000;

app.listen(appPort, () => {
    console.log(`Hotel Aura de Mallorca SERVER listening on port ${appPort}`);
});
