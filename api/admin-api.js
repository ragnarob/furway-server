const databaseFacade = require('../utils/database-facade')
const handle = require('../utils/handle-route')
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
    let query = 'SELECT user.id as id, user.username as username, user.firstname as firstName, user.lastname as lastName, user.email as email, user.dateofbirth as dateOfBirth, user.phone as phone, user.isvegan as isVegan, user.isFursuiter as isfursuiter, user.allergiestext as allergiestext, user.addressline1 as addressline1, user.addressline2 as addressLine2, user.addresscity as addressCity, user.addressstateprovince as addressStateProvince, user.addresscountry as addressCountry, user.additionalinfo as additionalInfo, user.isvolunteer as isVolunteer, user.isadmin AS isAdmin, registration.id as registrationId FROM user LEFT JOIN registration ON (user.registrationId = registration.id)'
    let users = await databaseFacade.execute(query)
    return users
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