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
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.API_URL);
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});
// Routes
app.use('/api/', expressRouter)
// Cookies and compression
app.use(cookieParser());
app.use(compression())

// MySQL
const pool = mysql.createPool({
    connectionLimit: 100,
    host: process.env.DB_URL,
    user: 'root',
    password: '',
    database: 'hotelaurademallorca'
})

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
            return res.status(500).send({ error: 'Internal server error' });
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
            return res.status(500).send({ error: 'Internal server error' });
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
            return res.status(500).send({ error: 'Internal server error' });
        }
        connection.query(sql, values, (error, results, fields) => {
            if (error) {
                console.error(error);
                return res.status(500);
            }
            res.status(200).send({ insertId: results.insertId });
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
            return res.status(500).send({ error: 'Internal server error' });
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

// ROOMS
expressRouter.get('/rooms', (req, res) => {
    pool.getConnection((err, connection) => {
        let sql = 'SELECT * FROM room'

        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ error: 'Internal server error' });
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

// PLANS
expressRouter.get('/plans', (req, res) => {
    pool.getConnection((err, connection) => {
        let sql = 'SELECT * FROM plan'

        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ error: 'Internal server error' });
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
            return res.status(500).send({ error: 'Internal server error' });
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

// PAYMENT METHODS
expressRouter.get('/paymentmethods', (req, res) => {
    pool.getConnection((err, connection) => {
        let sql = 'SELECT * FROM payment_method'

        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ error: 'Internal server error' });
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

// GUESTS
expressRouter.post('/guests', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ error: 'Internal server error' });
        }
        const guestsBooking = req.body;

        // LOGIC FOR INSERTING NON EXISTENT GUESTS
        // Get existing guests
        const existingGuestsIDs = guestsBooking
            .filter(guest => guest.id !== null)
            .map(guest => guest.id);

        if (existingGuestsIDs.length > 0) {
            const existingGuestsQuery = 'SELECT id FROM guest WHERE id IN (?)';

            connection.query(existingGuestsQuery, [existingGuestsIDs], (error, results) => {
                if (error) {
                    console.error(error);
                    return res.status(500).send({ status: "error", msg: "error retrieving existing guests" });
                }

                const existingGuestsIDsSet = new Set(results.map(result => result.id));

                // Insert guests with null id
                const guestsToInsert = guestsBooking.filter(guest => guest.id === null || !existingGuestsIDsSet.has(guest.id));

                if (guestsToInsert.length > 0) {
                    const guestsSQL = 'INSERT INTO guest (id, guest_name, guest_surnames, guest_email, isAdult) VALUES ?';
                    const guestsSQLValues = guestsToInsert.map(guest => [guest.id, guest.name, guest.surnames, guest.email, guest.isAdult]);

                    connection.query(guestsSQL, [guestsSQLValues], (error) => {
                        if (error) {
                            console.error(error);
                            return res.status(500).send({ status: "error", msg: "error creating guests" });
                        }

                        // Successfully inserted guests
                        res.status(200).send({ status: "success", msg: "Guests created successfully" });
                    });
                } else {
                    // No guests to insert
                    res.status(200).send({ status: "success", msg: "No guests to insert" });
                }
            });
        } else {
            // All guests have null id, insert all
            const guestsSQL = 'INSERT INTO guest (id, guest_name, guest_surnames, guest_email, isAdult) VALUES ?';
            const guestsSQLValues = guestsBooking.map(guest => [guest.id, guest.name, guest.surnames, guest.email, guest.isAdult]);

            connection.query(guestsSQL, [guestsSQLValues], (error) => {
                if (error) {
                    console.error(error);
                    res.status(500).send({ status: "error", msg: "Error creating guests" });
                }

                // Successfully inserted guests
                res.status(200).send({ status: "success", msg: "Guests created successfully" });
            });
        }
    });
})

// BOOKING !!!
expressRouter.post('/booking', (req, res) => {
    pool.getConnection(async (err, connection) => {
        if (err) {
            console.error('Error acquiring connection from pool:', err);
            return res.status(500).send({ error: 'Internal server error' });
        }
        let data = req.body;
        const booking = data.booking;
        const servicesIDs = Object.keys(data.selectedServicesIDs).map(Number)
        const guests = data.guests;

        let bookingInsertedID = null;

        // Start a transaction
        await connection.beginTransaction();

        try {
            // Insert the booking
            const bookingSQL = 'INSERT INTO booking (user_id, plan_id, room_id, booking_start_date, booking_end_date) VALUES (?, ?, ?, ?, ?)';
            const bookingValues = [booking.userID, booking.planID, booking.roomID, moment(booking.startDate).format('YYYY-MM-DD'), moment(booking.endDate).format('YYYY-MM-DD')];
            const bookingResult = await connection.query(bookingSQL, bookingValues);
            bookingInsertedID = bookingResult.insertId;

            // Insert the booking guests
            const bookingGuestsSQL = 'INSERT INTO booking_guest (booking_id, guest_id) VALUES (?)';
            const bookingGuestsValues = [];

            guests.forEach(async guest => {
                // Select guest ID based on email match
                const getGuestSQL = 'SELECT * FROM guest WHERE guest_email = ?';
                const guestResult = await connection.query(getGuestSQL, [guest.email]);
                if (guestResult.length > 0) {
                    bookingGuestsValues.push([bookingInsertedID, guestResult[0].id]);
                }
            });

            await connection.query(bookingGuestsSQL, bookingGuestsValues);

            // Insert the booking services
            const bookingServicesSQL = 'INSERT INTO booking_service (booking_id, service_id) VALUES (?)';
            const bookingServicesValues = [];

            servicesIDs.forEach(serviceID => {
                bookingServicesValues.push([bookingInsertedID, serviceID]);
            });

            await connection.query(bookingServicesSQL, bookingServicesValues);

            // Commit the transaction
            await connection.commit();

            res.status(200).send({ insertId: bookingInsertedID });
        } catch (err) {
            // Roll back the transaction if there is an error
            await connection.rollback();

            console.error(error);
            res.status(500).send({ error: "error creating booking" });
        } finally {
            // Release the connection
            await connection.release();
        }
    });
});

// PAYMENT
// Booking
expressRouter.post('/api/payment', (req, res) => {
    let data = req.body;
    console.log(data)
    res.status(200).send({ status: "success", msg: data });
})

// Listen SERVER
const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log(`Hotel Aura de Mallorca SERVER listening on port ${port}`)
})