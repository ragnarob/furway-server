const databaseFacade = require('../utils/database-facade')
const handle = require('../utils/handle-route')
const authApi = require('./auth-api')
const utils = require('../utils/utils')

module.exports = {
  setupRoutes () {
    app.get('/api/user', async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.getUserFromSession.bind(this), req)
      res.json(response)
    })

    app.get('/api/users/:id', async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.getUser.bind(this), req, Number(req.params.id))
      res.json(response)
    })

    app.post('/api/users', async (req, res, throwErr) => {
      let insertId = await handle(res, throwErr,
        this.createUser.bind(this), req.body.username, req.body.firstName, req.body.lastName, req.body.email, req.body.dateOfBirth, req.body.phone, req.body.isVegan, req.body.isFursuiter, req.body.allergiesText, req.body.addressLine1, req.body.addressLine2, req.body.addressCity, req.body.addressStateProvince, req.body.addressCountry, req.body.additionalInfo)

      let newUserData = await handle(res, throwErr,
        this.getUser.bind(this), req, insertId)
      res.json(newUserData)
    })

    app.post('/api/users/:id/updateprivileges', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr, 
        this.updateUserPrivileges.bind(this), Number(req.params.id), req.body.isModerator, req.body.isAdmin)
      res.json(response)
    })

    app.post('/api/users/:id', async (req, res, throwErr) => {
      let response = await handle(res, throwErr, 
        this.saveUser.bind(this), req, Number(req.params.id), req.body.username, req.body.firstName, req.body.lastName, req.body.email, req.body.dateOfBirth, req.body.phone, req.body.isVegan, req.body.isFursuiter, req.body.allergiesText, req.body.addressLine1, req.body.addressLine2, req.body.addressCity, req.body.addressStateProvince, req.body.addressCountry, req.body.additionalInfo)
      
      let newUserData = await handle(res, throwErr,
        this.getUser(req, Number(req.params.id)))
      res.json(newUserData)
    })
  },

  async getUserFromSession (req) {
    if (!req || !req.session || !req.session.user || !req.session.user.id) {
      return {user: undefined}
    }
    else {
      return await this.getUser(req.session.user.id)
    }
  },

  async getUser (req, userId) {
    await this.authorizeUserOrAdmin(req, userId)

    let getUserQuery = 'SELECT user.id as id, user.username as username, user.firstname as firstName, user.lastname as lastName, user.email as email, user.dateofbirth as dateOfBirth, user.phone as phone, user.isvegan as isVegan, user.isFursuiter as isfursuiter, user.allergiestext as allergiestext, user.addressline1 as addressline1, user.addressline2 as addressLine2, user.addresscity as addressCity, user.addressstateprovince as addressStateProvince, user.addresscountry as addressCountry, user.additionalinfo as additionalInfo, user.isvolunteer as isVolunteer, user.isadmin AS isAdmin, registration.id as registrationId FROM user LEFT JOIN registration ON (user.registrationId = registration.id) WHERE id=?'
    let getUserQueryParams = [userId]
    let userData = await databaseFacade.execute(getUserQuery, getUserQueryParams)
    
    if (userData.length === 0) {
      return {user: undefined}
    }

    return userData[0]
  },

  async saveUser (req, userId, username, firstName, lastName, email, dateOfBirth, phone, isVegan, isFursuiter, allergiesText, addressLine1, addressLine2, addressCity, addressStateProvince, addressCountry, additionalInfo) {
    if (!userId || !username || !firstName || !lastName || !email || !dateOfBirth || !phone || !addressLine1 || !addressCity || !addressCountry || !this.validateUsername(username)) {
      utils.throwError('Missing or invalid fields', 400)
    }
    await this.authorizeUserOrAdmin(req, userId)

    let saveUserQuery = 'UPDATE user SET username=?, firstname=?, lastname=?, email=?, dateofbirth=?, phone=?, isvegan=?, isfursuiter=?, allergiestext=?, addressline1=?, addressline2=?, addresscity=?, addressstateprovince=?, addresscountry=?, additionalinfo=? WHERE id=?'
    let saveUserQueryParams = [username, firstName, lastName, email, dateOfBirth, phone, isVegan, isFursuiter, allergiesText, addressLine1, addressLine2, addressCity, addressStateProvince, addressCountry, additionalInfo. userId]
    await databaseFacade.execute(saveUserQuery, saveUserQueryParams)

    return {success: true}
  },

  async authorizeUserOrAdmin (req, userId) {
    let user = authApi.getUser(req)
    if (!user || user.id !== userId || !authApi.authorizeAdminUser(req)) {
      utils.throwError('No permission', 401)
    }
  },

  async createUser (username, password1, password2, firstName, lastName, email, dateOfBirth, phone, isVegan, isFursuiter, allergiesText, addressLine1, addressLine2, addressCity, addressStateProvince, addressCountry, additionalInfo) {
    if (!username || !password1 || !password2 || !firstName || !lastName || !email || !dateOfBirth || !phone || !isVegan || !isFursuiter || !allergiesText || !addressLine1 || !addressCity || !addressCountry || !additionalInfo || !this.validateUsername(username) || !this.validatePassword(password1) || !this.validatePassword(password2) || !password1 !== password2) {
      utils.throwError('Missing or invalid fields', 400)
    }

    let createUserQuery = 'INSERT INTO user (username, firstname, lastname, email, dateofbirth, phone, isvegan, isfursuiter, allergiestext, addressline1, addressline2, addresscity, addressstateprovince, addresscountry, additionalinfo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    let createUserQueryParams = [username, firstName, lastName, email, dateOfBirth, phone, isVegan, isFursuiter, allergiesText, addressLine1, addressLine2, addressCity, addressStateProvince, addressCountry, additionalInfo]

    let result = await databaseFacade.execute(createUserQuery, createUserQueryParams)
    return result.insertId
  },

  async updateUserPrivileges (userId, isVolunteer, isAdmin) {
    let updateQuery = 'UPDATE user SET isvolunteer=?, isadmin=? WHERE id=?'
    let updateQueryParams = [isVolunteer, isAdmin, userId]
    await databaseFacade.execute(updateQuery, updateQueryParams)

    return {success: true}
  },

  validateUsername (username) {
    return /^[a-zA-ZÆØÅæøå][\w\d_-ÆØÅæøå]{1,19}$/.test(username)
  },

  validatePassword (password) {
    return password.length >= 6
  }
}