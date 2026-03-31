import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getColors } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FloatingActionButtonProps {
  onMenuPress?: (optionId: string) => void;
}

export default function FloatingActionButton({ onMenuPress }: FloatingActionButtonProps) {
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
    { id: 'placement', label: 'Placements', icon: 'briefcase', tint: colors.primary + '20' },
  ];

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(340)).current;
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
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1800,
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
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 90,
        }),
      ]).start();

      menuItemAnims.forEach((anim) => anim.setValue(0));

      Animated.stagger(
        120,
        menuItemAnims.map((anim) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          })
        )
      ).start();
    } else {
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(340);
      menuItemAnims.forEach((anim) => anim.setValue(0));
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
      }, 60);
    }
  };

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
        ]}
        onPress={openMenu}
        {...swipeUpResponder.panHandlers}
      >
        <LinearGradient
          colors={isDark ? ['#B8860B', '#D4AF37'] : ['#D4AF37', '#F4D03F']}
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
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </Animated.View>
          <Text style={styles.fabLabel}>Options</Text>
          <Animated.View
            style={[
              styles.fabShine,
              {
                opacity: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.16, 0.34],
                }),
              },
            ]}
          />
        </LinearGradient>
      </Pressable>

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
              <Text style={styles.menuTitle}>Choose an Option</Text>
              <Pressable onPress={() => setShowMenu(false)} style={styles.closeButton}>
                <Ionicons name="close" size={18} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.menuItems}
            >
              {menuOptions.map((option, index) => {
                const itemAnim = menuItemAnims[index];

                return (
                  <Animated.View
                    key={option.id}
                    style={[
                      styles.menuNavItemCell,
                      {
                      opacity: itemAnim,
                      transform: [
                        {
                          translateY: itemAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [16, 0],
                          }),
                        },
                      ],
                      },
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.75}
                      style={[
                        styles.menuNavItem,
                        { backgroundColor: option.tint },
                      ]}
                      hitSlop={8}
                      pressRetentionOffset={10}
                      onPress={() => handleMenuPress(option.id)}
                    >
                      <View style={styles.menuItemIconWrap}>
                        <Ionicons name={option.icon as any} size={20} color={colors.text} />
                      </View>
                      <Text style={styles.menuItemLabel}>{option.label}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 86,
    right: 16,
    width: 124,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 60,
    overflow: 'visible',
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  fabLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  fabShine: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 999,
    top: -28,
    right: -14,
    backgroundColor: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)', // Works for both themes
  },
  bottomSheet: {
    zIndex: 2,
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.1,
  },
  menuItems: {
    paddingHorizontal: 2,
    gap: 10,
  },
  menuNavItemCell: {
    width: 92,
  },
  menuNavItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 94,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuItemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuItemLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
});