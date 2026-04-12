
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { getColors } from '@/constants/styles'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Ionicons } from '@expo/vector-icons'
import { useFonts } from 'expo-font'
import { useRouter } from 'expo-router'
import LottieView from 'lottie-react-native'
import React, { useEffect, useRef, useState } from 'react'
import { Animated, Linking, Pressable, StyleSheet, View } from 'react-native'

type OnboardingPageData =
  | {
      type: 'intro'
      title: string
      subtitle: string
    }
  | {
      type: 'feature'
      title: string
      subtitle: string
      blocks: readonly { label: string; detail: string }[]
    }

const ONBOARDING_PAGES: readonly OnboardingPageData[] = [
  {
    type: 'intro',
    title: 'Pocket\nCare',
    subtitle: '"Care, clarity, and control — all in your pocket."',
  },
  {
    type: 'feature',
    title: 'Smart assistant in your pocket',
    subtitle: 'Pocket AI helps you ask questions, get instant insights, and complete tasks faster.',
    blocks: [
      { label: 'Ask Anything', detail: 'Ideas, study help, reminders.' },
      { label: 'Auto Summaries', detail: 'Instant clarity from fast answers.' },
      { label: 'Clever Tips', detail: 'Personalized advice when you need it.' },
    ],
  },
  {
    type: 'feature',
    title: 'Stay healthy and organized',
    subtitle: 'Track your wellness, save notes, and turn goals into habits.',
    blocks: [
      { label: 'Health', detail: 'Meds, steps, nutrition, mood.' },
      { label: 'Goals', detail: 'Plan milestones & stay motivated.' },
      { label: 'Tasks', detail: 'Prioritize work and daily routines.' },
    ],
  },
  {
    type: 'feature',
    title: 'Manage growth the smart way',
    subtitle: 'From finances to schedules, keep everything moving forward.',
    blocks: [
      { label: 'Finance', detail: 'Budget, save, and track expenses.' },
      { label: 'Schedule', detail: 'Events, reminders, and daily flow.' },
      { label: 'Skills', detail: 'Build habits, practice, and improve.' },
    ],
  },
] as const

