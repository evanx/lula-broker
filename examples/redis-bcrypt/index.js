require('assert').strictEqual(process.env.NODE_ENV, 'development')

require('../../lib/start')({
  config: require('./config'),
  hooks: (app) => ({
    authenticate: require('./authenticate')(app),
    authorizePublish: require('./authorizePublish')(app),
    authorizeSubscribe: require('./authorizeSubscribe')(app),
    authorizeForward: require('./authorizeForward')(app),
  }),
  listeners: (app) => ({
    publish: require('./publish')(app),
    clientReady: require('./clientReady')(app),
    clientDisconnect: require('./clientDisconnect')(app),
  }),
})
