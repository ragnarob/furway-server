module.exports = function (err, req, res, next) {
  let errorMessage
  if (!err.isInentional) {
    console.error(err)
    if (err.includes('DUP_ENTRY')) {
      errorMessage = 'A user with this email or username already exists'
    }
    else {
      errorMessage = 'Server error'
    }
  }
  else {
    errorMessage = err.message
  }

  res.json({'error': errorMessage})
}