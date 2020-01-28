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

    app.get('/api/driver-info', authApi.authorizeDriverUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.getDriverInfo.bind(this))
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
      let pickupType = [null, 'bus', 'train'][Math.floor(Math.random()*3)]
      let pickupTime = pickupType === null ? null : this.generateRandomPickupTime()
      let userId = await userApi.createUser(
        usName + '__' + x,
        usName + '__tlgrm',
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
        '4200 Trodnheim',
        '',
        'Norway',
        pickupType,
        pickupTime,
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

  generateRandomPickupTime () {
    let baseDate = new Date('2020-06-10T10:00:00')
    let newTime = baseDate.getTime() + 1000*(Math.floor(Math.random() * 86400*4))
    if (Math.random() > 0.3) {
      return new Date(newTime)
    }
    else { return null }
  },

  async getAllUsers () {
    let users = await databaseFacade.execute(databaseFacade.queries.getAllUsers)
    for (var user of users) {
      utils.parseUserBooleans(user)
    }
    return users
  },

  async getDriverInfo () {
    let users = await databaseFacade.execute(databaseFacade.queries.getUsersInNeedOfDriving)

    let sortedUsers = this.sortUsersInNeedOfDriving(users)

    return sortedUsers
  },

  sortUsersInNeedOfDriving (users) {
    let usersNeedingTransport = []

    for (let user of users) {
      if (user.pickupTime !== null) {
        user.pickupTime = new Date(user.pickupTime)
      }

      user.pickupType = user.pickupType.charAt(0).toUpperCase() + user.pickupType.slice(1)

      usersNeedingTransport.push(user)
    }

    usersNeedingTransport.sort(this.sortByPickupTime)

    return usersNeedingTransport
  },

  sortByPickupTime (user1, user2) {
    if (!user1.pickupTime) { return 1 }
    if (!user2.pickupTime) { return -1 }
    if (user1.pickupTime < user2.pickupTime) { return -1 }
    if (user1.pickupTime > user2.pickupTime) { return 1 }
    return 0
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