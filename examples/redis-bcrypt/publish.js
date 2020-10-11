const assert = require('assert')

module.exports = ({ config, logger, clock, redisClient }) => async (
  pub,
  client,
) => {
  const { topic, payloadString, payloadObject } = pub
  if (!client) {
    logger.debug({ topic }, 'no client')
    return
  }
  assert(payloadObject, 'payloadObject')
  const type = payloadObject.type || 'none'
  const clientId = client.id
  const clientKey = clientId.replace(/:/g, '')
  const now = clock()
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
        `${config.redis.keyPrefix}published:source:${clientKey}:p`,
        payloadString,
      ],
      ['zadd', 'published:timestamp:z', now, [clientKey, type].join(':')],
      ['zadd', `published:client:timestamp:z`, now, clientKey],
      ['zadd', `published:type:${type}:timestamp:z`, now, clientKey],
      ['zincrby', 'published:counter:z', 1, [clientKey, type].join(':')],
      ['zincrby', 'published:type:counter:z', 1, type],
      ['zincrby', 'published:source:counter:z', 1, clientKey],
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
