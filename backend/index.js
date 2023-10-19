const express = require('express')
const expressRouter = express.Router()
const morgan = require('morgan')
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
const { v4: uuidv4 } = require('uuid');

// Init server
const app = express();
// JSON enable
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
// CORS
const corsOptions = {
    origin: process.env.API_URL,
    credentials: true, //access-control-allow-credentials:true
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
    optionSuccessStatus: 200
}
app.use(cors(corsOptions));
// Middleware ensure CORS
// app.use((req, res, next) => {
//     res.header('Access-Control-Allow-Origin', process.env.API_URL);
//     res.header('Access-Control-Allow-Credentials', true);
//     res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
//     next();
// });
// Routes
app.use('/api/', expressRouter)
// Cookies and compression
app.use(cookieParser());
app.use(compression())
app.use(morgan('combined'))

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
    if (!req.cookies) {
        token = req.body.token;
    } else {
        token = req.cookies.token;
    }
    if (!token) {
        return res.status(401).json({ status: "error", msg: "You are not authenticated, forbidden." })
    } else {
        jwt.verify(token, jwtSecretKey, (err, decoded) => {
            if (err) {
                return res.status(401).json({ status: "error", msg: "Token is not valid, forbidden." })
            } else {
                req.name = decoded.name;
                next();
            }
        })
    }
}
const getJWTUser = (req, res, next) => {
    let token = '';
    if (!req.cookies) {
        token = req.body.token;
    } else {
        token = req.cookies.token;
    }
    if (!token) {
        return res.status(401).json({ status: "error", msg: "No token." })
    } else {
        jwt.verify(token, jwtSecretKey, (err, decoded) => {
            if (err) {
                return res.status(401).json({ status: "error", msg: "Token is not valid, forbidden." })
            } else {
                req.jwt = decoded;
                next();
            }
        })
    }
}

// Hashing
const salt = 10; // password hashing

// MAILS
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: false,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
});

// ROUTES
// if we use on defining routes app. -> NO /api prefix, if we use expressRoute, we defined to use /api prefix

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
                        res.cookie('token', jwtToken)
                        res.status(200).json({ status: "success", msg: "", cookieJWT: jwtToken, insertId: results.insertId });
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
                        res.cookie('token', jwtToken)
                        res.status(200).send({ status: "success", msg: "", cookieJWT: jwtToken, result: { id: results[0].id, name: results[0].user_name, email: results[0].user_email } });
                    } else {
                        res.status(500).send({ status: "error", msg: "Passwords do not match" });
                    }
                })
            } else {
                res.status(500).send({ status: "error", msg: "No email exists" });
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
            res.status(200).send({ status: "success", insertId: results.insertId });
        });
    });
})

expressRouter.delete('/user/:id', getJWTUser, (req, res) => {
    pool.getConnection((err, connection) => {
        let userID = req.body.id;
        let sql = 'DELETE FROM app_user WHERE id = ?';
        let values = [userID];
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ status: "error", error: 'Internal server error' });
        }
        connection.query(sql, values, (error, results, fields) => {
            if (error) {
                console.error(error);
                return res.status(500).send({ status: "error", error: 'Internal server error' });;
            }
            res.status(200).send({ status: "success", message: `User ${userID} deleted` });
        });
    });
})

expressRouter.post('/currentUser', getJWTUser, (req, res) => {
    return res.status(200).json({ status: "success", msg: "Token valid.", userID: req.jwt.userID })
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
        res.status(200).send({ status: "success", msg: "Email confirmation sent!" });
    } catch (error) {
        console.error(error)
        res.status(500).send({ status: "error", msg: "Email couldn't be sent!" });
    }
})

expressRouter.post('/user/verifyEmail/:token', function (req, res) {
    pool.getConnection(async (err, connection) => {
        const { token } = req.params;

        // try {
        //     // Find the user by verification token
        //     const user = await db.getUserByVerificationToken(token);

        //     // Check if the user exists and the token hasn't expired
        //     if (!user || user.verification_token_expiry < new Date()) {
        //         return res.status(400).json({ status: 'error', message: 'Invalid or expired token.' });
        //     }

        //     // Update user verification status
        //     await db.updateUserVerificationStatus(user.id, true);

        //     // Clear verification token and expiry
        //     await db.clearVerificationToken(user.id);

        //     res.json({ status: 'success', message: 'Email verified successfully.' });
        // } catch (error) {
        //     console.error('Error verifying email:', error);
        //     res.status(500).json({ status: 'error', message: 'Internal Server Error' });
        // }
    });
})

// Send contact form
expressRouter.post('/user/sendContactForm', async (req, res) => {
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
        res.status(200).send({ status: "success", msg: "Email confirmation sent!" });
    } catch (error) {
        console.error(error)
        res.status(500).send({ status: "error", msg: "Email couldn't be sent!" });
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
                res.status(200).send({ status: "success", msg: "Rooms found", data: results });
            } else {
                res.status(500).send({ status: "error", msg: "No rooms found" });
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
                res.status(200).send({ status: "success", msg: "Rooms found", data: results });
            } else {
                res.status(500).send({ status: "error", msg: "No rooms found" });
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
                res.status(200).send({ status: "success", msg: "Plans found", data: results });
            } else {
                res.status(500).send({ status: "error", msg: "No plans found" });
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
                res.status(200).send({ status: "success", msg: "Services found", data: results });
            } else {
                res.status(500).send({ status: "error", msg: "No services found" });
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
                res.status(200).send({ status: "success", msg: "Services found", data: results });
            } else {
                res.status(500).send({ status: "error", msg: "No services found" });
            }
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
                res.status(200).send({ status: "success", msg: "Payment methods found", data: results });
            } else {
                res.status(500).send({ status: "error", msg: "No payment methods found" });
            }
        })
    });
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
                    res.status(500).send({ status: "error", error: "error creating booking services" });
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

                    console.log(bookingGuestsValues)

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
                    res.status(500).send({ status: "error", error: "error creating booking guests" });
                } finally {
                    // Release the connection
                    await connection.release();
                }
                // Send the response outside the finally block
                res.status(200).send({ status: "success", insertId: bkInsertID });
            });
        }).catch(error => {
            console.error(error);
        })
    }).catch(err => console.error(err))
});

// PAYMENT
// Booking
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
            res.status(200).send({ status: "success", insertId: results.insertId });
        });
    });
    res.status(200).send({ status: "success", msg: data });
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

    res.status(200).json({ status: "success", msg: 'stripe', clientSecret: paymentIntent.client_secret })
})
// Stripe success or failure responses
expressRouter.get('/success', (req, res) => {
    res.status(200).json({ status: "success", msg: 'Payment successful! Thank you for your purchase.' })
})
expressRouter.get('/cancel', (req, res) => {
    res.status(200).json({ status: "success", msg: 'Payment cancelled. Your order was not processed.' })
})

// Listen SERVER
const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log(`Hotel Aura de Mallorca SERVER listening on port ${port}`)
})