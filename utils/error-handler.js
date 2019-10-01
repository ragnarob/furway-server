module.exports = function (err, req, res, next) {
  if (!err.statusCode) {
    err.statusCode = 500
  }

  if (!err.sendErrorMessage) {
    err.message = 'Server error'
    console.error(err)
  }

  res.status(err.statusCode).send(err.message)
}