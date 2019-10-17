const databaseFacade = require('../utils/database-facade')
const handle = require('../utils/handle-route')
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
      let response = await handle(res, throwErr,
        this.getUser.bind(this), req, Number(req.params.id))
      res.json(response)
    })

    app.post('/api/users', async (req, res, throwErr) => {
      let insertId = await handle(res, throwErr,
        this.createUser.bind(this), req.body.username, req.body.password1, req.body.password2, req.body.firstName, req.body.lastName, req.body.email, req.body.dateOfBirth, req.body.phone, req.body.isVegan, req.body.isFursuiter, req.body.allergiesText, req.body.addressLine1, req.body.addressLine2, req.body.addressCity, req.body.addressStateProvince, req.body.addressCountry, req.body.additionalInfo)
      await handle(req, throwErr,
        authApi.login.bind(authApi), req, req.body.username, req.body.password1)

      let userData = await handle(res, throwErr,
        this.getUser.bind(this), req, insertId)
      res.json(userData)
    })

    app.post('/api/users/:id/updateprivileges', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr, 
        this.updateUserPrivileges.bind(this), Number(req.params.id), req.body.isVolunteer, req.body.isAdmin)
      res.json(response)
    })

    app.post('/api/users/:id', async (req, res, throwErr) => {
      await handle(res, throwErr, 
        this.saveUser.bind(this), req, Number(req.params.id), req.body.username, req.body.firstName, req.body.lastName, req.body.email, req.body.dateOfBirth, req.body.phone, req.body.isVegan, req.body.isFursuiter, req.body.allergiesText, req.body.addressLine1, req.body.addressLine2, req.body.addressCity, req.body.addressStateProvince, req.body.addressCountry, req.body.additionalInfo)

      let newUserData = await handle(res, throwErr,
        this.getUser.bind(this), req, Number(req.params.id))
      res.json(newUserData)
    })
  },

  async getUserFromSession (req) {
    if (!req || !req.session || !req.session.user || !req.session.user.id) {
      return {user: null}
    }
    else {
      return await this.getUser(req, req.session.user.id)
    }
  },

  async getUser (req, userId) {
    await this.authorizeUserOrAdmin(req, userId)

    let getUserQuery = 'SELECT user.id as id, user.username as username, user.firstname as firstName, user.lastname as lastName, user.email as email, user.dateofbirth as dateOfBirth, user.phone as phone, user.isvegan as isVegan, user.isFursuiter as isFursuiter, user.allergiestext as allergiestext, user.addressline1 as addressLine1, user.addressline2 as addressLine2, user.addresscity as addressCity, user.addressstateprovince as addressStateProvince, user.addresscountry as addressCountry, user.additionalinfo as additionalInfo, user.isvolunteer as isVolunteer, user.isadmin AS isAdmin, registration.id as registrationId FROM user LEFT JOIN registration ON (registration.userId = user.id) WHERE user.id=?'
    let getUserQueryParams = [userId]
    let userData = await databaseFacade.execute(getUserQuery, getUserQueryParams)
    
    if (userData.length === 0) {
      return {user: null}
    }
    return userData[0]
  },

  async saveUser (req, userId, username, firstName, lastName, email, dateOfBirth, phone, isVegan, isFursuiter, allergiesText, addressLine1, addressLine2, addressCity, addressStateProvince, addressCountry, additionalInfo) {
    if (!userId || !username || !firstName || !lastName || !email || !dateOfBirth || !phone || !addressLine1 || !addressCity || !addressCountry || !utils.validateUsername(username)) {
      utils.throwError('Missing or invalid fields')
    }
    await this.authorizeUserOrAdmin(req, userId)

    let saveUserQuery = 'UPDATE user SET username=?, firstname=?, lastname=?, email=?, dateofbirth=?, phone=?, isvegan=?, isfursuiter=?, allergiestext=?, addressline1=?, addressline2=?, addresscity=?, addressstateprovince=?, addresscountry=?, additionalinfo=? WHERE id=?'
    let saveUserQueryParams = [username, firstName, lastName, email, new Date(dateOfBirth), phone, isVegan, isFursuiter, allergiesText, addressLine1, addressLine2, addressCity, addressStateProvince, addressCountry, additionalInfo, userId]
    await databaseFacade.execute(saveUserQuery, saveUserQueryParams)

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

  async createUser (username, password1, password2, firstName, lastName, email, dateOfBirth, phone, isVegan, isFursuiter, allergiesText, addressLine1, addressLine2, addressCity, addressStateProvince, addressCountry, additionalInfo) {
    if (!username || !password1 || !password2 || !firstName || !lastName || !email || !dateOfBirth || !phone || isVegan===undefined || isFursuiter===undefined || !addressLine1 || !addressCity || !addressCountry || !additionalInfo) {
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