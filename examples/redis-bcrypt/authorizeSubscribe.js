module.exports = ({ logger }) => (client, sub, callback) => {
  logger.warn(`authorizeSubscribe client ${client.id} to topic ${sub.topic}`)
  let authorized = client.id === sub.topic
  if (authorized) {
    callback(null, sub)
  } else {
    callback({}, null)
  }
}
