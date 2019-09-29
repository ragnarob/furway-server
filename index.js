const express = require('express')
const bodyParser = require('body-parser')

app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

app.use(express.static('./public'))

require('./api/user-api').setupRoutes()

const errorHandler = require('./utils/error-handler')
app.use(errorHandler)

app.listen('8088')
console.log('listening on port 8088')
