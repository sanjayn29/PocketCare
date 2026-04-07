import { getColors } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AnimatedTabButton } from './AnimatedTabButton';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FloatingActionButtonProps {
  onMenuPress?: (optionId: string) => void;
  asTabBarItem?: boolean;
  [key: string]: any;
}

export default function FloatingActionButton({ onMenuPress, asTabBarItem, ...props }: FloatingActionButtonProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const menuOptions = [
    { id: 'goals', label: 'Goals', icon: 'flag', tint: colors.danger + '1A' },
    { id: 'notes', label: 'Notes', icon: 'document-text', tint: colors.success + '1A' },
    { id: 'calculator', label: 'Calculator', icon: 'calculator', tint: colors.warning + '1A' },
    { id: 'tasks', label: 'Tasks', icon: 'checkbox', tint: colors.primary + '1A' },
    { id: 'skills', label: 'Skills', icon: 'school', tint: colors.secondary + '1A' },
    { id: 'schedule', label: 'Schedule', icon: 'calendar', tint: colors.info + '1A' },
    { id: 'profile', label: 'Profile', icon: 'person', tint: colors.textSecondary + '1A' },
    { id: 'placement', label: 'Placements', icon: 'briefcase', tint: colors.primary + '1A' },
  ];

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(450)).current;
  const menuItemAnims = useRef(menuOptions.map(() => new Animated.Value(0))).current;

  const openMenu = () => {
    if (!showMenu) {
      setShowMenu(true);
    }
  };

  const swipeUpResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -16 && Math.abs(gesture.dx) < 42) {
          openMenu();
        }
      },
    })
  ).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    Animated.spring(iconRotate, {
      toValue: showMenu ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 100,
    }).start();

    if (showMenu) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 80,
        }),
      ]).start();

      menuItemAnims.forEach((anim) => anim.setValue(0));
      Animated.stagger(
        60,
        menuItemAnims.map((anim) =>
          Animated.spring(anim, {
            toValue: 1,
            friction: 7,
            useNativeDriver: true,
          })
        )
      ).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 450,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [iconRotate, menuItemAnims, overlayOpacity, sheetTranslateY, showMenu]);

  const handleMenuPress = (optionId: string) => {
    setShowMenu(false);

    const optionRoutes: Record<string, string> = {
      goals: '/goals',
      notes: '/notes',
      calculator: '/calculator',
      tasks: '/tasks',
      skills: '/skills',
      schedule: '/schedule',
      profile: '/profile',
      placement: '/placement',
    };

    const route = optionRoutes[optionId];
    if (onMenuPress) {
      onMenuPress(optionId);
    }

    if (route) {
      setTimeout(() => {
        router.push(route as any);
      }, 100);
    }
  };

  return (
    <>
      {asTabBarItem ? (
        <AnimatedTabButton
          {...(props as any)}
          onPress={(e: any) => {
            openMenu();
          }}
        />
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            pressed && styles.fabPressed,
          ]}
          onPress={openMenu}
          {...swipeUpResponder.panHandlers}
        >
          <LinearGradient
            colors={['#D4AF37', '#B8860B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: iconRotate.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '45deg'],
                    }),
                  },
                ],
              }}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </Animated.View>
            <Text style={styles.fabLabel}>Options</Text>
            <Animated.View
              style={[
                styles.fabShine,
                {
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.1, 0.3],
                  }),
                },
              ]}
            />
        </LinearGradient>
      </Pressable>
      )}

      <Modal
        visible={showMenu}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowMenu(false)}
      >
        <View style={styles.modalOverlay}>
          <AnimatedPressable
            style={[styles.backdrop, { opacity: overlayOpacity }]}
            onPress={() => setShowMenu(false)}
          />

          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            <View style={styles.handle} />
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Dashboard Options</Text>
              <Pressable onPress={() => setShowMenu(false)} style={styles.closeButton}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.menuGrid}>
              {menuOptions.map((option, index) => {
                const itemAnim = menuItemAnims[index];

                return (
                  <Animated.View
                    key={option.id}
                    style={[
                      styles.menuItemCell,
                      {
                        opacity: itemAnim,
                        transform: [
                          {
                            translateY: itemAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [30, 0],
                            }),
                          },
                          {
                            scale: itemAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.8, 1],
                            }),
                          }
                        ],
                      },
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[
                        styles.menuItemButton,
                        { backgroundColor: option.tint },
                      ]}
                      onPress={() => handleMenuPress(option.id)}
                    >
                      <View style={styles.menuItemIconWrap}>
                        <Ionicons name={option.icon as any} size={24} color={colors.text} />
                      </View>
                      <Text style={styles.menuItemLabel} numberOfLines={1}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 96,
    right: 20,
    width: 124,
    height: 52,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 60,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  fabLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  fabPressed: {
    transform: [{ scale: 0.96 }],
  },
  fabShine: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    top: -40,
    right: -20,
    backgroundColor: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  bottomSheet: {
    zIndex: 2,
    backgroundColor: colors.card,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: 20,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
    paddingHorizontal: 4,
  },
  menuItemCell: {
    width: '22%', // 4 columns layout
    aspectRatio: 0.9,
  },
  menuItemButton: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuItemIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuItemLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});

