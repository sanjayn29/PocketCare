import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Navbar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* Left side: Logo and App Name */}
      <View style={styles.leftSection}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/Logoo.png')} 
            style={styles.logo}
            resizeMode="cover"
          />
        </View>
        <Text style={styles.appName}>PocketCare</Text>
      </View>

      {/* Right side: Profile Option */}
      <Pressable 
        style={({ pressed }) => [
          styles.profileButton,
          pressed && { opacity: 0.7 }
        ]}
        onPress={() => router.push('/profile')}
      >
        <Ionicons name="person-circle" size={36} color="#111111" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    // Shadow for a subtle floating effect logic
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F5F5F5', // fallback background 
    overflow: 'hidden',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.5,
  },
  profileButton: {
    padding: 2,
    borderRadius: 20,
    backgroundColor: '#F9F9F9',
  },
});
