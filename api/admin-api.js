const databaseFacade = require('../utils/database-facade')
const handlers = require('../utils/handle-route')
const handle = handlers.handleRoute
const handleAndAuthorize = handlers.handleRouteAndAuthorize
const authApi = require('./auth-api')
const userApi = require('./user-api')
const registrationApi = require('./registration-api')
const utils = require('../utils/utils')
const fileSystemFacade = require('../utils/file-system-facade')

module.exports = {
  setupRoutes () {
    app.post('/api/create-batch-regs', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.createBatchRegs.bind(this), req.body.regType, req.body.amount)
      res.json(response)
    })

    app.get('/api/users', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.getAllUsers.bind(this))
      res.json(response)
    })

    app.get('/api/waitinglist', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        registrationApi.getWaitingLists)
      res.json(response)
    })

    app.get('/api/pending-registrations', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.getPendingRegistrations.bind(this))
      res.json(response)
    })

    app.get('/api/static-content', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.getAllTextContent.bind(this))
      res.json(response)
    })

    app.post('/api/static-content/:contentId', authApi.authorizeAdminUser, async (req, res, throwErr) =>  {
      let response = await handle(res, throwErr,
        this.updateTextContent.bind(this), req.params.contentId, req.body.content)
      res.json(response)
    })
  },


  async createBatchRegs (regType, amount) {
    let usName = this.generateRandomString(5)
    let fName = this.generateRandomString(5)
    for (var x=0; x<amount; x++) {
      let userId = await userApi.createUser(
        usName + '__' + x,
        'passord',
        'passord',
        fName + ' ' + x,
        this.generateRandomString(),
        this.generateRandomString() + '@email.com',
        '2019-01-01',
        '+47696969',
        Math.round(Math.random()),
        Math.round(Math.random()),
        'Allergi oh no',
        'Addressen min 6',
        'Leil. 44',
        'Trodnheim',
        'Trondelag',
        'Norway',
        'Jeg sier litt info fordi det er et felt hvor jeg har lov til det'
      )

      await registrationApi.addRegistration(userId, regType)

      this.sleep()
    }
  },

  sleep () {
    return new Promise(resolve => setTimeout(resolve, 100))
  },

  generateRandomString (length=8) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  },

  async getAllUsers () {
    let users = await databaseFacade.execute(databaseFacade.queries.getAllUsers)
    for (var user of users) {
      utils.parseUserBooleans(user)
    }
    return users
  },

  async getPendingRegistrations () {
    let pendingRegistrations = await databaseFacade.execute(databaseFacade.queries.getPendingRegistrations)
  },

  async getAllTextContent () {
    let content = require('../static/text-content.json')
    return content
  },

  async updateTextContent (contentId, newContent) {
    let textContent = require('../static/text-content.json')
    textContent[contentId] = newContent
    await fileSystemFacade.writeFile(path.join(__dirname, '../static/text-content.json'), JSON.stringify(textContent))
  },
}