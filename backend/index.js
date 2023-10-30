// DEPENDENCIES
const express = require('express')
const expressRouter = express.Router()
const cors = require('cors')
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const mysql = require('mysql')
const cookieParser = require('cookie-parser')
const compression = require('compression')
const moment = require('moment'); // for dates, library
require('dotenv').config();
const dateFormat = 'YYYY-MM-DD'
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)
const nodemailer = require("nodemailer");
const fileExtensionRegex = /\.[^.]+$/;
const multer = require('multer');
var multerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/media/img/')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname.replace(fileExtensionRegex, '') + '.webp') //Appending .jpg
    }
})
const upload = multer({ storage: multerStorage })
// const morgan = require('morgan') // logger

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
var path = require('path');
app.use(express.static(path.join(__dirname, 'public')))

// MySQL
const pool = mysql.createPool({
    connectionLimit: 100,
    host: process.env.DB_URL,
    user: 'root',
    password: '',
    database: 'hotelaurademallorca',
    before: async (connection) => {
        connection.query = async function (sql, values) {
            const formedSQL = connection.format(sql, values);
            logFormedSQL(formedSQL);
            return await connection._query(formedSQL);
        };
    }
})

function logFormedSQL(sql) {
    console.log('Formed SQL statement:', sql);
}

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

// Hashing
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
        console.log("Server is ready to take our messages: " + success);
    }
})

// ROUTES (SERVER APP)
// if we use on defining routes app. -> NO /api prefix, if we use expressRoute, we defined to use /api prefix
app.use('/api/', expressRouter)

