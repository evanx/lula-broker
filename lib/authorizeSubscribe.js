module.exports = (app) => (client, sub, callback) => {
  app.logger.debug(
    `authorizeSubscribe client ${client.id} to topic ${sub.topic}`,
  )
  return client.id === sub.topic
}
