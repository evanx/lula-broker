const bcrypt = require('bcrypt')
const otplib = require('otplib')

module.exports = ({ config, logger, redisClient, clock }) => {
  const authenticate = async (username, passwordString) => {
    const [bcryptHash, otpSecret, regDeadline] = await redisClient.hmget(
      `client:${username}:h`,
      'bcryptHash',
      'otpSecret',
      'regDeadline',
    )
    if (otpSecret && /^\d{6}$/.test(passwordString)) {
      if (otplib.authenticator.check(passwordString, otpSecret)) {
        logger.debug({ username }, 'Authenticated OTP')
        return true
      }
    }
    if (bcryptHash) {
      if (await bcrypt.compare(passwordString, bcryptHash)) {
        logger.debug({ username }, 'Authenticated')
        return true
      }
    }
    if (regDeadline) {
      if (Number(regDeadline) < clock()) {
        logger.warn({ username }, 'Registration expired')
      } else {
        const passwordHash = await bcrypt.hash(
          passwordString,
          config.bcrypt.rounds,
        )
        await redisClient
          .multi([
            ['hset', `client:${username}:h`, 'bcryptHash', passwordHash],
            ['hdel', `client:${username}:h`, 'regDeadline'],
          ])
          .exec()
        logger.info({ username }, 'Registered')
      }
    }
    return false
  }
  return async (client, username, password, callback) => {
    const clientId = client.id
    let authenticated = false
    if (!username) {
      logger.warn({ clientId }, 'Empty username')
    } else if (!password) {
      logger.warn({ username }, 'Empty password')
    } else if (username !== clientId) {
      logger.warn({ clientId, username }, 'Mismatched client/username')
    } else {
      const clientKey = clientId.replace(/:/g, '')
      authenticated = await authenticate(clientKey, password.toString())
      logger.info({ clientKey, authenticated }, 'Authenticated')
    }
    callback(null, authenticated)
  }
}
