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

const errorHandler = require('./utils/error-handler')
app.use(errorHandler)

app.listen('8088')
console.log('listening on port 8088')
