const express = require('express')
const expressRouter = express.Router()
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const mysql = require('mysql')
const cookieParser = require('cookie-parser')
const compression = require('compression')
require('dotenv').config();
const salt = 10; // password hashing

// Init server
const app = express();
// JSON enable
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
// CORS
const corsOptions = {
    origin: process.env.API_URL,
    credentials: true, //access-control-allow-credentials:true
    optionSuccessStatus: 200
}
app.use(cors(corsOptions));
// Middleware ensure CORS
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.sendStatus(200);
    } else {
        next();
    }
});
// Routes
app.use('/api/', expressRouter)
// Cookies and compression
app.use(cookieParser());
app.use(compression())

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'hotelaurademallorca'
})

// ROUTES
// if we use on defining routes app. -> NO /api prefix, if we use expressRoute, we defined to use /api prefix

app.get('/', (req, res) => {
    let test = process.env.NODE_ENV + ' ' + process.env.API_URL;
    res.send(test)
})

expressRouter.post('/register', (req, res) => {
    let data = req.body;
    let sql = 'INSERT INTO app_user (user_name, user_surnames, user_email, user_password_hash, user_verified) VALUES (?, ?, ?, ?, ?)';

    bcrypt.hash(data.password, salt, (err, hash) => {
        let values = [data.name, data.surnames, data.email, hash, 0];
        connection.query(sql, values, (error, results) => {
            if (error) {
                console.error(error);
                return res.sendStatus(500).json({ status: "error", msg: "Inserting data error on server" });
            }
            res.status(200).json({ status: "success", msg: "", insertId: results.insertId });
        });
    })
})

expressRouter.post('/login', (req, res) => {
    let data = req.body;
    let sql = 'SELECT * FROM app_user WHERE user_email = ?';
    let values = [data.email];

    connection.query(sql, values, (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ status: "error", msg: "Error on server" });
        }
        if (results.length > 0) {
            console.log(data.password)
            bcrypt.compare(data.password, results[0].user_password_hash, (error, response) => {
                if (error) return res.status(500).json({ status: "error", msg: "Passwords do not match" })
                if (response) {
                    res.status(200).send({ status: "success", msg: "", result: { id: results[0].id, name: results[0].user_name, email: results[0].user_email } });
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
            return res.sendStatus(500);
        }
        res.status(200).send({ insertId: results.insertId });
    });
})

// Listen SERVER
const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log(`Hotel Aura de Mallorca SERVER listening on port ${port}`)
})