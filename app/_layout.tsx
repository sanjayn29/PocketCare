import LockScreen from '@/components/LockScreen'
import { ThemeProvider } from '@/context/ThemeContext'
import { savePushTokenToFirestore } from '@/lib/save-user'
import { recordVisit } from '@/lib/streak-service'
import { isAuthAvailable } from '@/utils/deviceAuth'
import {
    clearRemovedReminders,
    configureNotificationHandler,
    registerForPushNotificationsAsync,
    scheduleDailyProgressReminder,
    sendWelcomeNotification,
} from '@/utils/notifications'
import { ClerkProvider, useUser } from '@clerk/expo'
import { tokenCache } from '@clerk/expo/token-cache'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Font from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

SplashScreen.preventAutoHideAsync()

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

function MissingConfigScreen() {
  return (
    <View style={styles.missingConfigContainer}>
      <Text style={styles.missingConfigTitle}>PocketCare Configuration Error</Text>
      <Text style={styles.missingConfigText}>
        Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Add it to your EAS environment and rebuild.
      </Text>
    </View>
  )
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
        await scheduleDailyProgressReminder()
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

  // ── Lock screen state ────────────────────────────────────────────────────
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [authAvailable, setAuthAvailable] = useState<boolean | null>(null) // null = still checking

  // On mount: check if device has any credential (biometrics / PIN) configured
  useEffect(() => {
    isAuthAvailable().then(async (available) => {
      setAuthAvailable(available)
      const lockSetting = await AsyncStorage.getItem('appLockEnabled')
      if (!available || lockSetting !== 'true') {
        // No credential or user disabled app lock
        setIsUnlocked(true)
      }
    })
  }, [])

  // Load custom fonts
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

  // Wait for fonts AND auth-availability check before rendering
  if (!fontsLoaded || authAvailable === null) {
    return null
  }

  if (!publishableKey) {
    return <MissingConfigScreen />
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ThemeProvider>
        <RootLayoutContent />
        <StatusBar style="auto" />

        {/* ── Lock screen overlay — rendered above everything ── */}
        {!isUnlocked && authAvailable && (
          <LockScreen onUnlock={() => setIsUnlocked(true)} />
        )}
      </ThemeProvider>
    </ClerkProvider>
  )
}

const styles = StyleSheet.create({
  missingConfigContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  missingConfigTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  missingConfigText: {
    color: '#CBD5E1',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
})
