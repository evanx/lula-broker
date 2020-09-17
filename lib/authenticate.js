const bcrypt = require('bcrypt')

module.exports = (app) => async (client, username, password, callback) => {
  const { logger, config, redisClient } = app
  if (username !== client.id) {
    logger.warn(`Mismatched username "${username}" for client "${client.id}"`)
  } else if (password) {
    username = username.replace(/:/g, '')
    const [pass, reg] = await redisClient.hmget(
      `client:${username}:h`,
      'pass',
      'reg',
    )
    if (pass) {
      if (await bcrypt.compare(password.toString(), pass)) {
        logger.info(`Authenticated ${username}`, pass)
        callback(null, true)
        return
      }
    }
    if (reg) {
      if (Number(reg) < app.clock() {
        logger.warn(`Registration expired ${username}`)
      } else {
        const passwordHash = await bcrypt.hash(
          password.toString(),
          config.bcrypt.rounds,
        )
        await redisClient
          .multi([
            ['hset', `client:${username}:h`, 'pass', passwordHash],
            ['hdel', `client:${username}:h`, 'reg'],
          ])
          .exec()
        logger.info(`Registered ${username}`)
      }
    }
  }
  callback(null, false)
}
