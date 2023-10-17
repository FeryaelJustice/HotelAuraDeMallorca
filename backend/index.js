const express = require('express')
const expressRouter = express.Router()
const cors = require('cors')
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const mysql = require('mysql')
const cookieParser = require('cookie-parser')
const compression = require('compression')
require('dotenv').config();

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
                    res.status(200).send({ status: "success", msg: "", cookieJWT: jwtToken , result: { id: results[0].id, name: results[0].user_name, email: results[0].user_email } });
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
    // let userId = req.body.id;
    // let sql = 'SELECT * FROM app_user WHERE id = ' + connection.escape(userId);
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

// Listen SERVER
const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log(`Hotel Aura de Mallorca SERVER listening on port ${port}`)
})