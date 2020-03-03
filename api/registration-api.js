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
    app.get('/api/registrations', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.getAllRegistrations.bind(this))
      res.json(response)
    })

    app.get('/api/registrations/deleted', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.getDeletedRegistrations.bind(this))
      res.json(response)
    })

    app.get('/api/registrations/pending', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let allRegistrations = await handle(res, throwErr,
        this.getAllRegistrations.bind(this))
      let filteredRegistrations = await handle(res, throwErr,
        this.filterRegistrationsByUnapproved, allRegistrations)
      res.json(filteredRegistrations)
    })

    app.get('/api/registrations/user/:userId', async (req, res, throwErr) => {
      let response = await handleAndAuthorize(req, res, throwErr, Number(req.params.userId),
        this.getRegistrationByUserId.bind(this), Number(req.params.userId))
      res.json(response)
    })
    
    app.post('/api/registrations/user/:userId', async (req, res, throwErr) => {
      let response = await handleAndAuthorize(req, res, throwErr, Number(req.params.userId),
        this.addRegistration.bind(this), Number(req.params.userId), req.body.roomPreference)
      res.json(response)
    })
    
    app.post('/api/registrations/user/:userId/update', async (req, res, throwErr) => {
      let response = await handleAndAuthorize(req, res, throwErr, Number(req.params.userId),
        this.updateRegistration.bind(this), Number(req.params.userId), req.body.roomPreference, req.body.earlyArrival, req.body.lateDeparture, req.body.buyTshirt, req.body.buyHoodie, req.body.tshirtSize, req.body.hoodieSize, req.body.donationAmount)
      res.json(response)
    })
    
    app.post('/api/registrations/user/:userId/update-admin', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.updateRegistrationAsAdmin.bind(this), Number(req.params.userId), req.body.roomPreference, req.body.earlyArrival, req.body.lateDeparture, req.body.buyTshirt, req.body.buyHoodie, req.body.tshirtSize, req.body.hoodieSize, req.body.receivedInsideSpot, req.body.receivedOutsideSpot, req.body.paymentDeadline, req.body.donationAmount)
      res.json(response)
    })
    
    app.post('/api/registrations/user/:userId/override-payment', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.overridePaidAmountAsAdmin.bind(this), Number(req.params.userId), req.body.amount)
      res.json(response)
    })
    
    app.post('/api/registrations/user/:userId/delete', async (req, res, throwErr) => {
      let response = await handleAndAuthorize(req, res, throwErr, Number(req.params.userId),
        this.deleteRegistration.bind(this), Number(req.params.userId))
      res.json(response)
    })
    
    app.post('/api/registrations/user/:userId/approve', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.approveRegistration.bind(this), Number(req.params.userId));
      res.json(response)
    })
    
    app.post('/api/registrations/user/:userId/reject', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.rejectRegistration.bind(this), Number(req.params.userId));
      res.json(response)
    })
  },


  async getAllRegistrations () {
    return await this.getRegistrations(false)
  },


  async getDeletedRegistrations () {
    return await this.getRegistrations(true)
  },


  async getRegistrations (getCancelledRegistrations) {
    let allRegistrations = await databaseFacade.execute(getCancelledRegistrations ? databaseFacade.queries.getDeletedRegistrations : databaseFacade.queries.getAllRegistrations)

    for (let registration of allRegistrations) {
      registration.unpaidAmount = await paymentApi.getRegistrationUnpaidAmount(registration)
      registration.totalAmount = await paymentApi.getRegistrationTotalAmount(registration)
      registration.isPaid = registration.unpaidAmount < 5

      this.parseRegistrationBooleans(registration)
    }

    return allRegistrations
  },


  async filterRegistrationsByUnapproved (allRegistrations) {
    return allRegistrations.filter(reg => reg.isAdminApproved === null) 
  },


  async doesUserHaveRegistration (userId) {
    let registration = await databaseFacade.execute(databaseFacade.queries.getRegistrationSimple, [userId])

    return registration.length > 0
  },


  async getRegistrationByUserId (userId) {
    let registrationData = await databaseFacade.execute(databaseFacade.queries.getRegistration, [userId])

    if (registrationData.length === 0) {
      return {registration: null}
    }

    registrationData = registrationData[0]

    registrationData.unpaidAmount = await paymentApi.getRegistrationUnpaidAmount(registrationData)
    registrationData.totalAmount = await paymentApi.getRegistrationTotalAmount(registrationData)
    registrationData.isPaid = registrationData.unpaidAmount < 5

    this.parseRegistrationBooleans(registrationData)

    if (this.isRegistrationInWaitingList(registrationData)) {
      let wantsInsideRoom = registrationData['roomPreference'] === 'insideonly' || registrationData['roomPreference'] === 'insidepreference'
      let wantsOutsideRoom = registrationData['roomPreference'] === 'outsideonly' || registrationData['roomPreference'] === 'insidepreference'
      let receivedOutsideSpot = registrationData['receivedOutsideSpot'] === true
      registrationData.waitingListPositions = await this.getWaitingListPositionsByRegistrationId(registrationData.id, wantsInsideRoom, wantsOutsideRoom, receivedOutsideSpot)
    }
    else {
      registrationData.waitingListPositions = {inside: null, outside: null}
    }

    return registrationData
  },

  
  isRegistrationInWaitingList (registrationData) {
    if (registrationData['receivedInsideSpot'] === true) {
      return false
    }
    if (registrationData['roomPreference'] === 'outsideonly' && registrationData['receivedOutsideSpot'] === true) {
      return false
    }
    return true
  },


  async addRegistration (userId, roomPreference) {
    let existingRegistration = await this.doesUserHaveRegistration(userId)

    if (existingRegistration) {
      utils.throwError('This user already has a registration')
    }

    if (!this.isRoomPreferenceLegal(roomPreference)) {
      utils.throwError('Invalid room preference')
    }

    let conInfo = await conApi.getConInfo()

    let userData = await userApi.getUser(userId)
    let registrationOpenDate = userData.isVolunteer ? new Date(conInfo.volunteerRegistrationOpenDate) : new Date(conInfo.registrationOpenDate)

    let tempDate = new Date(registrationOpenDate + 'Z')
    tempDate.setTime(tempDate.getTime() - 3600000)
    registrationOpenDate = new Date(tempDate.toISOString())

    if (new Date().getTime() < registrationOpenDate.getTime()) {
      utils.throwError(`Registration has not yet opened! Opens in ${Math.round(100*((registrationOpenDate - new Date())/3600000))/100} hours.`)
    }
    if (new Date().getTime() > new Date(conInfo.registrationCloseDate).getTime()) {
      utils.throwError('Registration has closed')
    }

    await databaseFacade.execute(databaseFacade.queries.addRegistration, [userId, roomPreference])

    return {success: true}
  },


  async updateRegistrationAsAdmin (userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize, receivedInsideSpot, receivedOutsideSpot, paymentDeadline, donationAmount) {
    let existingRegistration = await this.getRegistrationByUserId(userId)

    if (existingRegistration.registration === null) {
      utils.throwError('This user has no registration')
    }

    if (!this.isRoomPreferenceLegal) {
      utils.throwError('Invalid room preference')
    }
    
    this.validateRegistrationDetails(userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize, donationAmount)

    paymentDeadline = new Date(paymentDeadline)

    let updateQueryParams = [roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize, receivedInsideSpot, receivedOutsideSpot, paymentDeadline, userId]
    
    await databaseFacade.execute(databaseFacade.queries.updateAllRegistrationFieldsAsAdmin, updateQueryParams)

    return {'success': true}
  },


  async overridePaidAmountAsAdmin (userId, paidAmount) {
    let registration = await this.getRegistrationByUserId(userId)

    await databaseFacade.execute(databaseFacade.queries.removePaymentsFromUser, [registration.id])
    await databaseFacade.execute(databaseFacade.queries.saveOverridePayment, [registration.id, paidAmount])

    return {'success': true}
  },


  async updateRegistration (userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize, donationAmount) {
    donationAmount = Number(donationAmount)
    let existingRegistration = await this.getRegistrationByUserId(userId)

    if (existingRegistration.registration === null) {
      utils.throwError('This user has no registration')
    }

    if (!this.isRoomPreferenceLegal) {
      utils.throwError('Invalid room preference')
    }

    if (existingRegistration.isAdminApproved === null) {
      return await this.updateUnprocessedRegistration(userId, roomPreference)
    }
    
    this.validateRegistrationDetails(userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize, donationAmount)
    
    if (existingRegistration.isAdminApproved === false) {
      utils.throwError('This registration has been rejected')
    }

    if (roomPreference !== existingRegistration.roomPreference) {
      return await this.updateRoomPreference(existingRegistration, roomPreference)
    }

    else if (existingRegistration.isAdminApproved === true) {
      return await this.updateApprovedRegistrationAddons(existingRegistration, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize, donationAmount)
    }

    return {'error': 'Server error: Found nothing to update'}
  },


  async updateUnprocessedRegistration (userId, roomPreference) {
    await this.updateRegistrationRoomPrefAndResetTimestamp(userId, roomPreference)
    
    await this.moveRegistrationsFromWaitingListIfPossible()

    return {success: true}
  },


  async updateApprovedRegistrationAddons (existingRegistration, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize, donationAmount) {
    let conInfo = await conApi.getConInfo()
    if (new Date() > new Date(conInfo.originalPaymentDeadline)) {
      utils.throwError(`You cannot add or remove items after the payment deadline has passed.`)
    }

    if ((buyTshirt && !tshirtSize) || (buyHoodie && !hoodieSize)) {
      utils.throwError('Missing merch size')
    }

    let updateRegistrationParams = [earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize, donationAmount, existingRegistration.userId]
    await databaseFacade.execute(databaseFacade.queries.updateRegistrationAddons, updateRegistrationParams)

    return {'success': true}
  },


  async updateRoomPreference (existingRegistration, newRoomPreference) {
    if (existingRegistration.roomPreference === 'insidepreference') {
      if (!existingRegistration.receivedInsideSpot && !existingRegistration.receivedOutsideSpot) {
        await this.addToOtherQueue(newRoomPreference, existingRegistration.userId)
      }
      else if (existingRegistration.receivedInsideSpot && newRoomPreference === 'insideonly') {
        utils.throwError(`You've already received an inside spot, no need to change ticket`)
      }
      else if (existingRegistration.receivedOutsideSpot && newRoomPreference === 'insideonly') {
        await this.setInsideOnlyAndRemoveOutsideSpot(existingRegistration.userId)
      }
      else if (existingRegistration.receivedOutsideSpot && newRoomPreference === 'outsideonly') {
        await this.updateRegistrationRoomPrefKeepTimestamp(newRoomPreference, existingRegistration.userId)
      }
      else {
        await this.updateRegistrationRoomPrefAndResetTimestamp(existingRegistration.userId, newRoomPreference)
      }
    }

    else if (existingRegistration.roomPreference === 'insideonly' || existingRegistration.roomPreference === 'outsideonly') {
      await this.updateRegistrationRoomPrefAndResetTimestamp(existingRegistration.userId, newRoomPreference)
    }

    await this.moveRegistrationsFromWaitingListIfPossible()

    return {'success': true}
  },

  addToOtherQueue: async (newRoomPref, userId) => await databaseFacade.execute(databaseFacade.queries.updateRoomPreference, [newRoomPref, userId]),

  setInsideOnlyAndRemoveOutsideSpot: async (userId) => await databaseFacade.execute(databaseFacade.queries.setInsideOnlyAndRemoveOutsideSpot, [userId]),

  updateRegistrationRoomPrefAndResetTimestamp: async (userId, roomPreference) =>
    await databaseFacade.execute(databaseFacade.queries.updateRegistrationRoomPrefAndResetTimestamp, [roomPreference, userId]),

  updateRegistrationRoomPrefKeepTimestamp: async (newRoomPref, userId) => await databaseFacade.execute(databaseFacade.queries.updateRoomPreference, [newRoomPref, userId]),

  async deleteRegistration (userId) {
    let registrationData = await this.getRegistrationByUserId(userId)

    let saveCancelledRegQueryParams = [userId, registrationData.roomPreference, registrationData.earlyArrival, registrationData.lateDeparture, registrationData.buyTshirt, registrationData.buyHoodie, registrationData.tshirtSize, registrationData.hoodieSize, registrationData.timestamp, registrationData.paymentDeadline, registrationData.isAdminApproved, registrationData.receivedInsideSpot, registrationData.receivedOutsideSpot]

    await databaseFacade.execute(databaseFacade.queries.saveCancelledRegistration, saveCancelledRegQueryParams)

    await databaseFacade.execute(databaseFacade.queries.deleteRegistration, [userId])

    await this.moveRegistrationsFromWaitingListIfPossible()

    return {success: true}
  },


  async approveRegistration (userId) {
    await databaseFacade.execute(databaseFacade.queries.approveRegistration, [userId])

    await this.moveRegistrationsFromWaitingListIfPossible()

    return {success: true}
  },

  async moveRegistrationsFromWaitingListIfPossible () {
    let allRegistrations = await this.getAllRegistrations()
    let availableSpots = await this.getSpotAvailabilityCount(allRegistrations)
    let paymentDeadline = await this.getPaymentDeadline()
    
    let firstInsideRegistrationUserIdInWaitingList = (await databaseFacade.execute(databaseFacade.queries.getFirstRegistrationUserIdInWaitingListInside))[0]
    while (availableSpots.inside>0 && firstInsideRegistrationUserIdInWaitingList!=undefined) {
      await this.addInsideSpotToWaitingRegistration(firstInsideRegistrationUserIdInWaitingList.userid, paymentDeadline)
      
      allRegistrations = await this.getAllRegistrations()
      availableSpots = await this.getSpotAvailabilityCount(allRegistrations)
      firstInsideRegistrationUserIdInWaitingList = (await databaseFacade.execute(databaseFacade.queries.getFirstRegistrationUserIdInWaitingListInside))[0]
    }

    let firstOutsideRegistrationUserIdInWaitingList = (await databaseFacade.execute(databaseFacade.queries.getFirstRegistrationUserIdInWaitingListOutside))[0]
    while (availableSpots.outside>0 && firstOutsideRegistrationUserIdInWaitingList!=undefined) {
      await this.addOutsideSpotToWaitingRegistration(firstOutsideRegistrationUserIdInWaitingList.userid, paymentDeadline)

      allRegistrations = await this.getAllRegistrations()
      availableSpots = await this.getSpotAvailabilityCount(allRegistrations)
      firstOutsideRegistrationUserIdInWaitingList = (await databaseFacade.execute(databaseFacade.queries.getFirstRegistrationUserIdInWaitingListOutside))[0]
    }
  },


  async addInsideSpotToWaitingRegistration (userId, paymentDeadline) {
    let registration = await this.getRegistrationByUserId(userId)

    if (registration.roomPreference === 'insideonly' || 
        registration.roomPreference === 'insidepreference' && !registration.receivedOutsideSpot) {
      await databaseFacade.execute(databaseFacade.queries.addInsideSpotToRegistration, [paymentDeadline, userId])
    }

    else if (registration.roomPreference === 'insidepreference' && registration.receivedOutsideSpot) {
      await databaseFacade.execute(databaseFacade.queries.addInsideSpotToRegistrationAndRemoveOutsideSpot, [paymentDeadline, userId])
    }
  },


  async addOutsideSpotToWaitingRegistration (userId, paymentDeadline) {
    await databaseFacade.execute(databaseFacade.queries.addOutsideSpotToRegistration, [paymentDeadline, userId])
  },

  
  async getPaymentDeadline () {
    let conInfo = await conApi.getConInfo()

    if (new Date() > new Date(conInfo.originalPaymentDeadline)) {
      return conInfo.finalPaymentDeadline
    }
    else {
      return conInfo.originalPaymentDeadline
    }
  },


  async getSpotAvailabilityCount (allRegistrations) {
    let conInfo = await conApi.getConInfo()

    let insideSpotsAvailable = conInfo.numberOfInsideSpots - allRegistrations.filter(r => r.receivedInsideSpot).length
    let outsideSpotsAvailable = conInfo.numberOfOutsideSpots - allRegistrations.filter(r => r.receivedOutsideSpot).length
    return {
      inside: insideSpotsAvailable,
      outside: outsideSpotsAvailable
    }    
  },


  async rejectRegistration (userId) {
    await databaseFacade.execute(databaseFacade.queries.rejectRegistration, [userId])

    return {success: true}
  },


  isRoomPreferenceLegal (roomPreference) {
    return roomPreference !== undefined && ['insideonly', 'insidepreference', 'outsideonly'].includes(roomPreference.toLowerCase())
  },


  validateRegistrationDetails (userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize, donationAmount) {
    let areFieldsOk = utils.areFieldsDefinedAndNotNull(userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie)
    let areMerchSizesOk = this.areMerchAndSizesValid(buyHoodie, hoodieSize, buyTshirt, tshirtSize)

    if (donationAmount < 0) {
      utils.throwError('Donation amount cannot be lower than zero.')
    }

    let areDetailsOk = this.isRoomPreferenceLegal(roomPreference) && areFieldsOk && areMerchSizesOk
    if (!areDetailsOk) {
      utils.throwError('Missing or invalid fields')
    }
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
  },


  async getWaitingListPositionsByRegistrationId (registrationId, wantsInsideRoom, wantsOutsideRoom, receivedOutsideSpot) {
    let registrationsInWaitingList = await databaseFacade.execute(databaseFacade.queries.getWaitingListRegistrations)
    let waitingListPositions = {inside: null, outside: null}
    let insideCounter = outsideCounter = 1
    for (let reg of registrationsInWaitingList) {
      if (reg['id'] === registrationId) {
        if (wantsInsideRoom) {
          waitingListPositions.inside = insideCounter
        }
        if (!receivedOutsideSpot && wantsOutsideRoom) {
          waitingListPositions.outside = outsideCounter
        }
        return waitingListPositions
      }

      else {
        if (reg['roomPreference'] === 'insideonly') {
          insideCounter++
        }
        else if (reg['roomPreference'] === 'outsideonly') {
          outsideCounter++
        }
        else {
          insideCounter++
          outsideCounter++
        }
      }
    }

    return waitingListPositions
  },

  
  async getWaitingLists () {
    let registrationsInWaitingList = await databaseFacade.execute(databaseFacade.queries.getWaitingListRegistrations)
    let waitingLists = {'inside': [], 'outside': []}
    let insideCounter = outsideCounter = 1
    for (let reg of registrationsInWaitingList) {
      if (reg['roomPreference'] === 'insideonly') {
        reg.insideWaitingListNumber = insideCounter
        waitingLists.inside.push(reg)
        insideCounter++
      }

      else if (reg['roomPreference'] === 'outsideonly') {
        reg.outsideWaitingListNumber = outsideCounter
        waitingLists.outside.push(reg)
        outsideCounter++
      }

      else if (reg['roomPreference'] === 'insidepreference') {
        reg.insideWaitingListNumber = insideCounter
        waitingLists.inside.push(reg)
        insideCounter++

        if (reg['receivedOutsideSpot'] === 0) {
          reg.outsideWaitingListNumber = outsideCounter
          waitingLists.outside.push(reg)
          outsideCounter++
        }
      }
    }

    return waitingLists
  },


  getSpotNumbers (allRegistrations) {
    let numbers = {
      insideSpotsReceived: 0,
      outsideSpotsReceived: 0,
      insideSpotsWaitingListLength: 0,
      outsideSpotsWaitingListLength: 0,
    }

    for (let registration of allRegistrations) {
      if (registration.roomPreference === 'insideonly') {
        if (registration.receivedInsideSpot) {
          numbers.insideSpotsReceived++
        }

        else {
          numbers.insideSpotsWaitingListLength++
        }
      }

      else if (registration.roomPreference === 'outsideonly') {
        if (registration.receivedOutsideSpot) {
          numbers.outsideSpotsReceived++
        }

        else {
          numbers.outsideSpotsWaitingListLength++
        }
      }

      else if (registration.roomPreference === 'insidepreference') {
        if (registration.receivedInsideSpot) {
          numbers.insideSpotsReceived++
        }
        
        else if (registration.receivedOutsideSpot) {
          numbers.insideSpotsWaitingListLength++
          numbers.outsideSpotsReceived++
        }

        else {
          numbers.insideSpotsWaitingListLength++
          numbers.outsideSpotsWaitingListLength++
        }
      }
    }

    return numbers
  },

  parseRegistrationBooleans (registration) {
    utils.convertIntsToBoolean(registration, 'earlyArrival', 'lateDeparture', 'buyTshirt', 'buyHoodie', 'isAdminApproved', 'receivedInsideSpot', 'receivedOutsideSpot', 'isPaid')
  }
}