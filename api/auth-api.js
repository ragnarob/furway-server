const databaseFacade = require('../utils/database-facade')

module.exports = {
  async authorizeVolunteerUser (req, res, next) {

  },

  async authorizeAdminUser (req, res, next) {
    let query = 'SELECT * FROM user WHERE id=? AND isadmin=1'
    let queryParams = req.session.user.id
    let result = await databaseFacade.execute(query, queryParams)
    if (result.length === 0) {
      if (next) { res.status(401).send('Unauthorized - must be admin user') }
      else { return false }
    }
    else {
      if (next) { next() }
      else { return true }
    }
  },

  getUser (req) {
    if (!req.session || req.session.user) {
      return null
    }
    else {
      return req.session.user
    }
  },
}