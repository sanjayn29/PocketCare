
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, View } from 'react-native'

import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { getColors } from '@/constants/styles'
import { useColorScheme } from '@/hooks/use-color-scheme'

const ONBOARDING_PAGES = [
  {
    title: 'Smart assistant in your pocket',
    subtitle: 'Pocket AI helps you ask questions, get instant insights, and complete tasks faster.',
    blocks: [
      { label: 'Ask Anything', detail: 'Ideas, study help, reminders.' },
      { label: 'Auto Summaries', detail: 'Instant clarity from fast answers.' },
      { label: 'Clever Tips', detail: 'Personalized advice when you need it.' },
    ],
  },
  {
    title: 'Stay healthy and organized',
    subtitle: 'Track your wellness, save notes, and turn goals into habits.',
    blocks: [
      { label: 'Health', detail: 'Meds, steps, nutrition, mood.' },
      { label: 'Goals', detail: 'Plan milestones & stay motivated.' },
      { label: 'Tasks', detail: 'Prioritize work and daily routines.' },
    ],
  },
  {
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

  const page = ONBOARDING_PAGES[pageIndex]

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

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.canvas}>
        <Animated.View style={[styles.diagramContainer, { transform: [{ translateY: floatAnim }] }]}> 
          <View style={[styles.glowCircle, { backgroundColor: `${colors.primary}20` }]} />
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
        </Animated.View>
      </View>

      <View style={styles.body}>
        <ThemedText type="title" style={[styles.title, { color: colors.text }]}>{page.title}</ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>{page.subtitle}</ThemedText>
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
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    marginBottom: 16,
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
