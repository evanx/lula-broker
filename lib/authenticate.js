const bcrypt = require('bcrypt')

module.exports = (app) => async (client, username, password, callback) => {
  const { logger, config, redisClient } = app
  if (username !== client.id) {
    logger.warn(`Mismatched username "${username}" for client "${client.id}"`)
  } else if (password) {
    username = username.replace(/:/g, '')
    const bcryptPassword = await redisClient.hget(
      `client:${client.id}:h`,
      'password',
    )
    if (bcryptPassword) {
      if (await bcrypt.compare(password.toString(), bcryptPassword)) {
        logger.info(`Authenticated ${username}`, bcryptPassword)
        callback(null, true)
        return
      }
    }
    const registerDeadline = await redisClient.zscore('register:z', username)
    if (registerDeadline) {
      await redisClient.zrem('register:z', username)
      if (Number(registerDeadline) < app.clockSeconds()) {
        logger.warn(`Registration expired ${username}`)
      } else {
        const passwordHash = await bcrypt.hash(
          password.toString(),
          config.bcrypt.rounds,
        )
        await redisClient.hset(
          `client:${client.id}:h`,
          'password',
          passwordHash,
        )
        logger.info(`Registered ${username}`)
      }
    }
  }
  callback(null, false)
}
