const dotenv = require('dotenv')
dotenv.config()

module.exports = {
  port: process.env.PORT,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  databaseSettings: {
    'host': process.env.DB_HOST,
    'user': process.env.DB_USER,
    'password': process.env.DB_PASSWORD,
    'database': process.env.DB_DATABASE,
    'connectionLimit': process.env.DB_CONNECTIONLIMIT
  },
  sessionDatabaseSettings: {
    'host': process.env.DB_HOST,
    'user': process.env.DB_USER,
    'password': process.env.DB_PASSWORD,
    'database': process.env.SESSION_DB_DATABASE,
    'connectionLimit': process.env.DB_CONNECTIONLIMIT,
    'expiration': 86400 * 1000 * 60,
    'connectionLimit': 4,
  },
  emailSettings: {
    'host': process.env.EMAIL_HOST,
    'port': process.env.EMAIL_PORT,
    'secure': false,
    'auth': {
      'user': process.env.EMAIL_USER,
      'pass': process.env.EMAIL_PASSWORD
    }
  }
}