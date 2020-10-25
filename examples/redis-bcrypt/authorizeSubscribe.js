module.exports = ({ logger }) => (client, sub, callback) => {
  logger.debug({ clientId: client.id, topic: sub.topic }, 'authorizeSubscribe')
  let authorized = client.id === sub.topic || true // TODO: remove
  if (authorized) {
    callback(null, sub)
  } else {
    callback({}, null)
  }
}
