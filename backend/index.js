// DEPENDENCIES
const express = require('express')
const expressRouter = express.Router()
const cors = require('cors')
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const mysql = require('mysql')
const cookieParser = require('cookie-parser')
const compression = require('compression')
const moment = require('moment-timezone'); // for dates, library
moment.tz.setDefault('Europe/Madrid');
const dateFormat = 'YYYY-MM-DD';
const nodemailer = require("nodemailer");
const fileExtensionRegex = /\.[^.]+$/;
const fs = require('fs');
const multer = require('multer');
// Podriamos hacer un storage con rutas distintas para cada proposito con un objeto uploadWith con su storage distinto para usarlo en las rutas
const rutaMedia = 'media/'
const rutaImgs = rutaMedia + 'img/'
const rutaProfilePics = rutaImgs + 'users/profilepics/'
// Aqui hacemos solo para subida de fotos de perfil de usuarios, pero podria hacerse mas
const multerStorageForUserPic = multer.diskStorage({
    destination: function (req, file, cb) {
        // const { id } = req.body
        // Generico: cb(null, 'public' + rutaMedia)
        const path = 'public/' + rutaProfilePics
        fs.mkdirSync(path, { recursive: true })
        return cb(null, path)
    },
    filename: function (req, file, cb) {
        if (req && req.dni) {
            return cb(null, req.dni + '.webp')
        } else {
            return cb(null, file.originalname.replace(fileExtensionRegex, '') + '.webp') //Appending .webp
        }
    }
})
const uploadWithMulterForUserPic = multer({ storage: multerStorageForUserPic })
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
// const morgan = require('morgan') // logger
// QR
const jsQR = require('jsqr');
const Jimp = require('jimp');
// AXIOS (for captcha and stuff verifications)
const axios = require("axios");
// const os = require('os');

// Check OS (if db connector changed or other uses)
// const isWindows = os.platform() === 'win32';

const decodeBase64Image = async (req, res, next) => {
    if (req.body && req.body.imagePicQR) {
        const base64ImageString = req.body.imagePicQR;
        const buffer = Buffer.from(base64ImageString.substring(22), 'base64');

        const decodedImage = await Jimp.read(buffer);
        // Get the image dimensions and pixel data
        const width = decodedImage.getWidth();
        const height = decodedImage.getHeight();
        const pixelData = decodedImage.bitmap.data;

        req.imageData = { width, height, pixelData };
        req.imageWidth = width;
        req.imageHeight = height;

        next();
    } else {
        res.status(400).json({ message: 'No image found' });
    }
};

// INIT SERVER
const app = express();

// CONFIGS
// JSON enable
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

// CORS
const corsOptions = {
    //origin: process.env.CORS_ORIGIN_FRONT_URL,
    origin: '*',
    credentials: true, //access-control-allow-credentials:true
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    optionsSuccessStatus: 200,
}
app.use(cors(corsOptions));

// Cookies and compression
app.use(cookieParser());
app.use(compression())
// app.use(morgan('combined'))

// Serve public media
var path = require('path');
app.use(express.static(path.join(__dirname, 'public')))

// DATABASE
const dbConfig = {
    host: process.env.DB_URL,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 300,
    connectTimeout: 30000,
    port: process.env.DB_PORT,
    timezone: process.env.DB_TIMEZONE,
    pingInterval: 60000,
    timezone: 'Europe/Madrid', // Set the timezone here
}

// const pool = isWindows ? mysql.createPool(dbConfig) : mysql2.createPool(dbConfig)
const pool = mysql.createPool(dbConfig)

// JWT
const jwt = require('jsonwebtoken')
const jwtSecretKey = 'jwt-secret-key'

// Verify user JWT
const verifyUser = (req, res, next) => {
    let token = '';
    //if (!req.cookies) {
    if (!req.headers.authorization) {
        token = req.body.token;
    } else {
        token = req.headers.authorization;
    }
    // } else {
    //     token = req.cookies.token;
    // }
    if (!token) {
        return res.status(401).json({ status: "error", msg: "You are not authenticated, forbidden." })
    } else {
        jwt.verify(token, jwtSecretKey, (err, decoded) => {
            if (err) {
                return res.status(401).json({ status: "error", msg: "Token is not valid, forbidden." })
            } else {
                // Check also on db
                req.dbConnectionPool.query('SELECT id, user_dni, user_verified FROM app_user WHERE access_token = ? AND isEnabled = 1', [token], (err, result) => {
                    if (err) {
                        return res.status(401).json({ status: "error", msg: "Couldn't check user token in db query." })
                    }
                    if (result && result.length > 0) {
                        if (result[0].user_verified == 1) {
                            req.id = decoded.userID;
                            req.dni = result[0].user_dni;
                            next();
                        } else {
                            return res.status(401).json({ status: "error", msg: "Token is valid, but user is not verified." })
                        }
                    } else {
                        return res.status(401).json({ status: "error", msg: "Token is not valid, forbidden." })
                    }
                })
            }
        })
    }
}

// Hashing for passwords
const salt = 10; // password hashing

// MAILS
const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
    name: process.env.API_URL
});

transporter.verify((error, success) => {
    if (error) {
        console.log(error);
    } else {
        console.log("Is server ready to send emails? " + success + ".");
    }
})

// ROUTES (SERVER APP)
// if we use on defining routes app. -> NO /api prefix, if we use expressRoute, we defined to use /api prefix
// DONT USE IF WE SERVE IT IN PROXYPASS OF APACHE APPENDING /api to the IP of BACKEND
app.use('/api/', expressRouter)

// MIDDLEWARE PARA PROPER CONNECTION HANDLING OF DB
expressRouter.use((req, res, next) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: 'error', error: 'Internal server error' });
        }
        req.dbConnectionPool = connection; // Agregamos la conexión al objeto de solicitud
        next(); // Continuamos con la ejecución de la ruta
    });
});

