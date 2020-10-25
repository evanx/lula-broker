const assert = require('assert')

module.exports = ({ config, logger, clock, redisClient }) => async (
  pub,
  client,
) => {
  const { topic, payloadString, payloadObject } = pub
  if (!client) {
    logger.trace({ topic }, 'no client')
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
      ['publish', `${config.redis.keyPrefix}publish:p`, payloadString],
      [
        'publish',
        `${config.redis.keyPrefix}publish:topic:${topic.replace(/:/g, '')}:p`,
        payloadString,
      ],
      [
        'publish',
        `${config.redis.keyPrefix}publish:source:${clientKey}:p`,
        payloadString,
      ],
      ['zadd', 'publish:timestamp:z', now, [clientKey, type].join(':')],
      ['zadd', `publish:client:timestamp:z`, now, clientKey],
      ['zadd', `publish:type:${type}:timestamp:z`, now, clientKey],
      ['zincrby', 'publish:counter:z', 1, [clientKey, type].join(':')],
      ['zincrby', 'publish:type:counter:z', 1, type],
      ['zincrby', 'publish:source:counter:z', 1, clientKey],
      [
        'xadd',
        `publish:x`,
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
