const handle = require('../utils/handle-route')
const databaseFacade = require('../utils/database-facade')
const utils = require('../utils/utils')
const userApi = require('../api/user-api')

const bcrypt = require('bcrypt')
const nodemailer = require('nodemailer')

const emailPattern = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/

const emailTransporter = nodemailer.createTransport(require('../config/email-settings.json'))

const authMiddleware = module.exports = {
  setupRoutes () {
    app.post('/login', async (req, res, throwErr) => {
      let userData = await handle(res, throwErr,
        this.login.bind(this), req, req.body.usernameOrEmail, req.body.password)
      
      let fullUserData = await handle(res, throwErr,
        userApi.getUser.bind(this), req, userData.id)

      res.json(fullUserData)
    })

    app.post('/logout', async (req, res, throwErr) => {
      this.logout()
      res.json({success: true})
    })

    app.post('/changeusername', async (req, res, throwErr) => {
      let newUserData = await handle(res, throwErr,
        this.changeUsername.bind(this), req.body.email, req.body.newUsername, req.body.password)
      
      let newFullUserData = await handle (req, throwErr,
        userApi.getUser.bind(this), newUserData.id)
      
      res.json(newFullUserData)
    })

    app.post('/changepassword', async (req, res, throwErr) => {
      await handle(res, throwErr,
        this.changePassword.bind(this), req.body.usernameOrEmail, req.body.password, req.body.newPassword1, req.body.newPassword2)
      res.json({success: true})
    })

    app.post('/forgottenpassword', async (req, res, throwErr) => {
      await handle(res, throwErr,
        this.handleForgottenPassword.bind(this), req.body.email)
    })
  },
  
  async login (req, usernameOrEmail, password) {
    let userData = await this.authenticate(usernameOrEmail, password)
    req.session.user = userData
    return userData
  },
  
  logout () {
    req.session.destroy()
  },

  async changeUsername (email, newUsername, password) {
    let userData = await this.authenticate(email, password)
    if (!utils.validateUsername(newUsername)) {
      utils.throwError('Invalid username')
    }

    let updateUsernameQuery = 'UPDATE user SET username = ? WHERE id = ?'
    let updateUsernameQueryParams = [newUsername, userData.id]
    await databaseFacade.execute(updateUsernameQuery, updateUsernameQueryParams)

    userData.username = newUsername
    req.session.user = userData
    return userData
  },

  async changePassword (usernameOrEmail, oldPassword, newPassword1, newPassword2) {
    let userData = await this.authenticate(usernameOrEmail, oldPassword)
    if (newPassword1 !== newPassword2) {
      utils.throwError('Passwords do not match')
    }
    if (!utils.validatePassword(newPassword1)) {
      utils.throwError('Invalid new password')
    }

    let hashedPassword = bcrypt.hash(newPassword1, 8)
    let updatePasswordQuery = 'UPDATE user SET password = ? WHERE id = ?'
    let updatePasswordQueryParams = [hashedPassword, userData.id]
    await databaseFacade.execute(updatePasswordQuery, updatePasswordQueryParams)
  },

  async handleForgottenPassword (email) {
    let getUserQuery = 'SELECT * FROM user WHERE email = ?'
    let getUserQueryParams = [email]
    let user = await databaseFacade.execute(getUserQuery, getUserQueryParams)
    if (user.length === 0) {
      utils.throwError('No account with given email')
    }

    let tempPassword = this.generateTempPassword()
    await emailTransporter.sendMail({
      from: 'Furway',
      to: email,
      subject: 'Forgotten password for Furway.no',
      html: `<p>Hi,</p><br/>
             <p>You may log with temporary password <b>${tempPassword}</b> to 
             <a href="https://furway.no/forgottenpassword/create">https://furway.no/forgottenpassword/create</a>.</p>
             <p>You wil be prompted to create a new password.</p><br/>
             <p>Regards, the Furway team</p>`
    })

    let updateUserQuery = 'UPDATE user SET temppassword = ? WHERE email = ?'
    let updateUserQueryParams = [tempPassword, email]
    await databaseFacade.execute(updateUserQuery, updateUserQueryParams)
  },

  async authenticate (usernameOrEmail, password) {
    let isEmail = emailPattern.test(usernameOrEmail)
    let getUserQuery = `SELECT id, username, email, password FROM user WHERE ${isEmail ? 'email' : 'username'} = ?`
    let userResult = await databaseFacade.execute(getUserQuery, [usernameOrEmail])
    if (userResult.length === 0) {
      utils.throwError('No user with given username or email')
    }
    
    userResult = userResult[0]
    let passwordMatch = await bcrypt.compare(password, userResult.password)
    if (!passwordMatch) {
      utils.throwError('Wrong password')
    }

    return Object.assign({}, userResult)
  },
  
  async validateUserAndHashPassword (username, email, password1, password2) {
    let usernameExistsQuery = 'SELECT * FROM user WHERE username = ?'
    let usernameExistsQueryParams = [username]
    let existingUser = await databaseFacade.execute(usernameExistsQuery, usernameExistsQueryParams)
    if (existingUser.length > 0) {
      utils.throwError('This username is taken')
    }
    let emailExistsQuery = 'SELECT * FROM user WHERE email = ?'
    let emailExistsQueryParams = [email]
    existingUser = await databaseFacade.execute(emailExistsQuery, emailExistsQueryParams)
    if (existingUser.length > 0) {
      utils.throwError('A user with this email already exists')
    }

    if (!password1 === password2) {
      utils.throwError('Passwords don\'t match')
    }
    if (!utils.validatePassword(password1) || !utils.validateUsername(username)) {
      utils.throwError('Invalid username or password')
    }

    let hashedPassword = bcrypt.hash(password1, 8)
    return hashedPassword
  },
  
  async authorizeAdminUser (req, res, next) {
    return await authMiddleware.authorizeUser(req, res, next, 'isadmin')
  },

  async authorizeVolunteerUser (req, res, next) {
    return await authMiddleware.authorizeUser(req, res, next, 'isvolunteer')
  },

  async authorizeUser (req, res, next, userType) {
    let authorized = false
    if (req.session && req.session.user) {
      let query = `SELECT * FROM user WHERE id=? AND ${userType}=1`
      let queryParams = req.session.user.id
      let result = await databaseFacade.execute(query, queryParams)
      authorized = result.length > 0
    }

    if (authorized) {
      if (next) { next() }
      else { return true }
    }
    else {
      if (next) { res.json({error: 'Unauthorized'}) }
      else { return false }
    }
  },

  generateTempPassword () {
    return Math.random().toString(36).substring(12);
  }
}