import { ViewStyle } from 'react-native';

type ThemeColors = {
  card: string;
  background: string;
  border: string;
  text: string;
};

export type CardSystem = {
  surface: ViewStyle;
  subtleSurface: ViewStyle;
  createSurface: ViewStyle;
  actionRail: ViewStyle;
  actionButton: ViewStyle;
};

export const getCardSystem = (colors: ThemeColors, isDark: boolean): CardSystem => {
  const surface: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  };

  return {
    surface,
    subtleSurface: {
      ...surface,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 3,
    },
    createSurface: {
      ...surface,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
    },
    actionRail: {
      padding: 12,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
      borderLeftWidth: 1.5,
      borderLeftColor: colors.border,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
    },
    actionButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
  };
};
