import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

type ThemeColors = {
  card: string;
  border: string;
  text: string;
  textSecondary: string;
};

type Props = {
  value?: string;
  placeholder: string;
  onPress: () => void;
  colors: ThemeColors;
  icon?: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
};

export default function DateTimeInputCard({
  value,
  placeholder,
  onPress,
  colors,
  icon = 'calendar-outline',
  accentColor = '#D4AF37',
  style,
}: Props) {
  const hasValue = Boolean(value && value.trim());

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: colors.card,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderWidth: 1.5,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 3,
          elevation: 1,
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
          backgroundColor: `${accentColor}20`,
        }}
      >
        <Ionicons name={icon} size={15} color={accentColor} />
      </View>
      <Text
        style={{
          flex: 1,
          fontSize: 14,
          fontWeight: '600',
          color: hasValue ? colors.text : colors.textSecondary,
        }}
        numberOfLines={1}
      >
        {hasValue ? value : placeholder}
      </Text>
      <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}
