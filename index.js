const express = require('express')
const bodyParser = require('body-parser')

app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

let session = require('express-session')
const redis = require('redis')
const redisStore = require('connect-redis')(session)
const redisClient = redis.createClient()
app.use(session({
  secret: 'de78asdta8dyasdhi2jadajadazuckerbergzuperc00l',
  name: '_redisPractice',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
  store: new redisStore({ host: 'localhost', port: 6379, client: redisClient, ttl: 86400 * 1000 * 60 }),
}));

app.use(express.static('./public'))

require('./api/user-api').setupRoutes()
require('./api/admin-api').setupRoutes()
require('./api/registration-api').setupRoutes()
require('./api/auth-api').setupRoutes()
require('./api/con-api').setupRoutes()

const errorHandler = require('./utils/error-handler')
app.use(errorHandler)

app.get('*', (req, res) => res.sendFile('index.html', {root: './public'}))

app.listen(process.env.PORT || 8088)
console.log('listening on port ' + process.env.PORT || 8088)
