import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';

type ThemeColors = {
  card: string;
  border: string;
  text: string;
  textSecondary: string;
};

type Tone = 'info' | 'success' | 'warning' | 'danger';

const toneMap: Record<Tone, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  info: { icon: 'information-circle-outline', color: '#3B82F6' },
  success: { icon: 'checkmark-circle-outline', color: '#10B981' },
  warning: { icon: 'alert-circle-outline', color: '#F59E0B' },
  danger: { icon: 'warning-outline', color: '#EF4444' },
};

type Props = {
  message: string;
  title?: string;
  tone?: Tone;
  colors: ThemeColors;
  style?: StyleProp<ViewStyle>;
};

export default function MessageCard({
  message,
  title,
  tone = 'info',
  colors,
  style,
}: Props) {
  const cfg = toneMap[tone];

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
          padding: 14,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: colors.card,
          marginTop: 12,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${cfg.color}20`,
        }}
      >
        <Ionicons name={cfg.icon} size={15} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        {title ? (
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 2 }}>
            {title}
          </Text>
        ) : null}
        <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19, fontWeight: '500' }}>
          {message}
        </Text>
      </View>
    </View>
  );
}
