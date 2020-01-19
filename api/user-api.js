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
        this.createUser.bind(this), req.body.username, req.body.telegramUsername, req.body.password1, req.body.password2, req.body.firstName, req.body.lastName, req.body.email, req.body.dateOfBirth, req.body.phone, req.body.isVegan, req.body.isFursuiter, req.body.allergiesText, req.body.addressLine1, req.body.addressLine2, req.body.addressCity, req.body.addressStateProvince, req.body.addressCountry, req.body.pickupType, req.body.pickupTime, req.body.additionalInfo)
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
        this.saveUser.bind(this), Number(req.params.id), req.body.username, req.body.telegramUsername, req.body.firstName, req.body.lastName, req.body.email, req.body.dateOfBirth, req.body.phone, req.body.isVegan, req.body.isFursuiter, req.body.allergiesText, req.body.addressLine1, req.body.addressLine2, req.body.addressCity, req.body.addressStateProvince, req.body.addressCountry, req.body.pickupType, req.body.pickupTime, req.body.additionalInfo)

      let newUserData = await handle(res, throwErr,
        this.getUser.bind(this), Number(req.params.id))

      res.json(newUserData)
    })

    app.post('/api/users/:id/as-admin', async (req, res, throwErr) => {
      let response = await handleAndAuthorize(req, res, throwErr, Number(req.params.id),
        this.saveUserAsAdmin.bind(this), Number(req.params.id), req.body.username, req.body.telegramUsername, req.body.firstName, req.body.lastName, req.body.email, req.body.dateOfBirth, req.body.phone, req.body.isVegan, req.body.isFursuiter, req.body.allergiesText, req.body.addressLine1, req.body.addressLine2, req.body.addressCity, req.body.addressStateProvince, req.body.addressCountry, req.body.pickupType, req.body.pickupTime, req.body.isVolunteer, req.body.isDriver, req.body.isAdmin, req.body.additionalInfo)

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

  async saveUser (userId, username, telegramUsername, firstName, lastName, email, dateOfBirth, phone, isVegan, isFursuiter, allergiesText, addressLine1, addressLine2, addressCity, addressStateProvince, addressCountry, pickupType, pickupTime, additionalInfo) {
    this.validateUserFields(userId, username, firstName, lastName, email, dateOfBirth, phone, isVegan, isFursuiter, addressLine1, addressCity, addressCountry)

    pickupTime = this.fixPickupTime(pickupType, pickupTime)

    let saveUserQueryParams = [username, telegramUsername, firstName, lastName, email, new Date(dateOfBirth), phone, isVegan, isFursuiter, allergiesText, addressLine1, addressLine2, addressCity, addressStateProvince, addressCountry, pickupType, pickupTime, additionalInfo, userId]
    await databaseFacade.execute(databaseFacade.queries.saveUser, saveUserQueryParams)

    return {success: true}
  },

  async saveUserAsAdmin (userId, username, telegramUsername, firstName, lastName, email, dateOfBirth, phone, isVegan, isFursuiter, allergiesText, addressLine1, addressLine2, addressCity, addressStateProvince, addressCountry, pickupType, pickupTime, isVolunteer, isDriver, isAdmin, additionalInfo) {
    this.validateUserFields(userId, username, firstName, lastName, email, dateOfBirth, phone, isVegan, isFursuiter, addressLine1, addressCity, addressCountry)
    this.validateUserAdminFields(isVolunteer, isDriver, isAdmin)

    pickupTime = this.fixPickupTime(pickupType, pickupTime)

    let saveUserQueryParams = [username, telegramUsername, firstName, lastName, email, new Date(dateOfBirth), phone, isVegan, isFursuiter, allergiesText, addressLine1, addressLine2, addressCity, addressStateProvince, addressCountry, pickupType, pickupTime, additionalInfo, isVolunteer, isDriver, isAdmin, userId]
    await databaseFacade.execute(databaseFacade.queries.saveUserAsAdmin, saveUserQueryParams)

    return {success: true}
  },

  validateUserFields (userId, username, firstName, lastName, email, dateOfBirth, phone, isVegan, isFursuiter, addressLine1, addressCity, addressCountry) {
    let fields = [userId, username, firstName, lastName, email, dateOfBirth, phone, addressLine1, addressCity, addressCountry]
    let fieldNames = ['user id', 'username', 'first name', 'last name', 'email', 'date of birth', 'phone', 'address line 1', 'address city', 'address country']
    for (let i=0; i<fields.length; i++) {
      if (!fields[i]) {
        utils.throwError(`Missing or invalid fields (${fieldNames[i]})`)
      }
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

  async createUser (username, password1, password2, firstName, lastName, email, dateOfBirth, phone, isVegan, isFursuiter, allergiesText, addressLine1, addressLine2, addressCity, addressStateProvince, addressCountry, additionalInfo) {
    if (!username || !password1 || !password2 || !firstName|| !password1 || !password2 || !firstName || !lastName || !email || !dateOfBirth || !phone || isVegan===undefined || isFursuiter===undefined || !addressLine1 || !addressCity || !addressCountry) {
      utils.throwError('Missing or invalid fields')
    }
    
    let hashedPassword = await authApi.validateUserAndHashPassword(username, email, password1, password2)

    let createUserQuery = 'INSERT INTO user (username, password, firstname, lastname, email, dateofbirth, phone, isvegan, isfursuiter, allergiestext, addressline1, addressline2, addresscity, addressstateprovince, addresscountry, additionalinfo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    let createUserQueryParams = [username, hashedPassword, firstName, lastName, email, dateOfBirth, phone, isVegan, isFursuiter, allergiesText, addressLine1, addressLine2, addressCity, addressStateProvince, addressCountry, additionalInfo]

    let result = await databaseFacade.execute(createUserQuery, createUserQueryParams)
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