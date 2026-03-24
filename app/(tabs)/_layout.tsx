import { useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { AnimatedTabButton } from '@/components/AnimatedTabButton';

// Inverted palette
const WHITE = '#FFFFFF';
const BLACK = '#000000';
const GRAY_ACTIVE = '#111111';     // almost black – very crisp
const GRAY_INACTIVE = '#666666';   // medium gray for inactive

export default function TabLayout() {
  const { isSignedIn, isLoaded } = useAuth();

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
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: WHITE,
            borderTopLeftRadius: 25,
            borderTopRightRadius: 25,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            height: 68,
            borderTopWidth: 2.5,
            borderTopColor: BLACK,
            borderLeftWidth: 1.5,
            borderLeftColor: BLACK,
            borderRightWidth: 1.5,
            borderRightColor: BLACK,
            borderBottomWidth: 0,
            paddingBottom: 10,
            paddingTop: 18,
          },
          tabBarActiveTintColor: GRAY_ACTIVE,
          tabBarInactiveTintColor: GRAY_INACTIVE,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginBottom: 4,
            marginTop: 4,
            letterSpacing: 0.2,
          },
          tabBarShowLabel: true,
          tabBarButton: AnimatedTabButton,
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
              <Ionicons
                name={focused ? 'flash' : 'flash-outline'}
                size={focused ? 28 : 26}
                color={color}
              />
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


      </Tabs>
    </View>
  );
}