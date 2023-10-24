// DEPENDENCIES
const express = require('express')
const expressRouter = express.Router()
// const morgan = require('morgan') // logger
const cors = require('cors')
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const mysql = require('mysql')
const cookieParser = require('cookie-parser')
const compression = require('compression')
const moment = require('moment'); // for dates, library
require('dotenv').config();
const dateFormat = 'YYYY-MM-DD'
const stripe = require('stripe')(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY)
const nodemailer = require("nodemailer");
// const { v4: uuidv4 } = require('uuid');

// Init server
const app = express();

// JSON enable
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

// CORS
const corsOptions = {
    //origin: process.env.FRONT_URL,
    origin: '*',
    credentials: true, //access-control-allow-credentials:true
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    preflightContinue: true,
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
        console.log("Server is ready to take our messages");
    }
})

// ROUTES
// if we use on defining routes app. -> NO /api prefix, if we use expressRoute, we defined to use /api prefix
app.use('/api/', expressRouter)

app.get('/', verifyUser, (req, res) => {
    let test = process.env.NODE_ENV + ' ' + process.env.API_URL;
    res.send(test)
})

// USER
// Protected route adding verifyUser middleware
expressRouter.post('/register', (req, res) => {
    pool.getConnection((err, connection) => {
        let data = req.body;

        let checkSQL = 'SELECT id FROM app_user WHERE user_email = ?'
        let checkValues = [data.email]

        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
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
                        return res.status(200).json({ status: "success", msg: "", cookieJWT: jwtToken, insertId: results.insertId });
                    });
                })
            }
        })
    })
})

expressRouter.post('/login', (req, res) => {
    pool.getConnection((err, connection) => {
        let data = req.body;
        let sql = 'SELECT * FROM app_user WHERE user_email = ?';
        let values = [data.email];
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        connection.query(sql, values, (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: "error", msg: "Error on connecting db" });
            }
            if (results.length > 0) {
                bcrypt.compare(data.password, results[0].user_password_hash, (error, response) => {
                    if (error) return res.status(500).json({ status: "error", msg: "Passwords matching error" })
                    if (response) {
                        let userID = results[0].id;
                        let jwtToken = jwt.sign({ userID }, jwtSecretKey, { expiresIn: '1d' })
                        // res.cookie('token', jwtToken)
                        return res.status(200).send({ status: "success", msg: "", cookieJWT: jwtToken, result: { id: results[0].id, name: results[0].user_name, email: results[0].user_email } });
                    } else {
                        return res.status(500).send({ status: "error", msg: "Passwords do not match" });
                    }
                })
            } else {
                return res.status(500).send({ status: "error", msg: "No email exists" });
            }
        });
    });
})

expressRouter.post('/editprofile/:id', (req, res) => {
    pool.getConnection((err, connection) => {
        let data = req.body;
        let sql = 'INSERT INTO app_user (user_name, user_surnames, user_email, user_password_hash, user_verified) VALUES (?, ?, ?, ?, ?)';
        let values = [data.username, data.surnames, data.email, data.password, 0];
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        connection.query(sql, values, (error, results, fields) => {
            if (error) {
                console.error(error);
                return res.status(500).send({ status: "error", error: 'Internal server error' });;
            }
            return res.status(200).send({ status: "success", insertId: results.insertId });
        });
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
        let userID = req.params.id;
        let sql = 'SELECT * FROM app_user WHERE id = ?';
        let values = [userID];

        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        connection.query(sql, values, (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: "error", msg: "Error on connecting db" });
            }
            if (results.length > 0) {
                res.status(200).send({ status: "success", msg: "User found", data: results[0] });
            } else {
                res.status(500).send({ status: "error", msg: "No user exists with that id" });
            }
        })
    });
})

expressRouter.get('/user/sendConfirmationEmail/:id', async (req, res) => {
    pool.getConnection(async (err, connection) => {
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
            console.error(error);
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
        const query = 'UPDATE app_user SET verification_token = ?, verification_token_expiry = ? WHERE id = ?';
        connection.query(query, [verificationToken, verificationTokenExpiry, userId], (error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
};
expressRouter.post('/user/verifyEmail/:token', function (req, res) {
    pool.getConnection(async (err, connection) => {
        const { token } = req.params;
        try {
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
            console.error('Error verifying email:', error);
            return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
        }
    });
})

// Utilities for verifying user
// Function to get a user by verification token
const getUserByVerificationToken = (connection, token) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM app_user WHERE verification_token = ?';
        connection.query(query, [token], (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results.length > 0 ? results[0] : null);
            }
        });
    });
};

