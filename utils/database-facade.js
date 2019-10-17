const mysql = require('mysql')
const databaseSettings = require('../config/database-settings.json')

const facade = module.exports = {
  mysqlPool: mysql.createPool(databaseSettings),

  queries: {
    addRegistration: 'INSERT INTO registration (userid, roompreference, earlyarrival, latedeparture, buytshirt, buyhoodie) VALUES (?, ?, ?, ?, ?, ?)',
    updateRegistration: 'UPDATE registration SET roompreference=?, earlyarrival=?, latedeparture=?, buytshirt=?, buyhoodie=? WHERE userid=?'
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