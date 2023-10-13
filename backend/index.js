const express = require('express')
const app = express()
require('dotenv').config();
const port = process.env.PORT || 3000

app.get('/', (req, res) => {
    let test = process.env.NODE_ENV + ' ' + process.env.API_URL;
    res.send(test)
})

app.listen(port, () => {
    console.log(`Hotel Aura de Mallorca SERVER listening on port ${port}`)
})