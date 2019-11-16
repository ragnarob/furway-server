module.exports = function (err, req, res, next) {
  let errorMessage
  if (!err.isInentional) {
    console.log(err)
    if (err.message && err.message.includes('DUP_ENTRY')) {
      errorMessage = 'A user with this email or username already exists'
    }
    else {
      errorMessage = 'Server error'
    }
  }
  else {
    errorMessage = err.message
  }

  try {
    res.json({'error': errorMessage})
  }
  catch (err) {
  }
}