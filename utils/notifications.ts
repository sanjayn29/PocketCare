import Constants from 'expo-constants'
import * as Device from 'expo-device'

let isHandlerConfigured = false

function isExpoGo() {
  return Constants.appOwnership === 'expo'
}

async function getNotificationsModule() {
  return import('expo-notifications')
}

export async function configureNotificationHandler() {
  if (isHandlerConfigured) return

  if (isExpoGo()) {
    console.log('Push notifications are skipped in Expo Go. Use a development build for remote push.')
    isHandlerConfigured = true
    return
  }

  const Notifications = await getNotificationsModule()

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })

  isHandlerConfigured = true
}

export async function registerForPushNotificationsAsync() {
  if (isExpoGo()) {
    console.log('Expo Go does not support Android remote push notifications. Build a dev client to test push tokens.')
    return
  }

  if (!Device.isDevice) {
    alert('Use a real device for notifications')
    return
  }

  const Notifications = await getNotificationsModule()

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    alert('Permission not granted!')
    return
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID

  if (!projectId) {
    console.warn('No EAS projectId found. Set expo.extra.eas.projectId in app.json or EXPO_PUBLIC_EAS_PROJECT_ID in .env.')
    return
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data

  console.log('Push Token:', token)

  return token
}

