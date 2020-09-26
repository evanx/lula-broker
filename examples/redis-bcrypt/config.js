module.exports = {
  maxlen: 1e6,
  redis: {
    keyPrefix: 'lula:',
  },
  logger: {
    name: 'lula-broker',
    level: 'debug',
    prettyPrint: true,
    prettifierInspector: true,
  },
  authenticateConcurrencyLimit: 1,
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
