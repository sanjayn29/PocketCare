import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { getColors } from '@/constants/styles'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useOAuth } from '@clerk/expo'
import { Ionicons } from '@expo/vector-icons'
import { useFonts } from 'expo-font'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import LottieView from 'lottie-react-native'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated'

const { width } = Dimensions.get('window');

const APP_FEATURES = [
  { icon: 'chatbubble-ellipses-outline', title: 'Pocket AI', sub: 'Ask smart questions' },
  { icon: 'heart-outline', title: 'Health', sub: 'Track diet, fitness & meds' },
  { icon: 'wallet-outline', title: 'Finance', sub: 'Budget, calculators & history' },
  { icon: 'briefcase-outline', title: 'Placement', sub: 'Application progress' },
  { icon: 'school-outline', title: 'Goals', sub: 'Set milestones & deadlines' },
  { icon: 'document-text-outline', title: 'Notes', sub: 'Save ideas & journals' },
  { icon: 'checkmark-circle-outline', title: 'Tasks', sub: 'Prioritize work & habits' },
  { icon: 'calendar-outline', title: 'Schedule', sub: 'Events, reminders & status' },
  { icon: 'trophy-outline', title: 'Skills', sub: 'Build growth plans' },
] as const

export default function AuthPage() {
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' })
  const router = useRouter()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = getColors(isDark)
  const [fontsLoaded] = useFonts({
    'Momo Signature': require('../../assets/Font/MomoSignature-Regular.ttf')
  })
  
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showThunderpower, setShowThunderpower] = useState(false)

  // Glass shine animation value
  const shimmerValue = useSharedValue(-200)
  const thunderScale = useSharedValue(0)
  const thunderOpacity = useSharedValue(1)
  const thunderRotate = useSharedValue(0)

  useEffect(() => {
    shimmerValue.value = withRepeat(
      withTiming(450, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    )
  }, [])

  useEffect(() => {
    if (showThunderpower) {
      thunderScale.value = withSequence(
        withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 800 }),
        withTiming(0, { duration: 400 })
      )

      thunderRotate.value = withSequence(
        withTiming(15, { duration: 300, easing: Easing.linear }),
        withTiming(-15, { duration: 300, easing: Easing.linear }),
        withTiming(0, { duration: 300, easing: Easing.linear })
      )

      thunderOpacity.value = withTiming(0, { duration: 1800, easing: Easing.in(Easing.quad) }, () => {
        router.replace('/onboarding')
      })
    }
  }, [showThunderpower])

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerValue.value }, { skewX: '-20deg' }],
  }))

  const thunderpowerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: thunderScale.value },
      { rotateZ: `${thunderRotate.value}deg` }
    ],
    opacity: thunderOpacity.value,
  }))

  const handleGoogleSignIn = async () => {
    try {
      setErrorMessage('')
      setIsLoading(true)
      const { createdSessionId, setActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL('/onboarding', { scheme: 'myapp' })
      })

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId })
        setIsLoading(false)
        setShowThunderpower(true)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google Sign-In was cancelled or failed')
      setIsLoading(false)
    }
  }

  if (!fontsLoaded) {
    return null
  }

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingTop: 40,
      paddingBottom: 24,
      justifyContent: 'space-between',
    },
    topSection: {
      alignItems: 'center',
      marginTop: 8,
    },
    logoContainer: {
      padding: 10,
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: 28,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logo: {
      width: 160,
      height: 160,
      borderRadius: 20,
    },
    actionSection: {
      alignItems: 'center',
      marginTop: 18,
    },
    googleButton: {
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 80,
      width: '88%',
      maxWidth: 320,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
      overflow: 'hidden',
    },
    googleButtonInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleButtonText: {
      color: colors.text,
      fontFamily: 'Momo Signature',
      fontSize: 16,
      fontStyle: 'normal',
    },
    buttonPressed: {
      opacity: 0.85,
    },
    helperText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 12,
    },
    shineMask: {
      flex: 1,
      borderRadius: 100,
      overflow: 'hidden',
    },
    shine: {
      width: 45,
      height: '100%',
      backgroundColor: `rgba(${isDark ? '255, 255, 255' : '0, 0, 0'}, 0.1)`,
    },
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 20,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      marginHorizontal: 16,
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
    },
    gridItem: {
      width: (width - 40 - 24) / 3,
      alignItems: 'center',
      marginBottom: 18,
    },
    iconBox: {
      width: 38,
      height: 38,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
      backgroundColor: colors.card,
    },
    gridTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 2,
    },
    gridSub: {
      fontSize: 9,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 12,
    },
    bannerContainer: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      alignItems: 'flex-start',
      marginTop: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bannerText: {
      flex: 1,
      fontSize: 10,
      color: colors.textSecondary,
      marginLeft: 8,
      lineHeight: 14,
    },
    error: {
      color: colors.danger,
      fontSize: 14,
      marginTop: 16,
      textAlign: 'center',
      fontWeight: '500',
    },
    thunderpowerOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: `rgba(0, 0, 0, ${isDark ? 0.95 : 0.9})`,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    thunderpowerCenter: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    thunderGlow: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: 'rgba(212, 175, 55, 0.3)',
      top: '50%',
      left: '50%',
      marginLeft: -90,
      marginTop: -90,
    },
  })

  return (
    <ThemedView style={dynamicStyles.container}>
      {showThunderpower && (
        <Animated.View style={[dynamicStyles.thunderpowerOverlay, thunderpowerStyle]}>
          <View style={dynamicStyles.thunderpowerCenter}>
            <Ionicons name="flash" size={120} color={colors.primary} />
            <View style={dynamicStyles.thunderGlow} />
          </View>
        </Animated.View>
      )}

      <View style={dynamicStyles.topSection}>
        <View style={dynamicStyles.logoContainer}>
          <Image
            source={require('../../assets/Logo.png')}
            style={dynamicStyles.logo}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={dynamicStyles.actionSection}>
        <Pressable
          style={({ pressed }) => [
            dynamicStyles.googleButton,
            (pressed || isLoading) && dynamicStyles.buttonPressed,
          ]}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
        >
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <View style={dynamicStyles.shineMask}>
              <Animated.View style={[dynamicStyles.shine, shimmerStyle]} />
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <View style={dynamicStyles.googleButtonInner}>
              <LottieView
                source={require('../../assets/animations/Google.json')}
                autoPlay
                loop
                style={{ width: 38, height: 38, marginRight: 12, borderRadius: 12, overflow: 'hidden' }}
              />
              <Text style={dynamicStyles.googleButtonText}>Continue with Google</Text>
            </View>
          )}
        </Pressable>
        <ThemedText style={dynamicStyles.helperText}>One tap sign-in • No password needed</ThemedText>

        {!!errorMessage && (
          <ThemedText style={dynamicStyles.error}>{errorMessage}</ThemedText>
        )}
      </View>

      <View style={dynamicStyles.dividerContainer}>
        <View style={dynamicStyles.dividerLine} />
        <ThemedText style={dynamicStyles.dividerText}>Everything You Need</ThemedText>
        <View style={dynamicStyles.dividerLine} />
      </View>

      <View style={dynamicStyles.gridContainer}>
        {APP_FEATURES.map((feature) => (
          <View key={feature.title} style={dynamicStyles.gridItem}>
            <View style={dynamicStyles.iconBox}>
              <Ionicons name={feature.icon as any} size={22} color={colors.primary} />
            </View>
            <ThemedText style={dynamicStyles.gridTitle}>{feature.title}</ThemedText>
            <ThemedText style={dynamicStyles.gridSub}>{feature.sub}</ThemedText>
          </View>
        ))}
      </View>

      <View style={dynamicStyles.bannerContainer}>
        <Ionicons name="lock-closed" size={14} color={colors.textSecondary} style={{ marginTop: 2 }} />
        <ThemedText style={dynamicStyles.bannerText}>
          Your data is encrypted and never shared with third parties
        </ThemedText>
      </View>
    </ThemedView>
  )
}
