// DEPENDENCIES
const express = require('express')
const expressRouter = express.Router()
const https = require('https');
const http = require('http');
const fs = require('fs');
const cors = require('cors')
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const mysql = require('mysql')
const cookieParser = require('cookie-parser')
const compression = require('compression')
const moment = require('moment'); // for dates, library
const dateFormat = 'YYYY-MM-DD';
const nodemailer = require("nodemailer");
const fileExtensionRegex = /\.[^.]+$/;
const multer = require('multer');
const multerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/media/img/')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname.replace(fileExtensionRegex, '') + '.webp') //Appending .webp
    }
})
const upload = multer({ storage: multerStorage })
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
};

// INIT SERVER
const app = express();

// CONFIGS
// JSON enable
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

// CORS
const corsOptions = {
    //origin: process.env.FRONT_URL,
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
    // MYSQL2 PARAMS
    //waitForConnections: true,
    // idleTimeout: 80000,
    //queueLimit: 0,
    //enableKeepAlive: true,
    //keepAliveInitialDelay: 0
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
                req.id = decoded.userID;
                next();
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
app.use('/api/', expressRouter)

// USER
expressRouter.post('/register', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            const data = req.body;
            const checkSQL = 'SELECT id FROM app_user WHERE user_email = ?'
            const checkValues = [data.email]
            connection.query(checkSQL, checkValues, (err, resultss) => {
                if (err) {
                    return res.status(500).json({ status: "error", message: "Error checking for existing emails" })
                }
                if (resultss.length > 0) {
                    return res.status(500).json({ status: "error", message: "Existing email found in DB, use another email!" })
                } else {
                    let sql = 'INSERT INTO app_user (user_name, user_surnames, user_email, user_password, user_verified) VALUES (?, ?, ?, ?, ?)';

                    bcrypt.hash(data.password, salt, (err, hash) => {
                        let values = [data.name, data.surnames, data.email, hash, 0];
                        connection.query(sql, values, (error, results) => {
                            if (error) {
                                console.error(error);
                                return res.status(500).json({ status: "error", msg: "Inserting data error on server" });
                            }
                            let userID = results.insertId;
                            let jwtToken = jwt.sign({ userID }, jwtSecretKey, { expiresIn: '1d' })
                            // res.cookie('token', jwtToken)

                            // Insert default picture to user
                            connection.query('INSERT INTO user_media (user_id, media_id) VALUES (?, ?)', [userID, 1], (err) => {
                                if (err) {
                                    console.error(err)
                                }
                            })

                            // Insert user role to user
                            connection.query('INSERT INTO user_role (user_id, role_id) VALUES (?,?)', [userID, data.roleID], (err) => {
                                if (err) {
                                    console.error(err)
                                }
                            });

                            return res.status(200).json({ status: "success", msg: "", cookieJWT: jwtToken, insertId: results.insertId });
                        });
                    })
                }
            })
        } catch (error) {
            return res.status(500).send({ status: "error", error: "Internal server error" });
        }
    })
})

