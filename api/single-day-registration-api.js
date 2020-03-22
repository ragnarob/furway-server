const databaseFacade = require('../utils/database-facade')
const handlers = require('../utils/handle-route')
const handle = handlers.handleRoute
const handleAndAuthorize = handlers.handleRouteAndAuthorize
const authApi = require('./auth-api')
const userApi = require('./user-api')
const paymentApi = require('./payment-api')
const utils = require('../utils/utils.js')
const fileSystemFacade = require('../utils/file-system-facade')
const conApi = require('./con-api')

module.exports = {
  setupRoutes () {
    app.get('/api/single-day-registrations', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.getAllRegistrations.bind(this))
      res.json(response)
    })

    app.get('/api/single-day-registration-spots-left', async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.getSingleDayRegistrationSpotsLeft.bind(this))
      res.json(response)
    })

    app.post('/api/single-day-registrations/user/:userId', async (req, res, throwErr) => {
      let response = await handleAndAuthorize(req, res, throwErr, Number(req.params.userId),
        this.addRegistration.bind(this), Number(req.params.userId), req.body.days)
      res.json(response)
    })
  },


  async getAllRegistrations () {

  },


  async getSingleDayRegistrationSpotsLeft () {
    return {
      'friday': 25,
      'saturday': 3,
      'sunday': 0,
    }
  },


  async addRegistration (userId, days) {
    return {
      'message': 'u noob'
    }
  },


  parseRegistrationBooleans (registration) {
    utils.convertIntsToBoolean(registration, 'earlyArrival', 'lateDeparture', 'buyTshirt', 'buyHoodie', 'isAdminApproved', 'receivedInsideSpot', 'receivedOutsideSpot', 'isPaid')
  }
}