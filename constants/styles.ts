/**
 * Reusable StyleSheet definitions for performance
 * Pre-compiled styles reduce runtime overhead
 * All sizes are responsive via utils/responsive.ts
 */
import { StyleSheet } from 'react-native';
import { Colors } from './theme';
import { rf, rr, rs, rv, rSpacing, rFontSize } from '@/utils/responsive';

// ─── Common Spacing (responsive) ────────────────────────────────────────────
export const spacing = rSpacing;

// ─── Light Theme Styles ─────────────────────────────────────────────────────
export const lightStyles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.light.background },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },

  heading1:      { fontSize: rf(32), fontWeight: 'bold',  color: Colors.light.text },
  heading2:      { fontSize: rf(24), fontWeight: '700',   color: Colors.light.text },
  heading3:      { fontSize: rf(20), fontWeight: '600',   color: Colors.light.text },
  body:          { fontSize: rf(16), fontWeight: '400',   color: Colors.light.text, lineHeight: rv(24) },
  bodySecondary: { fontSize: rf(14), fontWeight: '400',   color: Colors.light.textSecondary, lineHeight: rv(20) },
  caption:       { fontSize: rf(12), fontWeight: '400',   color: Colors.light.textSecondary, lineHeight: rv(16) },

  card: {
    backgroundColor: Colors.light.card,
    borderRadius: rr(12),
    padding: spacing.lg,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cardPrimary: {
    backgroundColor: Colors.light.card,
    borderRadius: rr(12),
    padding: spacing.lg,
    marginVertical: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.primary,
  },

  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: rr(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: Colors.light.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: rr(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryText: { color: Colors.light.text, fontWeight: '600', fontSize: rf(16) },
  buttonSecondary: {
    backgroundColor: Colors.light.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: rr(8),
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondaryText: { color: Colors.light.text, fontWeight: '600', fontSize: rf(16) },

  input: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: rr(8),
    padding: spacing.md,
    fontSize: rf(16),
    color: Colors.light.text,
  },
  inputFocus: { borderColor: Colors.light.primary, borderWidth: 2 },

  badgePrimary: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: rr(16),
  },
  badgePrimaryText:   { color: Colors.light.text, fontSize: rf(12), fontWeight: '600' },
  badgeSecondary: {
    backgroundColor: Colors.light.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: rr(16),
  },
  badgeSecondaryText: { color: Colors.light.text, fontSize: rf(12), fontWeight: '600' },

  divider: { height: 1, backgroundColor: Colors.light.border, marginVertical: spacing.md },

  row:           { flexDirection: 'row', alignItems: 'center' },
  spaceBetween:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  centerContent: { alignItems: 'center', justifyContent: 'center' },
  fullWidth:     { width: '100%' },
});

// ─── Dark Theme Styles ──────────────────────────────────────────────────────
export const darkStyles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.dark.background },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },

  heading1:      { fontSize: rf(32), fontWeight: 'bold',  color: Colors.dark.text },
  heading2:      { fontSize: rf(24), fontWeight: '700',   color: Colors.dark.text },
  heading3:      { fontSize: rf(20), fontWeight: '600',   color: Colors.dark.text },
  body:          { fontSize: rf(16), fontWeight: '400',   color: Colors.dark.text, lineHeight: rv(24) },
  bodySecondary: { fontSize: rf(14), fontWeight: '400',   color: Colors.dark.textSecondary, lineHeight: rv(20) },
  caption:       { fontSize: rf(12), fontWeight: '400',   color: Colors.dark.textSecondary, lineHeight: rv(16) },

  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: rr(12),
    padding: spacing.lg,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cardPrimary: {
    backgroundColor: Colors.dark.card,
    borderRadius: rr(12),
    padding: spacing.lg,
    marginVertical: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.dark.primary,
  },

  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: rr(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: rr(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryText: { color: Colors.dark.text, fontWeight: '600', fontSize: rf(16) },
  buttonSecondary: {
    backgroundColor: Colors.dark.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: rr(8),
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondaryText: { color: Colors.dark.text, fontWeight: '600', fontSize: rf(16) },

  input: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: rr(8),
    padding: spacing.md,
    fontSize: rf(16),
    color: Colors.dark.text,
  },
  inputFocus: { borderColor: Colors.dark.primary, borderWidth: 2 },

  badgePrimary: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: rr(16),
  },
  badgePrimaryText:   { color: Colors.dark.text, fontSize: rf(12), fontWeight: '600' },
  badgeSecondary: {
    backgroundColor: Colors.dark.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: rr(16),
  },
  badgeSecondaryText: { color: Colors.dark.text, fontSize: rf(12), fontWeight: '600' },

  divider: { height: 1, backgroundColor: Colors.dark.border, marginVertical: spacing.md },

  row:           { flexDirection: 'row', alignItems: 'center' },
  spaceBetween:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  centerContent: { alignItems: 'center', justifyContent: 'center' },
  fullWidth:     { width: '100%' },
});

// ─── Helper to select theme ─────────────────────────────────────────────────
export const getStyles = (isDarkMode: boolean) => isDarkMode ? darkStyles : lightStyles;
export const getColors = (isDarkMode: boolean) => isDarkMode ? Colors.dark : Colors.light;

// ─── Re-export responsive helpers so screens can import from one place ───────
export { rf, rr, rs, rv, rSpacing, rFontSize };
