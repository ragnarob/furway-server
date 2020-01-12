const express = require('express')
const bodyParser = require('body-parser')

app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

let session = require('express-session')
const MysqlStore = require('express-mysql-session')(session)
const dbOptions = require('./config/database-settings.json')
dbOptions['dabatase'] = 'furwaydb-session'
dbOptions['expiration'] = 86400 * 1000 * 60
dbOptions['connectionLimit'] = 2
const sessionStore = new MysqlStore(dbOptions)

app.use(session({
  secret: 'de78asdta8dyasdhi2jadajadazuckerbergzuperc00l',
  key: 'furway_session',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
  store: sessionStore,
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

const port = process.env.PORT || 8088
app.listen(port)
console.log('listening on port ' + port)
