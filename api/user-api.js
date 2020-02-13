const databaseFacade = require('../utils/database-facade')
const handlers = require('../utils/handle-route')
const handle = handlers.handleRoute
const handleAndAuthorize = handlers.handleRouteAndAuthorize
const authApi = require('./auth-api')
const utils = require('../utils/utils.js')

module.exports = {
  setupRoutes () {
    app.get('/api/user', async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.getUserFromSession.bind(this), req)

      res.json(response)
    })

    app.get('/api/users/:id', async (req, res, throwErr) => {
      let response = await handleAndAuthorize(req, res, throwErr, Number(req.params.id),
        this.getUser.bind(this), Number(req.params.id))
      res.json(response)
    })

    app.post('/api/users', async (req, res, throwErr) => {
      let insertId = await handle(res, throwErr,
        this.createUser.bind(this), req.body.username, req.body.telegramUsername, req.body.password1, req.body.password2, req.body.firstName, req.body.lastName, req.body.email, req.body.dateOfBirth, req.body.phone, req.body.phoneCountryCode, req.body.isVegan, req.body.isFursuiter, req.body.allergiesText, req.body.addressLine1, req.body.addressLine2, req.body.addressCity, req.body.addressStateProvince, req.body.addressCountry, req.body.pickupType, req.body.pickupTime, req.body.additionalInfo)
      await handle(req, throwErr,
        authApi.login.bind(authApi), req, req.body.username, req.body.password1)

      let userData = await handle(res, throwErr,
        this.getUser.bind(this), insertId)
      res.json(userData)
    })

    app.post('/api/users/:id/updateprivileges', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr, 
        this.updateUserPrivileges.bind(this), Number(req.params.id), req.body.isVolunteer, req.body.isAdmin)
      res.json(response)
    })

    app.post('/api/users/:id', async (req, res, throwErr) => {
      await handleAndAuthorize(req, res, throwErr, Number(req.params.id),
        this.saveUser.bind(this), Number(req.params.id), req.body.username, req.body.telegramUsername, req.body.firstName, req.body.lastName, req.body.email, req.body.dateOfBirth, req.body.phone, req.body.phoneCountryCode, req.body.isVegan, req.body.isFursuiter, req.body.allergiesText, req.body.addressLine1, req.body.addressLine2, req.body.addressCity, req.body.addressStateProvince, req.body.addressCountry, req.body.pickupType, req.body.pickupTime, req.body.additionalInfo)

      let newUserData = await handle(res, throwErr,
        this.getUser.bind(this), Number(req.params.id))

      res.json(newUserData)
    })

    app.post('/api/users/:id/as-admin', async (req, res, throwErr) => {
      let response = await handleAndAuthorize(req, res, throwErr, Number(req.params.id),
        this.saveUserAsAdmin.bind(this), Number(req.params.id), req.body.username, req.body.telegramUsername, req.body.firstName, req.body.lastName, req.body.email, req.body.dateOfBirth, req.body.phone, req.body.phoneCountryCode, req.body.isVegan, req.body.isFursuiter, req.body.allergiesText, req.body.addressLine1, req.body.addressLine2, req.body.addressCity, req.body.addressStateProvince, req.body.addressCountry, req.body.pickupType, req.body.pickupTime, req.body.isVolunteer, req.body.isDriver, req.body.isAdmin, req.body.additionalInfo)

      res.json(response)
    })

    app.post('/api/users/:id/delete', async (req, res, throwErr) => {
      let response = await handleAndAuthorize(req, res, throwErr, Number(req.params.id),
        this.deleteUser.bind(this), Number(req.params.id))

      res.json(response)
    })
  },

  async getUserFromSession (req) {
    if (!req || !req.session || !req.session.user || !req.session.user.id) {
      return {user: null}
    }
    else {
      return await this.getUser(req.session.user.id)
    }
  },

  async getUser (userId) {
    let getUserQueryParams = [userId]
    let userData = await databaseFacade.execute(databaseFacade.queries.getUserById, getUserQueryParams)
    
    if (userData.length === 0) {
      return {user: null}
    }

    userData = utils.parseUserBooleans(userData[0])

    return userData
  },

  async saveUser (userId, username, telegramUsername, firstName, lastName, email, dateOfBirth, phone, phoneCountryCode, isVegan, isFursuiter, allergiesText, addressLine1, addressLine2, addressCity, addressStateProvince, addressCountry, pickupType, pickupTime, additionalInfo) {
    this.validateUserFields(username, firstName, lastName, email, dateOfBirth, phone, phoneCountryCode, isVegan, isFursuiter, addressLine1, addressCity, addressCountry)

    pickupTime = this.fixPickupTime(pickupType, pickupTime)

    let saveUserQueryParams = [username, telegramUsername, firstName, lastName, email, new Date(dateOfBirth), phone, phoneCountryCode, isVegan, isFursuiter, allergiesText, addressLine1, addressLine2, addressCity, addressStateProvince, addressCountry, pickupType, pickupTime, additionalInfo, userId]
    await databaseFacade.execute(databaseFacade.queries.saveUser, saveUserQueryParams)

    return {success: true}
  },

  async saveUserAsAdmin (userId, username, telegramUsername, firstName, lastName, email, dateOfBirth, phone, phoneCountryCode, isVegan, isFursuiter, allergiesText, addressLine1, addressLine2, addressCity, addressStateProvince, addressCountry, pickupType, pickupTime, isVolunteer, isDriver, isAdmin, additionalInfo) {
    this.validateUserFields(username, firstName, lastName, email, dateOfBirth, phone, phoneCountryCode, isVegan, isFursuiter, addressLine1, addressCity, addressCountry)
    this.validateUserAdminFields(isVolunteer, isDriver, isAdmin)

    pickupTime = this.fixPickupTime(pickupType, pickupTime)

    let saveUserQueryParams = [username, telegramUsername, firstName, lastName, email, new Date(dateOfBirth), phone, phoneCountryCode, isVegan, isFursuiter, allergiesText, addressLine1, addressLine2, addressCity, addressStateProvince, addressCountry, pickupType, pickupTime, additionalInfo, isVolunteer, isDriver, isAdmin, userId]
    await databaseFacade.execute(databaseFacade.queries.saveUserAsAdmin, saveUserQueryParams)

    return {success: true}
  },

  validateUserFields (username, firstName, lastName, email, dateOfBirth, phone, phoneCountryCode, isVegan, isFursuiter, addressLine1, addressCity, addressCountry) {
    let fields = [username, firstName, lastName, email, dateOfBirth, phone, phoneCountryCode, addressLine1, addressCity, addressCountry]
    let fieldNames = ['username', 'first name', 'last name', 'email', 'date of birth', 'phone', 'phone country code', 'address line 1', 'zip code and area', 'address country']
    for (let i=0; i<fields.length; i++) {
      if (!fields[i]) {
        utils.throwError(`Missing or invalid fields (${fieldNames[i]})`)
      }
    }

    let isValidEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email)
    if (!isValidEmail) {
      utils.throwError('Invalid email address')
    }

    let booleanFields = [isFursuiter, isVegan]
    let booleanFieldNames = ['fursuiter, vegan']
    for (let i=0; i<booleanFields.length; i++) {
      if (booleanFields[i] === null || booleanFields[i] === undefined) {
        utils.throwError(`Missing or invalid fields (${booleanFieldNames[i]})`)
      }
    }
    
    if (!utils.validateUsername(username)) {
      utils.throwError(`Missing or invalid fields (username)`)
    }
  },

  validateUserAdminFields (isVolunteer, isDriver, isAdmin) {
    let booleanFields = [isVolunteer, isDriver, isAdmin]
    let booleanFieldNames = ['volunteer', 'driver', 'admin']
    for (let i=0; i<booleanFields.length; i++) {
      if (booleanFields[i] === null || booleanFields[i] === undefined) {
        utils.throwError(`Missing or invalid fields (${booleanFieldNames[i]})`)
      }
    }
  },

  fixPickupTime (pickupType, pickupTime) {
    if (pickupTime !== null && pickupType === null) {
      return null
    }
    if (pickupTime !== null && pickupType !== null) {
      return new Date(pickupTime)
    }
  },

  async deleteUser (userId) {
    let user = await this.getUser(userId)
    if (user.registrationId !== null) {
      utils.throwError('User has a registration which must be deleted first')
    }

    await databaseFacade.execute(databaseFacade.queries.deleteUser, [userId])

    return {'success': true}
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

  async createUser (username, telegramUsername, password1, password2, firstName, lastName, email, dateOfBirth, phone, phoneCountryCode, isVegan, isFursuiter, allergiesText, addressLine1, addressLine2, addressCity, addressStateProvince, addressCountry, pikcupType, pickupTime, additionalInfo) {
    this.validateUserFields(username, firstName, lastName, email, dateOfBirth, phone, phoneCountryCode, isVegan, isFursuiter, addressLine1, addressCity, addressCountry)
    
    let hashedPassword = await authApi.validateUserAndHashPassword(username, email, password1, password2)

    let createUserQueryParams = [username, telegramUsername, hashedPassword, firstName, lastName, email, dateOfBirth, phone, phoneCountryCode, isVegan, isFursuiter, allergiesText, addressLine1, addressLine2, addressCity, addressStateProvince, addressCountry, pikcupType, pickupTime, additionalInfo]

    let result = await databaseFacade.execute(databaseFacade.queries.createUser, createUserQueryParams)
    
    return result.insertId
  },

  async updateUserPrivileges (userId, isVolunteer, isAdmin) {
    let updateQuery = 'UPDATE user SET isvolunteer=?, isadmin=? WHERE id=?'
    let updateQueryParams = [isVolunteer, isAdmin, userId]
    await databaseFacade.execute(updateQuery, updateQueryParams)

    return {success: true}
  },
}

const varToString = varObj => Object.keys(varObj)[0]