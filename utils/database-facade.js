const mysql = require('mysql')
const databaseSettings = require('../config/database-settings.json')

const getRegistrationsBase = 'SELECT registration.id AS id, user.username AS username, user.firstname as firstName, user.lastname as lastName, userid AS userId, roompreference AS roomPreference, earlyarrival AS earlyArrival, latedeparture AS lateDeparture, buytshirt AS buyTshirt, buyhoodie AS buyHoodie, tshirtsize AS tshirtSize, hoodiesize AS hoodieSize, timestamp AS timestamp, paymentdeadline AS paymentDeadline, needsmanualpaymentdeadline AS needsManualPaymentDeadline, isadminapproved AS isAdminApproved, receivedinsidespot AS receivedInsideSpot, receivedoutsidespot AS receivedOutsideSpot, adminrejectedreason as adminRejectedReason, ismaindaysinsidepaid AS isMainDaysInsidePaid, ismaindaysoutsidepaid AS isMainDaysOutsidePaid, isearlyarrivalpaid AS isEarlyArrivalPaid, islatedeparturepaid AS isLateDeparturePaid, ishoodiepaid AS isHoodiePaid, istshirtpaid AS isTshirtPaid FROM XXX INNER JOIN user ON (registration.userid = user.id) ORDER BY timestamp ASC'

