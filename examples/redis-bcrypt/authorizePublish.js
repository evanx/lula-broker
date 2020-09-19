module.exports = ({ logger }) => (client, sub, callback) => {
  logger.warn(`authorizePublish client ${client.id} to topic ${sub.topic}`)
  const authorized = true
  if (authorized) {
    callback(null, sub)
  } else {
    callback({}, null)
  }
}