expressRouter.post('/registerWithQR', decodeBase64Image, async (req, res) => {
    pool.getConnection(async (err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {                    // Decode the QR code from the binary data
            const qrCodeData = jsQR(req.imageData.pixelData, req.imageWidth, req.imageHeight);

            if (qrCodeData) {
                // Extracted data from the QR code
                const extractedData = JSON.parse(qrCodeData.data);

                const checkSQL = 'SELECT id FROM app_user WHERE user_email = ?'
                const checkValues = [extractedData.user_email]
                connection.query(checkSQL, checkValues, (err, resultss) => {
                    if (err) {
                        return res.status(500).json({ status: "error", message: "Error checking for existing emails" })
                    }
                    if (resultss.length > 0) {
                        return res.status(500).json({ status: "error", message: "Existing email found in DB, use another email!" })
                    } else {
                        const query = 'INSERT INTO app_user (user_name, user_surnames, user_email, user_password, user_verified, verification_token, verification_token_expiry) VALUES (?, ?, ?, ?, ?, ?, ?)';
                        bcrypt.hash(extractedData.user_password, salt, (err, hash) => {
                            const values = [extractedData.user_name, extractedData.user_surnames, extractedData.user_email, hash, extractedData.user_verified, extractedData.verification_token, extractedData.verification_token_expiry];
                            connection.query(query, values, (err, result) => {
                                if (err) {
                                    console.error(error);
                                    return res.status(500).json({ status: "error", msg: "Error on inserting in db" });
                                }
                                if (result) {
                                    let userID = result.insertId;
                                    let jwtToken = jwt.sign({ userID }, jwtSecretKey, { expiresIn: '1d' })

                                    // Insert default picture to user
                                    connection.query('INSERT INTO user_media (user_id, media_id) VALUES (?, ?)', [userID, 1], (err) => {
                                        if (err) {
                                            console.error(err)
                                        }
                                    })

                                    // Insert user role to user (client by default: 1)
                                    connection.query('INSERT INTO user_role (user_id, role_id) VALUES (?,?)', [userID, 1], (err) => {
                                        if (err) {
                                            console.error(err)
                                        }
                                    });

                                    sendConfirmationEmail(connection, userID).then(json => {

                                        return res.status(200).json({ json, cookieJWT: jwtToken, insertId: userID });
                                        return res.status(200).send(json);
                                    }).catch(jsonError => {
                                        return res.status(500).send(jsonError);
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
        } catch (error) {
            res.status(500).send({ status: "error", error: "Internal server error" });
        }
    });
})

expressRouter.post('/login', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            let data = req.body;
            let sql = 'SELECT * FROM app_user WHERE user_email = ?';
            let values = [data.email];
            connection.query(sql, values, (error, results) => {
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
                                let userID = results[0].id;
                                let jwtToken = jwt.sign({ userID }, jwtSecretKey, { expiresIn: '1d' })
                                // res.cookie('token', jwtToken)
                                return res.status(200).send({ status: "success", msg: "", cookieJWT: jwtToken, result: { id: results[0].id, name: results[0].user_name, email: results[0].user_email } });
                            } else {
                                return res.status(500).send({ status: "error", msg: "User not verified" });
                            }
                        } else {
                            return res.status(500).send({ status: "error", msg: "Passwords do not match" });
                        }
                    })
                } else {
                    return res.status(500).send({ status: "error", msg: "No email exists" });
                }
            });
        } catch (error) {
            res.status(500).send({ status: "error", error: "Internal server error" });
        }
    });
})

// Edit by recieving cookie in body or authorization (NOT DIRECTLY WITH BROWSER COOKIES) with verifyUser
expressRouter.post('/edituser', verifyUser, (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            let userID = req.id;
            let data = req.body;
            let sql = 'UPDATE app_user SET user_name = ?, user_surnames = ? WHERE id = ?';
            let values = [data.name, data.surnames, userID];
            connection.query(sql, values, (error) => {
                if (error) {
                    console.error(error);
                    return res.status(500).send({ status: "error", error: 'Internal server error' });;
                }
                return res.status(200).send({ status: "success", msg: 'User updated successfully' });
            });
        } catch (error) {
            res.status(500).send({ status: "error", error: "Internal server error" });
        }
    });
})

expressRouter.delete('/user', verifyUser, (req, res) => {
    const userID = req.id;
    deleteBookingByUserID()
        .then(() => deletePaymentByUserID(userID))
        .then(() => deleteUserRoleByUserID(userID))
        .then(() => deleteUserMediaByUserID(userID))
        .then(() => deleteUserByUserID(userID))
        .then(() => {
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

expressRouter.get('/getUserRole/:id', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            connection.query('SELECT r.* FROM role r INNER JOIN user_role ur ON ur.role_id = r.id WHERE ur.user_id = ?', [req.params.id], (err, results) => {
                if (err) {
                    console.error(err);
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
        }
    });
})

// get current logged user data without jwt, only by id param
expressRouter.get('/loggedUser/:id', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            let userID = req.params.id;
            let sql = 'SELECT * FROM app_user WHERE id = ?';
            let values = [userID];
            connection.query(sql, values, (error, results) => {
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
        }
    });
})

expressRouter.post('/checkUserExistsByEmail', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            let data = req.body;
            let checkSQL = 'SELECT id FROM app_user WHERE user_email = ?'
            let checkValues = [data.email]
            connection.query(checkSQL, checkValues, (error, results) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ status: "error", msg: "Error on connecting db" });
                }
                if (results.length > 0) {
                    return res.status(200).send({ status: "success", msg: "User found" });
                } else {
                    return res.status(500).send({ status: "error", msg: "No user exists with that email" });
                }
            })
        } catch (error) {
            return res.status(500).send({ status: "error", error: "Internal server error" });
        }
    });
})