export default function OnboardingPage() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = getColors(isDark)
  const [pageIndex, setPageIndex] = useState(0)
  const floatAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }, [floatAnim])

  const [fontsLoaded] = useFonts({
    'Momo Signature': require('../assets/Font/MomoSignature-Regular.ttf'),
  })

  const page = ONBOARDING_PAGES[pageIndex]

  if (!fontsLoaded) {
    return null
  }

  const onNext = () => {
    if (pageIndex < ONBOARDING_PAGES.length - 1) {
      setPageIndex((idx) => idx + 1)
      return
    }

    router.replace('/(tabs)')
  }

  const onSkip = () => {
    router.replace('/(tabs)')
  }

  const onDeveloperPress = () => {
    Linking.openURL('https://www.sanjayn.me')
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.canvas}>
        <Animated.View style={[
          styles.diagramContainer,
          page.type === 'intro' && styles.introDiagramContainer,
          { transform: [{ translateY: floatAnim }] },
        ]}> 
          <View style={[styles.glowCircle, { backgroundColor: `${colors.primary}20` }]} />
          {page.type === 'intro' ? (
            <View style={styles.introContent}>
              <View style={[styles.introMainCard, { backgroundColor: colors.card }]}>
                <ThemedText style={[styles.introTitle, { color: colors.primary }]}>{page.title}</ThemedText>
                <ThemedText style={[styles.introQuote, { color: colors.text }]}>{page.subtitle}</ThemedText>
                <LottieView
                  source={require('../assets/animations/Intro.json')}
                  autoPlay
                  loop
                  style={styles.introAnimation}
                />
              </View>
              <Pressable onPress={onDeveloperPress} style={({ pressed }) => [styles.attributionCard, pressed && styles.buttonPressed]}>
                <View style={styles.rocketWrapper}>
                  <LottieView
                    source={require('../assets/animations/Rocketship.json')}
                    autoPlay
                    loop
                    style={styles.rocketAnimation}
                  />
                </View>
                <ThemedText style={[styles.attributionTagline, { color: colors.textSecondary }]}>Crafted with passion by</ThemedText>
                <ThemedText style={[styles.attributionName, { color: colors.text }]}>Sanjay N</ThemedText>
                <View style={styles.attributionDivider} />
                <ThemedText style={styles.attributionLink}>www.sanjayn.me</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.diagramRow}>
              {page.blocks.map((block, index) => (
                <React.Fragment key={block.label}>
                  <View style={[styles.blockCard, { backgroundColor: colors.card }]}> 
                    <ThemedText style={[styles.blockTitle, { color: colors.text }]}>{block.label}</ThemedText>
                    <ThemedText style={[styles.blockSubtitle, { color: colors.textSecondary }]}>{block.detail}</ThemedText>
                  </View>
                  {index < page.blocks.length - 1 ? (
                    <Ionicons name="arrow-down" size={24} color={colors.primary} style={styles.arrowIcon} />
                  ) : null}
                </React.Fragment>
              ))}
            </View>
          )}
        </Animated.View>
      </View>

      <View style={styles.body}>
        {page.type !== 'intro' && (
          <>
            <ThemedText style={[styles.title, { color: colors.text }]}>{page.title}</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>{page.subtitle}</ThemedText>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {ONBOARDING_PAGES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === pageIndex && { backgroundColor: colors.primary, width: 24 },
                index !== pageIndex && { backgroundColor: colors.border },
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonRow}>
          <Pressable onPress={onSkip} style={({ pressed }) => [styles.skipButton, pressed && styles.buttonPressed]}>
            <ThemedText style={[styles.skipText, { color: colors.primary }]}>Skip</ThemedText>
          </Pressable>
          <Pressable onPress={onNext} style={({ pressed }) => [styles.nextButton, { backgroundColor: colors.primary }, pressed && styles.buttonPressed]}>
            <ThemedText style={styles.nextText}>{pageIndex === ONBOARDING_PAGES.length - 1 ? 'Start' : 'Next'}</ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  canvas: {
    flex: 1,
    justifyContent: 'center',
  },
  diagramContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    borderRadius: 34,
    padding: 14,
  },
  introDiagramContainer: {
    borderWidth: 0,
    padding: 0,
    width: '100%',
  },
  glowCircle: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.25,
  },
  diagramRow: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introContent: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 12,
  },
  introMainCard: {
    width: '100%',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  introTitle: {
    fontFamily: 'Momo Signature',
    fontSize: 48,
    lineHeight: 54,
    textAlign: 'center',
    marginBottom: 18,
  },
  title: {
    fontFamily: 'Momo Signature',
    fontSize: 30,
    lineHeight: 36,
    marginBottom: 16,
  },
  introQuote: {
    fontSize: 18,
    lineHeight: 26,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 18,
  },
  introAnimation: {
    width: 240,
    height: 240,
    marginTop: 8,
  },
  attributionCard: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.75)',
    backgroundColor: 'rgba(212, 175, 55, 0.06)',
  },
  rocketWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  rocketAnimation: {
    width: 42,
    height: 42,
  },
  attributionTagline: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 2,
  },
  attributionName: {
    fontSize: 24,
    fontFamily: 'Momo Signature',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  attributionDivider: {
    width: 34,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#D4AF37',
    marginBottom: 6,
  },
  attributionLink: {
    fontSize: 12,
    color: '#D4AF37',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  blockCard: {
    width: 260,
    minHeight: 120,
    borderRadius: 28,
    padding: 18,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#D4AF37',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  blockSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  arrowIcon: {
    marginVertical: 4,
  },
  body: {
    marginTop: 24,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    paddingTop: 16,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skipButton: {
    borderRadius: 100,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#999',
  },
  nextButton: {
    borderRadius: 100,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '700',
  },
  nextText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
})
