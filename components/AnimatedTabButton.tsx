import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { getColors } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function AnimatedTabButton(props: BottomTabBarButtonProps) {
  const { children, accessibilityState, onPress, onPressIn } = props;
  const focused = accessibilityState?.selected ?? false;
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);
  const styles = useMemo(() => getStyles(colors), [colors]);

  const focusAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: false,
      friction: 7,
      tension: 95,
    }).start();
  }, [focusAnim, focused]);

  const handlePressIn = (ev: any) => {
    Haptics.selectionAsync();

    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: true,
      friction: 6,
    }).start();

    onPressIn?.(ev);
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 110,
    }).start();
  };

  const animatedTranslateY = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -7],
  });

  const animatedBg = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', colors.primary + '1A'],
  });

  const animatedDotScale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.button}
    >
      <Animated.View
        style={[
          styles.content,
          {
            backgroundColor: animatedBg,
            opacity: 1,
            transform: [{ translateY: animatedTranslateY }, { scale }],
          },
        ]}
      >
        {children}
      </Animated.View>

      <View style={styles.lineContainer}>
        <Animated.View
          style={[
            styles.line,
            {
              opacity: focusAnim,
              transform: [{ scale: animatedDotScale }],
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 54,
  },
  lineContainer: {
    position: 'absolute',
    bottom: -1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  line: {
    height: 5,
    width: 20, // Slightly wider pill instead of a tiny dot for a more modern look
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
});
