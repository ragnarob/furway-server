module.exports = function (err, req, res, next) {
  console.error(err)

  if (!err.statusCode) {
    err.statusCode = 500
  }

  if (!err.sendErrorMessage) {
    err.message = 'Server error'
  }

  res.status(err.statusCode).send(err.message)
}