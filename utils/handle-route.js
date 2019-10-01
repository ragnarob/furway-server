module.exports = async function handleRoute (res, throwErr, handlerFunction, ...handlerParams) {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await handlerFunction(...handlerParams)
      resolve(response)
    }
    catch (err) {
      throwErr(err)
    }
  })
}