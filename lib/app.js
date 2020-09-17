const aedes = require('aedes')()
const fs = require('fs')
const config = require('config')
const ws = require('websocket-stream')
const tls = require('tls')
const httpServer = require('http').createServer()
const pino = require('pino')
const Redis = require('ioredis')

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
  clockSeconds: () => Math.floor(Date.now() / 1000),
}

Object.assign(aedes, {
  authenticate: require('./authenticate')(app),
  authorizePublish: require('./authorizePublish')(app),
  authorizeSubscribe: require('./authorizeSubscribe')(app),
})

app.wsServer = ws.createServer({ server: httpServer }, aedes.handle)

httpServer.listen(config.ws.port, () => {
  app.logger.info(`Websocket server listening on port ${config.ws.port}`)
})

app.tlsServer = tls.createServer(tlsOptions, aedes.handle)

app.tlsServer.listen(config.mqtt.port, () => {
  app.logger.info(`Websocket server listening on port ${config.mqtt.port}`)
})
