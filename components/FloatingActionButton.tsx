import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface FloatingActionButtonProps {
  onMenuPress?: (optionId: string) => void;
}

export default function FloatingActionButton({ onMenuPress }: FloatingActionButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const menuScale = useRef(new Animated.Value(0.9)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;

  const menuOptions = [
    { id: 'goals', label: 'Goals', icon: 'flag', tint: '#E8F4FF' },
    { id: 'notes', label: 'Notes', icon: 'document-text', tint: '#EEFCEB' },
    { id: 'calculator', label: 'Calculator', icon: 'calculator', tint: '#FFF4E8' },
    { id: 'tasks', label: 'Tasks', icon: 'checkbox', tint: '#F5EDFF' },
    { id: 'skills', label: 'Skills', icon: 'school', tint: '#FFEFF4' },
  ];

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
        Animated.spring(menuScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 7,
          tension: 95,
        }),
        Animated.timing(menuOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      menuScale.setValue(0.9);
      menuOpacity.setValue(0);
    }
  }, [iconRotate, menuOpacity, menuScale, showMenu]);

  const handleMenuPress = (optionId: string) => {
    setShowMenu(false);
    if (onMenuPress) {
      onMenuPress(optionId);
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
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowMenu(false)}
        >
          <Animated.View
            style={[
              styles.menuContainer,
              {
                opacity: menuOpacity,
                transform: [{ scale: menuScale }],
              },
            ]}
          >
            <View style={styles.menuBanner} />
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Quick Actions</Text>
              <Pressable onPress={() => setShowMenu(false)}>
                <Ionicons name="close" size={24} color="#111111" />
              </Pressable>
            </View>

            <View style={styles.menuItems}>
              {menuOptions.map((option) => (
                <Pressable
                  key={option.id}
                  style={({ pressed }) => [
                    styles.menuItem,
                    { backgroundColor: option.tint },
                    pressed && styles.menuItemPressed,
                  ]}
                  onPress={() => handleMenuPress(option.id)}
                >
                  <View style={styles.menuItemIconWrap}>
                    <Ionicons name={option.icon as any} size={20} color="#111111" />
                  </View>
                  <Text style={styles.menuItemLabel}>{option.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#5A6B80" />
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </Pressable>
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    width: '80%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  menuBanner: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    top: -120,
    right: -50,
    backgroundColor: '#E7F1FF',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  menuTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  menuItems: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7ECF3',
  },
  menuItemPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
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
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 12,
    flex: 1,
  },
});
