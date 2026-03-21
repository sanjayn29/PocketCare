import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FloatingActionButtonProps {
  onMenuPress?: (optionId: string) => void;
}

export default function FloatingActionButton({ onMenuPress }: FloatingActionButtonProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const menuOptions = [
    { id: 'goals', label: 'Goals', icon: 'flag', tint: '#E8F4FF' },
    { id: 'notes', label: 'Notes', icon: 'document-text', tint: '#EEFCEB' },
    { id: 'calculator', label: 'Calculator', icon: 'calculator', tint: '#FFF4E8' },
    { id: 'tasks', label: 'Tasks', icon: 'checkbox', tint: '#F5EDFF' },
    { id: 'skills', label: 'Skills', icon: 'school', tint: '#FFEFF4' },
    { id: 'profile', label: 'Profile', icon: 'person', tint: '#EAF2FF' },
  ];

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(340)).current;
  const menuItemAnims = useRef(menuOptions.map(() => new Animated.Value(0))).current;

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

      // Ensure every open starts from hidden state, then reveal options one by one.
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
      profile: '/profile',
    };

    const route = optionRoutes[optionId];
    if (onMenuPress) {
      onMenuPress(optionId);
    }

    if (route) {
      // Defers navigation so the same tap both closes sheet and navigates reliably.
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
        onPress={() => setShowMenu(true)}
      >
        <View style={styles.fabOutline} />

        <Animated.View
          style={[
            styles.fabPulse,
            {
              opacity: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.18, 0.35],
              }),
              transform: [
                {
                  scale: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.16],
                  }),
                },
              ],
            },
          ]}
        />

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
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </Animated.View>
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
                <Ionicons name="close" size={18} color="#111111" />
              </Pressable>
            </View>

            <View style={styles.menuItems}>
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
                        styles.menuItem,
                        { backgroundColor: option.tint },
                      ]}
                      hitSlop={8}
                      pressRetentionOffset={10}
                      onPress={() => handleMenuPress(option.id)}
                    >
                      <TouchableOpacity
                        activeOpacity={0.75}
                        hitSlop={8}
                        onPress={() => handleMenuPress(option.id)}
                        style={styles.menuItemIconWrap}
                      >
                        <Ionicons name={option.icon as any} size={20} color="#111111" />
                      </TouchableOpacity>
                      <Text style={styles.menuItemLabel}>{option.label}</Text>
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

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 104,
    right: 24,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 12,
    elevation: 11,
    borderWidth: 2,
    borderColor: '#0A1222',
    zIndex: 50,
    overflow: 'visible',
  },
  fabOutline: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    opacity: 0.95,
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  fabPulse: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    backgroundColor: '#93C5FD',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  bottomSheet: {
    zIndex: 2,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopWidth: 2,
    borderTopColor: '#D8E7FA',
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
    backgroundColor: '#CBD5E1',
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
    backgroundColor: '#F1F5F9',
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.1,
  },
  menuItems: {
    flexDirection: 'column',
    gap: 10,
  },
  menuItemCell: {
    width: '100%',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 68,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7ECF3',
  },
  menuItemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E6EBF2',
  },
  menuItemLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 10,
    textAlign: 'left',
  },
});