// Function to update user verification status
const updateUserVerificationStatus = (connection, userId, status) => {
    return new Promise((resolve, reject) => {
        const query = 'UPDATE app_user SET user_verified = ? WHERE id = ?';
        connection.query(query, [status, userId], (error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
};

// Function to clear verification token and expiry
const clearVerificationToken = (connection, userId) => {
    return new Promise((resolve, reject) => {
        const query = 'UPDATE app_user SET verification_token = NULL, verification_token_expiry = NULL WHERE id = ?';
        connection.query(query, [userId], (error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
};

// Function to get user data by ID
const getUserById = (connection, userId) => {
    return new Promise((resolve, reject) => {
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
        console.error(error)
        return res.status(500).send({ status: "error", msg: "Message couldn't be sent!" });
    }
})

// ROOMS
expressRouter.get('/rooms', (req, res) => {
    pool.getConnection((err, connection) => {
        let sql = 'SELECT * FROM room'

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
                return res.status(200).send({ status: "success", msg: "Rooms found", data: results });
            } else {
                return res.status(500).send({ status: "error", msg: "No rooms found" });
            }
        })
    });
})

expressRouter.get('/room/:id', (req, res) => {
    pool.getConnection((err, connection) => {
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
    });
})

// PLANS
expressRouter.get('/plans', (req, res) => {
    pool.getConnection((err, connection) => {
        let sql = 'SELECT * FROM plan'

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
                return res.status(200).send({ status: "success", msg: "Plans found", data: results });
            } else {
                return res.status(500).send({ status: "error", msg: "No plans found" });
            }
        })
    });
})

// SERVICES
expressRouter.get('/services', (req, res) => {
    pool.getConnection((err, connection) => {
        let sql = 'SELECT * FROM service'

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
                return res.status(200).send({ status: "success", msg: "Services found", data: results });
            } else {
                return res.status(500).send({ status: "error", msg: "No services found" });
            }
        })
    });
})

expressRouter.get('/service/:id', (req, res) => {
    pool.getConnection((err, connection) => {
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
    });
})

expressRouter.post('/servicesImages', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }

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
                connection.release();
            });
    });
})

// PAYMENT METHODS
expressRouter.get('/paymentmethods', (req, res) => {
    pool.getConnection((err, connection) => {
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
    });
})

// Check booking availability
function calculateAvailableRanges(occupiedRanges, start, end) {
    console.log(occupiedRanges)
    const sortedRanges = [...occupiedRanges].sort((a, b) => new Date(a.start) - new Date(b.start));
    console.log(sortedRanges)

    const availableRanges = [];
    let currentStart = new Date(start);
    let currentEnd = new Date(start);

    for (const range of sortedRanges) {
        const rangeStart = new Date(range.start);
        const rangeEnd = new Date(range.end);

        if (currentEnd < rangeStart) {
            // If there is a gap between the current end and the next range's start, add an available range.
            availableRanges.push({
                start: currentEnd,
                end: rangeStart,
            });
            currentStart = rangeStart;
            currentEnd = rangeEnd;
        } else {
            // If there's an overlap, adjust the current end to cover the range.
            currentEnd = new Date(Math.max(currentEnd, rangeEnd));
        }
    }

    if (currentEnd < end) {
        availableRanges.push({
            start: currentEnd,
            end: new Date(end),
        });
    }

    console.log(availableRanges)

    return availableRanges;
}

expressRouter.post('/checkBookingAvalability', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }

        const { roomID, startDate, endDate } = req.body.booking;

        const sql = 'SELECT booking_start_date, booking_end_date FROM booking WHERE room_id = ?';

        connection.query(sql, [roomID, endDate, startDate], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ status: "error", msg: "Error on connecting db" });
            }

            if (results && results.length > 0) {
                const occupiedRanges = [];
                results.forEach((booking) => {
                    occupiedRanges.push({
                        start: booking.booking_start_date,
                        end: booking.booking_end_date,
                    });
                });
                console.log(occupiedRanges)

                const availabilityStart = startDate;
                const availabilityEnd = endDate;

                if (occupiedRanges.length === 0) {
                    return res.status(200).json({
                        status: "success",
                        msg: "OK, no rooms occupied.",
                        occupied: [],
                        available: [{ start: availabilityStart, end: availabilityEnd }],
                    });
                } else {
                    // Calculate available ranges by subtracting occupied ranges
                    const availableRanges = calculateAvailableRanges(occupiedRanges, startDate, endDate);
                    return res.status(200).json({
                        status: "success",
                        msg: "OK, rooms occupied but with available ranges of dates.",
                        occupied: occupiedRanges,
                        available: availableRanges,
                    });
                }
            } else {
                return res.status(200).send({ status: "success", msg: 'OK, no rooms occupied.' });
            }
        });
    })

})

