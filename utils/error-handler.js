module.exports = function (err, req, res, next) {
  if (!err.isInentional) {
    console.error(err)
    err.message = 'Server error'
  }

  res.json({error: err.message})
}