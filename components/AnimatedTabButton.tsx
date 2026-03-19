import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';

export function AnimatedTabButton(props: BottomTabBarButtonProps) {
  const { children, accessibilityState, onPress, onPressIn, style, ...rest } = props;
  const focused = accessibilityState?.selected ?? false;

  // Animated value for the line width (expands from center)
  const lineWidth = useRef(new Animated.Value(0)).current;
  // Animated value for a subtle scale bounce on press
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(lineWidth, {
      toValue: focused ? 1 : 0,
      useNativeDriver: false,
      friction: 6,
      tension: 80,
    }).start();
  }, [focused]);

  const handlePressIn = (ev: any) => {
    // Haptic feedback on iOS
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Subtle scale down animation
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
      friction: 5,
    }).start();

    onPressIn?.(ev);
  };

  const handlePressOut = () => {
    // Bounce back
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
      tension: 100,
    }).start();
  };

  // Interpolate line width from 0 to 28px
  const animatedLineWidth = lineWidth.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 28],
  });

  // Interpolate line opacity
  const animatedLineOpacity = lineWidth.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.button]}
    >
      <Animated.View style={[styles.content, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>

      {/* Animated line that expands from center */}
      <View style={styles.lineContainer}>
        <Animated.View
          style={[
            styles.line,
            {
              width: animatedLineWidth,
              opacity: animatedLineOpacity,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineContainer: {
    position: 'absolute',
    bottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  line: {
    height: 2.5,
    backgroundColor: '#111111',
    borderRadius: 2,
  },
});