// BOOKING !!!
expressRouter.post('/booking', (req, res) => {
    const data = req.body;
    const booking = data.booking;
    const servicesIDs = Object.keys(data.selectedServicesIDs).map(Number)
    const guests = data.guests;

    // Creacion guests
    const guestsCreation = new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                console.error('Error acquiring connection from pool, guests:', err);
                connection.rollback();
                reject({ error: "Error connecting guests pool" });
            }

            // LOGIC FOR INSERTING NON EXISTENT GUESTS
            // Get existing guests
            const existingGuestsIDs = guests
                .filter(guest => guest.id !== null)
                .map(guest => guest.id);

            if (existingGuestsIDs.length > 0) {
                const existingGuestsQuery = 'SELECT id FROM guest WHERE id IN (?)';

                try {
                    connection.query(existingGuestsQuery, [existingGuestsIDs], (error, results) => {
                        if (error) {
                            console.error(error);
                            connection.rollback();
                            reject({ error: "Error creating guests" });
                        }

                        const existingGuestsIDsSet = new Set(results.map(result => result.id));

                        // Insert guests with null id
                        const guestsToInsert = guests.filter(guest => guest.id === null || !existingGuestsIDsSet.has(guest.id));

                        if (guestsToInsert.length > 0) {
                            try {
                                const guestsSQL = 'INSERT INTO guest (id, guest_name, guest_surnames, guest_email, isAdult) VALUES ?';
                                const guestsSQLValues = guestsToInsert.map(guest => [guest.id, guest.name, guest.surnames, guest.email, guest.isAdult]);

                                connection.query(guestsSQL, [guestsSQLValues], (error) => {
                                    if (error) {
                                        console.error(error);
                                        connection.rollback();
                                        reject({ error: "Error creating guests" });
                                    } else {
                                        connection.commit();
                                        resolve({ success: 'success creating guests' })
                                    }
                                });
                            } catch (error) {
                                connection.rollback();
                                reject({ error: "Error creating guests" });
                            }
                        }
                    });
                } catch (error) {
                    connection.rollback();
                    reject({ error: "Error selecting guests" });
                } finally {
                    connection.release();
                }
            } else {
                try {
                    // All guests have null id, insert all
                    const guestsSQL = 'INSERT INTO guest (id, guest_name, guest_surnames, guest_email, isAdult) VALUES ?';
                    const guestsSQLValues = guests.map(guest => [guest.id, guest.name, guest.surnames, guest.email, guest.isAdult]);

                    connection.query(guestsSQL, [guestsSQLValues], (error) => {
                        if (error) {
                            console.error(error);
                            connection.rollback();
                            reject({ error: "Error creating guests" });
                        } else {
                            connection.commit();
                            resolve({ success: 'success creating guests' })
                        }
                    });
                } catch (error) {
                    connection.rollback();
                    reject({ error: "Error creating guests" });
                } finally {
                    connection.release();
                }
            }
        });
    });

    // Una vez nos aseguramos que los guests se han insertado, crear el booking
    guestsCreation.then(resp => {
        console.log(resp)
        // BOOKING
        const bookingCreation = new Promise((resolve, reject) => {
            pool.getConnection(async (err, connection) => {
                if (err) {
                    console.error('Error acquiring connection from pool:', err);
                    connection.rollback();
                    return res.status(500).send({ status: "error", error: 'Internal server error' });
                }

                try {
                    // Insert the booking
                    const bookingSQL = 'INSERT INTO booking (user_id, plan_id, room_id, booking_start_date, booking_end_date) VALUES (?, ?, ?, ?, ?)';
                    const bookingValues = [booking.userID, booking.planID, booking.roomID, moment(booking.startDate).format(dateFormat), moment(booking.endDate).format(dateFormat)];

                    connection.query(bookingSQL, bookingValues, (err, result) => {
                        if (result) {
                            connection.commit();
                            resolve({ status: "success", insertId: result.insertId });
                        }
                    })
                } catch (error) {
                    connection.rollback();
                    reject({ error: "Error creating booking" });
                } finally {
                    connection.release();
                }
            })
        });

        bookingCreation.then(result => {
            const bkInsertID = result.insertId;
            pool.getConnection(async (err, connection) => {
                if (err) {
                    console.error('Error acquiring connection from pool:', err);
                    return res.status(500).send({ status: "error", error: 'Internal server error' });
                }

                // Start a transaction
                await connection.beginTransaction();
                try {
                    // Insert the booking services
                    const bookingServicesSQL = 'INSERT INTO booking_service (booking_id, service_id) VALUES (?, ?)';
                    const bookingServicesValues = servicesIDs.map(serviceID => [bkInsertID, serviceID]);

                    for (const bookingServiceValue of bookingServicesValues) {
                        await connection.query(bookingServicesSQL, bookingServiceValue);
                    }
                    // Commit the transaction
                    await connection.commit();
                } catch (err) {
                    // Roll back the transaction if there is an error
                    await connection.rollback();
                    // Release the connection
                    await connection.release();
                    console.error(err);
                    return res.status(500).send({ status: "error", error: "error creating booking services" });
                }

                // Start a transaction
                await connection.beginTransaction();
                try {
                    // Insert the booking guests
                    const bookingGuestsSQL = 'INSERT INTO booking_guest (booking_id, guest_id) VALUES (?, ?)';
                    const bookingGuestsValues = [];

                    const getGuestsSQL = "SELECT * FROM guest WHERE guest_email LIKE ?"
                    const guestsEmailsSet = new Set(guests.map(guest => guest.email));
                    const guestsEmails = [...guestsEmailsSet].map(email => `${email}`);

                    // Create a function to perform the guest query asynchronously
                    const getGuestId = async (email) => {
                        return new Promise((resolve, reject) => {
                            connection.query(getGuestsSQL, email, (error, results) => {
                                if (error) {
                                    reject(error);
                                } else {
                                    resolve(results[0]?.id || null);
                                }
                            });
                        });
                    };

                    // Use Promise.all to wait for all asynchronous queries to complete
                    const guestIds = await Promise.all(guestsEmails.map(async (email) => {
                        console.log('Formed SQL:', getGuestsSQL);
                        console.log('Query Values:', email);
                        return await getGuestId(email);
                    }));

                    // Build bookingGuestsValues based on guestIds
                    guestIds.forEach(guestId => {
                        if (guestId) {
                            bookingGuestsValues.push([bkInsertID, guestId]);
                        }
                    });

                    // Check if there are any booking guests to insert
                    if (bookingGuestsValues.length > 0) {
                        for (const bookingGuestsValue of bookingGuestsValues) {
                            await connection.query(bookingGuestsSQL, bookingGuestsValue);
                        }
                    }

                    // Commit the transaction
                    await connection.commit();

                } catch (err) {
                    // Roll back the transaction if there is an error
                    await connection.rollback();
                    console.error(err);
                    return res.status(500).send({ status: "error", error: "error creating booking guests" });
                } finally {
                    // Release the connection
                    await connection.release();
                }
                // Send the response outside the finally block
                return res.status(200).send({ status: "success", insertId: bkInsertID });
            });
        }).catch(error => {
            console.error(error);
        })
    }).catch(err => console.error(err))
});

