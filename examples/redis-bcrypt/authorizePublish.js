module.exports = ({ logger }) => (client, pub, callback) => {
  logger.warn(`authorizePublish client ${client.id} to topic ${pub.topic}`)
  pub.payloadString = pub.payload.toString()
  pub.payloadObject = JSON.parse(pub.payloadString)
  const authorized = pub.payloadObject.source === client.id
  if (authorized) {
    callback(null, pub)
  } else {
    callback({}, null)
  }
}
