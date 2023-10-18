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
const connection = mysql.createConnection({
    host: 'localhost',
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
                    res.cookie('token', jwtToken)
                    res.status(200).json({ status: "success", msg: "", cookieJWT: jwtToken, insertId: results.insertId });
                });
            })
        }
    })
})

expressRouter.post('/login', (req, res) => {
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
})

expressRouter.post('/editprofile/:id', (req, res) => {
    let data = req.body;
    let sql = 'INSERT INTO app_user (user_name, user_surnames, user_email, user_password_hash, user_verified) VALUES (?, ?, ?, ?, ?)';
    let values = [data.username, data.surnames, data.email, data.password, 0];

    connection.query(sql, values, (error, results, fields) => {
        if (error) {
            console.error(error);
            return res.status(500);
        }
        res.status(200).send({ insertId: results.insertId });
    });
})

expressRouter.post('/currentUser', getJWTUser, (req, res) => {
    return res.status(200).json({ status: "success", msg: "Token valid.", userID: req.jwt.userID })
})

expressRouter.get('/loggedUser/:id', (req, res) => {
    let userID = req.params.id;
    let sql = 'SELECT * FROM app_user WHERE id = ?';
    let values = [userID];
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
})

// ROOMS
expressRouter.get('/rooms', (req, res) => {
    let sql = 'SELECT * FROM room'
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
})

// PLANS
expressRouter.get('/plans', (req, res) => {
    let sql = 'SELECT * FROM plan'
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
})

// SERVICES
expressRouter.get('/services', (req, res) => {
    let sql = 'SELECT * FROM service'
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
})

// PAYMENT METHODS
expressRouter.get('/paymentmethods', (req, res) => {
    let sql = 'SELECT * FROM payment_method'
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
})

// GUESTS
expressRouter.post('/guests', (req, res) => {
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
})

// BOOKING !!!
expressRouter.post('/booking', (req, res) => {

    let data = req.body;
    const booking = data.booking;
    // const servicesIDs = Object.keys(data.selectedServicesIDs).map(Number)
    const guests = data.guests;
    console.log(booking)
    // console.log(servicesIDs)
    console.log(guests)

    let bookingInsertedID = null;

    // Booking
    let bookingSQL = 'INSERT INTO booking (user_id, plan_id, room_id, booking_start_date, booking_end_date) VALUES (?, ?, ?, ?, ?)';
    let values = [booking.userID, booking.planID, booking.roomID, moment(booking.startDate).format(dateFormat), moment(booking.endDate).format(dateFormat)];

    connection.query(bookingSQL, values, (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).send({ error: "error creating booking" });
        }
        bookingInsertedID = results.insertId;

        // LOGIC for Booking Guests inserts
        const bookingGuestsSQL = 'INSERT INTO booking_guest (booking_id, guest_id) VALUES ?';

        // Iterate over each guest
        guests.forEach(guest => {
            const bookingGuestsSQLValues = []; // reset each iteration
            // Select guest ID based on email match
            const getGuestIDSQL = 'SELECT id FROM guest WHERE guest_email = ?';

            connection.query(getGuestIDSQL, [guest.email], (error, results) => {
                if (error) {
                    console.error(error);
                    return res.status(500).send({ error: "error retrieving guest ID" });
                }
                console.log(results)

                // If there's a result, add it to the bookingGuestsSQLValues array
                if (results && results.length > 0) {
                    const guestID = results[0].id;
                    bookingGuestsSQLValues.push([bookingInsertedID, guestID]);
                }

                // Insert
                connection.query(bookingGuestsSQL, [bookingGuestsSQLValues], (error) => {
                    if (error) {
                        console.error(error);
                        return res.status(500).send({ error: "error creating booking guests" });
                    }

                });
            });
        });
        res.status(200).send({ insertId: bookingInsertedID });
    });
})

// Listen SERVER
const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log(`Hotel Aura de Mallorca SERVER listening on port ${port}`)
})