const { Expo } = require('expo-server-sdk');
let expo = new Expo();

async function enviarNotificacion(pushToken, mensaje) {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error('Push token inválido:', pushToken);
    return;
  }

  const message = {
    to: pushToken,
    sound: 'default',
    body: mensaje,
    data: { withSome: 'data' },
  };

  try {
    let receipts = await expo.sendPushNotificationsAsync([message]);
    console.log('Notificación enviada:', receipts);
  } catch (error) {
    console.error('Error enviando notificación:', error);
  }
}

module.exports = { enviarNotificacion };
