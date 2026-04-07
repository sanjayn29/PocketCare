import { useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';
import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';

import { AnimatedTabButton } from '@/components/AnimatedTabButton';
import FloatingActionButton from '@/components/FloatingActionButton';
import { getColors } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);

  if (!isLoaded) {
    return null;
  }

  // If not signed in, redirect to auth
  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: Platform.OS === 'ios' ? 28 : 20,
            left: 20,
            right: 20,
            backgroundColor: isDark ? 'rgba(18, 18, 18, 0.7)' : 'rgba(255, 255, 255, 0.8)',
            borderRadius: 40,
            height: 74,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            elevation: 0,
            shadowOpacity: 0,
            paddingBottom: Platform.OS === 'ios' ? 20 : 12,
            paddingTop: 12,
          },
          tabBarBackground: () => (
            <BlurView
              intensity={isDark ? 30 : 50}
              tint={isDark ? 'dark' : 'light'}
              style={{
                ...StyleSheet.absoluteFillObject,
                borderRadius: 40,
                overflow: 'hidden',
              }}
            />
          ),
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          },
          tabBarShowLabel: true,
          tabBarButton: (props) => <AnimatedTabButton {...props} />,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={focused ? 28 : 26}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="finance"
          options={{
            title: 'Finance',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'card' : 'card-outline'}
                size={focused ? 28 : 26}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="ai"
          options={{
            title: 'Pocket AI',
            tabBarStyle: { display: 'none' },
            tabBarIcon: ({ color, focused }) => (
              <View style={{ 
                width: 40, 
                height: 40, 
                justifyContent: 'center', 
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2
              }}>
                <LottieView
                  source={require('../../assets/animations/AI.json')}
                  autoPlay
                  loop
                  style={{ width: 44, height: 44 }}
                />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="health"
          options={{
            title: 'Health',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'heart' : 'heart-outline'}
                size={focused ? 28 : 26}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="placement" // Keeping string name the same to not break routing
          options={{
            title: '+Options',
            tabBarIcon: () => (
              <LottieView
                source={require('../../assets/animations/More.json')}
                autoPlay
                loop
                style={{ width: 44, height: 44 }}
              />
            ),
            tabBarButton: (props) => <FloatingActionButton asTabBarItem {...props} />,
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="goals"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="notes"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="calculator"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="tasks"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="skills"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="schedule"
          options={{
            href: null,
          }}
        />

      </Tabs>
    </View>
  );
}