// USER
expressRouter.post('/checkUserExists', (req, res) => {
    try {
        const { email, dni } = req.body;
        req.dbConnectionPool.query('SELECT id FROM app_user WHERE user_email = ? OR user_dni = ?', [email, dni], (err, results) => {
            if (err) {
                return res.status(500).json({ status: "error", message: "Error checking for existing users" })
            }
            if (results && results.length > 0) {
                return res.status(409).json({ status: "error", message: "Existing user found in DB, use another email or dni!" })
            } else {
                return res.status(200).json({ status: "success", message: "User available" })
            }
        })
    } catch (error) {
        return res.status(500).json({ status: "error", message: "Error checking for existing users" })
    }
})
expressRouter.post('/register', (req, res) => {
    try {
        const data = req.body;
        const checkSQL = 'SELECT * FROM app_user WHERE user_email = ? OR user_dni = ?'
        const checkValues = [data.email, data.dni]
        req.dbConnectionPool.query(checkSQL, checkValues, (err, resultss) => {
            if (err) {
                return res.status(500).json({ status: "error", message: "Error checking for existing emails and dni" })
            }
            if (resultss.length > 0) {
                return res.status(500).json({ status: "error", message: "Existing email OR DNI found in DB, use another email or DNI!" })
            } else {
                const sql = 'INSERT INTO app_user (user_name, user_surnames, user_email, user_dni, user_password) VALUES (?, ?, ?, ?, ?)';

                bcrypt.hash(data.password, salt, (err, hash) => {
                    const values = [data.name, data.surnames, data.email, data.dni, hash];
                    req.dbConnectionPool.query(sql, values, (error, results) => {
                        if (error) {
                            console.error(error);
                            return res.status(500).json({ status: "error", msg: "Inserting data error on server" });
                        }
                        let userID = results.insertId;
                        let jwtToken = jwt.sign({ userID }, jwtSecretKey, { expiresIn: '1d' })
                        // res.cookie('token', jwtToken)

                        // Insert default picture to user
                        // req.dbConnectionPool.query('INSERT INTO user_media (user_id, media_id) VALUES (?, ?)', [userID, 1], (err) => {
                        //     if (err) {
                        //         console.error(err)
                        //     }
                        // })

                        // Insert user role to user
                        req.dbConnectionPool.query('INSERT INTO user_role (user_id, role_id) VALUES (?,?)', [userID, data.roleID], (err) => {
                            if (err) {
                                console.error(err)
                            }
                        });

                        req.dbConnectionPool.query('UPDATE app_user SET access_token = ? WHERE id = ?', [jwtToken, userID], (err) => {
                            if (err) {
                                console.error(err)
                            }
                        });

                        sendConfirmationEmail(req.dbConnectionPool, userID).then(json => {
                            return res.status(200).json({ status: "success", msg: json.msg, cookieJWT: jwtToken, insertId: userID });
                        }).catch(jsonError => {
                            return res.status(201).json({ status: "success", msg: jsonError, cookieJWT: jwtToken, insertId: userID });
                        })

                    });
                })
            }
        })
    } catch (error) {
        return res.status(500).send({ status: "error", error: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
})

expressRouter.post('/registerWithQR', decodeBase64Image, async (req, res) => {
    try {
        if (req.imageData && req.imageWidth && req.imageHeight) {
            // Decode the QR code from the binary data
            const qrCodeData = jsQR(req.imageData.pixelData, req.imageWidth, req.imageHeight);

            if (qrCodeData) {
                // Extracted data from the QR code
                const extractedData = JSON.parse(qrCodeData.data);
                const checkSQL = 'SELECT * FROM app_user WHERE user_email = ? OR user_dni = ?'
                const checkValues = [extractedData.user_email, extractedData.user_dni]
                req.dbConnectionPool.query(checkSQL, checkValues, (err, resultss) => {
                    if (err) {
                        return res.status(500).json({ status: "error", message: "Error checking for existing emails" })
                    }
                    if (resultss.length > 0) {
                        return res.status(500).json({ status: "error", message: "Existing email found in DB, use another email!" })
                    } else {
                        const query = 'INSERT INTO app_user (user_name, user_surnames, user_email, user_dni, user_password, user_verified) VALUES (?, ?, ?, ?, ?, ?)';
                        bcrypt.hash(extractedData.user_password, salt, (err, hash) => {
                            const values = [extractedData.user_name, extractedData.user_surnames, extractedData.user_email, extractedData.user_dni, hash, extractedData.user_verified];
                            req.dbConnectionPool.query(query, values, (err, result) => {
                                if (err) {
                                    console.error(err);
                                    return res.status(500).json({ status: "error", msg: "Error on inserting in db" });
                                }
                                if (result) {
                                    let userID = result.insertId;
                                    let jwtToken = jwt.sign({ userID }, jwtSecretKey, { expiresIn: '1d' })

                                    // Insert default picture to user
                                    // req.dbConnectionPool.query('INSERT INTO user_media (user_id, media_id) VALUES (?, ?)', [userID, 1], (err) => {
                                    //     if (err) {
                                    //         console.error(err)
                                    //     }
                                    // })

                                    // Insert user role to user (client by default: 1)
                                    req.dbConnectionPool.query('INSERT INTO user_role (user_id, role_id) VALUES (?,?)', [userID, 1], (err) => {
                                        if (err) {
                                            console.error(err)
                                        }
                                    });

                                    req.dbConnectionPool.query('UPDATE app_user SET access_token = ? WHERE id = ?', [jwtToken, userID], (err) => {
                                        if (err) {
                                            console.error(err)
                                        }
                                    });

                                    sendConfirmationEmail(req.dbConnectionPool, userID).then(json => {
                                        return res.status(200).json({ status: "success", msg: json.msg, cookieJWT: jwtToken, insertId: userID });
                                    }).catch(jsonError => {
                                        return res.status(201).json({ status: "success", msg: jsonError, cookieJWT: jwtToken, insertId: userID });
                                    })

                                } else {
                                    return res.status(500).json({ status: "error", msg: "Error on getting insert in db" });
                                }
                            })
                        });
                    }
                })
            } else {
                res.status(400).json({ message: 'No QR code found in the image' });
            }
        } else {
            res.status(400).json({ message: 'No image found' });
        }
    } catch (error) {
        res.status(500).send({ status: "error", error: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
})

expressRouter.post('/login', (req, res) => {
    try {
        let data = req.body;
        let sql = 'SELECT * FROM app_user WHERE user_email = ? AND isEnabled = 1';
        let values = [data.email];
        req.dbConnectionPool.query(sql, values, (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: "error", msg: "Error on connecting db" });
            }
            if (results.length > 0) {
                bcrypt.compare(data.password, results[0].user_password, (error, response) => {
                    if (error) return res.status(500).json({ status: "error", msg: "Passwords matching error" })
                    if (response) {
                        // Check is verified
                        if (results[0].user_verified === 1) {
                            // Login
                            // Generating jwt manually, but we use our db
                            // const userID = results[0].id;
                            // let jwtToken = jwt.sign({ userID }, jwtSecretKey, { expiresIn: '1d' })

                            if (!results[0].access_token) {
                                // If user hasn't a token, generate jwt token and update the user on db
                                const userID = results[0].id;
                                const jwtToken = jwt.sign({ userID }, jwtSecretKey, { expiresIn: '1d' })
                                req.dbConnectionPool.query('UPDATE app_user SET access_token = ? WHERE id = ?', [jwtToken, userID], (error, result) => {
                                    if (error) {
                                        console.log("Error updating access token to user on login which haven't gone one before.")
                                    }
                                    if (result) {
                                        return res.status(200).send({ status: "success", msg: "", cookieJWT: jwtToken, result: { id: results[0].id, name: results[0].user_name, email: results[0].user_email, dni: results[0].user_dni } });
                                    } else {
                                        console.log("Error updating access token to user on login which haven't gone one before.")
                                    }
                                })
                            } else {
                                // Return the user of db
                                return res.status(200).send({ status: "success", msg: "", cookieJWT: results[0].access_token, result: { id: results[0].id, name: results[0].user_name, email: results[0].user_email, dni: results[0].user_dni } });
                            }
                        } else {
                            return res.status(500).send({ status: "error", msg: "User not verified" });
                        }
                    } else {
                        return res.status(500).send({ status: "error", msg: "Passwords do not match" });
                    }
                })
            } else {
                return res.status(500).send({ status: "error", msg: "User not found" });
            }
        });
    } catch (error) {
        res.status(500).send({ status: "error", error: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
})

expressRouter.post('/loginByToken', (req, res) => {
    try {
        const token = req.body.token;
        let sql = 'SELECT * FROM app_user WHERE access_token = ? AND isEnabled = 1';
        let values = [token];
        req.dbConnectionPool.query(sql, values, (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: "error", msg: "Error on connecting db" });
            }
            if (results.length > 0) {
                // Check is verified
                if (results[0].user_verified === 1) {
                    // Login
                    return res.status(200).send({ status: "success", msg: "", cookieJWT: results[0].access_token, result: { id: results[0].id, name: results[0].user_name, email: results[0].user_email } });
                } else {
                    return res.status(500).send({ status: "error", msg: "User not verified" });
                }
            } else {
                return res.status(500).send({ status: "error", msg: "Token not valid" });
            }
        });
    } catch (error) {
        res.status(500).send({ status: "error", error: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
})

// Edit by recieving cookie in body or authorization (NOT DIRECTLY WITH BROWSER COOKIES) with verifyUser
expressRouter.post('/edituser', verifyUser, (req, res) => {
    try {
        let userID = req.id;
        let data = req.body;
        let sql = 'UPDATE app_user SET user_name = ?, user_surnames = ? WHERE id = ?';
        let values = [data.name, data.surnames, userID];
        req.dbConnectionPool.query(sql, values, (error) => {
            if (error) {
                console.error(error);
                return res.status(500).send({ status: "error", error: 'Internal server error' });;
            }
            return res.status(200).send({ status: "success", msg: 'User updated successfully' });
        });
    } catch (error) {
        res.status(500).send({ status: "error", error: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
})

expressRouter.delete('/user', verifyUser, (req, res) => {
    const userID = req.id;
    deleteBookingByUserID(userID, req.dbConnectionPool)
        .then(() => deletePaymentByUserID(userID, req.dbConnectionPool))
        .then(() => deleteUserRoleByUserID(userID, req.dbConnectionPool))
        .then(() => deleteUserMediaByUserID(userID, req.dbConnectionPool))
        .then(() => deleteUserByUserID(userID, req.dbConnectionPool))
        .then(() => {
            req.dbConnectionPool.release();
            return res.status(200).send({ status: "success", message: `User ${userID} deleted` });
        })
        .catch((error) => {
            console.error(error);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        });
})

// get logged user ID by jwt
expressRouter.post('/getLoggedUserID', verifyUser, (req, res) => {
    return res.status(200).json({ status: "success", msg: "Token valid.", userID: req.id })
})

expressRouter.get('/getUserRole/:id', verifyUser, (req, res) => {
    try {
        req.dbConnectionPool.query('SELECT r.* FROM role r INNER JOIN user_role ur ON ur.role_id = r.id WHERE ur.user_id = ?', [req.params.id], (err, results) => {
            if (err) {
                return res.status(500).json({ status: "error", msg: "Error on connecting db" });
            }
            if (results.length > 0) {
                return res.status(200).send({ status: "success", msg: "User role found", data: results[0] });
            } else {
                return res.status(500).send({ status: "error", msg: "No user role exists with that user id" });
            }
        })
    } catch (error) {
        return res.status(500).send({ status: "error", error: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
})

// get current logged user data without jwt, only by id param
expressRouter.get('/loggedUser/:id', verifyUser, (req, res) => {
    try {
        let userID = req.params.id;
        let sql = 'SELECT id, user_name, user_surnames, user_email, user_dni, isEnabled, user_verified, created_at, updated_at FROM app_user WHERE id = ? AND isEnabled = 1';
        let values = [userID];
        req.dbConnectionPool.query(sql, values, (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: "error", msg: "Error on connecting db" });
            }
            if (results.length > 0) {
                return res.status(200).send({ status: "success", msg: "User found", data: results[0] });
            } else {
                return res.status(500).send({ status: "error", msg: "No user exists with that id" });
            }
        })
    } catch (error) {
        return res.status(500).send({ status: "error", error: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
})

expressRouter.get('/checkUserIsVerified/:id', verifyUser, (req, res) => {
    try {
        req.dbConnectionPool.query('SELECT user_verified FROM app_user WHERE id = ?', [req.params.id], (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: "error", msg: "Error on connecting db" });
            }
            if (results.length > 0) {
                if (results[0].user_verified === 1) {
                    return res.status(200).send({ status: "success", msg: "User verified" });
                } else {
                    return res.status(200).send({ status: "error", msg: "User not verified" });
                }
            } else {
                return res.status(500).send({ status: "error", msg: "No user exists with that id" });
            }
        })
    } catch (error) {
        return res.status(500).send({ status: "error", msg: "Error checking user verified" });
    } finally {
        req.dbConnectionPool.release();
    }
})

expressRouter.post('/uploadUserImg', verifyUser, uploadWithMulterForUserPic.single('image'), (req, res) => {
    const userID = req.id;

    function deleteUserMediaPromise(userID, connection) {
        return new Promise((resolve, reject) => {
            connection.query('SELECT media_id FROM user_media WHERE user_id = ?', [userID], (error, results) => {
                if (error) {
                    reject(error);
                    return;
                }

                // Filter the results to keep only those with media_id not equal to '1'
                // const filteredResults = results.filter(result => result.media_id !== 1);

                if (results.length > 0) {
                    // Create an array of Promises for deletion
                    const deletePromises = results.map(result => {
                        return new Promise((resolveDelete, rejectDelete) => {
                            connection.query('DELETE FROM media WHERE id = ?', [result.media_id], (error) => {
                                if (error) {
                                    rejectDelete(error);
                                } else {
                                    resolveDelete();
                                }
                            });
                        });
                    });

                    // Wait for all delete Promises to resolve
                    Promise.all(deletePromises)
                        .then(() => {
                            connection.commit();
                            resolve()
                        })
                        .catch(error => reject(error));
                } else {
                    // No records to delete
                    resolve();
                }
            });
        });
    }

    // Insert the new media and user_media records.
    function insertMediaAndUserMediaPromise(filename, userID, connection) {
        return new Promise((resolve, reject) => {
            try {
                if (!req.file) {
                    reject('No file found')
                }
                connection.query('INSERT INTO media (type, url) VALUES (?, ?)', ['image', rutaProfilePics + filename], (err, result) => {
                    if (err) {
                        reject(err);
                    }

                    try {
                        const newMediaID = result.insertId;
                        connection.query('INSERT INTO user_media (user_id, media_id) VALUES (?, ?)', [userID, newMediaID], (error) => {
                            if (error) {
                                reject(err);
                            }
                            resolve();
                        });
                    } catch (error) {
                        reject(error);
                    }
                });
            } catch (error) {
                reject(error);
            }
        })
    }

    if (req.file) {
        // Wait for both promises to resolve before sending a response to the client.
        Promise.all([deleteUserMediaPromise(userID, req.dbConnectionPool), insertMediaAndUserMediaPromise(req.file.filename, userID, req.dbConnectionPool)]).then(() => {
            return res.status(200).json({ status: 'success', message: `Image ${req.file.filename} successfully uploaded` });
        })
    } else {
        return res.status(200).json({ status: 'success', message: `Image not changed, not uploaded.` });
    }
});

expressRouter.post('/getUserImgByToken', verifyUser, (req, res) => {
    try {
        let userID = req.id;
        req.dbConnectionPool.query('SELECT url FROM media INNER JOIN user_media ON user_media.media_id = media.id WHERE user_media.user_id = ?', [userID], (err, results) => {
            if (err) {
                return res.status(500).send({ status: "error", error: 'Internal server error' });
            }
            return res.status(200).send({ status: "success", fileURL: results[0] });
        })
    } catch (error) {
        return res.status(500).send({ status: "error", error: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
})

async function sendConfirmationEmail(connection, userId) {
    return new Promise(async (resolve, reject) => {
        // Generate a random confirmation token
        const confirmationToken = generateRandomToken();

        // Set the expiry date to 1 hour from now
        const verificationTokenExpiry = new Date();
        verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 1);

        // Update the user record with the confirmation token and expiry
        await updateUserVerificationData(connection, userId, confirmationToken, verificationTokenExpiry);

        // Form the verification URL
        const verificationUrl = `${process.env.FRONT_URL}/userVerification/${confirmationToken}`;

        getUserById(connection, userId).then(async userRes => {
            // Send the email
            const info = await transporter.sendMail({
                from: "'Hotel Aura de Mallorca 👻' <hotelaurademallorca@hotmail.com>'",
                to: userRes.user_email, // Replace with the actual user's email
                subject: 'Email Confirmation', // Subject line
                html: `<html><body>Click the following link to verify your email: <a href="${verificationUrl}">${verificationUrl}</a></body></html>`, // HTML body
            });

            console.log("Message sent: %s", info.messageId);

            resolve({ status: 'success', msg: 'Email confirmation sent!' });
        }).catch(err => {
            console.error(err);
            reject({ status: 'error', msg: "Email couldn't be sent!" })
        })
    });
}

// Function to generate a random token
function generateRandomToken() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Function to update user verification data
const updateUserVerificationData = (connection, userId, verificationToken, verificationTokenExpiry) => {
    return new Promise((resolve, reject) => {
        try {
            const query = 'UPDATE app_user SET verification_token = ?, verification_token_expiry = ? WHERE id = ?';
            connection.query(query, [verificationToken, verificationTokenExpiry, userId], (error) => {
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

expressRouter.post('/user/verifyEmail/:token', async function (req, res) {
    try {
        const { token } = req.params;
        // Find the user by verification token
        const user = await getUserByVerificationToken(req.dbConnectionPool, token);

        // Check if the user exists and the token hasn't expired
        if (!user || user.verification_token_expiry < new Date()) {
            return res.status(400).json({ status: 'error', message: 'Invalid or expired token.' });
        }

        // Update user verification status
        await updateUserVerificationStatus(req.dbConnectionPool, user.id, true);

        // Clear verification token and expiry
        await clearVerificationToken(req.dbConnectionPool, user.id);

        // let jwtToken = jwt.sign({ userID: user.id }, jwtSecretKey, { expiresIn: '1d' })
        return res.status(200).json({ status: 'success', message: 'Email verified successfully.', jwt: user.access_token });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    } finally {
        req.dbConnectionPool.release();
    }
})

// Utilities for verifying user
// Function to get a user by verification token
const getUserByVerificationToken = (connection, token) => {
    return new Promise((resolve, reject) => {
        try {
            const query = 'SELECT * FROM app_user WHERE verification_token = ?';
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
            const query = 'UPDATE app_user SET user_verified = ? WHERE id = ?';
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
            const query = 'UPDATE app_user SET verification_token = NULL, verification_token_expiry = NULL WHERE id = ?';
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
            const query = 'SELECT * FROM app_user WHERE id = ?';
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
            const query = 'SELECT r.name FROM user_role ur INNER JOIN role r ON r.id = ur.role_id WHERE ur.user_id = ?';
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

expressRouter.get('/usersID', (req, res) => {
    try {
        req.dbConnectionPool.query('SELECT id FROM app_user', (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: "error", msg: "Error on connecting db" });
            }
            return res.status(200).json({ status: "success", msg: "successful", data: results });
        });
    } catch (error) {
        res.status(500).send({ status: "error", error: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
})

// CONTACT FORM
expressRouter.post('/sendContactForm', async (req, res) => {
    try {
        let formData = req.body;
        const info = await transporter.sendMail({
            from: formData.email, // sender address
            to: process.env.MAIL_CONTACT_RECEIVERS, // list of receivers
            subject: formData.subject, // Subject line
            text: formData.message, // plain text body
            html: "<pre>" + formData.message + "</pre>", // html body
        });
        console.log("Message sent: %s", info.messageId);
        return res.status(200).send({ status: "success", msg: "Your message was sent!" });
    } catch (error) {
        return res.status(500).send({ status: "error", msg: "Message couldn't be sent!" });
    } finally {
        req.dbConnectionPool.release();
    }
})

// ROOMS
expressRouter.get('/rooms', (req, res) => {
    try {
        let sql = 'SELECT * FROM room';
        req.dbConnectionPool.query(sql, [], (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: "error", msg: "Error on connecting db" });
            }
            if (results.length > 0) {
                // Results
                // Get medias
                let roomsMedias = [];
                const promises = [];

                for (room of results) {
                    const planMediaQuery = new Promise((resolve, reject) => {
                        const roomID = room.id;
                        req.dbConnectionPool.query('SELECT media_id FROM room_media WHERE room_id = ?', [roomID], (error, results) => {
                            if (error) {
                                reject(error);
                            } else {
                                if (results && results.length > 0) {
                                    req.dbConnectionPool.query('SELECT url FROM media WHERE id = ?', [results[0].media_id], (error, mediaResults) => {
                                        if (error) {
                                            reject(error);
                                        } else {
                                            roomsMedias.push({ roomID: roomID, mediaURL: mediaResults[0].url });
                                            resolve();
                                        }
                                    });
                                } else {
                                    resolve("no rooms media");
                                }
                            }
                        });
                    });
                    promises.push(planMediaQuery);
                }
                Promise.all(promises)
                    .then(() => {
                        const combinedArray = results.map(result => {
                            // Find the corresponding media object based on roomID
                            const mediaObject = roomsMedias.find(media => media.roomID === result.id);

                            // If a matching media object is found, add its properties to the result
                            if (mediaObject) {
                                return {
                                    ...result,
                                    imageURL: mediaObject.mediaURL,
                                };
                            }

                            // If no matching media object is found, return the result as it is
                            return result;
                        });
                        // Return services
                        return res.status(200).send({ status: "success", msg: "Rooms found", data: combinedArray });
                    })
                    .catch(error => {
                        console.error(error);
                        return res.status(500).send({ status: "error", msg: "Error in processing data" });
                    })
            } else {
                return res.status(500).send({ status: "error", msg: "No rooms found" });
            }
        })
    } catch (error) {
        res.status(500).send({ status: "error", error: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
})

expressRouter.get('/room/:id', (req, res) => {
    try {
        let id = req.params.id;
        let sql = 'SELECT * FROM room WHERE id = ?';
        let values = [id]
        req.dbConnectionPool.query(sql, [values], (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: "error", msg: "Error on querying db" });
            }
            if (results.length > 0) {
                return res.status(200).send({ status: "success", msg: "Rooms found", data: results });
            } else {
                return res.status(500).send({ status: "error", msg: "No rooms found" });
            }
        });
    } catch (error) {
        res.status(500).send({ status: "error", error: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
})

expressRouter.get('/roomsID', (req, res) => {
    try {
        req.dbConnectionPool.query('SELECT id FROM room', (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: "error", msg: "Error on connecting db" });
            }
            return res.status(200).json({ status: "success", msg: "successful", data: results });
        });
    } catch (error) {
        res.status(500).send({ status: "error", error: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
})

// PLANS
expressRouter.get('/plans', (req, res) => {
    try {
        let sql = 'SELECT * FROM plan';
        req.dbConnectionPool.query(sql, [], (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: "error", msg: "Error on connecting db" });
            }
            if (results.length > 0) {
                // Results
                // Get medias
                let plansMedias = [];
                const promises = [];

                for (plan of results) {
                    const planMediaQuery = new Promise((resolve, reject) => {
                        const planID = plan.id;
                        req.dbConnectionPool.query('SELECT media_id FROM plan_media WHERE plan_id = ?', [planID], (error, results) => {
                            if (error) {
                                reject(error);
                            } else {
                                if (results && results.length > 0) {
                                    req.dbConnectionPool.query('SELECT url FROM media WHERE id = ?', [results[0].media_id], (error, mediaResults) => {
                                        if (error) {
                                            reject(error);
                                        } else {
                                            plansMedias.push({ planID: planID, mediaURL: mediaResults[0].url });
                                            resolve();
                                        }
                                    });
                                } else {
                                    resolve("no plans media");
                                }
                            }
                        });
                    });
                    promises.push(planMediaQuery);
                }
                Promise.all(promises)
                    .then(() => {
                        const combinedArray = results.map(result => {
                            // Find the corresponding media object based on planID
                            const mediaObject = plansMedias.find(media => media.planID === result.id);

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
                        return res.status(200).send({ status: "success", msg: "Plans found", data: combinedArray });
                    })
                    .catch(error => {
                        console.error(error);
                        return res.status(500).send({ status: "error", msg: "Error in processing data" });
                    })
            } else {
                return res.status(500).send({ status: "error", msg: "No plans found" });
            }
        })
    } catch (error) {
        res.status(500).send({ status: "error", error: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
})

expressRouter.get('/plansID', (req, res) => {
    try {
        req.dbConnectionPool.query('SELECT id FROM plan', (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: "error", msg: "Error on connecting db" });
            }
            return res.status(200).json({ status: "success", msg: "successful", data: results });
        });
    } catch (error) {
        res.status(500).send({ status: "error", error: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
})

// SERVICES
expressRouter.get('/services', (req, res) => {
    try {
        let sql = 'SELECT * FROM service';
        req.dbConnectionPool.query(sql, [], (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: "error", msg: "Error on connecting db" });
            }
            if (results.length > 0) {
                // Results
                // Get medias
                let servicesMedias = [];
                const promises = [];

                for (service of results) {
                    const serviceMediaQuery = new Promise((resolve, reject) => {
                        const serviceID = service.id;
                        req.dbConnectionPool.query('SELECT media_id FROM service_media WHERE service_id = ?', [serviceID], (error, results) => {
                            if (error) {
                                reject(error);
                            } else {
                                if (results && results.length > 0) {
                                    req.dbConnectionPool.query('SELECT url FROM media WHERE id = ?', [results[0].media_id], (error, mediaResults) => {
                                        if (error) {
                                            reject(error);
                                        } else {
                                            servicesMedias.push({ serviceID: serviceID, mediaURL: mediaResults[0].url });
                                            resolve();
                                        }
                                    });
                                } else {
                                    resolve("no services media");
                                }
                            }
                        });
                    });
                    promises.push(serviceMediaQuery);
                }
                Promise.all(promises)
                    .then(() => {
                        const combinedArray = results.map(result => {
                            // Find the corresponding media object based on serviceID
                            const mediaObject = servicesMedias.find(media => media.serviceID === result.id);

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
                        return res.status(200).send({ status: "success", msg: "Services found", data: combinedArray });
                    })
                    .catch(error => {
                        console.error(error);
                        return res.status(500).send({ status: "error", msg: "Error in processing data" });
                    })
            } else {
                return res.status(500).send({ status: "error", msg: "No services found" });
            }
        })
    } catch (error) {
        return res.status(500).send({ status: "error", error: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
})

expressRouter.get('/service/:id', (req, res) => {
    try {
        let id = req.params.id;
        let sql = 'SELECT * FROM service  WHERE id = ?';
        let values = [id]
        req.dbConnectionPool.query(sql, [values], (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: "error", msg: "Error on querying db" });
            }
            if (results.length > 0) {
                return res.status(200).send({ status: "success", msg: "Services found", data: results });
            } else {
                return res.status(500).send({ status: "error", msg: "No services found" });
            }
        });
    } catch (error) {
        return res.status(500).send({ status: "error", error: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
})

expressRouter.post('/servicesImages', (req, res) => {
    try {
        const services = req.body.services;
        let servicesMedias = [];
        const promises = [];

        for (service of services) {
            const serviceMediaQuery = new Promise((resolve, reject) => {
                const serviceID = service.id;
                req.dbConnectionPool.query('SELECT media_id FROM service_media WHERE service_id = ?', [serviceID], (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        if (results && results.length > 0) {
                            req.dbConnectionPool.query('SELECT url FROM media WHERE id = ?', [results[0].media_id], (error, mediaResults) => {
                                if (error) {
                                    reject(error);
                                } else {
                                    servicesMedias.push({ serviceID: serviceID, mediaURL: mediaResults[0].url });
                                    resolve();
                                }
                            });
                        } else {
                            resolve("no services media");
                        }
                    }
                });
            });
            promises.push(serviceMediaQuery);
        }
        Promise.all(promises)
            .then(() => {
                return res.status(200).send({ status: "success", msg: "Services medias found", data: servicesMedias });
            })
            .catch(error => {
                console.error(error);
                return res.status(500).send({ status: "error", msg: "Error in processing data" });
            })
            .finally(() => {
                //
            });
    } catch (error) {
        return res.status(500).send({ status: "error", error: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
})

// PAYMENT METHODS
expressRouter.get('/paymentmethods', (req, res) => {
    try {
        let sql = 'SELECT * FROM payment_method'
        req.dbConnectionPool.query(sql, [], (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: "error", msg: "Error on connecting db" });
            }
            if (results.length > 0) {
                return res.status(200).send({ status: "success", msg: "Payment methods found", data: results });
            } else {
                return res.status(500).send({ status: "error", msg: "No payment methods found" });
            }
        })
    } catch (error) {
        return res.status(500).send({ status: "error", error: "Internal server error" });
    } finally {
        req.dbConnectionPool.release();
    }
})

expressRouter.post('/checkBookingAvailability', (req, res) => {
    try {
        const { start_date, end_date } = req.body;
        // Añadimos un dia por la diferencia de timezone al recibir los datos y la base de datos
        const startDateAsDate = new Date(start_date)
        startDateAsDate.setDate(startDateAsDate.getDate() + 1)
        const endDateAsDate = new Date(end_date)
        endDateAsDate.setDate(endDateAsDate.getDate() + 1)
        const startDate = startDateAsDate.toISOString().slice(0, 11).replace('T', ' ')
        const endDate = endDateAsDate.toISOString().slice(0, 11).replace('T', ' ')
        const sql = `SELECT r.id, r.room_availability_start, r.room_availability_end, b.booking_start_date, b.booking_end_date 
                    FROM room r
                    INNER JOIN booking b ON r.id = b.room_id
                    WHERE b.is_cancelled = 0
                    AND (
                        (b.booking_start_date BETWEEN ? AND ?) OR
                        (b.booking_end_date BETWEEN ? AND ?)
                    )
                    `;

        req.dbConnectionPool.query(sql, [startDate, endDate, startDate, endDate], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ status: "error", msg: "Error on connecting db" });
            }

            if (results && results.length > 0) {
                // Esto significa que está ocupada, sino estará a null
                if (results[0].booking_start_date) {
                    // Buscar fechas disponibles
                    const roomAvailabilityStart = new Date(results[0].room_availability_start);
                    const roomAvailabilityEnd = new Date(results[0].room_availability_end);

                    const availableDates = [];
                    const today = new Date();

                    for (let currentDate = roomAvailabilityStart; currentDate <= roomAvailabilityEnd; currentDate.setDate(currentDate.getDate() + 1)) {
                        let isDateOccupied = false; // buscando si esta ocupado en las fechas disponibles del room con las del book ya reservado

                        for (const row of results) {
                            const bookingStartDate = new Date(row.booking_start_date);
                            const bookingEndDate = new Date(row.booking_end_date);
                            if (currentDate >= bookingStartDate && currentDate <= bookingEndDate) {
                                isDateOccupied = true;
                                break; // No need to check further, the date is occupied
                            }
                        }

                        if (!isDateOccupied && currentDate >= today && currentDate.toISOString().slice(0, 11).replace('T', ' ') >= startDate) {
                            availableDates.push(currentDate.toISOString().split('T')[0]);
                        }
                    }

                    if (availableDates.length === 0) {
                        return res.status(200).json({
                            status: "success",
                            isAvailable: false,
                            msg: "No rooms available, they're occupied."
                        });
                    } else {
                        // return res.status(200).json({
                        //     status: "success",
                        //     msg: "OK, rooms occupied but with available dates.",
                        //     isAvailable: false,
                        //     available: availableDates
                        // });
                        return res.status(200).json({
                            status: "success",
                            isAvailable: false,
                            msg: "No rooms available for these dates, they're occupied."
                        });
                    }
                } else {
                    return res.status(200).send({ status: "success", msg: 'OK, no rooms occupied.', isAvailable: true });
                }
            } else {
                return res.status(200).send({ status: "success", msg: 'OK, no rooms occupied.', isAvailable: true });
            }
        });
    } catch (error) {
        return res.status(500).send({ status: "error", error: "Internal server error", errorMsg: error });
    } finally {
        req.dbConnectionPool.release();
    }
})

// BOOKING
expressRouter.delete('/booking/:bookingID', verifyUser, (req, res) => {
    try {
        // Delete booking, only for admins
        const bookingId = req.params.bookingID;

        req.dbConnectionPool.beginTransaction(async (err) => {
            if (err) {
                req.dbConnectionPool.rollback();
                return res.status(500).send({ status: "error", error: "Internal server error" });
            }
            req.dbConnectionPool.query('DELETE FROM booking WHERE id = ?', [bookingId], (err) => {
                if (err) {
                    req.dbConnectionPool.rollback();
                    return res.status(500).send({ status: "error", error: "Internal server error" });
                }

                req.dbConnectionPool.commit((err) => {
                    if (err) {
                        req.dbConnectionPool.rollback();
                    }
                    return res.status(200).send({ status: "success", msg: "Successfully deleted!" });
                });
            })
        });
    } catch (error) {
        return res.status(500).send({ status: "error", error: "Internal server error", errorMsg: error });
    } finally {
        req.dbConnectionPool.release();
    }
})

expressRouter.put('/booking', verifyUser, (req, res) => {
    try {
        // Update booking (only for admins)
        const userID = req.id;
        const booking = req.body;

        getUserRoleById(req.dbConnectionPool, userID).then(userRole => {
            if (userRole && (userRole.name == "ADMIN" || userRole.name == "EMPLOYEE")) {
                req.dbConnectionPool.beginTransaction(async (err) => {
                    if (err) {
                        req.dbConnectionPool.rollback();
                        return res.status(500).send({ status: "error", error: "Internal server error" });
                    }
                    req.dbConnectionPool.query('UPDATE booking SET user_id = ?, plan_id = ?, room_id = ?, booking_start_date = ?, booking_end_date = ? WHERE id = ?', [booking.userID, booking.planID, booking.roomID, booking.startDate, booking.endDate, booking.id], (err) => {
                        if (err) {
                            req.dbConnectionPool.rollback();
                            return res.status(500).send({ status: "error", error: "Internal server error" });
                        }

                        req.dbConnectionPool.commit((err) => {
                            if (err) {
                                req.dbConnectionPool.rollback();
                            }
                            return res.status(200).send({ status: "success", msg: "Successfully updated!" });
                        });
                    })
                });
            }
        }).catch(err => {
            return res.status(500).send({ status: "error", error: "Internal server error: " + err });
        });
    } catch (error) {
        return res.status(500).send({ status: "error", error: "Internal server error", errorMsg: error });
    } finally {
        req.dbConnectionPool.release();
    }
})

expressRouter.put('/cancelBookingByUser', verifyUser, (req, res) => {
    try {
        const bookingID = req.body.bookingID;

        req.dbConnectionPool.query("SELECT cancellation_deadline FROM booking WHERE id =  ?", [bookingID], (err, results) => {
            if (err) {
                return res.status(500).send({ status: "error", error: "Internal server error" });
            }
            if (results) {
                const deadline = new Date(results[0].cancellation_deadline)
                const currentDate = new Date();
                // Compare dates
                if (deadline < currentDate) {
                    return res.status(500).send({
                        status: 'error',
                        error: 'Deadline to cancel this booking is over',
                    });
                }

                req.dbConnectionPool.beginTransaction(async (err) => {
                    if (err) {
                        req.dbConnectionPool.rollback();
                        return res.status(500).send({ status: "error", error: "Internal server error" });
                    }
                    req.dbConnectionPool.query('UPDATE booking SET is_cancelled = true WHERE id = ?', [bookingID], (err) => {
                        if (err) {
                            req.dbConnectionPool.rollback();
                            return res.status(500).send({ status: "error", error: "Internal server error" });
                        }

                        req.dbConnectionPool.commit((err) => {
                            if (err) {
                                req.dbConnectionPool.rollback();
                            }
                            return res.status(200).send({ status: "success", msg: "Successfully updated!" });
                        });
                    })
                });
            } else {
                return res.status(500).send({ status: "error", error: "Internal server error" });
            }
        })

    } catch (error) {
        return res.status(500).send({ status: "error", error: "Internal server error", errorMsg: error });
    } finally {
        req.dbConnectionPool.release();
    }
})

expressRouter.post('/duplicateBooking', verifyUser, (req, res) => {
    const booking = req.body;
    const startDateAsDate = new Date(booking.startDate)
    startDateAsDate.setDate(startDateAsDate.getDate() + 1)
    const endDateAsDate = new Date(booking.endDate)
    endDateAsDate.setDate(endDateAsDate.getDate() + 1)
    const startDate = startDateAsDate.toISOString().slice(0, 11).replace('T', ' ')
    const endDate = endDateAsDate.toISOString().slice(0, 11).replace('T', ' ')

    req.dbConnectionPool.query('SELECT is_cancelled FROM booking WHERE id = ?', [booking.id], (err, results) => {
        if (err) {
            return res.status(500).send({ status: "error", error: "Internal server error" });
        }

        if (results[0].is_cancelled === 0) {
            return res.status(400).send({ status: "error", error: "This booking is active" });
        }

        req.dbConnectionPool.beginTransaction((err) => {
            if (err) {
                req.dbConnectionPool.rollback();
                return res.status(500).send({ status: "error", error: "Internal server error" });
            }
            const sql = "UPDATE booking SET booking_start_date = ?, booking_end_date = ?, cancellation_deadline = DATE_ADD(CURDATE(), INTERVAL 1 DAY),is_cancelled = 0 WHERE id = ?";
            req.dbConnectionPool.query(sql, [startDate, endDate, booking.id], (err) => {
                if (err) {
                    req.dbConnectionPool.rollback();
                    return res.status(500).send({ status: "error", error: "Internal server error: " + err });
                }
                req.dbConnectionPool.commit();
                return res.status(200).send({ status: "200", msg: "Successfully updated!" });
            })
        })
    })
})

expressRouter.post('/createBooking', async (req, res) => {
    try {
        const data = req.body;
        const { booking, selectedServicesIDs, guests } = data;
        // Filtrar services por los que estan a true solo
        const servicesIDs = Object.keys(selectedServicesIDs).filter((key) => selectedServicesIDs[key]).map(Number);

        // Create or select guests
        const guestIds = await createOrSelectGuests(guests, req.dbConnectionPool);

        // Create a booking
        const bookingId = await createBooking(booking, guestIds, servicesIDs, req.dbConnectionPool);

        if (bookingId) {
            await addBookingCountToUser(booking.userID, req.dbConnectionPool);
        }

        return res.status(200).send({ status: "success", insertId: bookingId });
    } catch (error) {
        return res.status(500).send({ status: "error", error: `Internal server error: ${error}` });
    } finally {
        req.dbConnectionPool.release();
    }
});

// Counter of bookings of user
async function addBookingCountToUser(userID, connectionPool) {
    try {
        const query = 'INSERT INTO user_booking_count (user_id, booking_count) VALUES (?, 1) ON DUPLICATE KEY UPDATE booking_count = booking_count + 1';
        const values = [userID];
        await connectionPool.query(query, values);
    } catch (error) {
        throw error;
    }
}

// Check user present: if user has 5 bookings, present the user with a unique promo associated with him
expressRouter.post('/userPresentCheck', verifyUser, (req, res) => {
    let userID = req.body.userID;
    try {
        // Get the count of bookings for the user
        req.dbConnectionPool.query('SELECT COUNT(*) as count FROM booking WHERE user_id = ?', [userID], async (error, results) => {
            if (error) {
                return res.status(500).json({ status: "Internal Server Error" })
            }
            const bookingCount = results[0].count;

            // Update the booking count in user_booking_count table
            await req.dbConnectionPool.query(
                'INSERT INTO user_booking_count (user_id, booking_count) VALUES (?, ?) ON DUPLICATE KEY UPDATE booking_count = ?',
                [userID, bookingCount, bookingCount]
            );

            // Check if the booking count is 5 (logic of generate promotion for user)
            if (bookingCount === 5) {
                req.dbConnectionPool.query('SELECT COUNT(*) as count FROM user_promotion WHERE user_id = ? AND isUsed = 0', [userID], (error, results) => {
                    if (error) {
                        return res.status(500).json({ status: "error", msg: 'Internal server error: ' + error });
                    }
                    if (results && results[0].count > 0) {
                        return res.status(401).json({ status: "error", msg: 'User already has a unique promo code associated' });
                    } else {
                        // Generate a new promotion
                        const promoCode = generateUniquePromoCode();
                        const discountPrice = 50; // 50% discount
                        const promoName = "Unique 50% discount promotion only for you!"
                        const promoDescription = "This 50% discount is only for you and it's valid only from today to 7 days from now!"
                        const startDate = new Date(); // Current date
                        const endDate = new Date();
                        endDate.setDate(endDate.getDate() + 7); // 7 days from today

                        // Insert the new promotion into the promotion table
                        req.dbConnectionPool.query(
                            'INSERT INTO promotion (code, discount_price, name, description, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
                            [promoCode, discountPrice, promoName, promoDescription, startDate, endDate],
                            (error, result) => {
                                if (error) {
                                    return res.status(500).json({ status: "Internal Server Error" })
                                }
                                const promotionId = result.insertId;

                                // Link the generated promo to the user in the user_promotion table
                                req.dbConnectionPool.query(
                                    'INSERT INTO user_promotion (user_id, promotion_id) VALUES (?, ?)',
                                    [userID, promotionId],
                                    (error) => {
                                        if (error) {
                                            return res.status(500).json({ status: "Internal Server Error: " + error })
                                        }
                                        return res.status(200).json({
                                            status: 'success',
                                            msg: 'Booking count updated successfully',
                                            promotion: {
                                                promoCode,
                                                discountPrice,
                                                promoName,
                                                promoDescription,
                                                startDate,
                                                endDate,
                                                promotionId
                                            }
                                        });
                                    }
                                );

                            }
                        );
                    }
                })
            } else {
                return res.status(200).json({
                    status: 'success',
                    msg: 'Booking count updated successfully'
                });
            }
        })

    } catch (error) {
        return res.status(500).json({ status: "error", msg: 'Internal server error: ' + error });
    }
})

// Check user punishment: if user has a 2 or more cancelled bookings, punish the user disabling the account
expressRouter.post('/userPunishmentCheck', (req, res) => {
    let userID = req.body.userID;
    try {
        req.dbConnectionPool.beginTransaction((err) => {
            if (err) {
                req.dbConnectionPool.rollback();
                return res.status(500).json({ status: "error", msg: 'Internal server error: ' + error });
            }

            req.dbConnectionPool.query('SELECT COUNT(*) as count FROM booking WHERE user_id = ? AND is_cancelled = 1', [userID], (error, results) => {
                if (error) {
                    req.dbConnectionPool.rollback();
                    return res.status(500).json({ status: "Internal Server Error" })
                }
                const bookingCount = results[0].count;

                // Punishment to the user if the case
                if (bookingCount >= 2) {
                    req.dbConnectionPool.query('SELECT enabledByAdmin FROM app_user WHERE id = ?', [userID], (err, results) => {
                        if (err) {
                            req.dbConnectionPool.rollback();
                            return res.status(500).json({ status: "Internal Server Error" })
                        }

                        const enabledByAdmin = results[0].enabledByAdmin;
                        if (!enabledByAdmin) {
                            req.dbConnectionPool.query(
                                'UPDATE app_user SET isEnabled = 0 WHERE id = ?',
                                [userID],
                                async (err) => {
                                    if (err) {
                                        await req.dbConnectionPool.rollback();
                                        return res.status(500).json({ status: "Internal Server Error" })
                                    }

                                    await req.dbConnectionPool.commit();

                                    return res.status(200).json({
                                        status: 'success',
                                        msg: 'User punishment checked successfully and user was disabled',
                                        disabled: true,
                                    });
                                }
                            );
                        } else {
                            return res.status(200).json({
                                status: 'success',
                                msg: 'User punishment checked successfully, but not punished due to it was reactivated by admin'
                            });
                        }
                    });
                } else {
                    return res.status(200).json({
                        status: 'success',
                        msg: 'User punishment checked successfully'
                    });
                }
            })
        })
    }
    catch (error) {
        return res.status(500).json({ status: "error", msg: 'Internal server error: ' + error });
    }
})

function generateUniquePromoCode() {
    const prefix = 'PROMO';
    const randomComponent = Math.random().toString(36).substring(2, 8).toUpperCase();
    const suffix = new Date().getTime().toString(36).toUpperCase();

    return `${prefix}-${randomComponent}-${suffix}`;
}

// Booking functions
async function createOrSelectGuests(guests, connection) {
    try {
        const existingGuests = guests.filter(guest => guest.id !== null);
        const existingGuestIds = existingGuests.map(guest => guest.id);

        const [guestIdMap, guestsToInsert] = await Promise.all([
            selectGuestIds(existingGuestIds, connection),
            insertGuests(guests.filter(guest => guest.id === null), connection)
        ]);

        // Use a Set to ensure unique values
        const guestIdSet = new Set(existingGuests.map(guest => guest.id).concat(guestIdMap).concat(guestsToInsert));

        // Convert the Set back to an array
        const uniqueGuestIds = Array.from(guestIdSet);

        return uniqueGuestIds;
    } catch (error) {
        throw error; // Optionally, rethrow the error for further handling
    }
}

function selectGuestIds(existingGuestIds, connection) {
    return new Promise((resolve, reject) => {
        try {
            if (existingGuestIds.length === 0) {
                resolve([]);
                return;
            }
            const query = 'SELECT id FROM guest WHERE id IN (?)';
            connection.query(query, [existingGuestIds], (err, results) => {
                if (err) {
                    reject("Error selecting guests");
                } else {
                    resolve(results.map(result => result.id));
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
            if (guestsToInsert.length === 0) {
                resolve([]);
                return;
            }

            const values = guestsToInsert.map(guest => [guest.id, guest.name, guest.surnames, guest.email, guest.isAdult, guest.isSystemUser]);
            const query = 'INSERT INTO guest (id, guest_name, guest_surnames, guest_email, isAdult, isSystemUser) VALUES ?';
            connection.query(query, [values], (err, result) => {
                if (err) {
                    reject("Error creating guests");
                } else {
                    const insertedIds = Array(guestsToInsert.length).fill(result.insertId);
                    resolve(insertedIds);
                }
            });
        } catch (error) {
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
    });
}

async function createBooking(booking, guestIds, servicesIDs, connection) {
    return new Promise((resolve, reject) => {
        try {
            const startDate = moment(booking.startDate).format(dateFormat);
            const endDate = moment(booking.endDate).format(dateFormat);
            const query = 'INSERT INTO booking (user_id, plan_id, room_id, booking_start_date, booking_end_date) VALUES (?, ?, ?, ?, ?)';
            const values = [booking.userID, booking.planID, booking.roomID, startDate, endDate];
            connection.beginTransaction(async (err) => {
                if (err) {
                    connection.rollback(() => reject("Transaction start error"));
                    return;
                }

                connection.query(query, values, async (err, result) => {
                    if (err) {
                        connection.rollback(() => reject(`Error creating booking: ${err}`));
                        return;
                    }

                    const bookingId = result.insertId;

                    await insertBookingServices(connection, bookingId, servicesIDs);
                    await insertBookingGuests(connection, bookingId, guestIds);

                    connection.commit((err) => {
                        if (err) {
                            connection.rollback(() => reject("Transaction commit error"));
                        }
                        resolve(bookingId);
                    });
                });
            });
        } catch (error) {
            reject(error);
        }
    });
}

function insertBookingServices(connection, bookingId, servicesIDs) {
    try {
        const query = 'INSERT INTO booking_service (booking_id, service_id) VALUES ?';
        const values = servicesIDs.map(serviceID => [bookingId, serviceID]);
        return connection.query(query, [values]);
    } catch (error) {
        // Handle the error or log it
        console.error('Error in insertBookingServices:', error);
        throw error; // Optionally, rethrow the error for further handling
    }
}

function insertBookingGuests(connection, bookingId, guestIds) {
    try {
        if (guestIds.length === 0) {
            return;
        }
        const query = 'INSERT INTO booking_guest (booking_id, guest_id) VALUES ?';
        const values = guestIds.map(guestId => [bookingId, guestId]);
        return connection.query(query, [values]);
    } catch (error) {
        // Handle the error or log it
        console.error('Error in insertBookingGuests:', error);
        throw error; // Optionally, rethrow the error for further handling
    }
}

expressRouter.get('/bookings', verifyUser, (req, res) => {
    try {
        req.dbConnectionPool.query('SELECT * FROM booking', (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send({ status: "error", error: 'Internal server error' });;
            }
            return res.status(200).send({ status: "success", msg: "successful", data: results });
        })
    } catch (error) {
        return res.status(500).send({ status: "error", error: 'Internal server error' });
    }
})

expressRouter.get('/bookingsByUser', verifyUser, (req, res) => {
    try {
        // AND is_cancelled = 0
        req.dbConnectionPool.query('SELECT * FROM booking WHERE user_id = ?', [req.id], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send({ status: "error", error: 'Internal server error' });;
            }
            return res.status(200).send({ status: "success", msg: "successful", data: results });
        })
    } catch (error) {
        return res.status(500).send({ status: "error", error: 'Internal server error' });
    } finally {
        req.dbConnectionPool.release();
    }
})

// PAYMENT
expressRouter.post('/payment', (req, res) => {
    try {
        const data = req.body;
        let sql = 'INSERT INTO payment (user_id, booking_id, payment_amount, payment_date, payment_method_id) VALUES (?, ?, ?, ?, ?)';
        // Create a Date object from the original string
        const dateObject = new Date(data.date);
        // Format the date as 'YYYY-MM-DD'
        const formattedDate = dateObject.toISOString().split('T')[0];
        let values = [data.userID, data.bookingID, data.amount, formattedDate, data.paymentMethodID];
        req.dbConnectionPool.query(sql, values, (error, result) => {
            if (error) {
                console.error(error);
                return res.status(500).send({ status: "error", error: 'Internal server error' });;
            }
            return res.status(200).send({ status: "success", insertId: result.insertId });
        });
    } catch (error) {
        return res.status(500).send({ status: "error", error: 'Internal server error' });
    } finally {
        req.dbConnectionPool.release();
    }
})

expressRouter.post('/paymentTransaction', (req, res) => {
    try {
        const data = req.body;
        req.dbConnectionPool.query('INSERT INTO payment_transaction (payment_id, transaction_id) VALUES (?, ?)', [data.payment_id, data.transaction_id], (error, result) => {
            if (error) {
                return res.status(500).send({ status: "error", error: 'Internal server error' });
            }
            return res.status(200).send({ status: "success", insertId: result.insertId });
        })
    } catch (error) {
        return res.status(500).send({ status: "error", error: 'Internal server error' });
    } finally {
        req.dbConnectionPool.release();
    }
})

// Stripe
expressRouter.post('/purchase', async (req, res) => {
    try {
        const { data } = req.body;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: data.amount,
            currency: data.currency,
            description: 'Hotel booking',
            payment_method_types: ['card'],
        })

        const { client_secret } = paymentIntent

        return res.status(200).json({ status: "success", msg: 'stripe', client_secret: client_secret })
    } catch (error) {
        return res.status(200).json({ status: "error", msg: 'stripe', error: error, client_secret: null })
    } finally {
        req.dbConnectionPool.release();
    }
})
expressRouter.post('/cancel-payment', async (req, res) => {
    try {
        const { client_secret } = req.body;

        // Retrieve the Payment Intent using the client_secret
        const paymentIntent = await stripe.paymentIntents.retrieve(null, { client_secret });

        // Cancel the Payment Intent
        const canceledPaymentIntent = await stripe.paymentIntents.cancel(paymentIntent.id);

        return res.status(200).json({ status: "success", msg: 'Payment Intent canceled', canceledPaymentIntent });
    } catch (error) {
        return res.status(200).json({ status: "error", msg: 'Error canceling Payment Intent', error });
    } finally {
        req.dbConnectionPool.release();
    }
});

// DELETES FUNCTIONS
// By user ID
function deleteUserByUserID(userID, connection) {
    return new Promise((resolve, reject) => {
        try {
            const sql = 'DELETE FROM app_user WHERE id = ?';
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
            const sql = 'DELETE FROM booking WHERE user_id = ?';
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
            const sql = 'DELETE FROM payment WHERE user_id = ?';
            const values = [userID];

            connection.query(sql, values, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        } catch (error) {
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
    });
}

function deleteUserRoleByUserID(userID, connection) {
    return new Promise((resolve, reject) => {
        try {
            const sql = 'DELETE FROM user_role WHERE user_id = ?';
            const values = [userID];


            connection.query(sql, values, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        } catch (error) {
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
    });
}

function deleteUserMediaByUserID(userID, connection) {
    return new Promise((resolve, reject) => {
        try {
            const sql = 'DELETE FROM user_media WHERE user_id = ?';
            const values = [userID];

            connection.query(sql, values, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        } catch (error) {
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
    });
}

// Google ReCAPTCHA
// Verify site
expressRouter.post('/captchaSiteVerify', async (req, res) => {
    try {
        const { secret, response } = req.body;
        const reCaptchaURLEndpoint = 'https://www.google.com/recaptcha/api/siteverify';
        const verificationResponse = await axios.post(
            reCaptchaURLEndpoint,
            null,
            {
                params: {
                    secret,
                    response,
                },
            }
        );

        if (verificationResponse.data.success) {
            // reCAPTCHA verification successful
            res.status(200).json({ success: true });
        } else {
            // reCAPTCHA verification failed
            res.status(400).json({ success: false });
        }
    } catch (error) {
        console.error("reCAPTCHA verification error:", error);
        res.status(500).json({ success: false });
    } finally {
        req.dbConnectionPool.release();
    }
})

// WEATHER
// Insert weather
expressRouter.post('/insert-weather', async (req, res) => {
    try {
        const weatherData = req.body.list;

        // Extract unique dates from the weather data
        const uniqueDates = Array.from(new Set(weatherData.map(data => data.dt_txt.split(' ')[0])));

        // Initialize remainingQueries counter
        let remainingQueries = uniqueDates.length;
        let existingDataIsFound = false;

        // Start a transaction
        req.dbConnectionPool.beginTransaction((err) => {
            if (err) {
                return res.status(500).json({ status: 'error', 'message': err.message });
            }
        });

        // Iterate through weather data and insert into the database
        for (const date of uniqueDates) {
            const rainOccurrence = weatherData.find(data => {
                const dataDate = data.dt_txt.split(' ')[0];
                return dataDate === date && data.weather[0].main === 'Rain';
            });

            if (rainOccurrence) {
                // Get date from the ocurrence
                const parsedDate = new Date(rainOccurrence.dt_txt);
                // Set correct hours due to tz difference
                parsedDate.setHours(parsedDate.getHours() + 1)
                if (parsedDate.toISOString().split('T')[1].split(':')[0] != 0) {
                    // Check if hour is different from 00 midnight
                    parsedDate.setHours(1); // 1 because of timezone that does -1h
                    parsedDate.setMinutes(0);
                    parsedDate.setSeconds(0);
                }
                const state = rainOccurrence.weather[0].main;

                // Check if the date doesn't exist in the database before inserting
                const existingData = await new Promise((resolve, reject) => {
                    req.dbConnectionPool.query('SELECT * FROM weather WHERE weather_date = ?', [parsedDate], (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    });
                });

                if (existingData.length === 0) {
                    await new Promise((resolve, reject) => {
                        req.dbConnectionPool.query('INSERT INTO weather (weather_date, weather_state) VALUES (?, ?)', [parsedDate, state], (error) => {
                            if (error) {
                                remainingQueries--;
                                reject(error);
                            } else {
                                remainingQueries--;
                                resolve();
                            }
                        });
                    });
                } else {
                    for (data in existingData) {
                        await new Promise((resolve, reject) => {
                            req.dbConnectionPool.query('UPDATE weather SET weather_state = ? WHERE id = ?', ['Rain', data.id], (error) => {
                                if (error) {
                                    remainingQueries--;
                                    reject(error);
                                } else {
                                    remainingQueries--;
                                    resolve();
                                }
                            });
                        });
                    }
                }
            } else {
                // Handle cases where no 'RAIN' occurrence for the day
                const firstOccurrence = weatherData.find(data => {
                    const dataDate = data.dt_txt.split(' ')[0];
                    return dataDate === date;
                });

                if (firstOccurrence) {
                    const parsedDate = new Date(firstOccurrence.dt_txt);
                    // Set correct hours due to tz difference
                    parsedDate.setHours(parsedDate.getHours() + 1)
                    if (parsedDate.toISOString().split('T')[1].split(':')[0] != 0) {
                        // Check if hour is different from 00 midnight
                        parsedDate.setHours(1); // 1 because of timezone that does -1h
                        parsedDate.setMinutes(0);
                        parsedDate.setSeconds(0);
                    }
                    const state = firstOccurrence.weather[0].main;

                    try {
                        // Check if the date doesn't exist in the database before inserting
                        const existingData = await new Promise((resolve, reject) => {
                            req.dbConnectionPool.query('SELECT * FROM weather WHERE weather_date = ?', [parsedDate], (error, result) => {
                                if (error) {
                                    reject(error);
                                } else {
                                    resolve(result);
                                }
                            });
                        });

                        if (existingData.length === 0) {
                            await new Promise((resolve, reject) => {
                                req.dbConnectionPool.query('INSERT INTO weather (weather_date, weather_state) VALUES (?, ?)', [parsedDate, state], (error) => {
                                    if (error) {
                                        remainingQueries--;
                                        reject(error);
                                    } else {
                                        remainingQueries--;
                                        resolve();
                                    }
                                });
                            });
                        } else {
                            remainingQueries--;
                            existingDataIsFound = true;
                        }
                    } catch (error) {
                        remainingQueries--;
                        if (remainingQueries === 0) {
                            return res.status(500).send({ status: "error", error: 'Internal server error' });
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
                                reject({ status: "error", error: 'Internal server error' });
                            });
                        } else {
                            resolve();
                        }
                    });
                });
                if (!existingDataIsFound) {
                    return res.status(200).send({ status: "success", message: 'Weather data inserted successfully' });
                } else {
                    return res.status(200).send({ status: "success", message: 'Weather data inserted successfully with existing weather data days found.' });
                }
            }
        }
    } catch (error) {
        return res.status(500).send({ status: "error", message: "Internal server error" })
    } finally {
        if (req.dbConnectionPool) {
            req.dbConnectionPool.release();
        }
    }
});
// Get weather data
expressRouter.get('/weather', (req, res) => {
    req.dbConnectionPool.query('SELECT * FROM weather', (err, results) => {
        if (err) {
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        return res.status(200).send({ status: "success", data: results });
    })
})

// PROMOTIONS
// Get promos
expressRouter.get('/promotions', (req, res) => {
    req.dbConnectionPool.query('SELECT * FROM promotion', (err, results) => {
        if (err) {
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        return res.status(200).send({ status: "success", data: results });
    })
})
expressRouter.get('/get-promo-discount/:id', (req, res) => {
    let promoID = req.params.id;
    req.dbConnectionPool.query('SELECT discount_price FROM promotion WHERE id = ?', [promoID], (err, results) => {
        if (err) {
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        return res.status(200).send({ status: "success", data: { discount: results[0].discount_price } });
    })
})
expressRouter.post('/saveBookingWithPromoApplied', (req, res) => {
    let promoID = req.body.promoID;
    let bookingID = req.body.bookingID;
    req.dbConnectionPool.query('INSERT INTO booking_promotion (booking_id, promotion_id) VALUES (?, ?)', [bookingID, promoID], (err, result) => {
        if (err) {
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        return res.status(200).send({ status: "success", data: { insertedID: result.insertId } });
    })
})
expressRouter.post('/getUserAssociatedPromos', (req, res) => {
    let userID = req.body.userID;
    req.dbConnectionPool.query('SELECT * FROM user_promotion WHERE user_id = ?', [userID], (err, results) => {
        if (err) {
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        return res.status(200).send({ status: "success", results });
    })
})
expressRouter.post('/getUserAssociatedPromoCode', (req, res) => {
    let userID = req.body.userID;
    req.dbConnectionPool.query('SELECT * FROM user_promotion INNER JOIN promotion ON user_promotion.promotion_id = promotion.id WHERE user_id = ? AND isUsed = 0', [userID], (err, results) => {
        if (err) {
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        return res.status(200).send({ status: "success", results });
    })
})
expressRouter.post('/setUserPromoUsed', verifyUser, (req, res) => {
    let promoID = req.body.promoID;
    let userID = req.body.userID;
    req.dbConnectionPool.query('UPDATE user_promotion SET isUsed = 1 WHERE user_id = ? AND promotion_id = ?', [userID, promoID], (err) => {
        if (err) {
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        return res.status(200).send({ status: "success" });
    })
})

// Listen SERVER (DEFAULT NODE PORT RUN OR 3000)
const appPort = process.env.PORT || 3000

app.listen(appPort, () => {
    console.log(`Hotel Aura de Mallorca SERVER listening on port ${appPort}`)
})