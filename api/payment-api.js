const databaseFacade = require('../utils/database-facade')
const handlers = require('../utils/handle-route')
const handle = handlers.handleRoute
const utils = require('../utils/utils')
const conInfo = require('../config/con-info.json')

const stripe = require('stripe')('sk_test_isgtm3rrdEuuknBv0TDsvd8P');

module.exports = {
  setupRoutes () {
    this.registrationApi = require('./registration-api')

    app.get('/api/payments/initialize', async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.initializePayment.bind(this), req)

      res.json(response)
    })

    app.post('/api/payments/complete', async (req, res, throwErr) => {
      let response = await handle(res, throwErr,
        this.completePayment.bind(this), req, req.body.paymentId)

      res.json(response)
    })
  },


  async initializePayment (req) {
    let user = await utils.getUserFromSession(req)
    if (!user) { utils.throwError('Not logged in') }

    let registration = await this.registrationApi.getRegistrationByUserId(user.id)
    if (!registration) { utils.throwError('No registration') }

    let unpaidAmount = await this.getRegistrationUnpaidAmount(registration)
    if (unpaidAmount <= 0) { utils.throwError('Nothing left to pay') }

    // In Stripe, NOK is divided by 100. Scary.
    unpaidAmount *= 100
    
    let paymentIntent = await stripe.paymentIntents.create({
      amount: unpaidAmount,
      currency: 'nok',
      description: 'Furway convention payment',
      receipt_email: user.email,
    })

    if (!paymentIntent.error) {
      return {clientSecret: paymentIntent.client_secret}
    }
    else {
      utils.throwError(paymentIntent.error.message)
    }
  },


  async completePayment (req, paymentId) {
    let user = await utils.getUserFromSession(req)
    let registration = await this.registrationApi.getRegistrationByUserId(user.id)

    let paymentIntent = await stripe.paymentIntents.retrieve(paymentId)
    let amount = paymentIntent.amount / 100

    let queryParams = [paymentId, registration.id, amount]
    await databaseFacade.execute(databaseFacade.queries.savePaymentRecord, queryParams)

    return {success: true}
  },


  async getRegistrationUnpaidAmount (registration) {
    let totalAmount = this.getRegistrationTotalAmount(registration)
    let paidAmount = await this.getRegistrationPaidAmount(registration.id)

    return Math.max(totalAmount - paidAmount, 0) 
  },

  
  async getRegistrationPaidAmount (registrationId) {
    let amount = await databaseFacade.execute(databaseFacade.queries.getPaidAmountByRegistrationId, [registrationId])
    if (!amount || amount.length === 0) {
      return 0
    }
    else {
      return amount[0].amount
    }
  },


  getRegistrationTotalAmount (registration) {
    let totalAmountToPay = 0

    if (registration.receivedInsideSpot) {
      totalAmountToPay += conInfo.mainDaysInsidePriceNok
    }
    else if (registration.receivedOutsideSpot) {
      totalAmountToPay += conInfo.mainDaysOutsidePriceNok
    }
    else if (registration.roomPreference === 'insideonly') {
      totalAmountToPay += conInfo.mainDaysInsidePriceNok
    }
    else {
      totalAmountToPay += conInfo.mainDaysOutsidePriceNok
    }

    if (registration.earlyArrival) {
      totalAmountToPay += conInfo.earlyArrivalPriceNok
    }
    if (registration.lateDeparture) {
      totalAmountToPay += conInfo.lateDeparturePriceNok
    }
    if (registration.buyHoodie) {
      totalAmountToPay += conInfo.hoodiePriceNok
    }
    if (registration.buyTshirt) {
      totalAmountToPay += conInfo.tshirtPriceNok
    }

    return totalAmountToPay
  },

  async validatePaymentAmount (amount, userId) {
    return true
  },
}