module.exports = async function handleRoute (res, throwErr, handlerFunction, ...handlerParams) {
  try {
    let response = await handlerFunction(...handlerParams)
    return response
  }
  catch (err) {
    throwErr(err)
  }
}