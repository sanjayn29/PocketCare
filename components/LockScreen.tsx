import { getColors } from '@/constants/styles'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { authenticateUser } from '@/utils/deviceAuth'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Animated,
    Easing,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface LockScreenProps {
  onUnlock: () => void
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = getColors(isDark)

  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [showError, setShowError] = useState(false)

  // Pulsing glow animation on the lock icon
  const glowAnim = useRef(new Animated.Value(0)).current
  // Shake animation on failed attempt
  const shakeAnim = useRef(new Animated.Value(0)).current
  // Fade-in entrance
  const fadeAnim = useRef(new Animated.Value(0)).current

  const triggerShake = useCallback(() => {
    shakeAnim.setValue(0)
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start()
  }, [shakeAnim])

  const triggerAuth = useCallback(async () => {
    if (isAuthenticating) return
    setIsAuthenticating(true)
    setShowError(false)

    const success = await authenticateUser()

    setIsAuthenticating(false)

    if (success) {
      // Fade out before calling onUnlock
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => onUnlock())
    } else {
      setShowError(true)
      triggerShake()
    }
  }, [fadeAnim, isAuthenticating, onUnlock, triggerShake])

  useEffect(() => {
    // Entrance fade
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start()

    // Glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start()

    // Auto-trigger authentication on mount for seamless UX
    triggerAuth()
  }, [fadeAnim, glowAnim, triggerAuth])

  const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] })
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] })

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={isDark ? ['#000000', '#0A0A0A', '#111111'] : ['#FAFAFA', '#F5F5F5', '#EFEFEF']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe}>
        {/* ── App logo + name ── */}
        <View style={styles.topSection}>
          <View style={[styles.logoRing, { borderColor: '#D4AF37' + '50' }]}>
            <Image
              source={require('../assets/Logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>PocketCare</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>Your personal dashboard</Text>
        </View>

        {/* ── Lock icon with glow ── */}
        <Animated.View style={[styles.lockWrap, { transform: [{ translateX: shakeAnim }] }]}>
          {/* Glow ring */}
          <Animated.View
            style={[
              styles.glowRing,
              {
                backgroundColor: '#D4AF37',
                transform: [{ scale: glowScale }],
                opacity: glowOpacity,
              },
            ]}
          />
          <LinearGradient
            colors={['#D4AF37', '#B8860B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.lockCircle}
          >
            <Ionicons name="lock-closed" size={36} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>

        {/* ── Text ── */}
        <View style={styles.textSection}>
          <Text style={[styles.title, { color: colors.text }]}>App Locked</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Use your fingerprint, face ID,{'\n'}or phone PIN to continue
          </Text>

          {showError && (
            <View style={styles.errorBadge}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>Authentication failed. Try again.</Text>
            </View>
          )}
        </View>

        {/* ── Unlock button ── */}
        <TouchableOpacity
          style={[
            styles.unlockBtn,
            isAuthenticating && styles.unlockBtnDisabled,
          ]}
          onPress={triggerAuth}
          activeOpacity={0.85}
          disabled={isAuthenticating}
        >
          <LinearGradient
            colors={['#D4AF37', '#B8860B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.unlockBtnGradient}
          >
            {isAuthenticating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="finger-print" size={20} color="#FFFFFF" />
                <Text style={styles.unlockBtnText}>Unlock PocketCare</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Security note ── */}
        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={13} color={colors.textSecondary} />
          <Text style={[styles.securityText, { color: colors.textSecondary }]}>
            Verified by your device OS · No access to your PIN
          </Text>
        </View>
      </SafeAreaView>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 28,
  },
  topSection: {
    alignItems: 'center',
    gap: 8,
  },
  logoRing: {
    width: 88,
    height: 88,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 22,
  },
  appName: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
  },
  lockWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 110,
    height: 110,
  },
  glowRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  lockCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  textSection: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#EF444418',
    borderWidth: 1,
    borderColor: '#EF444435',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  unlockBtn: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  unlockBtnDisabled: {
    opacity: 0.75,
  },
  unlockBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  unlockBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
})
