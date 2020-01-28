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
    
    app.post('/api/registrations/user/:userId/update-payment-status', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.updateRegistrationPaymentStatus.bind(this), Number(req.params.userId), req.body.isMainDaysInsidePaid, req.body.isMainDaysOutsidePaid, req.body.isLateDeparturePaid, req.body.isEarlyArrivalPaid, req.body.isHoodiePaid, req.body.isTshirtPaid)
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
      registration.isMainDaysPaid = this.isMainDaysPaid(registration)
      registration.isAddonsPaid = this.isAddonsPaid(registration)

      let amounts = this.getPaidAndUnpaidAmount(registration)
      registration.paidAmount = amounts.paid
      registration.unpaidAmount = amounts.unpaid

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
    registrationData.isMainDaysPaid = this.isMainDaysPaid(registrationData)
    registrationData.isAddonsPaid = this.isAddonsPaid(registrationData)
    this.parseRegistrationBooleans(registrationData)

    if (this.isRegistrationInWaitingList(registrationData)) {
      let wantsInsideRoom = registrationData['roomPreference'] === 'insideonly' || registrationData['roomPreference'] === 'insidepreference'
      let wantsOutsideRoom = registrationData['roomPreference'] === 'outsideonly' || registrationData['roomPreference'] === 'insidepreference'
      let receivedOutsideSpot = registrationData['receivedOutsideSpot'] === true
      registrationData.waitingListPositions = this.getWaitingListPositionsByRegistrationId(registrationData.id, wantsInsideRoom, wantsOutsideRoom, receivedOutsideSpot)
    }
    else {
      registrationData.waitingListPositions = {inside: null, outside: null}
    }

    let amounts = this.getPaidAndUnpaidAmount(registrationData)
    registrationData.paidAmount = amounts.paid
    registrationData.unpaidAmount = amounts.unpaid

    return registrationData
  },


  isMainDaysPaid (registration) {
    return registration.receivedInsideSpot && registration.isMainDaysInsidePaid
           || registration.receivedOutsideSpot && registration.isMainDaysOutsidePaid
  },


  isAddonsPaid (registration) {
    return registration.buyHoodie ? registration.isHoodiePaid : true
           && registration.buyTshirt ? registration.isTshirtPaid : true
           && registration.earlyArrival ? registration.isEarlyArrivalPaid : true
           && registration.lateDeparture ? registration.isLateDeparturePaid : true 
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


  getPaidAndUnpaidAmount (registration) {
    let unpaidAmount = 0
    let paidAmount = 0

    let mainDaysPrice = registration.receivedInsideSpot === true ? conInfo.mainDaysInsidePriceNok : conInfo.mainDaysOutsidePriceNok
    if (this.isMainDaysPaid(registration)) {paidAmount += mainDaysPrice }
    else { unpaidAmount += mainDaysPrice }

    if (registration.earlyArrival) {
      if (registration.isEarlyArrivalPaid) { paidAmount += conInfo.earlyArrivalPriceNok }
      else { unpaidAmount += conInfo.earlyArrivalPriceNok }
    }
    if (registration.lateDeparture) {
      if (registration.isLateDeparturePaid) { paidAmount += conInfo.lateDeparturePriceNok }
      else { unpaidAmount += conInfo.lateDeparturePriceNok }
    }
    if (registration.buyHoodie) {
      if (registration.isHoodiePaid) { paidAmount += conInfo.hoodiePriceNok }
      else { unpaidAmount += conInfo.hoodiePriceNok }
    }
    if (registration.buyTshirt) {
      if (registration.isTshirtPaid) { paidAmount += conInfo.tshirtPriceNok }
      else { unpaidAmount += conInfo.tshirtPriceNok }
    }

    return {
      paid: paidAmount,
      unpaid: unpaidAmount
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


  async updateRegistrationPaymentStatus (userId, isMainDaysInsidePaid, isMainDaysOutsidePaid, isLateDeparturePaid, isEarlyArrivalPaid, isHoodiePaid, isTshirtPaid) {
    await databaseFacade.execute(databaseFacade.queries.updateRegistrationPaymentStatus, [isMainDaysInsidePaid, isMainDaysOutsidePaid, isLateDeparturePaid, isEarlyArrivalPaid, isHoodiePaid, isTshirtPaid, userId])

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
      return await this.updateRejectedRegistration(roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize)
    }

    if (existingRegistration.isAdminApproved === true) {
      return await this.updateApprovedRegistration(existingRegistration, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize)
    }

    return {'error': 'Server error: Found nothing to update'}
  },


  async updateUnprocessedRegistration (userId, roomPreference) {
    await databaseFacade.execute(databaseFacade.queries.updateRegistrationOnlyRoomPreference, [roomPreference, userId])
    
    return {success: true}
  },


  async updateApprovedRegistration (existingRegistration, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize) {
    if (this.arePaidItemsRemoved(existingRegistration, earlyArrival, lateDeparture, buyTshirt, buyHoodie)) {
      utils.throwError('You cannot remove items you\'ve already paid for')
    }
    if (this.areAddonsAddedAfterDeadlines(existingRegistration, earlyArrival, lateDeparture, buyTshirt, buyHoodie)) {
      utils.throwError(`It's too late to add some of these purchasable items`)
    }

    if (roomPreference !== existingRegistration.roomPreference) {
      await this.updateRoomPreference(existingRegistration, roomPreference)
    }
    
    await this.updateRegistrationAddons(existingRegistration, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize)

    this.moveRegistrationsFromWaitingListIfPossible()

    return {'success': true}
  },


  async updateRoomPreference (existingRegistration, newRoomPreference) {
    if (existingRegistration.isMainDaysInsidePaid || existingRegistration.isMainDaysOutsidePaid) {
      utils.throwError('You cannot change ticket type because you have already paid for it')
    }

    if (existingRegistration.roomPreference === 'insidepreference') {
      if (existingRegistration.receivedOutsideSpot && newRoomPreference === 'insideonly') {
        await this.removeCurrentSpotAndAddToOtherQueue('insideonly', existingRegistration.userId)
      }
      else {
        await this.addToOtherQueue(newRoomPreference, existingRegistration.userId)
      }
    }

    else if (existingRegistration.roomPreference === 'insideonly' || existingRegistration.roomPreference === 'outsideonly') {
      if (newRoomPreference === 'insidepreference') {
        await this.addToInsidePreferenceQueue(existingRegistration.userId)
      }

      else if (newRoomPreference === 'insideonly' || newRoomPreference === 'outsideonly') {
        await this.removeCurrentSpotAndAddToOtherQueue(newRoomPreference, existingRegistration.userId)
      }
    }
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
  addToInsidePreferenceQueue: async userId => await databaseFacade.execute(databaseFacade.queries.updateRoomPreference, ['insidepreference', userId]),
  removeCurrentSpotAndAddToOtherQueue: async (newRoomPref, userId) => await databaseFacade.execute(databaseFacade.queries.updateRoomPreferenceAndResetSpot, [newRoomPref, userId]),


  async deleteRegistration (userId) {
    let registrationData = await this.getRegistrationByUserId(userId)

    let saveCancelledRegQueryParams = [userId, registrationData.roomPreference, registrationData.earlyArrival, registrationData.lateDeparture, registrationData.buyTshirt, registrationData.buyHoodie, registrationData.tshirtSize, registrationData.hoodieSize, registrationData.timestamp, registrationData.paymentDeadline, registrationData.needsManualPaymentDeadline, registrationData.isAdminApproved, registrationData.receivedInsideSpot, registrationData.receivedOutsideSpot, registrationData.isMainDaysInsidePaid, registrationData.isMainDaysOutsidePaid, registrationData.isEarlyArrivalPaid, registrationData.isLateDeparturePaid, registrationData.isHoodiePaid, registrationData.isTshirtPaid]

    await databaseFacade.execute(databaseFacade.queries.saveCancelledRegistration, saveCancelledRegQueryParams)

    await databaseFacade.execute(databaseFacade.queries.deleteRegistration, [userId])

    await this.moveRegistrationsFromWaitingListIfPossible()

    return {success: true}
  },


  async updateRejectedRegistration (userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize) {
    await databaseFacade.execute(databaseFacade.queries.updateRejectedRegistrationDetails(userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize))

    return {success: true}
  },

  
  arePaidItemsRemoved (existingRegistration, earlyArrival, lateDeparture, buyTshirt, buyHoodie) {
    return existingRegistration.earlyArrival === 1 && existingRegistration.isEarlyArrivalPaid && earlyArrival === false
           || existingRegistration.lateDeparture === 1 && existingRegistration.isLateDeparturePaid && lateDeparture === false
           || existingRegistration.buyTshirt === 1 && existingRegistration.isTshirtPaid && buyTshirt === false
           || existingRegistration.buyHoodie === 1 && existingRegistration.isHoodiePaid && buyHoodie === false
  },


  arePurchasableItemsAdded (existingRegistration, earlyArrival, lateDeparture, buyTshirt, buyHoodie) {
    return existingRegistration.earlyArrival === false && earlyArrival === true
           || existingRegistration.lateDeparture === false && lateDeparture === true
           || existingRegistration.buyTshirt === false && buyTshirt === true
           || existingRegistration.buyHoodie === false && buyHoodie === true
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

  async authorizeAdmin (req) {
    let isAdmin = await authApi.authorizeAdminUser(req)
    if (!isAdmin) {
      utils.throwError('No permission')
    }
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
      insideSpotsPaid: 0,
      outsideSpotsPaid: 0,
      insideSpotsPartiallyPaid: 0,
      insideSpotsReceived: 0,
      outsideSpotsReceived: 0,
      insideSpotsWaitingListLength: 0,
      outsideSpotsWaitingListLength: 0,
    }

    for (let registration of allRegistrations) {
      if (registration.roomPreference === 'insideonly') {
        if (registration.receivedInsideSpot) {
          numbers.insideSpotsReceived++

          if (registration.isMainDaysInsidePaid) {
            numbers.insideSpotsPaid++
          }
        }

        else {
          numbers.insideSpotsWaitingListLength++
        }
      }

      else if (registration.roomPreference === 'outsideonly') {
        if (registration.receivedOutsideSpot) {
          numbers.outsideSpotsReceived++

          if (registration.isMainDaysOutsidePaid) {
            numbers.outsideSpotsPaid++
          }
        }

        else {
          numbers.outsideSpotsWaitingListLength++
        }
      }

      else if (registration.roomPreference === 'insidepreference') {
        if (registration.receivedInsideSpot) {
          numbers.insideSpotsReceived++

          if (registration.isMainDaysInsidePaid) {
            numbers.insideSpotsPaid++
          }
          else if (registration.isMainDaysOutsidePaid) {
            numbers.insideSpotsPartiallyPaid++
          }
        }
        
        else if (registration.receivedOutsideSpot) {
          numbers.insideSpotsWaitingListLength++
          numbers.outsideSpotsReceived++

          if (registration.isMainDaysOutsidePaid) {
            numbers.outsideSpotsPaid++
          }
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
    utils.convertIntsToBoolean(registration, 'earlyArrival', 'lateDeparture', 'buyTshirt', 'buyHoodie', 'needsManualPaymentDeadline', 'isAdminApproved', 'receivedInsideSpot', 'receivedOutsideSpot', 'isMainDaysInsidePaid', 'isMainDaysOutsidePaid', 'isEarlyArrivalPaid', 'isLateDeparturePaid', 'isHoodiePaid', 'isTshirtPaid', 'isMainDaysPaid', 'isAddonsPaid')
  }
}