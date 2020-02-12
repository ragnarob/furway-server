const handlers = require('../utils/handle-route')
const handle = handlers.handleRoute
const fileSystemFacade = require('../utils/file-system-facade')
const authApi = require('./auth-api')
const registrationApi = require('./registration-api')
const utils = require('../utils/utils.js')
const path = require('path')

module.exports = {
  setupRoutes () {
    app.get('/api/con-info', async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.getConInfo.bind(this))

      res.json(response)
    })

    app.post('/api/con-info', authApi.authorizeAdminUser, async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.updateConInfo.bind(this), req.body.conIfno)

      res.json(response)
    })
  },

  async getConInfo () {
    let conInfo = await fileSystemFacade.readFile(path.join(__dirname, '../config/con-info.json'))
    conInfo = JSON.parse(conInfo)

    return conInfo
  },

  async updateConInfo (newConInfo) {
    this.parseConInfoFields(newConInfo)
    this.validateConInfo(newConInfo)
    await fileSystemFacade.writeFile(path.join(__dirname, '../config/con-info.json'), JSON.stringify(newConInfo))
    await registrationApi.moveRegistrationsFromWaitingListIfPossible()

    return {success: true}
  },

  parseConInfoFields (conInfo) {
    conInfo.mainDaysInsidePriceNok = Number(conInfo.mainDaysInsidePriceNok)
    conInfo.mainDaysOutsidePriceNok = Number(conInfo.mainDaysOutsidePriceNok)
    conInfo.earlyArrivalPriceNok = Number(conInfo.earlyArrivalPriceNok)
    conInfo.lateDeparturePriceNok = Number(conInfo.lateDeparturePriceNok)
    conInfo.singeDayTicketPriceNok = Number(conInfo.singeDayTicketPriceNok)
    conInfo.hoodiePriceNok = Number(conInfo.hoodiePriceNok)
    conInfo.tshirtPriceNok = Number(conInfo.tshirtPriceNok)
  },

  validateConInfo (conInfo) {
    let error = ''

    let openDate = new Date(conInfo.registrationOpenDate)
    let closeDate = new Date(conInfo.registrationCloseDate)
    let volunteerDate = new Date(conInfo.volunteerRegistrationOpenDate)

    if (openDate > closeDate) {
      error = 'Opening date must be before closing date'
    }
    else if (openDate < volunteerDate) {
      error = 'Volunteer opening date must be earlier than general opening date'
    }
    if (conInfo.mainDaysPriceNok < 1 || conInfo.earlyArrivalPriceNok < 1 || conInfo.lateDeparturePriceNok < 1 || conInfo.hoodiePriceNok < 1 || conInfo.tshirtPriceNok < 1) {
      error = 'Some prices are 0 or below'
    }

    if (error) {
      utils.throwError(error)
    }
  },
}