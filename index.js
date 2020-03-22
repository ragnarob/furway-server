const express = require('express')
const bodyParser = require('body-parser')

const { port, sessionDatabaseSettings } = require('./config')

app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

let session = require('express-session')
const MysqlStore = require('express-mysql-session')(session)
const sessionStore = new MysqlStore(sessionDatabaseSettings)

app.use(session({
  secret: 'de78asdta8dyasdhi2jadajadazuckerbergzuperc00l',
  key: 'furway_session',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
  store: sessionStore,
}));

app.use(express.static('./public'))

app.use((req, res, next) => {
  if (req.method === 'POST' && req.path && req.path.indexOf('registrations/user') >= 0) {
    console.log(req.path, req.body, (new Date()).toTimeString().substr(0,8))
  }
  next()
})

require('./api/user-api').setupRoutes()
require('./api/admin-api').setupRoutes()
require('./api/registration-api').setupRoutes()
require('./api/single-day-registration-api').setupRoutes()
require('./api/auth-api').setupRoutes()
require('./api/con-api').setupRoutes()
require('./api/payment-api').setupRoutes()

const errorHandler = require('./utils/error-handler')
app.use(errorHandler)

app.get('*', (req, res) => res.sendFile('index.html', {root: './public'}))

app.listen(port)
console.log('Listening on port ' + port || 8080)