expressRouter.get('/checkUserIsVerified/:id', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            connection.query('SELECT user_verified FROM app_user WHERE id = ?', [req.params.id], (error, results) => {
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

        }
    });
})

expressRouter.post('/uploadUserImg', upload.single('image'), (req, res) => {
    const userID = req.body.userID;
    // Delete all existing media and user_media associated with the user.
    const deleteMediaPromise = new Promise((resolve, reject) => {
        try {
            pool.getConnection((err, connection) => {
                if (err) {
                    return reject(err);
                }
                connection.query('SELECT media_id FROM user_media WHERE user_id = ?', [userID], (error, results) => {
                    if (error) {
                        return reject(error);
                    }

                    try {
                        if (results && results != []) {
                            for (const result of results) {
                                connection.query('DELETE FROM media WHERE id = ?', [result.media_id], (error) => {
                                    if (error) {
                                        reject(err);
                                    }
                                });
                            }

                            resolve();
                        } else {
                            reject();
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            });
        } catch (error) {
            reject(error);
        }
    });

    const deleteUserMediaPromise = deleteMediaPromise.then(() => {
        return new Promise((resolve, reject) => {
            pool.getConnection((err, connection) => {
                if (err) {
                    return reject(err);
                }
                connection.query('DELETE FROM user_media WHERE user_id = ?', [userID], (error) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve();
                });
            });
        });
    }).catch(_ => {
        return res.status(500).json({ status: 'error', message: `Image ${req.file.filename} existing in db and couln't be replaced with your new image` });
    });

    // Insert the new media and user_media records.
    const insertMediaAndUserMediaPromise = new Promise((resolve, reject) => {
        try {
            pool.getConnection((err, connection) => {
                if (err) {
                    return reject(error);
                }
                connection.query('INSERT INTO media (type, url) VALUES (?, ?)', ['image', 'media/img/' + req.file.filename], (err, result) => {
                    if (err) {
                        return reject(err);
                    }

                    try {
                        const newMediaID = result.insertId;
                        connection.query('INSERT INTO user_media (user_id, media_id) VALUES (?, ?)', [userID, newMediaID], (error) => {
                            if (error) {
                                return reject(err);
                            }
                            resolve();
                        });
                    } catch (error) {
                        reject(error);
                    }
                });
            });
        } catch (error) {
            reject(error);
        }
    }).catch(_ => {
        return res.status(500).json({ status: 'error', message: `Image ${req.file.filename} existing in db successfully deleted but couldn't be inserted` });
    });

    // Wait for both promises to resolve before sending a response to the client.
    Promise.all([deleteUserMediaPromise, insertMediaAndUserMediaPromise]).then(() => {
        return res.status(200).json({ status: 'success', message: `Image ${req.file.filename} successfully uploaded` });
    }).catch(() => {
        return res.status(500).json({ status: 'error', message: `Image ${req.file.filename} for the user couldn't be inserted` });
    });
});

expressRouter.post('/getUserImgByToken', verifyUser, (req, res) => {
    pool.getConnection(async (err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            let userID = req.id;
            connection.query('SELECT url FROM media INNER JOIN user_media ON user_media.media_id = media.id WHERE user_media.user_id = ?', [userID], (err, results) => {
                if (err) {
                    console.error('Error acquiring connection from connection:', err);
                    return res.status(500).send({ status: "error", error: 'Internal server error' });
                }
                return res.status(200).send({ status: "success", fileURL: results[0] });
            })
        } catch (error) {
            return res.status(500).send({ status: "error", error: "Internal server error" });
        }
    })
})

expressRouter.get('/user/sendConfirmationEmail/:id', async (req, res) => {
    pool.getConnection(async (err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            const userId = req.params.id;

            sendConfirmationEmail(connection, userId).then(json => {
                return res.status(200).send(json);
            }).catch(jsonError => {
                return res.status(500).send(jsonError);
            })
        } catch (error) {
            return res.status(500).send({ status: 'error', msg: "Email couldn't be sent!" });
        }
    });
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

            console.log(info)
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
expressRouter.post('/user/verifyEmail/:token', function (req, res) {
    pool.getConnection(async (err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            const { token } = req.params;
            // Find the user by verification token
            const user = await getUserByVerificationToken(connection, token);

            // Check if the user exists and the token hasn't expired
            if (!user || user.verification_token_expiry < new Date()) {
                return res.status(400).json({ status: 'error', message: 'Invalid or expired token.' });
            }

            // Update user verification status
            await updateUserVerificationStatus(connection, user.id, true);

            // Clear verification token and expiry
            await clearVerificationToken(connection, user.id);

            let jwtToken = jwt.sign({ userID: user.id }, jwtSecretKey, { expiresIn: '1d' })
            return res.status(200).json({ status: 'success', message: 'Email verified successfully.', jwt: jwtToken });
        } catch (error) {
            return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
        }
    });
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
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            connection.query('SELECT id FROM app_user', (error, results) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ status: "error", msg: "Error on connecting db" });
                }
                return res.status(200).json({ status: "success", msg: "successful", data: results });
            });
        } catch (error) {
            res.status(500).send({ status: "error", error: "Internal server error" });
        }
    });
})