const facade = module.exports = {
  mysqlPool: mysql.createPool(databaseSettings),

  queries: {
    getAllUsers: 'SELECT user.id as id, user.username as username, user.telegramusername AS telegramUsername, user.firstname as firstName, user.lastname as lastName, user.email as email, user.dateofbirth as dateOfBirth, user.phone as phone, user.isvegan as isVegan, user.isFursuiter as isFursuiter, user.allergiestext as allergiesText, user.addressline1 as addressLine1, user.addressline2 as addressLine2, user.addresscity as addressCity, user.addressstateprovince as addressStateProvince, user.addresscountry as addressCountry, user.additionalinfo as additionalInfo, user.isvolunteer as isVolunteer, user.isdriver AS isDriver, user.isadmin AS isAdmin, user.pickuptype AS pickupType, pickuptime AS pickupTime, registration.id as registrationId FROM user LEFT JOIN registration ON (registration.userid = user.id)',

    getUserById: 'SELECT user.id as id, user.username AS username, user.telegramusername AS telegramUsername,user.firstname as firstName, user.lastname as lastName, user.email as email, user.dateofbirth as dateOfBirth, user.phone as phone, user.isvegan as isVegan, user.isFursuiter as isFursuiter, user.allergiestext as allergiesText, user.addressline1 as addressLine1, user.addressline2 as addressLine2, user.addresscity as addressCity, user.addressstateprovince as addressStateProvince, user.addresscountry as addressCountry, user.additionalinfo as additionalInfo, user.isvolunteer as isVolunteer, user.isdriver AS isDriver, user.isadmin AS isAdmin, user.pickuptype AS pickupType, pickuptime AS pickupTime, registration.id as registrationId FROM user LEFT JOIN registration ON (registration.userId = user.id) WHERE user.id=?',

    getUsersInNeedOfDriving: 'SELECT user.id, user.username, user.telegramusername AS telegramUsername, user.firstname AS firstName, user.lastname AS lastName, user.phone AS phone, user.pickuptime AS pickupTime, user.pickuptype AS pickupType FROM user INNER JOIN registration ON (user.id = registration.userid) WHERE (registration.receivedinsidespot=1 OR registration.receivedoutsidespot=1) AND (user.pickuptype IS NOT NULL)',

    createUser: 'INSERT INTO user (username, telegramusername, password, firstname, lastname, email, dateofbirth, phone, isvegan, isfursuiter, allergiestext, addressline1, addressline2, addresscity, addressstateprovince, addresscountry, pickupType, pickupTime, additionalinfo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',

    saveUser: 'UPDATE user SET username=?, telegramusername=?, firstname=?, lastname=?, email=?, dateofbirth=?, phone=?, isvegan=?, isfursuiter=?, allergiestext=?, addressline1=?, addressline2=?, addresscity=?, addressstateprovince=?, addresscountry=?, pickuptype=?, pickuptime=?, additionalinfo=? WHERE id=?',

    saveUserAsAdmin: 'UPDATE user SET username=?, telegramusername=?, firstname=?, lastname=?, email=?, dateofbirth=?, phone=?, isvegan=?, isfursuiter=?, allergiestext=?, addressline1=?, addressline2=?, addresscity=?, addressstateprovince=?, addresscountry=?, pickuptype=?, pickuptime=?, additionalinfo=?, isVolunteer=?, isDriver=?, isAdmin=? WHERE id=?',

    deleteUser: 'DELETE FROM user WHERE id=?',

    changePassword: 'UPDATE user SET password = ? WHERE id = ?',

    changePasswordByEmail: 'UPDATE user SET password = ? WHERE email = ?',

    getAllRegistrations: getRegistrationsBase.replace('XXX', 'registration'),

    getDeletedRegistrations: getRegistrationsBase
      .replace(/registration./g, 'cancelledregistration.')
      .replace('XXX', 'cancelledregistration'),

    getRegistration: 'SELECT registration.id AS id, userid AS userId, roompreference AS roomPreference, earlyarrival AS earlyArrival, latedeparture AS lateDeparture, buytshirt AS buyTshirt, buyhoodie AS buyHoodie, tshirtsize AS tshirtSize, hoodiesize AS hoodieSize, timestamp AS timestamp, paymentdeadline AS paymentDeadline, needsmanualpaymentdeadline AS needsManualPaymentDeadline, isadminapproved AS isAdminApproved, receivedinsidespot AS receivedInsideSpot, receivedoutsidespot AS receivedOutsideSpot, adminrejectedreason AS adminRejectedReason, ismaindaysinsidepaid AS isMainDaysInsidePaid, ismaindaysoutsidepaid AS isMainDaysOutsidePaid, isearlyarrivalpaid AS isEarlyArrivalPaid, islatedeparturepaid AS isLateDeparturePaid, ishoodiepaid AS isHoodiePaid, istshirtpaid AS isTshirtPaid FROM registration WHERE userId = ?',

    getWaitingListRegistrations: `SELECT registration.id AS id, user.username AS username, userid AS userId, roompreference AS roomPreference, earlyarrival AS earlyArrival, latedeparture AS lateDeparture, buytshirt AS buyTshirt, buyhoodie AS buyHoodie, tshirtsize AS tshirtSize, hoodiesize AS hoodieSize, timestamp AS timestamp, paymentdeadline AS paymentDeadline, needsmanualpaymentdeadline AS needsManualPaymentDeadline, isadminapproved AS isAdminApproved, receivedinsidespot AS receivedInsideSpot, receivedoutsidespot AS receivedOutsideSpot, adminrejectedreason as adminRejectedReason, ismaindaysinsidepaid AS isMainDaysInsidePaid, ismaindaysoutsidepaid AS isMainDaysOutsidePaid, isearlyarrivalpaid AS isEarlyArrivalPaid, islatedeparturepaid AS isLateDeparturePaid, ishoodiepaid AS isHoodiePaid, istshirtpaid AS isTshirtPaid FROM registration INNER JOIN user ON (registration.userid = user.id) WHERE isadminapproved=1 AND receivedinsidespot=0 AND (receivedoutsidespot=0 OR roompreference='insidepreference') ORDER BY timestamp ASC`,

    getPendingRegistrations: `SELECT registration.id AS id, user.username AS username, userid AS userId, roompreference AS roomPreference, timestamp AS timestamp, user.username AS username FROM registration INNER JOIN user ON (registration.userid = user.id) WHERE isadminapproved=0 ORDER BY timestamp ASC`,

    addRegistration: 'INSERT INTO registration (userid, roompreference) VALUES (?, ?)',

    deleteRegistration: 'DELETE FROM registration WHERE userid = ?',

    saveCancelledRegistration: 'INSERT INTO cancelledregistration (userid, roompreference, earlyarrival, latedeparture, buytshirt, buyhoodie, tshirtsize, hoodiesize, timestamp, paymentdeadline, needsmanualpaymentdeadline, isadminapproved, receivedinsidespot, receivedoutsidespot, ismaindaysinsidePaid, ismaindaysoutsidepaid, isearlyarrivalpaid, islatedeparturepaid, ishoodiepaid, istshirtpaid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',

    updateRegistrationOnlyRoomPreference: 'UPDATE registration SET roompreference=? WHERE userid=?',

    updateRegistrationAddons: 'UPDATE registration SET earlyarrival=?, latedeparture=?, buytshirt=?, buyhoodie=?, tshirtsize=?, hoodiesize=? WHERE userid=?',

    updateRejectedRegistrationDetails: 'UPDATE registration SET roompreference=?, earlyarrival=?, latedeparture=?, buytshirt=?, buyhoodie=?, tshirtsize=?, hoodiesize=?, timestamp=NOW(), adminrejectedreason = NULL WHERE userid=?',

    updateRegistrationPaymentStatus: 'UPDATE registration SET ismaindaysinsidePaid=?, ismaindaysoutsidepaid=?, islatedeparturepaid=?, isearlyarrivalpaid=?, ishoodiepaid=?, istshirtpaid=? WHERE userid=?',

    approveRegistration: 'UPDATE registration SET isadminapproved = 1, adminrejectedreason = NULL WHERE userid = ?',

    rejectRegistration: 'UPDATE registration SET isadminapproved = 0 WHERE userid = ?',

    removeSpotFromRegistration: 'UPDATE registration SET receivedinsidespot = 0, receivedoutsidespot = 0, isadminapproved = 0, timestamp = NOW() WHERE userid = ?',

    getFirstRegistrationUserIdInWaitingListInside: `SELECT userid FROM registration WHERE receivedinsidespot=0 AND (roompreference='insideonly' OR roompreference='insidepreference') AND isadminapproved=1 AND ismaindaysinsidepaid=0 ORDER BY timestamp ASC LIMIT 1`,

    getFirstRegistrationUserIdInWaitingListOutside: `SELECT userid FROM registration WHERE receivedoutsidespot=0 AND receivedinsidespot=0 AND (roompreference='outsideonly' OR roompreference='insidepreference') AND isadminapproved=1 AND ismaindaysoutsidepaid=0 ORDER BY timestamp ASC LIMIT 1`,

    addInsideSpotToRegistration: `UPDATE registration SET receivedinsidespot = 1, paymentdeadline = ? WHERE userid = ?`,
    addOutsideSpotToRegistration: `UPDATE registration SET receivedoutsidespot = 1, paymentdeadline = ? WHERE userid = ?`,

    addInsideSpotWithoutDeadlineToRegistration: `UPDATE registration SET receivedinsidespot = 1, needsmanualpaymentdeadline = 1 WHERE userid = ?`,
    addOutsideSpotWithoutDeadlineToRegistration: `UPDATE registration SET receivedoutsidespot = 1, needsmanualpaymentdeadline = 1 WHERE userid = ?`,

    addInsideSpotToRegistrationAndRemoveOutsideSpot: `UPDATE registration SET receivedinsidespot = 1, receivedoutsidespot = 0, paymentdeadline = ? WHERE userid = ?`,
    addInsideSpotWithoutDeadlineToRegistrationAndRemoveOutsideSpot: `UPDATE registration SET receivedinsidespot = 1, receivedoutsidespot = 0, needsmanualpaymentdeadline = 1 WHERE userid = ?`,

    updateRoomPreference: `UPDATE registration SET roompreference = ? WHERE userid = ?`,
    updateRoomPreferenceAndResetSpot: `UPDATE registration SET roompreference = ?, receivedinsidespot = 0, receivedoutsidespot = 0 WHERE userid = ?`,

    logRoute: `INSERT INTO log (path) VALUES (?)`,
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