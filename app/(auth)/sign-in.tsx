import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { useOAuth } from '@clerk/expo'
import { Ionicons } from '@expo/vector-icons'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Dimensions, Image, Pressable, StyleSheet, View } from 'react-native'
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
  { icon: 'heart-outline', title: 'Health', sub: 'AI guidance' },
  { icon: 'wallet-outline', title: 'Finance', sub: 'Smart tracking' },
  { icon: 'briefcase-outline', title: 'Placement', sub: 'Career growth' },
  { icon: 'school-outline', title: 'Goals', sub: 'Mastery paths' },
  { icon: 'sparkles-outline', title: 'Personal AI', sub: 'Tailored advice' },
  { icon: 'checkmark-circle-outline', title: 'TODO', sub: 'Task management' },
] as const

export default function AuthPage() {
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' })
  const router = useRouter()
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
      -1, // loops infinitely
      false
    )
  }, [])

  // Thunderpower animation sequence - plays after successful login
  useEffect(() => {
    if (showThunderpower) {
      // Initial burst
      thunderScale.value = withSequence(
        withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 800 }),
        withTiming(0, { duration: 400 })
      )

      // Rotation effect
      thunderRotate.value = withSequence(
        withTiming(15, { duration: 300, easing: Easing.linear }),
        withTiming(-15, { duration: 300, easing: Easing.linear }),
        withTiming(0, { duration: 300, easing: Easing.linear })
      )

      // Fade out
      thunderOpacity.value = withTiming(0, { duration: 1800, easing: Easing.in(Easing.quad) }, () => {
        // Navigate after animation completes
        router.replace('/(tabs)')
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
        redirectUrl: Linking.createURL('/(tabs)', { scheme: 'myapp' })
      })

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId })
        // Trigger thunderpower animation after successful login
        setIsLoading(false)
        setShowThunderpower(true)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google Sign-In was cancelled or failed')
      setIsLoading(false)
    }
  }

  return (
    <ThemedView style={styles.container}>
      {/* Thunderpower Animation Overlay - plays after successful login */}
      {showThunderpower && (
        <Animated.View style={[styles.thunderpowerOverlay, thunderpowerStyle]}>
          <View style={styles.thunderpowerCenter}>
            <Ionicons name="flash" size={120} color="#FFD700" />
            <View style={styles.thunderGlow} />
          </View>
        </Animated.View>
      )}

      <View style={styles.topSection}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/Logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

      </View>

      <View style={styles.actionSection}>
        <Pressable
          style={({ pressed }) => [
            styles.googleButton,
            (pressed || isLoading) && styles.buttonPressed,
          ]}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
        >
          {/* Shimmer Glass Shine Overlay */}
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <View style={styles.shineMask}>
              <Animated.View style={[styles.shine, shimmerStyle]} />
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator size="small" color="#111111" />
          ) : (
            <View style={styles.googleButtonInner}>
              <Image
                source={{ uri: 'https://img.icons8.com/color/48/000000/google-logo.png' }}
                style={{ width: 22, height: 22, marginRight: 12 }}
              />
              <ThemedText style={styles.googleButtonText}>Continue with Google</ThemedText>
            </View>
          )}
        </Pressable>
        <ThemedText style={styles.helperText}>One tap sign-in • No password needed</ThemedText>

        {!!errorMessage && (
          <ThemedText style={styles.error}>{errorMessage}</ThemedText>
        )}
      </View>

      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <ThemedText style={styles.dividerText}>Everything You Need</ThemedText>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.gridContainer}>
        {APP_FEATURES.map((feature) => (
          <View key={feature.title} style={styles.gridItem}>
            <View style={styles.iconBox}>
              <Ionicons name={feature.icon as any} size={22} color="#111" />
            </View>
            <ThemedText style={styles.gridTitle}>{feature.title}</ThemedText>
            <ThemedText style={styles.gridSub}>{feature.sub}</ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.bannerContainer}>
        <Ionicons name="lock-closed" size={14} color="#666" style={{ marginTop: 2 }} />
        <ThemedText style={styles.bannerText}>
          Your data is encrypted and never shared with third parties
        </ThemedText>
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  topSection: {
    alignItems: 'center',
    marginTop: 10,
  },
  logoContainer: {
    padding: 12, // Reduced white space
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 36,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
    fontWeight: '500',
  },
  actionSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 100,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  googleButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#111111',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  helperText: {
    fontSize: 12,
    color: '#888888',
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
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
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
    backgroundColor: '#EEEEEE',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  gridItem: {
    width: (width - 48 - 20) / 3, // screen width - padding - grid gap
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EAEAEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'center',
    marginBottom: 2,
  },
  gridSub: {
    fontSize: 10,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 12,
  },
  bannerContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  bannerText: {
    flex: 1,
    fontSize: 11,
    color: '#666666',
    marginLeft: 8,
    lineHeight: 16,
  },
  error: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  thunderpowerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    top: '50%',
    left: '50%',
    marginLeft: -90,
    marginTop: -90,
  },
})
