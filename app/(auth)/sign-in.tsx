import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { useOAuth } from '@clerk/expo'
import { useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

export default function AuthPage() {
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' })
  const router = useRouter()
  const [errorMessage, setErrorMessage] = React.useState('')

  const handleGoogleSignIn = async () => {
    try {
      setErrorMessage('')
      const { createdSessionId, setActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL('/(tabs)', { scheme: 'myapp' })
      })

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId })
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google Sign-In error')
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Welcome Back</ThemedText>
        <ThemedText style={styles.subtitle}>Sign in to PocketCare</ThemedText>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.googleButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleGoogleSignIn}
      >
        <ThemedText style={styles.googleButtonText}>Sign in with Google</ThemedText>
      </Pressable>

      {!!errorMessage && (
        <ThemedText style={styles.error}>{errorMessage}</ThemedText>
      )}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 10,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  googleButton: {
    backgroundColor: '#111',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  googleButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  error: {
    color: '#d32f2f',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
})
