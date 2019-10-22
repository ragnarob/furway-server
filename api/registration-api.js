const databaseFacade = require('../utils/database-facade')
const handle = require('../utils/handle-route')
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

    app.get('/api/registrations/user/:userId', async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.getRegistrationByUserId.bind(this), req, Number(req.params.userId))
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
    
    app.post('/api/registrations/user/:userId/approve', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.approveRegistration.bind(this), Number(req.params.userId));
      res.json(response)
    })
    
    app.post('/api/registrations/user/:userId/reject', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.rejectRegistration.bind(this), Number(req.params.userId), req.body.reason);
      res.json(response)
    })
    
    app.post('/api/registrations/user/:userId/delete', async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.deleteRegistration.bind(this), req, Number(req.params.userId))
      res.json(response)
    })
  },


  async getAllRegistrations () {
    let allRegistrations = await databaseFacade.execute(databaseFacade.queries.getAllRegistrations)
    for (let registration of allRegistrations) {
      registration.isTicketPaid = this.isRegistrationTicketPaid(registration)
    }

    return allRegistrations
  },


  async getRegistrationByUserId (req, userId) {
    await this.authorizeUserOrAdmin(req, userId)

    let registrationData = await databaseFacade.execute(databaseFacade.queries.getRegistration, [userId])

    if (registrationData.length === 0) {
      return {registration: null}
    }

    registrationData = registrationData[0]
    registrationData.isTicketPaid = this.isRegistrationTicketPaid(registrationData)

    return {registration: registrationData}
  },


  isRegistrationTicketPaid (registration) {
    return registration.receivedInsideSpot && registration.isMainDaysInsidePaid
           || registration.receivedOutsideSpot && registration.isMainDaysOutsidePaid
  },


  async addRegistration (req, userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize) {
    await this.authorizeUserOrAdmin(req, userId)

    let existingRegistration = await this.getRegistrationByUserId(req, userId)
    if (existingRegistration.registration !== null) {
      utils.throwError('This user already has a registration')
    }
    
    if (!this.validateRegistrationDetails (userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize)) {
      utils.throwError('Missing or invalid fields')
    }

    let userData = await userApi.getUser(req, userId)
    let registrationOpenDate = userData.isVolunteer ? new Date(conInfo.volunteerRegistrationOpenDate) : new Date(conInfo.registrationOpenDate)
    if (new Date().getTime() < registrationOpenDate.getTime()) {
      utils.throwError('Registration has not yet opened')
    }
    if (new Date().getTime() > new Date(conInfo.registrationCloseDate).getTime()) {
      utils.throwError('Registration has closed')
    }

    await databaseFacade.execute(databaseFacade.queries.addRegistration, [userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize])

    return {success: true}
  },


  async updateRegistration (userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize) {
    await this.authorizeUserOrAdmin(req, userId)

    let existingRegistration = await this.getRegistrationByUserId(req, userId)
    if (existingRegistration.registration === null) {
      utils.throwError('This user has no registration')
    }
    
    if (!this.validateRegistrationDetails (userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize)) {
      utils.throwError('Missing or invalid fields')
    }

    if (existingRegistration.isAdminApproved === null) {
      return await this.updateUnprocessedRegistration(roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize)
    }
    if (existingRegistration.isAdminApproved === 1) {
      if (existingRegistration.isMainDaysPaid) {
        return await this.updatePaidRegistration(existingRegistration, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize)
      }
      else {
        return await this.updateUnpaidRegistration(roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize)
      }
    }
    if (existingRegistration.isAdminApproved === 0) {
      return await this.updateRejectedRegistration(roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize)
    }
  },


  async updateUnprocessedRegistration (userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize) {
    await databaseFacade.execute(databaseFacade.queries.updateRegistration(userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize))
    
    return {success: true}
  },


  async updatePaidRegistration (existingRegistration, userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize) {
    let arePaidItemsRemoved = this.arePaidItemsRemoved(existingRegistration, earlyArrival, lateDeparture, buyTshirt, buyHoodie)
    let arePurchasableItemsAdded = this.arePurchasableItemsAdded(existingRegistration, earlyArrival, lateDeparture, buyTshirt, buyHoodie)

    if (arePaidItemsRemoved) {
      utils.throwError('You cannot remove items you\'ve already paid for')
    }

    if (roomPreference !== existingRegistration.roomPreference) {

    }
  },


  async updateUnpaidRegistration (userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize) {
    await databaseFacade.execute(databaseFacade.queries.updateRegistration(userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize))
    
    return {success: true}
  },


  async updateRejectedRegistration (userId, roomPreference, earlyArrival, lateDeparture, buyTshirt, buyHoodie, tshirtSize, hoodieSize) {
    // update timestamp
  },

  
  arePaidItemsRemoved (existingRegistration, earlyArrival, lateDeparture, buyTshirt, buyHoodie) {
    return existingRegistration.earlyArrival === 1 && earlyArrival === false
           || existingRegistration.lateDeparture === 1 && lateDeparture === false
           || existingRegistration.buyTshirt === 1 && buyTshirt === false
           || existingRegistration.buyHoodie === 1 && buyHoodie === false
  },

  arePurchasableItemsAdded (existingRegistration, earlyArrival, lateDeparture, buyTshirt, buyHoodie) {
    return existingRegistration.earlyArrival === false && earlyArrival === true
           || existingRegistration.lateDeparture === false && lateDeparture === true
           || existingRegistration.buyTshirt === false && buyTshirt === true
           || existingRegistration.buyHoodie === false && buyHoodie === true
  },


  async approveRegistration (userId) {
    await databaseFacade.execute(databaseFacade.queries.approveRegistration, [userId])

    let allRegistrations = await this.getAllRegistrations()
    let approvedRegistration = allRegistrations.find(r => r.userId === userId)

    return {success: true}
  },


  async removeSpotFromUnpaidRegistration (req, userId) {
    await databaseFacade.execute(databaseFacade.queries.removeSpotFromUnpaidRegistration, [userId])

    return {success: true}
    // todo call moveRegistrationFromWaitingListIfPossible
  },


  async moveRegistrationsFromWaitingListIfPossible () {
    let allRegistrations = await this.getAllRegistrations()
    let availableSpots = this.getSpotAvailabilityCount(allRegistrations)

    if (availableSpots.inside > 0) {
      let firstInsideRegistrationUserIdInWaitingList = await databaseFacade.execute(databaseFacade.queries.getFirstRegistrationUserIdInWaitingListInside)
    }
    if (availableSpots.outside > 0) {
      let firstOutsideRegistrationUserIdInWaitingList = await databaseFacade.execute(databaseFacade.queries.getFirstRegistrationUserIdInWaitingListOutside)
    }
  },


  async giveInsideSpotToWaitingRegistration (userId) {
    let registration = this.getRegistrationByUserId(userId)

    if (registration.roomPreference === 'insideonly') {
      if (this.isAutomaticPaymentDeadlineAssignmentAvailable()) {
        await databaseFacade.execute(databaseFacade.queries.addInsideSpotToRegistration, [conInfo.originalPaymentDeadline, userId])
      }
      else {
        await databaseFacade.execute(databaseFacade.queries.addInsideSpotWithoutDeadlineToRegistration, [userId])
      }
    }

    else if (registration.roomPreference === 'insidepreference') {
      if (registration.receivedOutsideSpot) {
        // hard
        if (registration.isMainDaysOutsidePaid) {
          // hardest
        }
        else {
          // easier
        }
      }
      else {
        // easy
      }
    }
  },


  async giveOutsideSpotToWaitingRegistration (userId) {
    let registrationData = this.getRegistrationByUserId(userId)
    if (registrationData.roomPreference === 'outsideonly') {
      // easy
    }
    else if (registrationData.roomPreference === 'insidepreference') {
      // hard
    }
  },


  isAutomaticPaymentDeadlineAssignmentAvailable () {
    return new Date().getTime() < new Date(conInfo.newRegShouldGetManuallySetDeadlineDate).getTime()
  },


  async getSpotAvailabilityCount (allRegistrations) {
    let insideSpotsAvailable = conInfo.numberOfInsideSpots - allRegistrations.filter(r => r.receivedInsideSpot).length
    let outsideSpotsAvailable = conInfo.numberOfOutsideSpots - allRegistrations.filter(r => r.receivedOutsideSpot).length
    return {
      inside: insideSpotsAvailable,
      outside: outsideSpotsAvailable
    }    
  },

  
  async getFirstRegistrationInWaitingList (roomType) {
    
  },


  async rejectRegistration (userId, reason) {
    await databaseFacade.execute(databaseFacade.queries.rejectRegistration, [reason, userId])

    return {success: true}
  },


  async deleteRegistration (req, userId) {
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
}