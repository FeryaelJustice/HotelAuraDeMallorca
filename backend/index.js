const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const mysql = require('mysql')
const cookieParser = require('cookie-parser')
const compression = require('compression')
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(cookieParser());
app.use(compression())

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'hotelaurademallorca'
})

app.get('/', (req, res) => {
    let test = process.env.NODE_ENV + ' ' + process.env.API_URL;
    res.send(test)
})

app.post('/register', (req, res) => {
    let data = req.body;
    // let userId = req.body.id;
    // let sql = 'SELECT * FROM app_user WHERE id = ' + connection.escape(userId);
    let sql = 'INSERT INTO app_user (user_name, user_surnames, user_email, user_password_hash, user_verified) VALUES (?, ?, ?, ?, ?)';
    let values = [data.username, data.surnames, data.email, data.password, 0];

    connection.query(sql, values, (error, results, fields) => {
        if (error){
            console.error(error);
            return res.sendStatus(500);
        }
        res.status(200).send({ insertId: results.insertId});
    });
})

const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log(`Hotel Aura de Mallorca SERVER listening on port ${port}`)
})