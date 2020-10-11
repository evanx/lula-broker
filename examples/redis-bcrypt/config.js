module.exports = {
  maxlen: 1e6,
  redis: {
    keyPrefix: 'lula:',
  },
  dbs: {
    rateLimiter: 1,
    mqEmitter: 2,
    persistence: 3,
  },
  persistenceRedis: {
    maxSessionDelivery: 1000, // maximum offline messages deliverable on client CONNECT, default is 1000
    packetTTL: (packet) => 72 * 24 * 3600, // seconds, offline message TTL
  },
  addressRateLimiter: {
    limit: 2,
    expireSeconds: 10,
  },
  clientRateLimiter: {
    limit: 1,
    expireSeconds: 10,
  },
  authenticateConcurrencyLimit: 1,
  logger: {
    name: 'lula-broker',
    level: 'debug',
    prettyPrint: true,
    prettifierInspector: true,
  },
  bcrypt: {
    rounds: 12,
  },
  tls: {
    key: '/etc/lula-broker/key.pem',
    cert: '/etc/lula-broker/cert.pem',
  },
  mqtt: {
    port: 8883,
  },
  ws: {
    port: 8443,
  },
}
