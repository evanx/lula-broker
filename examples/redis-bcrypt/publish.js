module.exports = ({ config, logger, redisClient }) => {
  const { keyPrefix } = config.redis
  return async (pub, client) => {
    if (client) {
      const { topic, payloadString, payloadObject } = pub
      const type = payloadObject.type || 'none'
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
          ['zincrby', 'published:z', 1, [clientId, type].join(':')],
          ['zincrby', 'published:type:z', 1, type],
          ['zincrby', 'published:source:z', 1, clientId],
          [
            'xadd',
            `published:x`,
            'maxlen',
            config.maxlen,
            '*',
            'source',
            clientId,
            'topic',
            topic,
            'payload',
            payloadString,
            'type',
            type,
          ],
        ])
        .exec()
    }
  }
}