// CONTACT FORM
expressRouter.post('/sendContactForm', async (req, res) => {
    try {
        let formData = req.body;
        const info = await transporter.sendMail({
            from: formData.email, // sender address
            to: ["'Hotel Aura de Mallorca 👻' <hotelaurademallorca@hotmail.com>'", "'Fernando Homerti' <fernando.gonzalez@homerti.com>'"], // list of receivers
            subject: formData.subject, // Subject line
            text: formData.message, // plain text body
            html: "<pre>" + formData.message + "</pre>", // html body
        });
        console.log("Message sent: %s", info.messageId);
        return res.status(200).send({ status: "success", msg: "Your message was sent!" });
    } catch (error) {
        return res.status(500).send({ status: "error", msg: "Message couldn't be sent!" });
    }
})

// ROOMS
expressRouter.get('/rooms', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            let sql = 'SELECT * FROM room';
            connection.query(sql, [], (error, results) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ status: "error", msg: "Error on connecting db" });
                }
                if (results.length > 0) {
                    return res.status(200).send({ status: "success", msg: "Rooms found", data: results });
                } else {
                    return res.status(500).send({ status: "error", msg: "No rooms found" });
                }
            })
        } catch (error) {
            res.status(500).send({ status: "error", error: "Internal server error" });
        }
    });
})

expressRouter.get('/room/:id', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            let id = req.params.id;
            let sql = 'SELECT * FROM room WHERE id = ?';
            let values = [id]
            connection.query(sql, [values], (error, results) => {
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
        }
    });
})

expressRouter.get('/roomsID', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            connection.query('SELECT id FROM room', (error, results) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ status: "error", msg: "Error on connecting db" });
                }
                return res.status(200).json({ status: "success", msg: "successful", data: results });
            });
        } catch (error) {
            res.status(500).send({ status: "error", error: "Internal server error" });
        }
    });
})

// PLANS
expressRouter.get('/plans', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            let sql = 'SELECT * FROM plan';
            connection.query(sql, [], (error, results) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ status: "error", msg: "Error on connecting db" });
                }
                if (results.length > 0) {
                    return res.status(200).send({ status: "success", msg: "Plans found", data: results });
                } else {
                    return res.status(500).send({ status: "error", msg: "No plans found" });
                }
            })
        } catch (error) {
            res.status(500).send({ status: "error", error: "Internal server error" });
        }
    });
})

expressRouter.get('/plansID', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            connection.query('SELECT id FROM plan', (error, results) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ status: "error", msg: "Error on connecting db" });
                }
                return res.status(200).json({ status: "success", msg: "successful", data: results });
            });
        } catch (error) {
            res.status(500).send({ status: "error", error: "Internal server error" });
        }
    });
})

// SERVICES
expressRouter.get('/services', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            let sql = 'SELECT * FROM service';
            connection.query(sql, [], (error, results) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ status: "error", msg: "Error on connecting db" });
                }
                if (results.length > 0) {
                    return res.status(200).send({ status: "success", msg: "Services found", data: results });
                } else {
                    return res.status(500).send({ status: "error", msg: "No services found" });
                }
            })
        } catch (error) {
            return res.status(500).send({ status: "error", error: "Internal server error" });
        }
    });
})

expressRouter.get('/service/:id', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            let id = req.params.id;
            let sql = 'SELECT * FROM service  WHERE id = ?';
            let values = [id]
            connection.query(sql, [values], (error, results) => {
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
        }
    });
})

