import { getColors } from '@/constants/styles'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useGreeting } from '@/hooks/use-greeting'
import { saveUserToFirestore } from '@/lib/save-user'
import { useUser } from '@clerk/expo'
import LottieView from 'lottie-react-native'
import React, { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'

export default function HomeScreen() {
  const { user } = useUser()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = getColors(isDark)
  const greeting = useGreeting(user?.firstName || 'User')

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

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 60,
      paddingHorizontal: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      marginBottom: 20,
      position: 'absolute',
      top: 60,
      left: 20,
      color: colors.primary,
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
      color: colors.text,
    },
    motivational: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 20,
      textAlign: 'center',
      lineHeight: 20,
    },
  })

  return (
    <View style={dynamicStyles.container}>
      <Text style={dynamicStyles.title}>PocketCare ✨</Text>
      <LottieView
        source={require('../../assets/animations/Morphing.json')}
        autoPlay
        loop
        style={dynamicStyles.animation}
      />
      <Text style={dynamicStyles.greetingMessage}>{greeting.message}</Text>
      <Text style={dynamicStyles.motivational}>{greeting.motivational}</Text>
    </View>
  )
}