import { ThemeProvider } from '@/context/ThemeContext'
import { savePushTokenToFirestore } from '@/lib/save-user'
import { recordVisit } from '@/lib/streak-service'
import {
  clearRemovedReminders,
  configureNotificationHandler,
  registerForPushNotificationsAsync,
  sendWelcomeNotification,
} from '@/utils/notifications'
import { ClerkProvider, useUser } from '@clerk/expo'
import { tokenCache } from '@clerk/expo/token-cache'
import * as Font from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useState } from 'react'

SplashScreen.preventAutoHideAsync()

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

if (!publishableKey) {
  throw new Error('Add your Clerk Publishable Key to the .env file')
}

function RootLayoutContent() {
  const { user } = useUser()
  const email = user?.emailAddresses?.[0]?.emailAddress
  const firstName = user?.firstName

  useEffect(() => {
    configureNotificationHandler().catch((error) => {
      console.warn('Notification handler setup skipped:', error)
    })
  }, [])

  useEffect(() => {
    if (email) {
      recordVisit(email)
    }
  }, [email])

  useEffect(() => {
    async function registerAndSaveToken() {
      if (!email) return
      try {
        await clearRemovedReminders(email)
        const token = await registerForPushNotificationsAsync()
        if (token) {
          await savePushTokenToFirestore(email, token)
        }
        await sendWelcomeNotification(firstName)
      } catch (error) {
        console.warn('Push registration skipped:', error)
      }
    }

    registerAndSaveToken()
  }, [email, firstName])

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  )
}

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false)

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          MomoSignature: require('@/assets/Font/MomoSignature-Regular.ttf'),
          RobotoSlab: require('@/assets/Font/RobotoSlab-VariableFont_wght.ttf'),
        })
      } catch (e) {
        console.warn('Error loading fonts:', e)
      } finally {
        setFontsLoaded(true)
        await SplashScreen.hideAsync()
      }
    }

    loadFonts()
  }, [])

  if (!fontsLoaded) {
    return null
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ThemeProvider>
        <RootLayoutContent />
        <StatusBar style="auto" />
      </ThemeProvider>
    </ClerkProvider>
  )
}
