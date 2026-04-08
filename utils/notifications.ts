import Constants from 'expo-constants'

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

import * as Notifications from "expo-notifications"
import { Platform } from "react-native"

export async function registerForPushNotificationsAsync() {
  
  // 🔹 Android notification channel (must be created first)
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#06B6D4",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  // 🔹 Request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission not granted");
    return;
  }

  // 🔹 Get Expo push token
  const token = (
    await Notifications.getExpoPushTokenAsync({
      projectId: "9515599a-1ebe-494e-96d0-6624f71c6210",
    })
  ).data;

  return token;
}

