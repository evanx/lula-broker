module.exports = ({ config, logger, clock, redisClient }) => async (
  client,
) => {
  logger.debug({ clientId: client.id }, 'clientDisconnect')
}