module.exports = {
  throwError (message, statusCode) {
    let error = new Error(message)
    if (statusCode) { error.statusCode = statusCode }
    error.sendMessage = true
    throw error
  },
}