module.exports = {
  throwError (message) {
    let error = new Error(message)
    error.isInentional = true
    throw error
  },
  
  validateUsername (username) {
    return /^[a-zA-ZÆØÅæøå][\w\d_-ÆØÅæøå]{2,20}$/.test(username)
  },

  validatePassword (password) {
    return password.length >= 6
  },

  getUserFromSession (req) {
    if (!req.session || !req.session.user) {
      return null
    }
    else {
      return req.session.user
    }
  },

  areFieldsDefinedAndNotNull (...fields) {
    for (let field of fields) {
      if (field === undefined || field === null) {
        return false
      }
    }

    return true
  },

  convertIntsToBoolean (object, ...keyNames) {
    for (var key of keyNames) {
      if (object[key] === 0) {
        object[key] = false
      }
      else if (object[key] === 1) {
        object[key] = true
      }
    }
  },
}