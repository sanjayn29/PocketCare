import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface FloatingActionButtonProps {
  onMenuPress?: (optionId: string) => void;
}

export default function FloatingActionButton({ onMenuPress }: FloatingActionButtonProps) {
  const [showMenu, setShowMenu] = useState(false);

  const menuOptions = [
    { id: 'goals', label: 'Goals', icon: 'flag' },
    { id: 'notes', label: 'Notes', icon: 'document-text' },
    { id: 'calculator', label: 'Calculator', icon: 'calculator' },
    { id: 'tasks', label: 'Tasks', icon: 'checkbox' },
    { id: 'skills', label: 'Skills', icon: 'school' },
  ];

  const handleMenuPress = (optionId: string) => {
    setShowMenu(false);
    if (onMenuPress) {
      onMenuPress(optionId);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && { opacity: 0.8 }
        ]}
        onPress={() => setShowMenu(true)}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </Pressable>

      {/* Modal Menu */}
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
          <View style={styles.menuContainer}>
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
                    pressed && { backgroundColor: '#F0F0F0' }
                  ]}
                  onPress={() => handleMenuPress(option.id)}
                >
                  <Ionicons name={option.icon as any} size={24} color="#111111" />
                  <Text style={styles.menuItemLabel}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
  },
  menuItems: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    marginLeft: 12,
  },
});