// USER
// Protected route adding verifyUser middleware
expressRouter.post('/register', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            let data = req.body;
            let checkSQL = 'SELECT id FROM app_user WHERE user_email = ?'
            let checkValues = [data.email]
            connection.query(checkSQL, checkValues, (err, resultss) => {
                if (err) {
                    return res.status(500).json({ status: "error", message: "Error checking for existing emails" })
                }
                if (resultss.length > 0) {
                    return res.status(500).json({ status: "error", message: "Existing email found in DB, use another email!" })
                } else {
                    let sql = 'INSERT INTO app_user (user_name, user_surnames, user_email, user_password_hash, user_verified) VALUES (?, ?, ?, ?, ?)';

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
                    bcrypt.compare(data.password, results[0].user_password_hash, (error, response) => {
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

expressRouter.delete('/user/:id', verifyUser, (req, res) => {
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

expressRouter.post('/currentUser', verifyUser, (req, res) => {
    return res.status(200).json({ status: "success", msg: "Token valid.", userID: req.id })
})

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

expressRouter.post('/uploadUserImg', upload.single('image'), async (req, res) => {
    const userID = req.body.userID;
    // Delete all existing media and user_media associated with the user.
    const deleteMediaAndUserMediaPromise = new Promise((resolve, reject) => {
        try {
            pool.query('SELECT media_id FROM user_media WHERE user_id = ?', [userID], async (error, results) => {
                if (error) {
                    return reject(error);
                }

                try {
                    for (const result of results) {
                        await pool.query('DELETE FROM media WHERE id = ?', [result.media_id]);
                    }

                    await pool.query('DELETE FROM user_media WHERE user_id = ?', [userID]);

                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        } catch (error) {
            reject(error);
        }
    });

    // Insert the new media and user_media records.
    const insertMediaAndUserMediaPromise = new Promise((resolve, reject) => {
        try {
            pool.query('INSERT INTO media (type, url) VALUES (?, ?)', ['image', 'media/img/' + req.file.filename], async (err, result) => {
                if (err) {
                    return reject(err);
                }

                try {
                    const newMediaID = result.insertId;
                    await pool.query('INSERT INTO user_media (user_id, media_id) VALUES (?, ?)', [userID, newMediaID]);

                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        } catch (error) {
            reject(error);
        }
    });

    // Wait for both promises to resolve before sending a response to the client.
    await Promise.all([deleteMediaAndUserMediaPromise, insertMediaAndUserMediaPromise]);

    return res.status(200).json({ status: 'success', message: `Image ${req.file.filename} successfully uploaded` });
});

expressRouter.get('/getUserImg', (req, res) => {
    pool.getConnection(async (err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            let userID = req.query.userID;
            connection.query('SELECT url FROM media INNER JOIN user_media ON user_media.media_id = media.id WHERE user_media.user_id = ?', [userID], (err, results) => {
                if (err) {
                    console.error('Error acquiring connection from connection:', err);
                    return res.status(500).send({ status: "error", error: 'Internal server error' });
                }
                return res.status(200).send({ status: "success", fileURL: results[0] });
            })
        } catch (error) {
            res.status(500).send({ status: "error", error: "Internal server error" });
        }
    })
})

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

                return res.status(200).send({ status: 'success', msg: 'Email confirmation sent!' });
            }).catch(err => {
                console.error(err);
                return res.status(500).send({ status: 'error', msg: "Email couldn't be sent!" });
            })
        } catch (error) {
            return res.status(500).send({ status: 'error', msg: "Email couldn't be sent!" });
        }
    });
})

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

// CONTACT FORM
expressRouter.post('/sendContactForm', async (req, res) => {
    try {
        let formData = req.body;
        const info = await transporter.sendMail({
            from: "'Hotel Aura de Mallorca 👻' <hotelaurademallorca@hotmail.com>'", // sender address
            to: formData.email, // list of receivers
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

expressRouter.post('/checkBookingAvalability', (req, res) => {
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

// BOOKING !!!
expressRouter.post('/booking', async (req, res) => {
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

            const query = 'SELECT id FROM guest WHERE id IN (?)';
            pool.query(query, [existingGuestIds], (err, results) => {
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

function insertGuests(guestsToInsert) {
    return new Promise((resolve, reject) => {
        try {
            if (guestsToInsert.length === 0) {
                resolve([]);
                return;
            }

            const values = guestsToInsert.map(guest => [guest.id, guest.name, guest.surnames, guest.email, guest.isAdult]);
            const query = 'INSERT INTO guest (id, guest_name, guest_surnames, guest_email, isAdult) VALUES ?';
            pool.query(query, [values], (err, result) => {
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
            let values = [data.userID, data.bookingID, data.amount, data.date, data.paymentMethodID];
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

// MEDIAS
expressRouter.post('/userLogoByToken', verifyUser, (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        try {
            let userID = req.id;
            connection.query('SELECT media_id FROM user_media WHERE user_id = ' + userID, (error, results) => {
                if (error) {
                    return res.status(500).send({ status: "error", error: 'Internal server error' });;
                }
                if (results && results.length > 0) {
                    connection.query('SELECT url, type FROM media WHERE id = ' + results[0].media_id, (error, results) => {
                        if (error) {
                            return res.status(500).send({ status: "error", error: 'Internal server error' });;
                        }
                        return res.status(200).json({ status: "success", msg: 'get user photo correct', type: results[0].type, photoURL: results[0].url })
                    });
                } else {
                    return res.status(200).send({ status: "error", error: 'No user logo' });;
                }
            })
        } catch (error) {
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
    });
})

// DELETES
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

            pool.query(sql, values, (err) => {
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

function deletePaymentByUserID(userID) {
    return new Promise((resolve, reject) => {
        try {
            const sql = 'DELETE FROM payment WHERE user_id = ?';
            const values = [userID];

            pool.query(sql, values, (err) => {
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

function deleteUserRoleByUserID(userID) {
    return new Promise((resolve, reject) => {
        try {
            const sql = 'DELETE FROM user_role WHERE user_id = ?';
            const values = [userID];

            pool.query(sql, values, (err) => {
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

function deleteUserMediaByUserID(userID) {
    return new Promise((resolve, reject) => {
        try {
            const sql = 'DELETE FROM user_media WHERE user_id = ?';
            const values = [userID];

            pool.query(sql, values, (err) => {
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

// Listen SERVER (RUN)
const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log(`Hotel Aura de Mallorca SERVER listening on port ${port}`)
})