// PAYMENT
expressRouter.post('/payment', (req, res) => {
    pool.getConnection((err, connection) => {
        let data = req.body;
        let sql = 'INSERT INTO payment (user_id, booking_id, payment_amount, payment_date, payment_method_id) VALUES (?, ?, ?, ?, ?)';
        let values = [data.userID, data.bookingID, data.amount, data.date, paymentMethodID];
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        connection.query(sql, values, (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).send({ status: "error", error: 'Internal server error' });;
            }
            return res.status(200).send({ status: "success", insertId: results.insertId });
        });
    });
    return res.status(200).send({ status: "success", msg: data });
})

// Stripe
expressRouter.post('/create-payment-intent', async (req, res) => {
    const { amount, currency, plan } = req.body;
    console.log(req.body)

    const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        confirmation_method: 'manual',
        confirm: true,
        statement_descriptor_suffix: "Payment using Stripe",
    })

    return res.status(200).json({ status: "success", msg: 'stripe', clientSecret: paymentIntent.client_secret })
})
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
                const sql = 'DELETE FROM app_user WHERE id = ?';
                const values = [userID];
                connection.query(sql, values, (err, results, fields) => {
                    connection.release(); // Release the connection
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            }
        });
    });
}

function deleteBookingByUserID(userID) {
    return new Promise((resolve, reject) => {
        const sql = 'DELETE FROM booking WHERE user_id = ?';
        const values = [userID];

        pool.query(sql, values, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

function deletePaymentByUserID(userID) {
    return new Promise((resolve, reject) => {
        const sql = 'DELETE FROM payment WHERE user_id = ?';
        const values = [userID];

        pool.query(sql, values, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

function deleteUserRoleByUserID(userID) {
    return new Promise((resolve, reject) => {
        const sql = 'DELETE FROM user_role WHERE user_id = ?';
        const values = [userID];

        pool.query(sql, values, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

function deleteUserMediaByUserID(userID) {
    return new Promise((resolve, reject) => {
        const sql = 'DELETE FROM user_media WHERE user_id = ?';
        const values = [userID];

        pool.query(sql, values, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// Listen SERVER (RUN)
const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log(`Hotel Aura de Mallorca SERVER listening on port ${port}`)
})