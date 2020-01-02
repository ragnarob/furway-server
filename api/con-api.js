const handlers = require('../utils/handle-route')
const handle = handlers.handleRoute

module.exports = {
  setupRoutes () {
    app.get('/api/con-info', async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.getConInfo.bind(this))

      res.json(response)
    })
  },

  async getConInfo () {
    let conInfo = require('../config/con-info.json')

    return conInfo
  }
}