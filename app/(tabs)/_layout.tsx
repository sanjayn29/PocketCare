import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab'; // keep if you want haptics
import Navbar from './navbar';

// Inverted palette
const WHITE = '#FFFFFF';
const BLACK = '#000000';
const GRAY_ACTIVE = '#111111';     // almost black – very crisp
const GRAY_INACTIVE = '#666666';   // medium gray for inactive

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          backgroundColor: WHITE,
          borderRadius: 35, // side curves
          height: 70,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 5,
          borderTopWidth: 0,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: GRAY_ACTIVE,
        tabBarInactiveTintColor: GRAY_INACTIVE,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 4,
          letterSpacing: 0.2,
        },
        tabBarShowLabel: true,
        tabBarButton: HapticTab,
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
        name="skills"
        options={{
          title: 'Skills',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'school' : 'school-outline'}
              size={focused ? 28 : 26}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={focused ? 28 : 26}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="navbar"
        options={{
          href: null,
        }}
      />
    </Tabs>
    </View>
  );
}