/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * Premium Gold Theme with performance-optimized styling
 */

import { Platform } from 'react-native';

// Premium Gold Theme Colors
const primaryGold = '#D4AF37';
const secondaryGold = '#F4D03F';
const brightGold = '#FFD700';

export const Colors = {
  light: {
    text: '#000000',
    background: '#FFFFFF',
    tint: primaryGold,
    icon: '#6B7280',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: primaryGold,
    primary: primaryGold,
    secondary: secondaryGold,
    card: '#F8F9FA',
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
    textSecondary: '#6B7280',
    overlay: 'rgba(0, 0, 0, 0.1)',
  },
  dark: {
    text: '#FFFFFF',
    background: '#000000',
    tint: primaryGold,
    icon: '#D1D5DB',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: primaryGold,
    primary: primaryGold,
    secondary: brightGold,
    card: '#121212',
    border: '#2D2D2D',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
    textSecondary: '#9CA3AF',
    overlay: 'rgba(255, 255, 255, 0.1)',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
