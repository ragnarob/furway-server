const databaseFacade = require('../utils/database-facade')
const handlers = require('../utils/handle-route')
const handle = handlers.handleRoute
const handleAndAuthorize = handlers.handleRouteAndAuthorize
const authApi = require('./auth-api')
const userApi = require('./user-api')
const utils = require('../utils/utils.js')
const fileSystemFacade = require('../utils/file-system-facade')
const conInfo = require('../config/con-info.json')

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
        this.updateRegistration.bind(this), Number(req.params.userId), req.body.roomPreference, req.body.earlyArrival, req.body.lateDeparture, req.body.buyTshirt, req.body.buyHoodie, req.body.tshirtSize, req.body.hoodieSize)
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
      let amounts = this.getPaidAndTotalAmount(registration)
      registration.paidAmount = amounts.paid
      registration.totalAmount = amounts.total
      registration.isPaid = amounts.paid >= amounts.total

      this.parseRegistrationBooleans(registration)
    }

    return allRegistrations
  },


  async filterRegistrationsByUnapproved (allRegistrations) {
    return allRegistrations.filter(reg => reg.isAdminApproved === null) 
  },


  async getRegistrationByUserId (userId) {
    let registrationData = await databaseFacade.execute(databaseFacade.queries.getRegistration, [userId])

    if (registrationData.length === 0) {
      return {registration: null}
    }

    registrationData = registrationData[0]
    
    let amounts = this.getPaidAndTotalAmount(registrationData)
    registrationData.paidAmount = amounts.paid
    registrationData.totalAmount = amounts.total
    registrationData.isPaid = amounts.paid >= amounts.total

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


  getPaidAndTotalAmount (registration) {
    let totalAmountToPay = 0
    let paidAmount = 0

    if (registration.receivedInsideSpot) {
      totalAmountToPay += conInfo.mainDaysInsidePriceNok
    }
    else if (registration.receivedOutsideSpot) {
      totalAmountToPay += conInfo.mainDaysOutsidePriceNok
    }
    else if (registration.roomPreference === 'insideonly') {
      totalAmountToPay += conInfo.mainDaysInsidePriceNok
    }
    else {
      totalAmountToPay += conInfo.mainDaysOutsidePriceNok
    }

    if (registration.earlyArrival) {
      totalAmountToPay += conInfo.earlyArrivalPriceNok
    }
    if (registration.lateDeparture) {
      totalAmountToPay += conInfo.lateDeparturePriceNok
    }
    if (registration.buyHoodie) {
      totalAmountToPay += conInfo.hoodiePriceNok
    }
    if (registration.buyTshirt) {
      totalAmountToPay += conInfo.tshirtPriceNok
    }

    return {
      paid: paidAmount,
      total: totalAmountToPay
    }
  },


  async addRegistration (userId, roomPreference) {
    let existingRegistration = await this.getRegistrationByUserId(userId)
    if (existingRegistration.registration !== null) {
      utils.throwError('This user already has a registration')
    }
    
    if (!this.isRoomPreferenceLegal(roomPreference)) {
      utils.throwError('Invalid room preference')
    } 

    let userData = await userApi.getUser(userId)
    let registrationOpenDate = userData.isVolunteer ? new Date(conInfo.volunteerRegistrationOpenDate) : new Date(conInfo.registrationOpenDate)
    if (new Date().getTime() < registrationOpenDate.getTime()) {
      utils.throwError('Registration has not yet opened')
    }
    if (new Date().getTime() > new Date(conInfo.registrationCloseDate).getTime()) {
      utils.throwError('Registration has closed')
    }

    await databaseFacade.execute(databaseFacade.queries.addRegistration, [userId, roomPreference])

    return {success: true}
  },


  async updateRegistration (userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize) {
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
    
    if (!this.validateRegistrationDetails (userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize)) {
      utils.throwError('Missing or invalid fields')
    }
    
    if (existingRegistration.isAdminApproved === false) {
      utils.throwError('This registration has been rejected')
    }

    if (roomPreference !== existingRegistration.roomPreference) {
      return await this.updateRoomPreference(existingRegistration, roomPreference)
    }

    else if (existingRegistration.isAdminApproved === true) {
      return await this.updateApprovedRegistrationAddons(existingRegistration, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize)
    }

    return {'error': 'Server error: Found nothing to update'}
  },


  async updateUnprocessedRegistration (userId, roomPreference) {
    await this.updateRegistrationRoomPrefAndResetTimestamp(userId, roomPreference)
    
    await this.moveRegistrationsFromWaitingListIfPossible()

    return {success: true}
  },


  async updateRegistrationRoomPrefAndResetTimestamp (userId, roomPreference) {
    await databaseFacade.execute(databaseFacade.queries.updateRegistrationRoomPrefAndResetTimestamp, [roomPreference, userId])
  },


  async updateApprovedRegistrationAddons (existingRegistration, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize) {
    if (this.areAddonsAddedAfterDeadlines(existingRegistration, earlyArrival, lateDeparture, buyTshirt, buyHoodie)) {
      utils.throwError(`It's too late to add some of these purchasable items`)
    }

    await this.updateRegistrationAddons(existingRegistration, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize)

    return {'success': true}
  },


  async updateRoomPreference (existingRegistration, newRoomPreference) {
    if (existingRegistration.roomPreference === 'insidepreference') {
      if (!existingRegistration.receivedInsideSpot && !existingRegistration.receivedOutsideSpot) {
        await this.addToOtherQueue(newRoomPreference, existingRegistration.userId)
      }
      else if (existingRegistration.receivedOutsideSpot) {
        await this.setInsideOnlyAndRemoveOutsideSpot(existingRegistration.userId)
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

  async updateRegistrationAddons (existingRegistration, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize) {
    if ((buyTshirt && !tshirtSize) || (buyHoodie && !hoodieSize)) {
      utils.throwError('Missing merch size')
    }

    let updateRegistrationParams = [earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize, existingRegistration.userId]
    await databaseFacade.execute(databaseFacade.queries.updateRegistrationAddons, updateRegistrationParams)

    return {success: true}
  },

  addToOtherQueue: async (newRoomPref, userId) => await databaseFacade.execute(databaseFacade.queries.updateRoomPreference, [newRoomPref, userId]),
  setInsideOnlyAndRemoveOutsideSpot: async (userid) => await databaseFacade.execute(databaseFacade.queries.setInsideOnlyAndRemoveOutsideSpot, [userId]),

  async deleteRegistration (userId) {
    let registrationData = await this.getRegistrationByUserId(userId)

    let saveCancelledRegQueryParams = [userId, registrationData.roomPreference, registrationData.earlyArrival, registrationData.lateDeparture, registrationData.buyTshirt, registrationData.buyHoodie, registrationData.tshirtSize, registrationData.hoodieSize, registrationData.timestamp, registrationData.paymentDeadline, registrationData.needsManualPaymentDeadline, registrationData.isAdminApproved, registrationData.receivedInsideSpot, registrationData.receivedOutsideSpot]

    await databaseFacade.execute(databaseFacade.queries.saveCancelledRegistration, saveCancelledRegQueryParams)

    await databaseFacade.execute(databaseFacade.queries.deleteRegistration, [userId])

    await this.moveRegistrationsFromWaitingListIfPossible()

    return {success: true}
  },


  areAddonsAddedAfterDeadlines (existingRegistration, earlyArrival, lateDeparture, buyTshirt, buyHoodie) {
    if (!existingRegistration.earlyArrival && earlyArrival
        || !existingRegistration.lateDeparture && lateDeparture) {
      if (new Date() > new Date(conInfo.addEarlyOrLatePaymentDeadline)) {
        return true
      }
    }

    if (!existingRegistration.buyTshirt && buyTshirt
        || !existingRegistration.buyHoodie && buyHoodie) {
      if (new Date() > new Date(conInfo.merchPaymentDeadline)) {
        return true
      }
    }

    return false
  },


  async approveRegistration (userId) {
    await databaseFacade.execute(databaseFacade.queries.approveRegistration, [userId])

    await this.moveRegistrationsFromWaitingListIfPossible()

    return {success: true}
  },

  async moveRegistrationsFromWaitingListIfPossible () {
    let allRegistrations = await this.getAllRegistrations()
    let availableSpots = this.getSpotAvailabilityCount(allRegistrations)
    
    let firstInsideRegistrationUserIdInWaitingList = (await databaseFacade.execute(databaseFacade.queries.getFirstRegistrationUserIdInWaitingListInside))[0]
    while (availableSpots.inside>0 && firstInsideRegistrationUserIdInWaitingList!=undefined) {
      await this.addInsideSpotToWaitingRegistration(firstInsideRegistrationUserIdInWaitingList.userid)
      
      allRegistrations = await this.getAllRegistrations()
      availableSpots = this.getSpotAvailabilityCount(allRegistrations)
      firstInsideRegistrationUserIdInWaitingList = (await databaseFacade.execute(databaseFacade.queries.getFirstRegistrationUserIdInWaitingListInside))[0]
    }

    let firstOutsideRegistrationUserIdInWaitingList = (await databaseFacade.execute(databaseFacade.queries.getFirstRegistrationUserIdInWaitingListOutside))[0]
    while (availableSpots.outside>0 && firstOutsideRegistrationUserIdInWaitingList!=undefined) {
      await this.addOutsideSpotToWaitingRegistration(firstOutsideRegistrationUserIdInWaitingList.userid)

      allRegistrations = await this.getAllRegistrations()
      availableSpots = this.getSpotAvailabilityCount(allRegistrations)
      firstOutsideRegistrationUserIdInWaitingList = (await databaseFacade.execute(databaseFacade.queries.getFirstRegistrationUserIdInWaitingListOutside))[0]
    }
  },


  async addInsideSpotToWaitingRegistration (userId) {
    let registration = await this.getRegistrationByUserId(userId)

    if (registration.roomPreference === 'insideonly' || 
        registration.roomPreference === 'insidepreference' && !registration.receivedOutsideSpot) {
      if (this.isAutomaticPaymentDeadlineAssignmentAvailable()) {
        await databaseFacade.execute(databaseFacade.queries.addInsideSpotToRegistration, [conInfo.originalPaymentDeadline, userId])
      }
      else {
        await databaseFacade.execute(databaseFacade.queries.addInsideSpotWithoutDeadlineToRegistration, [userId])
      }
    }

    else if (registration.roomPreference === 'insidepreference' && registration.receivedOutsideSpot) {
      if (this.isAutomaticPaymentDeadlineAssignmentAvailable()) {
        await databaseFacade.execute(databaseFacade.queries.addInsideSpotToRegistrationAndRemoveOutsideSpot, [conInfo.originalPaymentDeadline, userId])
      }
      else {
        await databaseFacade.execute(databaseFacade.queries.addInsideSpotWithoutDeadlineToRegistrationAndRemoveOutsideSpot, [userId])
      }
    }
  },


  async addOutsideSpotToWaitingRegistration (userId) {
    if (this.isAutomaticPaymentDeadlineAssignmentAvailable()) {
      await databaseFacade.execute(databaseFacade.queries.addOutsideSpotToRegistration, [conInfo.originalPaymentDeadline, userId])
    }
    else {
      await databaseFacade.execute(databaseFacade.queries.addOutsideSpotWithoutDeadlineToRegistration, [userId])
    }
  },


  isAutomaticPaymentDeadlineAssignmentAvailable () {
    return new Date() < new Date(conInfo.newRegShouldGetManuallySetDeadlineDate)
  },


  getSpotAvailabilityCount (allRegistrations) {
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


  validateRegistrationDetails (userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize) {
    let areFieldsOk = utils.areFieldsDefinedAndNotNull(userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie)
    let areMerchSizesOk = this.areMerchAndSizesValid(buyHoodie, hoodieSize, buyTshirt, tshirtSize)

    return this.isRoomPreferenceLegal(roomPreference) && areFieldsOk && areMerchSizesOk
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
    utils.convertIntsToBoolean(registration, 'earlyArrival', 'lateDeparture', 'buyTshirt', 'buyHoodie', 'needsManualPaymentDeadline', 'isAdminApproved', 'receivedInsideSpot', 'receivedOutsideSpot', 'isPaid')
  }
}