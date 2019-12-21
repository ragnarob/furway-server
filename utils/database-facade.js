const mysql = require('mysql')
const databaseSettings = require('../config/database-settings.json')

const facade = module.exports = {
  mysqlPool: mysql.createPool(databaseSettings),

  queries: {
    getAllUsers: 'SELECT user.id as id, user.username as username, user.firstname as firstName, user.lastname as lastName, user.email as email, user.dateofbirth as dateOfBirth, user.phone as phone, user.isvegan as isVegan, user.isFursuiter as isfursuiter, user.allergiestext as allergiestext, user.addressline1 as addressline1, user.addressline2 as addressLine2, user.addresscity as addressCity, user.addressstateprovince as addressStateProvince, user.addresscountry as addressCountry, user.additionalinfo as additionalInfo, user.isvolunteer as isVolunteer, user.isadmin AS isAdmin, registration.id as registrationId FROM user LEFT JOIN registration ON (registration.userid = user.id)',

    getUserById: 'SELECT user.id as id, user.username as username, user.firstname as firstName, user.lastname as lastName, user.email as email, user.dateofbirth as dateOfBirth, user.phone as phone, user.isvegan as isVegan, user.isFursuiter as isFursuiter, user.allergiestext as allergiestext, user.addressline1 as addressLine1, user.addressline2 as addressLine2, user.addresscity as addressCity, user.addressstateprovince as addressStateProvince, user.addresscountry as addressCountry, user.additionalinfo as additionalInfo, user.isvolunteer as isVolunteer, user.isadmin AS isAdmin, registration.id as registrationId FROM user LEFT JOIN registration ON (registration.userId = user.id) WHERE user.id=?',

    getAllRegistrations: 'SELECT id AS id, userid AS userId, roompreference AS roomPreference, earlyarrival AS earlyArrival, latedeparture AS lateDeparture, buytshirt AS buyTshirt, buyhoodie AS buyHoodie, tshirtsize AS tshirtSize, hoodiesize AS hoodiesize, timestamp AS timestamp, paymentdeadline AS paymentDeadline, needsmanualpaymentdeadline AS needsManualPaymentDeadline, isadminapproved AS isAdminApproved, receivedinsidespot AS receivedInsideSpot, receivedoutsidespot AS receivedOutsideSpot, adminrejectedreason as adminRejectedReason, ismaindaysinsidepaid AS isMainDaysInsidePaid, ismaindaysoutsidepaid AS isMainDaysOutsidePaid, isearlyarrivalpaid AS isEarlyArrivalPaid, islatedeparturepaid AS isLateDeparturePaid, ishoodiepaid AS isHoodiePaid, istshirtpaid AS isTshirtPaid FROM registration ORDER BY timestamp ASC',

    getRegistration: 'SELECT id AS id, userid AS userId, roompreference AS roomPreference, earlyarrival AS earlyArrival, latedeparture AS lateDeparture, buytshirt AS buyTshirt, buyhoodie AS buyHoodie, tshirtsize AS tshirtSize, hoodiesize AS hoodiesize, timestamp AS timestamp, paymentdeadline AS paymentDeadline, needsmanualpaymentdeadline AS needsManualPaymentDeadline, isadminapproved AS isAdminApproved, receivedinsidespot AS receivedInsideSpot, receivedoutsidespot AS receivedOutsideSpot, adminrejectedreason as adminRejectedReason, ismaindaysinsidepaid AS isMainDaysInsidePaid, ismaindaysoutsidepaid AS isMainDaysOutsidePaid, isearlyarrivalpaid AS isEarlyArrivalPaid, islatedeparturepaid AS isLateDeparturePaid, ishoodiepaid AS isHoodiePaid, istshirtpaid AS isTshirtPaid FROM registration WHERE userId = ?',

    getWaitingListRegistrations: `SELECT id AS id, userid AS userId, roompreference AS roomPreference, earlyarrival AS earlyArrival, latedeparture AS lateDeparture, buytshirt AS buyTshirt, buyhoodie AS buyHoodie, tshirtsize AS tshirtSize, hoodiesize AS hoodiesize, timestamp AS timestamp, paymentdeadline AS paymentDeadline, needsmanualpaymentdeadline AS needsManualPaymentDeadline, isadminapproved AS isAdminApproved, receivedinsidespot AS receivedInsideSpot, receivedoutsidespot AS receivedOutsideSpot, adminrejectedreason as adminRejectedReason, ismaindaysinsidepaid AS isMainDaysInsidePaid, ismaindaysoutsidepaid AS isMainDaysOutsidePaid, isearlyarrivalpaid AS isEarlyArrivalPaid, islatedeparturepaid AS isLateDeparturePaid, ishoodiepaid AS isHoodiePaid, istshirtpaid AS isTshirtPaid FROM registration WHERE isadminapproved=1 AND receivedinsidespot=0 AND (receivedoutsidespot=0 OR roompreference='insidepreference') ORDER BY timestamp ASC`,

    addRegistration: 'INSERT INTO registration (userid, roompreference, earlyarrival, latedeparture, buytshirt, buyhoodie, tshirtsize, hoodiesize) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',

    deleteRegistration: 'DELETE FROM registration WHERE userid = ?',

    updateRegistrationDetails: 'UPDATE registration SET roompreference=?, earlyarrival=?, latedeparture=?, buytshirt=?, buyhoodie=?, tshirtsize=?, hoodiesize=? WHERE userid=?',

    updateRejectedRegistrationDetails: 'UPDATE registration SET roompreference=?, earlyarrival=?, latedeparture=?, buytshirt=?, buyhoodie=?, tshirtsize=?, hoodiesize=?, timestamp=NOW(), adminrejectedreason = NULL WHERE userid=?',

    updateRegistrationPaymentStatus: 'UPDATE registration SET ismaindaysinsidePaid=?, ismaindaysoutsidepaid=?, islatedeparturepaid=?, isearlyarrivalpaid=?, ishoodiepaid=?, istshirtpaid=? WHERE userid=?',

    approveRegistration: 'UPDATE registration SET isadminapproved = 1, adminrejectedreason = NULL WHERE userid = ?',

    rejectRegistration: 'UPDATE registration SET isadminapproved = 0, adminrejectedreason = ? WHERE userid = ?',

    removeSpotFromRegistration: 'UPDATE registration SET receivedinsidespot = 0, receivedoutsidespot = 0, isadminapproved = 0, timestamp = NOW() WHERE userid = ?',

    deleteRegistration: 'DELETE FROM registration WHERE userid = ?',

    getFirstRegistrationUserIdInWaitingListInside: `SELECT userid FROM registration WHERE receivedinsidespot=0 AND (roompreference='insideonly' OR roompreference='insidepreference') AND isadminapproved=1 AND ismaindaysinsidepaid=0 ORDER BY timestamp ASC LIMIT 1`,

    getFirstRegistrationUserIdInWaitingListOutside: `SELECT userid FROM registration WHERE receivedoutsidespot=0 AND receivedinsidespot=0 AND (roompreference='outsideonly' OR roompreference='insidepreference') AND isadminapproved=1 AND ismaindaysoutsidepaid=0 ORDER BY timestamp ASC LIMIT 1`,

    addInsideSpotToRegistration: `UPDATE registration SET receivedinsidespot = 1, paymentdeadline = ? WHERE userid = ?`,
    addOutsideSpotToRegistration: `UPDATE registration SET receivedoutsidespot = 1, paymentdeadline = ? WHERE userid = ?`,

    addInsideSpotWithoutDeadlineToRegistration: `UPDATE registration SET receivedinsidespot = 1, needsmanualpaymentdeadline = 1 WHERE userid = ?`,
    addOutsideSpotWithoutDeadlineToRegistration: `UPDATE registration SET receivedoutsidespot = 1, needsmanualpaymentdeadline = 1 WHERE userid = ?`,

    addInsideSpotToRegistrationAndRemoveOutsideSpot: `UPDATE registration SET receivedinsidespot = 1, receivedoutsidespot = 0, paymentdeadline = ? WHERE userid = ?`,
    addInsideSpotWithoutDeadlineToRegistrationAndRemoveOutsideSpot: `UPDATE registration SET receivedinsidespot = 1, receivedoutsidespot = 0, needsmanualpaymentdeadline = 1 WHERE userid = ?`,

    updateRoomPreference: `UPDATE registration SET roompreference = ? WHERE userid = ?`,
    updateRoomPreferenceAndResetSpot: `UPDATE registration SET roompreference = ?, receivedinsidespot = 0, receivedoutsidespot = 0 WHERE userid = ?`
  },

  execute (queryStringOrName, queryParams) {
    if (queryStringOrName in facade.queries) {
      queryStringOrName = facade.queries[queryStringOrName]
    }
  
    return new Promise (async (resolve, reject) => {
      this.mysqlPool.getConnection((err, connection) => {
        if (err) {
          reject('Error establishing database connection')
        }
        
        else if (queryParams) {
          connection.query(queryStringOrName, queryParams, (err, results) => {
            connection.release()
            if (err) {
              reject(err.message)
            }
            else {
              resolve(results)
            }
          })
        }
        
        else {
          connection.query(queryStringOrName, (err, results) => {
            connection.release()
            if (err) {
              reject(err.message)
            }
            else {
              resolve(results)
            }
          })
        }
      })
    })
  }
}