expressRouter.post('/servicesImages', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }

        try {
            const services = req.body.services;
            let servicesMedias = [];
            const promises = [];

            for (service of services) {
                const serviceMediaQuery = new Promise((resolve, reject) => {
                    const serviceID = service.id;
                    connection.query('SELECT media_id FROM service_media WHERE service_id = ?', [serviceID], (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            if (results && results.length > 0) {
                                connection.query('SELECT url FROM media WHERE id = ?', [results[0].media_id], (error, mediaResults) => {
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
        }
    });
})

// PAYMENT METHODS
expressRouter.get('/paymentmethods', (req, res) => {
    pool.getConnection((err, connection) => {
        try {
            let sql = 'SELECT * FROM payment_method'

            if (err) {
                console.error('Error acquiring connection from pool:', err);
                return res.status(500).send({ status: "error", error: 'Internal server error' });
            }
            connection.query(sql, [], (error, results) => {
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
        }
    });
})

expressRouter.post('/checkBookingAvailability', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }

        try {
            const { roomID, start_date, end_date } = req.body;
            const startDate = new Date(start_date).toISOString().slice(0, 11).replace('T', ' ')
            const endDate = new Date(end_date).toISOString().slice(0, 11).replace('T', ' ')
            const sql = 'SELECT r.id, r.room_availability_start, r.room_availability_end, b.booking_start_date, b.booking_end_date FROM room r LEFT JOIN booking b ON r.id = b.room_id AND ((b.booking_start_date BETWEEN ? AND ?) OR (b.booking_end_date BETWEEN ? AND ?) OR (b.booking_start_date <= ? AND b.booking_end_date >= ?)) WHERE r.id = ?';

            connection.query(sql, [startDate, endDate, startDate, endDate, startDate, endDate, roomID], (err, results) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ status: "error", msg: "Error on connecting db" });
                }

                if (results && results.length > 0) {
                    // Esto significa que está ocupada, sino estará a null
                    if (results[0].booking_start_date) {
                        // Buscar fechas disponibles
                        const roomAvailabilityStart = results[0].room_availability_start;
                        const roomAvailabilityEnd = results[0].room_availability_end;

                        const availableDates = [];
                        const today = new Date();

                        for (let currentDate = new Date(roomAvailabilityStart); currentDate <= roomAvailabilityEnd; currentDate.setDate(currentDate.getDate() + 1)) {
                            let isDateOccupied = false; // buscando si esta ocupado en las fechas disponibles del room con las del book ya reservado

                            for (const row of results) {
                                const bookingStartDate = new Date(row.booking_start_date);
                                const bookingEndDate = new Date(row.booking_end_date);
                                if (currentDate >= bookingStartDate && currentDate <= bookingEndDate) {
                                    isDateOccupied = true;
                                    break; // No need to check further, the date is occupied
                                }
                            }

                            if (!isDateOccupied && currentDate >= today && currentDate >= results[0].booking_start_date) {
                                availableDates.push(currentDate.toISOString().split('T')[0]);
                            }
                        }

                        if (availableDates.length === 0) {
                            return res.status(200).json({
                                status: "success",
                                msg: "No rooms available, they're occupied."
                            });
                        } else {
                            return res.status(200).json({
                                status: "success",
                                msg: "OK, rooms occupied but with available dates.",
                                available: availableDates
                            });
                        }
                    } else {
                        return res.status(200).send({ status: "success", msg: 'OK, no rooms occupied.' });
                    }
                } else {
                    return res.status(200).send({ status: "success", msg: 'OK, no rooms occupied.' });
                }
            });
        } catch (error) {
            return res.status(500).send({ status: "error", error: "Internal server error", errorMsg: error });
        }
    })

})

// BOOKING
expressRouter.delete('/booking/:bookingID', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            // Delete booking, only for admins
            const bookingId = req.params.bookingID;

            connection.beginTransaction(async (err) => {
                if (err) {
                    connection.rollback();
                    return res.status(500).send({ status: "error", error: "Internal server error" });
                }
                connection.query('DELETE FROM booking WHERE id = ?', [bookingId], (err) => {
                    console.log(err)
                    if (err) {
                        connection.rollback();
                        return res.status(500).send({ status: "error", error: "Internal server error" });
                    }

                    connection.commit((err) => {
                        if (err) {
                            connection.rollback();
                        }
                        return res.status(200).send({ status: "success", msg: "Successfully deleted!" });
                    });
                })
            });
        } catch (error) {
            return res.status(500).send({ status: "error", error: "Internal server error", errorMsg: error });
        }
    })
})

