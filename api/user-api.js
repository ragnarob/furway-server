const databaseFacade = require('../utils/database-facade')

module.exports = {
  setupRoutes () {
    app.get('/api/users/:id', (req, res, throwErr) => {
      this.handleRoute(res, throwErr, this.getUser, req.params.id)
    })
  },

  async getUser (userId) {
    return {name: 'asdasd'}
  },

  async handleRoute (res, throwErr, handlerFunction, ...handlerParams) {
    try {
      let response = await handlerFunction(...handlerParams)
      res.json(response)
    }
    catch (err) {
      throwErr(err)
    }
  },
}