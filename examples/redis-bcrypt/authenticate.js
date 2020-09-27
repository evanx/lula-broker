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
  const exceedsRateLimit = async (remoteAddress) => {
    remoteAddress = remoteAddress.split(':').pop()
    const [count] = await multiAsync(rateLimiterRedisClient, [
      ['incr', remoteAddress],
      ['expire', remoteAddress, config.rateLimiter.expireSeconds],
    ])
    return count > config.rateLimiter.limit
  }
  const authenticate = async (username, passwordString) => {
    logger.debug({ username }, 'authenticate')
    const [
      authenticateCount,
      [bcryptHash, otpSecret, registrationDeadline],
    ] = await multiAsync(redisClient, [
      ['hincrby', 'meter:upDownCounter:h', 'authenticate', 1],
      [
        'hmget',
        `client:${username}:h`,
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
            ['hset', `client:${username}:h`, 'bcryptHash', passwordHash],
            ['hdel', `client:${username}:h`, 'registrationDeadline'],
          ])
          .exec()
        logger.info({ username }, 'Registered')
        return [true, 'registeredOk']
      }
    }
    return [false, 'invalidPassword']
  }

  return async (client, username, password, callback) => {
    const clientId = client.id
    const result = {
      authenticated: false,
      reason: 'unknown',
    }
    if (!username) {
      result.reason = 'emptyUsername'
    } else if (!password) {
      result.reason = 'emptyPassword'
    } else if (username !== clientId) {
      result.reason = 'mismatchedClientUsername'
    } else {
      const { remoteAddress } = client.conn
      if (await exceedsRateLimit(remoteAddress)) {
        result.reason = 'rateLimited'
      } else {
        const clientKey = clientId.replace(/:/g, '')
        const [clientKeyExistsRes] = await multiAsync(redisClient, [
          ['exists', `client:${clientKey}:h`],
        ])
        if (!clientKeyExistsRes) {
          result.reason = 'invalidClient'
        } else {
          try {
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
            logger.error({ clientKey, err }, 'authenticate')
            throw err // TODO: check that app exits
          } finally {
            await multiAsync(redisClient, [
              ['hincrby', 'meter:upDownCounter:h', 'authenticate', -1],
              ['hincrby', 'meter:counter:h', 'authenticate', 1],
              ['hincrby', 'meter:counter:authenticate:h', reasonRes, 1],
            ])
            result.counted = true
          }
        }
      }
    }
    logger.debug({ clientId, result }, 'authenticate')
    if (!result.counted) {
      await multiAsync(redisClient, [
        ['hincrby', 'meter:counter:h', 'authenticate', 1],
        ['hincrby', 'meter:counter:authenticate:h', result.reason, 1],
      ])
    }
    callback(null, result.authenticated)
  }
}
