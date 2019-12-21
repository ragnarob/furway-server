const databaseFacade = require('../utils/database-facade')
const handlers = require('../utils/handle-route')
const handle = handlers.handleRoute
const handleAndAuthorize = handlers.handleRouteAndAuthorize
const authApi = require('./auth-api')
const utils = require('../utils/utils')
const fileSystemFacade = require('../utils/file-system-facade')

module.exports = {
  setupRoutes () {
    app.get('/api/users', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.getAllUsers.bind(this))
      res.json(response)
    })

    app.get('/api/waitinglist', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.getWaitingLists.bind(this))
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

  async getAllUsers () {
    let users = await databaseFacade.execute(databaseFacade.queries.getAllUsers)
    return users
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