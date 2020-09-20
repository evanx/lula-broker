const assert = require('assert')

module.exports = ({ config, logger, redisClient }) => async (pub, client) => {
  if (!client) {
    logger.debug('no client')
    return
  }
  const { topic, payloadString, payloadObject } = pub
  assert(payloadObject, 'payloadObject')
  const type = payloadObject.type || 'none'
  const clientId = client.id
  logger.debug({ clientId, topic, payloadString }, 'publish')
  await redisClient
    .multi([
      ['publish', `${config.redis.keyPrefix}published:p`, payloadString],
      [
        'publish',
        `${config.redis.keyPrefix}published:topic:${topic.replace(/:/g, '')}:p`,
        payloadString,
      ],
      [
        'publish',
        `${config.redis.keyPrefix}published:source:${clientId.replace(
          /:/g,
          '',
        )}:p`,
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
