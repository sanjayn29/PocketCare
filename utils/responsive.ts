/**
 * utils/responsive.ts
 *
 * Centralised responsive scaling for PocketCare.
 *
 * Design baseline:  375 × 812  (iPhone 13 mini / standard Android reference)
 *
 * Usage:
 *   import { rs, rv, rf, rr } from '@/utils/responsive'
 *
 *   fontSize: rf(14)      // responsive font
 *   padding:  rs(16)      // responsive horizontal/general scale
 *   height:   rv(48)      // responsive vertical scale
 *   borderRadius: rr(12)  // responsive radius (lighter scaling)
 */

import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/** Design reference dimensions */
const BASE_W = 375;
const BASE_H = 812;

/**
 * Horizontal scale — use for widths, horizontal padding/margin, icon sizes.
 * Clamps output so tiny or giant phones don't break.
 */
export const rs = (size: number): number => {
  const scaled = (SCREEN_W / BASE_W) * size;
  return Math.round(PixelRatio.roundToNearestPixel(Math.min(scaled, size * 1.4)));
};

/**
 * Vertical scale — use for heights, vertical padding/margin.
 */
export const rv = (size: number): number => {
  const scaled = (SCREEN_H / BASE_H) * size;
  return Math.round(PixelRatio.roundToNearestPixel(Math.min(scaled, size * 1.4)));
};

/**
 * Font scale — moderate scaling so text never gets too big/small.
 * Uses a factor of 0.5 so the scaling is gentler than full horizontal scale.
 */
export const rf = (size: number, factor = 0.5): number => {
  const scaled = size + (rs(size) - size) * factor;
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/**
 * Radius scale — even lighter scaling for border radii.
 */
export const rr = (size: number): number => rf(size, 0.3);

// ─── Breakpoint helpers ────────────────────────────────────────────────────
export const isSmallPhone = SCREEN_W < 360;          // e.g. Galaxy A01
export const isNormalPhone = SCREEN_W >= 360 && SCREEN_W < 414;
export const isLargePhone = SCREEN_W >= 414;         // e.g. Pro Max, Pixel 7 Pro

/** Screen info (useful for conditional layouts) */
export const screen = {
  width: SCREEN_W,
  height: SCREEN_H,
  isSmall: isSmallPhone,
  isNormal: isNormalPhone,
  isLarge: isLargePhone,
  isAndroid: Platform.OS === 'android',
  isIOS: Platform.OS === 'ios',
};

/** Responsive spacing presets — replaces bare number constants */
export const rSpacing = {
  xs:   rs(4),
  sm:   rs(8),
  md:   rs(12),
  lg:   rs(16),
  xl:   rs(20),
  xxl:  rs(24),
  xxxl: rs(32),
};

/** Responsive font size presets */
export const rFontSize = {
  tiny:    rf(10),
  caption: rf(11),
  small:   rf(12),
  body:    rf(14),
  default: rf(15),
  medium:  rf(16),
  large:   rf(18),
  title:   rf(20),
  h3:      rf(22),
  h2:      rf(24),
  h1:      rf(28),
  display: rf(32),
};
