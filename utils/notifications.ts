import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

let isHandlerConfigured = false
const ANDROID_CHANNEL_ID = 'default'
const SCHEDULE_REMINDER_IDS_KEY = 'schedule_reminder_ids_v1'

type ScheduleReminderIds = Record<string, string>
type ScheduleReminderInput = {
  eventId: string
  email?: string
  title: string
  purpose?: string
  date: string
  startTime: string
}

function isExpoGo() {
  return Constants.appOwnership === 'expo'
}

function getProjectId() {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
}

async function ensureLocalNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'General',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#06B6D4',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    })
  }

  let { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync()
    status = requested.status
  }
  return status === 'granted'
}

function buildDateTimeFromSchedule(date: string, startTime: string): Date | null {
  if (!date || !startTime) return null

  const [hourRaw, minuteRaw] = startTime.split(':')
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null

  const triggerDate = new Date(`${date}T00:00:00`)
  if (Number.isNaN(triggerDate.getTime())) return null
  triggerDate.setHours(hour, minute, 0, 0)

  return triggerDate
}

async function getScheduleReminderIds(): Promise<ScheduleReminderIds> {
  const raw = await AsyncStorage.getItem(SCHEDULE_REMINDER_IDS_KEY)
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw) as ScheduleReminderIds
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

async function setScheduleReminderIds(ids: ScheduleReminderIds): Promise<void> {
  await AsyncStorage.setItem(SCHEDULE_REMINDER_IDS_KEY, JSON.stringify(ids))
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

export async function sendWelcomeNotification(firstName?: string | null): Promise<boolean> {
  let { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync()
    status = requested.status
  }
  if (status !== 'granted') return false

  const safeFirstName = firstName?.trim()
  const title = safeFirstName ? `Welcome to PocketCare, ${safeFirstName}!` : 'Welcome to PocketCare!'

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: 'Track yourself daily and become a better version of yourself.',
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
      data: { type: 'welcome' },
    },
    trigger: null,
  })
  return true
}

export async function clearRemovedReminders(email?: string): Promise<void> {
  const normalizedEmail = email?.toLowerCase()
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()

  for (const request of scheduled) {
    const data = request.content.data as { type?: string; email?: string } | undefined
    const isRemovedType =
      data?.type === 'daily-progress-reminder' || data?.type === 'goal-deadline-reminder'
    if (!isRemovedType) continue

    if (!normalizedEmail || !data?.email || data.email === normalizedEmail) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier)
    }
  }
}

export async function cancelScheduleEventReminder(eventId: string): Promise<void> {
  if (!eventId) return

  const reminderIds = await getScheduleReminderIds()
  const notificationId = reminderIds[eventId]
  if (!notificationId) return

  await Notifications.cancelScheduledNotificationAsync(notificationId)
  delete reminderIds[eventId]
  await setScheduleReminderIds(reminderIds)
}

export async function scheduleScheduleEventReminder(input: ScheduleReminderInput): Promise<boolean> {
  const triggerDate = buildDateTimeFromSchedule(input.date, input.startTime)
  if (!triggerDate || triggerDate.getTime() <= Date.now()) return false

  const permissionGranted = await ensureLocalNotificationPermission()
  if (!permissionGranted) return false

  await cancelScheduleEventReminder(input.eventId)

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Reminder: ${input.title}`,
      body: input.purpose?.trim() || 'This event is starting now.',
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
      data: {
        type: 'schedule-event-reminder',
        eventId: input.eventId,
        email: input.email || '',
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  })

  const reminderIds = await getScheduleReminderIds()
  reminderIds[input.eventId] = identifier
  await setScheduleReminderIds(reminderIds)
  return true
}
