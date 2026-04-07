import { getColors } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

export function AnimatedTabButton(props: BottomTabBarButtonProps) {
  const { children, accessibilityState, onPress, onPressIn } = props;
  const focused = accessibilityState?.selected ?? false;
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const focusAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 100,
    }).start();
  }, [focusAnim, focused]);

  const handlePressIn = (ev: any) => {
    Haptics.selectionAsync();

    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: false,
      friction: 8,
      tension: 100,
    }).start();

    onPressIn?.(ev);
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: false,
      friction: 8,
      tension: 100,
    }).start();
  };

  const animatedTranslateY = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const animatedIconScale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const animatedBg = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', colors.primary + '12'],
  });

  const animatedIndicatorScaleX = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.17, 1],  // 4/24 = 0.17
  });

  const animatedIndicatorOpacity = focusAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
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
            transform: [
              { translateY: animatedTranslateY },
              { scale: Animated.multiply(scale, animatedIconScale) }
            ],
          },
        ]}
      >
        {children}
      </Animated.View>

      <Animated.View
        style={[
          styles.indicator,
          {
            transform: [{ scaleX: animatedIndicatorScaleX }],
            opacity: animatedIndicatorOpacity,
            shadowOpacity: focusAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.4],
            }),
          },
        ]}
      />
    </Pressable>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 50,
  },
  indicator: {
    position: 'absolute',
    bottom: 12,
    width: 24,
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
});
