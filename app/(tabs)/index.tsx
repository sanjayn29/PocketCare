import { Image as ExpoImage } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#1e40af', dark: '#1e3a8a' }}
      headerImage={
        <ExpoImage
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.headerImage}
          contentFit="contain"
        />
      }
    >
      {/* Hero Section */}
      <ThemedView style={styles.heroContainer}>
        <ThemedText style={styles.title}>
          Project Started! 🚀
        </ThemedText>

        <ThemedText style={styles.subtitle}>
          R&D is going strong – let's innovate!
        </ThemedText>

        <View style={styles.welcomeBadge}>
          <ThemedText style={styles.welcomeText}>Welcome</ThemedText>
          <HelloWave />
        </View>
      </ThemedView>

      {/* You can add more sections here later */}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    height: 178,
    width: 290,
    position: 'absolute',
    bottom: 0,
    left: 0,
  },

  heroContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    backgroundColor: '#1e40af',     // blue-700
    // For dark mode you can use useColorScheme() + conditional or keep ThemedView logic
  },

  title: {
    fontSize: 48,              // ≈ text-5xl
    fontWeight: 'bold',
    color: '#ef4444',          // red-500
    textAlign: 'center',
    marginBottom: 16,
    // fontFamily: 'serif',    // ← only if you loaded a serif font
  },

  subtitle: {
    fontSize: 24,              // ≈ text-2xl
    color: '#fca5a5',          // red-300
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: 'monospace',   // or 'SpaceMono', 'Courier New', etc.
    letterSpacing: 1.5,
  },

  welcomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(30, 64, 175, 0.4)', // blue-800 / 30% opacity
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 999,         // rounded-full
  },

  welcomeText: {
    fontSize: 36,              // ≈ text-4xl
    fontWeight: '800',
    color: 'white',
    // fontFamily: 'sans-serif',
  },
});