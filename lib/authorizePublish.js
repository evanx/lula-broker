module.exports = (app) => (client, sub, callback) => {
  app.logger.debug(`authorizePublish client ${client.id} to topic ${sub.topic}`)
  return false
}
