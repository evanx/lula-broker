module.exports = ({ logger, aedes }) => (client, packet) => {
  logger.debug({ clientId: client.id, topic: packet.topic }, 'authorizeForward')
  if (packet.forwardClientId && packet.forwardClientId !== client.id) {
    return null
  }
  return packet
}