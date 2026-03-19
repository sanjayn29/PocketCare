import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab'; // keep if you want haptics

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
            height: 58,
            borderTopWidth: 1.5,
            borderTopColor: BLACK,
            borderLeftWidth: 1.5,
            borderLeftColor: BLACK,
            borderRightWidth: 1.5,
            borderRightColor: BLACK,
            borderBottomWidth: 0,
            paddingBottom: 6,
            paddingTop: 6,
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
          name="navbar"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </View>
  );
}