const databaseFacade = require('../utils/database-facade')
const handle = require('../utils/handle-route')
const authApi = require('./auth-api')
const utils = require('../utils/utils.js')

module.exports = {
  setupRoutes () {
    app.get('/api/registrations/user/:userId', async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.getRegistration.bind(this), req, Number(req.params.userId))
      res.json(response)
    })
    
    app.post('/api/registrations/user/:userId', async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.addRegistration.bind(this), req, Number(req.params.userId), req.body.roomPreference, req.body.earlyArrival, req.body.lateDeparture, req.body.buyTshirt, req.body.buyHoodie, req.body.tshirtSize, req.body.hoodieSize)
      res.json(response)
    })
    
    app.post('/api/registrations/user/:userId/update', async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.updateRegistration.bind(this), req, Number(req.params.userId), req.body.roomPreference, req.body.earlyArrival, req.body.lateDeparture, req.body.buyTshirt, req.body.buyHoodie, req.body.tshirtSize, req.body.hoodieSize)
      res.json(response)
    })
    
    app.post('/api/registrations/user/:userId/delete', async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.deleteRegistration.bind(this), req, Number(req.params.userId))
      res.json(response)
    })
  },


  async getRegistration (req, userId) {
    await this.authorizeUserOrAdmin(req, userId)

    let query = 'SELECT id AS id, roompreference AS roomPreference, earlyarrival AS earlyArrival, latedeparture AS lateDeparture, buytshirt AS buyTshirt, buyhoodie AS buyHoodie, tshirtsize AS tshirtSize, hoodiesize AS hoodiesize, timestamp AS timestamp, isregpaymentcomplete AS isRegPaymentComplete, ismerchpaymentcomplete AS isMerchPaymentComplete FROM registration WHERE userId = ?'
    let registrationData = await databaseFacade.execute(query, [userId])

    if (registrationData.length === 0) {
      return {registration: null}
    }

    return {registration: registrationData[0]}
  },


  async addRegistration (req, userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize) {
    await this.authorizeUserOrAdmin(req, userId)

    let existingRegistration = await this.getRegistration(req, userId)
    if (existingRegistration.registration !== null) {
      utils.throwError('This user already has a registration')
    }
    
    if (!this.validateRegistrationDetails (userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize)) {
      utils.throwError('Missing or invalid fields')
    }

    await databaseFacade.execute(databaseFacade.queries.addRegistration, [userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize])

    return {success: true}
  },


  // Todo for fremtiden: bare legge til, ikke fjerne. Oppdatere payment status ofc.
  async updateRegistration (req, userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize) {
    await this.authorizeUserOrAdmin(req, userId)

    let existingRegistration = await this.getRegistration(req, userId)
    if (existingRegistration.registration === null) {
      utils.throwError('This user has no registration')
    }
    
    if (!this.validateRegistrationDetails (userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize)) {
      utils.throwError('Missing or invalid fields')
    }

    await databaseFacade.execute(databaseFacade.queries.updateRegistration, [roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize, userId])

    return {success: true}
  },


  async deleteRegistration (req, userId) {
    await this.authorizeUserOrAdmin(req, userId)

    await databaseFacade.execute(databaseFacade.queries.deleteRegistration, [userId])

    return {success: true}
  },


  async authorizeUserOrAdmin (req, userId) {
    let user = utils.getUserFromSession(req)
    if (user && user.id === userId) {
      return
    }

    let isAdmin = await authApi.authorizeAdminUser(req)
    if (!isAdmin) {
      utils.throwError('No permission')
    }
  },


  validateRegistrationDetails (userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize) {
    let areFieldsOk = utils.areFieldsDefinedAndNotNull(userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie)
    let areMerchSizesOk = this.areMerchAndSizesValid(buyHoodie, hoodieSize, buyTshirt, tshirtSize)

    return areFieldsOk && areMerchSizesOk
  },
  

  areMerchAndSizesValid (buyHoodie, hoodieSize, buyTshirt, tshirtSize) {
    if (buyHoodie) {
      if (hoodieSize === null || hoodieSize === undefined) {
        return false
      }
    }
    if (buyTshirt) {
      if (tshirtSize === null || tshirtSize === undefined) {
        return false
      }
    }

    return true
  }
}