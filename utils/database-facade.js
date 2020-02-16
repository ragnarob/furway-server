const mysql = require('mysql')
const databaseSettings = require('../config/database-settings.json')

const getRegistrationsBase = 'SELECT user.username AS username, registration.id AS id, registration.registrationnumber AS registrationNumber, user.firstname AS firstName, user.lastname AS lastName, userid AS userId, roompreference AS roomPreference, earlyarrival AS earlyArrival, latedeparture AS lateDeparture, buytshirt AS buyTshirt, buyhoodie AS buyHoodie, tshirtsize AS tshirtSize, hoodiesize AS hoodieSize, registration.timestamp AS timestamp, paymentdeadline AS paymentDeadline, isadminapproved AS isAdminApproved, receivedinsidespot AS receivedInsideSpot, receivedoutsidespot AS receivedOutsideSpot, COALESCE(SUM(amount), 0) AS paidAmount FROM XXX INNER JOIN user ON (registration.userid = user.id) LEFT JOIN payment ON (registration.id = payment.registrationid) GROUP BY registration.id ORDER BY registration.timestamp ASC'

const facade = module.exports = {
  mysqlPool: mysql.createPool(databaseSettings),

  queries: {
    getAllUsers: 'SELECT user.id as id, user.username as username, user.telegramusername AS telegramUsername, user.firstname as firstName, user.lastname as lastName, user.email as email, user.dateofbirth as dateOfBirth, user.phone as phone, user.phonecountrycode AS phoneCountryCode, user.isvegan as isVegan, user.isFursuiter as isFursuiter, user.allergiestext as allergiesText, user.addressline1 as addressLine1, user.addressline2 as addressLine2, user.addresscity as addressCity, user.addressstateprovince as addressStateProvince, user.addresscountry as addressCountry, user.additionalinfo as additionalInfo, user.isvolunteer as isVolunteer, user.isdriver AS isDriver, user.isadmin AS isAdmin, user.pickuptype AS pickupType, pickuptime AS pickupTime, registration.id as registrationId FROM user LEFT JOIN registration ON (registration.userid = user.id)',

    getUserById: 'SELECT user.id as id, user.username AS username, user.telegramusername AS telegramUsername,user.firstname as firstName, user.lastname as lastName, user.email as email, user.dateofbirth as dateOfBirth, user.phone as phone, user.phonecountrycode AS phoneCountryCode, user.isvegan as isVegan, user.isFursuiter as isFursuiter, user.allergiestext as allergiesText, user.addressline1 as addressLine1, user.addressline2 as addressLine2, user.addresscity as addressCity, user.addressstateprovince as addressStateProvince, user.addresscountry as addressCountry, user.additionalinfo as additionalInfo, user.isvolunteer as isVolunteer, user.isdriver AS isDriver, user.isadmin AS isAdmin, user.pickuptype AS pickupType, pickuptime AS pickupTime, registration.id as registrationId FROM user LEFT JOIN registration ON (registration.userId = user.id) WHERE user.id=?',

    getUsersInNeedOfDriving: 'SELECT user.id, user.username, user.telegramusername AS telegramUsername, user.firstname AS firstName, user.lastname AS lastName, user.phone AS phone, user.phonecountrycode AS phoneCountryCode, user.pickuptime AS pickupTime, user.pickuptype AS pickupType FROM user INNER JOIN registration ON (user.id = registration.userid) WHERE (registration.receivedinsidespot=1 OR registration.receivedoutsidespot=1) AND (user.pickuptype IS NOT NULL)',

    createUser: 'INSERT INTO user (username, telegramusername, password, firstname, lastname, email, dateofbirth, phone, phonecountrycode, isvegan, isfursuiter, allergiestext, addressline1, addressline2, addresscity, addressstateprovince, addresscountry, pickupType, pickupTime, additionalinfo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',

    saveUser: 'UPDATE user SET username=?, telegramusername=?, firstname=?, lastname=?, email=?, dateofbirth=?, phone=?, phonecountrycode=?, isvegan=?, isfursuiter=?, allergiestext=?, addressline1=?, addressline2=?, addresscity=?, addressstateprovince=?, addresscountry=?, pickuptype=?, pickuptime=?, additionalinfo=? WHERE id=?',

    saveUserAsAdmin: 'UPDATE user SET username=?, telegramusername=?, firstname=?, lastname=?, email=?, dateofbirth=?, phone=?, phonecountrycode=?, isvegan=?, isfursuiter=?, allergiestext=?, addressline1=?, addressline2=?, addresscity=?, addressstateprovince=?, addresscountry=?, pickuptype=?, pickuptime=?, additionalinfo=?, isVolunteer=?, isDriver=?, isAdmin=? WHERE id=?',

    deleteUser: 'DELETE FROM user WHERE id=?',

    changePassword: 'UPDATE user SET password = ? WHERE id = ?',

    changePasswordByEmail: 'UPDATE user SET password = ? WHERE email = ?',

    getAllRegistrations: getRegistrationsBase.replace('XXX', 'registration'),

    getDeletedRegistrations: getRegistrationsBase
      .replace(/, registration./g, ', cancelledregistration.')
      .replace('XXX', 'cancelledregistration')
      .replace('registration.userid', 'cancelledregistration.userid')
      .replace('(registration.id', '(cancelledregistration.id')
      .replace(' registration.timestamp', ' cancelledregistration.timestamp')
      .replace(' registration.id', ' cancelledregistration.id'),

    getRegistration: 'SELECT registration.id AS id, userid AS userId, registration.registrationnumber AS registrationNumber, roompreference AS roomPreference, earlyarrival AS earlyArrival, latedeparture AS lateDeparture, buytshirt AS buyTshirt, buyhoodie AS buyHoodie, tshirtsize AS tshirtSize, hoodiesize AS hoodieSize, registration.timestamp AS timestamp, paymentdeadline AS paymentDeadline, isadminapproved AS isAdminApproved, receivedinsidespot AS receivedInsideSpot, receivedoutsidespot AS receivedOutsideSpot, COALESCE(SUM(amount), 0) AS paidAmount FROM registration LEFT JOIN payment ON (registration.id = payment.registrationid) WHERE userid = ?',

    getWaitingListRegistrations: `SELECT registration.id AS id, user.username AS username, userid AS userId, roompreference AS roomPreference, earlyarrival AS earlyArrival, latedeparture AS lateDeparture, buytshirt AS buyTshirt, buyhoodie AS buyHoodie, tshirtsize AS tshirtSize, hoodiesize AS hoodieSize, timestamp AS timestamp, paymentdeadline AS paymentDeadline, isadminapproved AS isAdminApproved, receivedinsidespot AS receivedInsideSpot, receivedoutsidespot AS receivedOutsideSpot FROM registration INNER JOIN user ON (registration.userid = user.id) WHERE isadminapproved=1 AND receivedinsidespot=0 AND (receivedoutsidespot=0 OR roompreference='insidepreference') ORDER BY timestamp ASC`,

    getPendingRegistrations: `SELECT registration.id AS id, user.username AS username, userid AS userId, roompreference AS roomPreference, timestamp AS timestamp, user.username AS username FROM registration INNER JOIN user ON (registration.userid = user.id) WHERE isadminapproved=0 ORDER BY timestamp ASC`,

    addRegistration: 'INSERT INTO registration (userid, roompreference) VALUES (?, ?)',

    deleteRegistration: 'DELETE FROM registration WHERE userid = ?',

    saveCancelledRegistration: 'INSERT INTO cancelledregistration (userid, roompreference, earlyarrival, latedeparture, buytshirt, buyhoodie, tshirtsize, hoodiesize, timestamp, paymentdeadline, isadminapproved, receivedinsidespot, receivedoutsidespot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',

    updateAllRegistrationFieldsAsAdmin: 'UPDATE registration SET roompreference=?, earlyarrival=?, latedeparture=?, buytshirt=?, buyhoodie=?, tshirtsize=?, hoodiesize=?, receivedinsidespot=?, receivedoutsidespot=?, paymentdeadline=? WHERE userid=?',

    updateRegistrationRoomPrefAndResetTimestamp: 'UPDATE registration SET roompreference=?, timestamp=NOW(3), receivedoutsidespot=0, receivedinsidespot=0 WHERE userid=?',

    updateRegistrationAddons: 'UPDATE registration SET earlyarrival=?, latedeparture=?, buytshirt=?, buyhoodie=?, tshirtsize=?, hoodiesize=? WHERE userid=?',

    approveRegistration: 'UPDATE registration SET isadminapproved = 1, registrationnumber = (SELECT num FROM (SELECT IFNULL((SELECT MAX(registrationnumber) FROM registration), 0) + 1 AS num) AS nextregnum) WHERE userid = ?',

    rejectRegistration: 'UPDATE registration SET isadminapproved = 0 WHERE userid = ?',

    removeSpotFromRegistration: 'UPDATE registration SET receivedinsidespot = 0, receivedoutsidespot = 0, isadminapproved = 0, timestamp = NOW(3) WHERE userid = ?',

    getFirstRegistrationUserIdInWaitingListInside: `SELECT userid FROM registration WHERE receivedinsidespot=0 AND (roompreference='insideonly' OR roompreference='insidepreference') AND isadminapproved=1 ORDER BY timestamp ASC LIMIT 1`,

    getFirstRegistrationUserIdInWaitingListOutside: `SELECT userid FROM registration WHERE receivedoutsidespot=0 AND receivedinsidespot=0 AND (roompreference='outsideonly' OR roompreference='insidepreference') AND isadminapproved=1 ORDER BY timestamp ASC LIMIT 1`,

    addInsideSpotToRegistration: `UPDATE registration SET receivedinsidespot = 1, paymentdeadline = ?WHERE userid = ?`,

    addOutsideSpotToRegistration: `UPDATE registration SET receivedoutsidespot = 1, paymentdeadline = ? WHERE userid = ?`,

    addInsideSpotToRegistrationAndRemoveOutsideSpot: `UPDATE registration SET receivedinsidespot = 1, receivedoutsidespot = 0, paymentdeadline = ? WHERE userid = ?`,

    updateRoomPreference: `UPDATE registration SET roompreference = ? WHERE userid = ?`,

    getPaidAmountByRegistrationId: `SELECT COALESCE(SUM(amount), 0) AS amount FROM payment WHERE registrationid = ?`,
    
    setInsideOnlyAndRemoveOutsideSpot: `UPDATE registration SET roompreference = 'insideonly', receivedoutsidespot = 0 WHERE userid = ?`,

    removePaymentsFromUser: `DELETE FROM payment WHERE registrationid = ?`,

    savePaymentRecord: `INSERT INTO payment (paymentid, registrationid, amount) VALUES (?, ?, ?)`,

    saveOverridePayment: `INSERT INTO payment (registrationid, amount) VALUES (?, ?)`,

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