module.exports = {
  throwError (message) {
    let error = new Error(message)
    error.isInentional = true
    throw error
  },
  
  validateUsername (username) {
    return /^[a-zA-ZÆØÅæøå][\w\d_-ÆØÅæøå]{1,19}$/.test(username)
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
}