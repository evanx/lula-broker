module.exports = ({ config, logger, redisClient }) => {
  const { keyPrefix } = config.redis
  return async (pub, client) => {
    if (client) {
      const { topic } = pub
      const payloadString = pub.payload.toString()
      const clientId = client.id
      logger.debug({ clientId, topic, payloadString }, 'publish')
      await redisClient
        .multi([
          ['publish', `${keyPrefix}published:p`, payloadString],
          [
            'publish',
            `${keyPrefix}published:topic:${topic.replace(/:/g, '')}:p`,
            payloadString,
          ],
          [
            'publish',
            `${keyPrefix}published:source:${clientId.replace(/:/g, '')}:p`,
            payloadString,
          ],
        ])
        .exec()
    }
  }
}
