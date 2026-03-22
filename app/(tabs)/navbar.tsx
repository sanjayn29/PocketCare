import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Navbar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const glowAnim = useRef(new Animated.Value(0)).current;
  const statusAnim = useRef(new Animated.Value(0)).current;
  const headerEnter = useRef(new Animated.Value(20)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerEnter, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 95,
      }),
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2400,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2400,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [glowAnim, headerEnter, headerOpacity]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(statusAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(statusAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [statusAnim]);

  const animatedRingScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const animatedRingOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.45],
  });

  const statusScale = statusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.22],
  });

  const statusOpacity = statusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.75],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 10,
          opacity: headerOpacity,
          transform: [{ translateY: headerEnter }],
        },
      ]}
    >
      <View style={styles.bgOrbLeft} />
      <View style={styles.bgOrbRight} />
      <View style={styles.topAccentLine} />

      <View style={styles.leftSection}>
        <View style={styles.logoContainer}>
          <Animated.View
            style={[
              styles.logoRing,
              {
                opacity: animatedRingOpacity,
                transform: [{ scale: animatedRingScale }],
              },
            ]}
          />
          <Image
            source={require('../../assets/Logoo.png')}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>

        <View>
          <Text style={styles.appName}>PocketCare</Text>
          <View style={styles.subMetaRow}>
            <Animated.View
              style={[
                styles.liveDot,
                {
                  opacity: statusOpacity,
                  transform: [{ scale: statusScale }],
                },
              ]}
            />
            <Text style={styles.subMetaText}>Ready to track your day</Text>
          </View>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.profileButton,
          pressed && styles.profileButtonPressed,
        ]}
        onPress={() => router.push('/profile')}
      >
        <View style={styles.profileIconChip}>
          <Ionicons name="person" size={14} color="#0F172A" />
        </View>
        <Text style={styles.profileText}>Profile</Text>
        <Ionicons name="chevron-forward" size={14} color="#64748B" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 100,
    backgroundColor: '#F8FBFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DEE6F3',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  topAccentLine: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 3,
    borderRadius: 10,
    backgroundColor: '#93C5FD',
    opacity: 0.45,
  },
  bgOrbLeft: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    top: -150,
    left: -100,
    backgroundColor: '#DAE9FF',
  },
  bgOrbRight: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 999,
    top: -95,
    right: -40,
    backgroundColor: '#E4F4FF',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginRight: 13,
    borderWidth: 1,
    borderColor: '#D8E4F2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  logoRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: '#5AA0FF',
    borderRadius: 18,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  welcomeText: {
    fontSize: 11,
    color: '#5C6F86',
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 0,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.6,
  },
  subMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  subMetaText: {
    fontSize: 11,
    color: '#5A6B80',
    fontWeight: '600',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6DFEC',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  profileIconChip: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDF4FF',
    borderWidth: 1,
    borderColor: '#D8E6FA',
  },
  profileText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.25,
  },
  profileButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});
