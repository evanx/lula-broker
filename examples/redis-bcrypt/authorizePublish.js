const seq = new Map()

module.exports = ({ logger, aedes }) => (client, pub, callback) => {
  logger.debug({ clientId: client.id, topic: pub.topic }, 'authorizePublish')
  pub.payloadString = pub.payload.toString()
  pub.payloadObject = JSON.parse(pub.payloadString)
  if (pub.payloadObject.fanout) {
    const fanout = pub.payloadObject.fanout
    const clientIds = Object.keys(aedes.clients).filter(
      clientId => clientId.split('/')[0] === fanout
    )
    if (clientIds.length) {
      const count = seq.get(fanout)
      if (!count) {
        seq.set(fanout, 1)
      } else {
        seq.set(fanout, count + 1)
      }
      pub.forwardClientId = clientIds[count % clientIds.length]
    }
  }
  const authorized = pub.payloadObject.source === client.id
  if (authorized) {
    callback(null, pub)
  } else {
    callback({}, null)
  }
}
