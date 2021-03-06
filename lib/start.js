const fs = require('fs')
const ws = require('websocket-stream')
const tls = require('tls')
const httpServer = require('http').createServer()
const pino = require('pino')
const Redis = require('ioredis')

module.exports = async ({ config, hooks, listeners }) => {
  const tlsOptions = {
    key: fs.readFileSync(config.tls.key),
    cert: fs.readFileSync(config.tls.cert),
  }

  if (config.logger.prettifierInspector) {
    config.logger.prettifier = require('pino-inspector')
  }

  const app = {
    config,
    redisClient: new Redis(config.redis),
    httpServer,
    logger: pino(config.logger),
    clock: () => Date.now(),
  }

  Object.assign(app, require('./utils')(config))

  await app.multiAsync(app.redisClient, [
    ['hset', 'meter:upDownCounter:h', 'authenticate', 0],
  ])

  const aedes = require('aedes')({
    mq: require('mqemitter-redis')(
      Object.assign(
        {
          db: 1,
        },
        config.redis,
      ),
    ),
    persistence: require('aedes-persistence-redis')(
      Object.assign(
        {
          db: 2,
          maxSessionDelivery: 100, // maximum offline messages deliverable on client CONNECT, default is 1000
          packetTTL: (packet) => 10, // seconds, offline message TTL
        },
        config.redis,
      ),
    ),
  })

  Object.assign(aedes, hooks(app))

  Object.entries(listeners(app)).forEach((entry) => aedes.on(...entry))

  app.wsServer = ws.createServer({ server: httpServer }, aedes.handle)

  httpServer.listen(config.ws.port, () => {
    app.logger.info(`Websocket server listening on port ${config.ws.port}`)
  })

  app.tlsServer = tls.createServer(tlsOptions, aedes.handle)

  app.tlsServer.listen(config.mqtt.port, () => {
    app.logger.info(`Websocket server listening on port ${config.mqtt.port}`)
  })
}
