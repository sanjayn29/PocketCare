import { getColors } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Navbar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);
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

  // Dynamic styles based on theme
  const dynamicStyles = StyleSheet.create({
    container: {
      zIndex: 100,
      backgroundColor: colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
      backgroundColor: colors.primary,
      opacity: 0.45,
    },
    bgOrbLeft: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 999,
      top: -150,
      left: -100,
      backgroundColor: colors.primary,
      opacity: 0.1,
    },
    bgOrbRight: {
      position: 'absolute',
      width: 150,
      height: 150,
      borderRadius: 999,
      top: -95,
      right: -40,
      backgroundColor: colors.primary,
      opacity: 0.08,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logoContainer: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: colors.background,
      overflow: 'hidden',
      marginRight: 13,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    logoRing: {
      ...StyleSheet.absoluteFillObject,
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: 18,
    },
    logo: {
      width: '100%',
      height: '100%',
    },
    welcomeText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 0,
    },
    appName: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
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
      backgroundColor: colors.success,
      marginRight: 6,
    },
    subMetaText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    profileButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
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
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    profileText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: 0.25,
    },
    profileButtonPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.98 }],
    },
  });

  return (
    <Animated.View
      style={[
        dynamicStyles.container,
        {
          paddingTop: insets.top + 10,
          opacity: headerOpacity,
          transform: [{ translateY: headerEnter }],
        },
      ]}
    >
      <View style={dynamicStyles.bgOrbLeft} />
      <View style={dynamicStyles.bgOrbRight} />
      <View style={dynamicStyles.topAccentLine} />

      <View style={dynamicStyles.leftSection}>
        <View style={dynamicStyles.logoContainer}>
          <Animated.View
            style={[
              dynamicStyles.logoRing,
              {
                opacity: animatedRingOpacity,
                transform: [{ scale: animatedRingScale }],
              },
            ]}
          />
          <Image
            source={require('@/assets/Logoo.png')}
            style={dynamicStyles.logo}
            resizeMode="cover"
          />
        </View>

        <View>
          <Text style={dynamicStyles.appName}>PocketCare</Text>
          <View style={dynamicStyles.subMetaRow}>
            <Animated.View
              style={[
                dynamicStyles.liveDot,
                {
                  opacity: statusOpacity,
                  transform: [{ scale: statusScale }],
                },
              ]}
            />
            <Text style={dynamicStyles.subMetaText}>Ready to track your day</Text>
          </View>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          dynamicStyles.profileButton,
          pressed && dynamicStyles.profileButtonPressed,
        ]}
        onPress={() => router.push('/profile')}
      >
        <View style={dynamicStyles.profileIconChip}>
          <Ionicons name="person" size={14} color={colors.text} />
        </View>
        <Text style={dynamicStyles.profileText}>Profile</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}