expressRouter.post('/booking', verifyUser, (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            // Update booking (only for admins)
            const userID = req.id;
            const booking = req.body;

            getUserRoleById(connection, userID).then(userRole => {
                if (userRole && (userRole.name == "ADMIN" || userRole.name == "EMPLOYEE")) {
                    connection.beginTransaction(async (err) => {
                        if (err) {
                            connection.rollback();
                            return res.status(500).send({ status: "error", error: "Internal server error" });
                        }
                        connection.query('UPDATE booking SET user_id = ?, plan_id = ?, room_id = ?, booking_start_date = ?, booking_end_date = ? WHERE id = ?', [booking.userID, booking.planID, booking.roomID, booking.startDate, booking.endDate, booking.id], (err) => {
                            if (err) {
                                connection.rollback();
                                return res.status(500).send({ status: "error", error: "Internal server error" });
                            }

                            connection.commit((err) => {
                                if (err) {
                                    connection.rollback();
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
        }
    })
})

expressRouter.post('/createBooking', async (req, res) => {
    try {
        const data = req.body;
        const { booking, selectedServicesIDs, guests } = data;
        // Filtrar services por los que estan a true solo
        const servicesIDs = Object.keys(selectedServicesIDs).filter((key) => selectedServicesIDs[key]).map(Number);

        // Create or select guests
        const guestIds = await createOrSelectGuests(guests);

        // Create a booking
        const bookingId = await createBooking(booking, guestIds, servicesIDs);

        return res.status(200).send({ status: "success", insertId: bookingId });
    } catch (error) {
        return res.status(500).send({ status: "error", error: "Internal server error" });
    }
});

// Booking functions
async function createOrSelectGuests(guests) {
    try {
        const existingGuests = guests.filter(guest => guest.id !== null);
        const existingGuestIds = existingGuests.map(guest => guest.id);

        const [guestIdMap, guestsToInsert] = await Promise.all([
            selectGuestIds(existingGuestIds),
            insertGuests(guests.filter(guest => guest.id === null))
        ]);

        return existingGuests.map(guest => guest.id).concat(guestIdMap).concat(guestsToInsert);
    } catch (error) {
        throw error; // Optionally, rethrow the error for further handling
    }
}

function selectGuestIds(existingGuestIds) {
    return new Promise((resolve, reject) => {
        try {
            if (existingGuestIds.length === 0) {
                resolve([]);
                return;
            }
            pool.getConnection(async (err, connection) => {
                if (err) {
                    return reject(error);
                }
                const query = 'SELECT id FROM guest WHERE id IN (?)';
                connection.query(query, [existingGuestIds], (err, results) => {
                    if (err) {
                        reject("Error selecting guests");
                    } else {
                        resolve(results.map(result => result.id));
                    }
                });
            });
        } catch (error) {
            reject(error);
        }
    });
}

function insertGuests(guestsToInsert) {
    return new Promise((resolve, reject) => {
        try {
            if (guestsToInsert.length === 0) {
                resolve([]);
                return;
            }

            pool.getConnection(async (err, connection) => {
                if (err) {
                    return reject(error);
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
            });
        } catch (error) {
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
    });
}

async function createBooking(booking, guestIds, servicesIDs) {
    return new Promise((resolve, reject) => {
        pool.getConnection(async (err, connection) => {
            if (err) {
                reject("Error acquiring connection from pool");
                return;
            }

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
                            connection.rollback(() => reject("Error creating booking"));
                            return;
                        }

                        const bookingId = result.insertId;

                        await insertBookingServices(connection, bookingId, servicesIDs);
                        await insertBookingGuests(connection, bookingId, guestIds);

                        connection.commit((err) => {
                            if (err) {
                                connection.rollback(() => reject("Transaction commit error"));
                            }
                            //
                            resolve(bookingId);
                        });
                    });
                });
            } catch (error) {
                reject(error);
            }
        });
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
    pool.getConnection((err, connection) => {
        try {
            if (err) {
                console.error('Error acquiring connection from pool:', err);
                return res.status(500).send({ status: "error", error: 'Internal server error' });
            }
            connection.query('SELECT * FROM booking', (err, results) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send({ status: "error", error: 'Internal server error' });;
                }
                return res.status(200).send({ status: "success", msg: "successful", data: results });
            })
        } catch (error) {
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
    });
})

// PAYMENT
expressRouter.post('/payment', (req, res) => {
    pool.getConnection((err, connection) => {
        try {
            if (err) {
                console.error('Error acquiring connection from pool:', err);
                return res.status(500).send({ status: "error", error: 'Internal server error' });
            }
            const data = req.body;
            let sql = 'INSERT INTO payment (user_id, booking_id, payment_amount, payment_date, payment_method_id) VALUES (?, ?, ?, ?, ?)';
            // Create a Date object from the original string
            const dateObject = new Date(data.date);
            // Format the date as 'YYYY-MM-DD'
            const formattedDate = dateObject.toISOString().split('T')[0];
            let values = [data.userID, data.bookingID, data.amount, formattedDate, data.paymentMethodID];
            connection.query(sql, values, (error, result) => {
                if (error) {
                    console.error(error);
                    return res.status(500).send({ status: "error", error: 'Internal server error' });;
                }
                return res.status(200).send({ status: "success", insertId: result.insertId });
            });
        } catch (error) {
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
    });
})

expressRouter.post('/paymentTransaction', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            const data = req.body;
            connection.query('INSERT INTO payment_transaction (payment_id, transaction_id) VALUES (?, ?)', [data.payment_id, data.transaction_id], (error, result) => {
                if (error) {
                    console.error('Error acquiring connection from pool:', error);
                    return res.status(500).send({ status: "error", error: 'Internal server error' });
                }
                return res.status(200).send({ status: "success", insertId: result.insertId });
            })
        } catch (error) {
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
    });
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
    }
});
// Stripe success or failure responses
expressRouter.get('/success', (req, res) => {
    return res.status(200).json({ status: "success", msg: 'Payment successful! Thank you for your purchase.' })
})
expressRouter.get('/cancel', (req, res) => {
    return res.status(200).json({ status: "success", msg: 'Payment cancelled. Your order was not processed.' })
})

