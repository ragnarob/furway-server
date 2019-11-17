const utils = require('./utils')
const databaseFacade = require('./database-facade')

const thisModule = {
  async handleRoute (res, throwErr, handlerFunction, ...handlerParams) {
    return new Promise(async (resolve, reject) => {
      try {
        let response = await handlerFunction(...handlerParams)
        resolve(response)
      }
      catch (err) {
        throwErr(err)
      }
    })
  },

  async handleRouteAndAuthorize (req, res, throwErr, userId, handlerFunction, ...handlerParams) {
    return new Promise(async (resolve, reject) => {
      try {
        await thisModule.authorizeUserOrAdmin(req, userId)
        let response = await handlerFunction(...handlerParams)
        resolve(response)
      }
      catch (err) {
        throwErr(err)
      }
    })
  },

  async authorizeUserOrAdmin (req, userId) {
    let user = utils.getUserFromSession(req)

    if (user && user.id === userId) {
      return
    }

    let isAdmin = await thisModule.authorizeAdmin(req)
    if (!isAdmin) {
      utils.throwError('No permission')
    }
  },

  async authorizeAdmin (req) {
    let isAuthorized = false
    if (req.session && req.session.user) {
      let query = `SELECT * FROM user WHERE id=? AND isadmin=1`
      let queryParams = [req.session.user.id]
      let result = await databaseFacade.execute(query, queryParams)
      isAuthorized = result.length > 0
    }

    return isAuthorized
  },
}

module.exports = thisModule