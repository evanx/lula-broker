const bcrypt = require('bcrypt')
const otplib = require('otplib')

module.exports = ({
  config,
  logger,
  redisClient,
  rateLimiterRedisClient,
  multiAsync,
  clock,
}) => {
  const getRateLimitedReason = async ({ clientKey, remoteAddress }) => {
    remoteAddress = remoteAddress.split(':').pop()
    const [addressCount, clientCount] = await multiAsync(
      rateLimiterRedisClient,
      [
        ['incr', `a:${remoteAddress}`],
        ['incr', `c:${clientKey}`],
        [
          'expire',
          `a:${remoteAddress}`,
          config.addressRateLimiter.expireSeconds,
        ],
        ['expire', `c:${clientKey}`, config.clientRateLimiter.expireSeconds],
      ],
    )
    if (addressCount > config.addressRateLimiter.limit) {
      return 'addressRateLimited'
    } else if (clientCount > config.clientRateLimiter.limit) {
      return 'clientRateLimited'
    } else {
      return ''
    }
  }

  const authenticate = async (clientKey, passwordString) => {
    logger.debug({ clientKey }, 'authenticate')
    const [
      authenticateCount,
      [bcryptHash, otpSecret, registrationDeadline],
    ] = await multiAsync(redisClient, [
      ['zincrby', 'meter:upDownCounter:z', 1, 'authenticate'],
      [
        'hmget',
        `client:${clientKey}:h`,
        'bcryptHash',
        'otpSecret',
        'registrationDeadline',
      ],
    ])
    if (authenticateCount > config.authenticateConcurrencyLimit) {
      return [false, 'concurrencyExceeded']
    }
    if (otpSecret && /^\d{6}$/.test(passwordString)) {
      if (otplib.authenticator.check(passwordString, otpSecret)) {
        return [true, 'otpOk']
      }
    }
    if (bcryptHash) {
      if (await bcrypt.compare(passwordString, bcryptHash)) {
        return [true, 'bcryptOk']
      }
    }
    if (registrationDeadline) {
      if (Number(registrationDeadline) < clock()) {
        return [false, 'registrationExpired']
      } else {
        const passwordHash = await bcrypt.hash(
          passwordString,
          config.bcrypt.rounds,
        )
        await redisClient
          .multi([
            ['hset', `client:${clientKey}:h`, 'bcryptHash', passwordHash],
            ['hdel', `client:${clientKey}:h`, 'registrationDeadline'],
          ])
          .exec()
        logger.info({ clientKey }, 'Registered')
        return [true, 'registeredOk']
      }
    }
    return [false, 'invalidPassword']
  }

  const recordResult = (result) => {
    if (result.recordedResult) {
      throw new Error('Authenticate result already recorded')
    }
    result.recordedResult = true
    const commands = [
      ['zincrby', 'meter:counter:z', 1, 'authenticate'],
      ['zincrby', 'meter:authenticate:counter:z', 1, result.reason],
    ]
    if (result.clientKey) {
      commands.push([
        'zincrby',
        `meter:authenticate:reason:${result.reason}:counter:z`,
        1,
        result.clientKey,
      ])
      const resultType = result.authenticated ? 'allowed' : 'denied'
      commands.push([
        'zadd',
        `authenticate:result:${resultType}:timestamp:z`,
        result.timestamp,
        [result.clientKey, result.reason].join(':'),
      ])
      commands.push([
        'zadd',
        `authenticate:reason:${result.reason}:timestamp:z`,
        result.timestamp,
        result.clientKey,
      ])
    }
    if (result.calledAuthenticate) {
      commands.push(['zincrby', 'meter:upDownCounter:z', -1, 'authenticate'])
    }
    return multiAsync(redisClient, commands)
  }

  return async (client, username, password, callback) => {
    const clientId = client.id
    const clientKey = clientId.replace(/:/g, '')
    const result = {
      clientKey,
      timestamp: clock(),
      authenticated: false,
      reason: 'unknown',
      calledAuthenticate: false,
      recordedResult: false,
    }
    if (!username) {
      result.reason = 'emptyUsername'
    } else if (!password) {
      result.reason = 'emptyPassword'
    } else if (username !== clientId) {
      result.reason = 'mismatchedClientUsername'
    } else {
      const { remoteAddress } = client.conn
      const rateLimitedReason = await getRateLimitedReason({
        clientKey,
        remoteAddress,
      })
      if (rateLimitedReason) {
        result.reason = rateLimitedReason
      } else {
        const [clientKeyExistsRes] = await multiAsync(redisClient, [
          ['exists', `client:${clientKey}:h`],
        ])
        if (!clientKeyExistsRes) {
          result.reason = 'invalidClient'
        } else {
          try {
            result.calledAuthenticate = true
            const [authenticatedRes, reasonRes] = await authenticate(
              clientKey,
              password.toString(),
            )
            if (authenticatedRes) {
              result.authenticated = true
            }
            result.reason = reasonRes
          } catch (err) {
            result.reason = 'errored'
            result.err = err
            logger.error({ clientId, err }, 'authenticate')
            throw err // TODO: check that app exits
          } finally {
            await recordResult(result)
          }
        }
      }
    }
    logger.debug({ clientId, result }, 'authenticate')
    if (!result.recordedResult) {
      await recordResult(result)
    }
    callback(null, result.authenticated)
  }
}
