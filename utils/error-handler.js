module.exports = function (err, req, res, next) {
  let errorMessage
  if (!err.isInentional) {
    console.error(err)
    errorMessage = 'Server error'
  }
  else {
    errorMessage = err.message
  }

  res.json({'error': errorMessage})
}