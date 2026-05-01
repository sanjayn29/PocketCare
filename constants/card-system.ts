import { ViewStyle } from 'react-native';
import { rr, rs, rv } from '@/utils/responsive';

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
    borderRadius: rr(20),
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: rv(4) },
    shadowOpacity: 0.12,
    shadowRadius: rs(12),
    elevation: 5,
    overflow: 'hidden',
  };

  return {
    surface,
    subtleSurface: {
      ...surface,
      shadowOffset: { width: 0, height: rv(3) },
      shadowOpacity: 0.08,
      shadowRadius: rs(10),
      elevation: 3,
    },
    createSurface: {
      ...surface,
      shadowOffset: { width: 0, height: rv(4) },
      shadowOpacity: 0.1,
      shadowRadius: rs(10),
      elevation: 4,
    },
    actionRail: {
      padding: rs(12),
      justifyContent: 'center',
      alignItems: 'center',
      gap: rs(10),
      borderLeftWidth: 1.5,
      borderLeftColor: colors.border,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
    },
    actionButton: {
      width: rs(38),
      height: rs(38),
      borderRadius: rr(12),
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: rv(1) },
      shadowOpacity: 0.06,
      shadowRadius: rs(3),
      elevation: 1,
    },
  };
};
