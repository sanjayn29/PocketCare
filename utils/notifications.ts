import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

let isHandlerConfigured = false
const ANDROID_CHANNEL_ID = 'default'

function isExpoGo() {
  return Constants.appOwnership === 'expo'
}

function getProjectId() {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
}

export async function configureNotificationHandler() {
  if (isHandlerConfigured) return

  if (isExpoGo()) {
    console.log('Push notifications are skipped in Expo Go. Use a development build for remote push.')
    isHandlerConfigured = true
    return
  }

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

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (isExpoGo()) {
    console.log('Push token registration is skipped in Expo Go. Use a development build.')
    return
  }

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device.')
    return
  }

  // Android notification channel must be created before requesting permission.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'General',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#06B6D4',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    })
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted')
    return
  }

  const projectId = getProjectId()
  if (!projectId) {
    throw new Error('Missing EAS projectId for getExpoPushTokenAsync')
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId })
  return data
}
