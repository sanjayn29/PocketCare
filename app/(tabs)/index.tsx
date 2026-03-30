import { useGreeting } from '@/hooks/use-greeting'
import { saveUserToFirestore } from '@/lib/save-user'
import { useUser } from '@clerk/expo'
import LottieView from 'lottie-react-native'
import React, { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'

export default function HomeScreen() {
  const { user } = useUser()
  const greeting = useGreeting(user?.firstName || 'User')

  // Save user data to Firebase when they're logged in
  useEffect(() => {
    if (user) {
      const email = user.emailAddresses[0]?.emailAddress
      if (email) {
        const provider =
          user.externalAccounts?.length > 0
            ? user.externalAccounts[0].provider || 'google'
            : 'email'

        saveUserToFirestore({
          email,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
          clerkUserId: user.id,
          provider,
        })
      }
    }
  }, [user])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PocketCare</Text>
      <LottieView
        source={require('../../assets/animations/Morphing.json')}
        autoPlay
        loop
        style={styles.animation}
      />
      <Text style={styles.greetingMessage}>{greeting.message}</Text>
      <Text style={styles.motivational}>{greeting.motivational}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    position: 'absolute',
    top: 60,
    left: 20,
  },
  animation: {
    width: 250,
    height: 250,
    marginBottom: 20,
  },
  greetingMessage: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  motivational: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
})