import { useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';

import { AnimatedTabButton } from '@/components/AnimatedTabButton';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getColors } from '@/constants/styles';

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
          sceneStyle: { backgroundColor: 'transparent' },
          tabBarStyle: {
            position: 'absolute',
            bottom: 24,
            left: 16,
            right: 16,
            backgroundColor: colors.card,
            borderRadius: 36, // Perfect circular edges for 72 height
            height: 72,
            borderWidth: 1, // Softer border
            borderColor: colors.border,
            paddingBottom: 8,
            paddingTop: 8,
            shadowColor: colors.primary, // Premium glow effect matching the theme
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 12,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: 'bold',
            marginBottom: 4,
            marginTop: 4,
            letterSpacing: 0.2,
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
          name="placement"
          options={{
            title: 'Placement',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'briefcase' : 'briefcase-outline'}
                size={focused ? 28 : 26}
                color={color}
              />
            ),
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