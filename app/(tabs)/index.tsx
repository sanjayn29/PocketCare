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

  const animationItems = [
    { source: require('../../assets/animations/Morphing.json'), label: 'Morphing' },
    { source: require('../../assets/animations/Rocketship.json'), label: 'Rocketship' },
    { source: require('../../assets/animations/Loader.json'), label: 'Loader' },
    { source: require('../../assets/animations/Intro.json'), label: 'Intro' },
  ]

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 60,
      paddingHorizontal: 20,
      justifyContent: 'flex-start',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      marginBottom: 16,
      alignSelf: 'flex-start',
      color: colors.primary,
    },
    animationGrid: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    animationCard: {
      width: '48%',
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: colors.card,
      marginBottom: 16,
      alignItems: 'center',
      padding: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 5,
    },
    animation: {
      width: 140,
      height: 140,
      marginBottom: 8,
    },
    animationLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
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
      <View style={dynamicStyles.animationGrid}>
        {animationItems.map((item) => (
          <View key={item.label} style={dynamicStyles.animationCard}>
            <LottieView
              source={item.source}
              autoPlay
              loop
              style={dynamicStyles.animation}
            />
            <Text style={dynamicStyles.animationLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
      <Text style={dynamicStyles.greetingMessage}>{greeting.message}</Text>
      <Text style={dynamicStyles.motivational}>{greeting.motivational}</Text>
    </View>
  )
}