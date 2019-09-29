const databaseFacade = require('../utils/database-facade')

module.exports = {
  async authorizeAdminUser (req, res, next) {
    return await this.authorizeUser(req, res, next, 'isadmin')
  },

  async authorizeVolunteerUser (req, res, next) {
    return await this.authorizeUser(req, res, next, 'isvolunteer')
  },

  async authorizeUser (req, res, next, userType) {
    let query = `SELECT * FROM user WHERE id=? AND ${userType}=1`
    let queryParams = req.session.user.id
    let result = await databaseFacade.execute(query, queryParams)
    if (result.length === 0) {
      if (next) { res.status(401).send('Unauthorized') }
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