// DELETES FUNCTIONS
// By user ID
function deleteUserByUserID(userID) {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                reject(err);
            } else {
                try {
                    const sql = 'DELETE FROM app_user WHERE id = ?';
                    const values = [userID];
                    connection.query(sql, values, (err) => {
                        //
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                } catch (error) {
                    reject(error);
                }
            }
        });
    });
}

function deleteBookingByUserID(userID) {
    return new Promise((resolve, reject) => {
        try {
            const sql = 'DELETE FROM booking WHERE user_id = ?';
            const values = [userID];

            pool.getConnection(async (err, connection) => {
                if (err) {
                    return reject(error);
                }
                connection.query(sql, values, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        } catch (error) {
            reject(error);
        }
    });
}

function deletePaymentByUserID(userID) {
    return new Promise((resolve, reject) => {
        try {
            const sql = 'DELETE FROM payment WHERE user_id = ?';
            const values = [userID];

            pool.getConnection(async (err, connection) => {
                if (err) {
                    return reject(error);
                }
                connection.query(sql, values, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        } catch (error) {
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
    });
}

function deleteUserRoleByUserID(userID) {
    return new Promise((resolve, reject) => {
        try {
            const sql = 'DELETE FROM user_role WHERE user_id = ?';
            const values = [userID];

            pool.getConnection(async (err, connection) => {
                if (err) {
                    return reject(error);
                }
                connection.query(sql, values, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            })
        } catch (error) {
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
    });
}

function deleteUserMediaByUserID(userID) {
    return new Promise((resolve, reject) => {
        try {
            const sql = 'DELETE FROM user_media WHERE user_id = ?';
            const values = [userID];

            pool.getConnection(async (err, connection) => {
                if (err) {
                    return reject(error);
                }
                connection.query(sql, values, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
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
    }
})

// Listen SERVER (RUN)
const appPort = process.env.APP_PORT || 3000

app.listen(appPort, () => {
    console.log(`Hotel Aura de Mallorca SERVER listening on port ${appPort}`)
})

// const serverOptions = {
// key: fs.readFileSync('test/fixtures/keys/agent2-key.pem'),
// cert: fs.readFileSync('test/fixtures/keys/agent2-cert.cert')
// }

// if (appPort == 80) {
//     http.createServer(app).listen(appPort)
// } else if (appPort == 443) {
//     https.createServer(serverOptions, app).listen(appPort)
// } else {
//     app.listen(appPort, () => {
//         console.log(`Hotel Aura de Mallorca SERVER listening on port ${appPort}`)
//     })
// }