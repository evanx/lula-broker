require('assert').strictEqual(process.env.NODE_ENV, 'development')

require('../../lib/start')({
  config: require('./config'),
  hooks: (app) => ({
    authenticate: require('./authenticate')(app),
    authorizePublish: require('./authorizePublish')(app),
    authorizeSubscribe: require('./authorizeSubscribe')(app),
  }),
  listeners: (app) => ({
    publish: require('./publish')(app),
  }),
})
