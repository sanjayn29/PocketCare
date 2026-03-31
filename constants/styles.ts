/**
 * Reusable StyleSheet definitions for performance
 * Pre-compiled styles reduce runtime overhead
 */
import { StyleSheet } from 'react-native';
import { Colors } from './theme';
 



// ─── Common Spacing ─────────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// ─── Light Theme Styles ─────────────────────────────────────────────────────
export const lightStyles = StyleSheet.create({
  // Containers
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  
  // Text
  heading1: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  heading2: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
  },
  heading3: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.light.text,
    lineHeight: 24,
  },
  bodySecondary: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.light.textSecondary,
    lineHeight: 16,
  },
  
  // Cards
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: spacing.lg,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cardPrimary: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: spacing.lg,
    marginVertical: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.primary,
  },
  
  // Buttons
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: Colors.light.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryText: {
    color: Colors.light.text,
    fontWeight: '600',
    fontSize: 16,
  },
  buttonSecondary: {
    backgroundColor: Colors.light.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondaryText: {
    color: Colors.light.text,
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Inputs
  input: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: Colors.light.text,
  },
  inputFocus: {
    borderColor: Colors.light.primary,
    borderWidth: 2,
  },
  
  // Badges
  badgePrimary: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  badgePrimaryText: {
    color: Colors.light.text,
    fontSize: 12,
    fontWeight: '600',
  },
  badgeSecondary: {
    backgroundColor: Colors.light.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  badgeSecondaryText: {
    color: Colors.light.text,
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Dividers
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: spacing.md,
  },
  
  // Flex Utilities
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
});

// ─── Dark Theme Styles ──────────────────────────────────────────────────────
export const darkStyles = StyleSheet.create({
  // Containers
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  
  // Text
  heading1: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  heading2: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  heading3: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.dark.text,
    lineHeight: 24,
  },
  bodySecondary: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.dark.textSecondary,
    lineHeight: 16,
  },
  
  // Cards
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: spacing.lg,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cardPrimary: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: spacing.lg,
    marginVertical: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.dark.primary,
  },
  
  // Buttons
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryText: {
    color: Colors.dark.text,
    fontWeight: '600',
    fontSize: 16,
  },
  buttonSecondary: {
    backgroundColor: Colors.dark.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondaryText: {
    color: Colors.dark.text,
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Inputs
  input: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: Colors.dark.text,
  },
  inputFocus: {
    borderColor: Colors.dark.primary,
    borderWidth: 2,
  },
  
  // Badges
  badgePrimary: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  badgePrimaryText: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '600',
  },
  badgeSecondary: {
    backgroundColor: Colors.dark.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  badgeSecondaryText: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Dividers
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: spacing.md,
  },
  
  // Flex Utilities
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
});

// ─── Helper to select theme ─────────────────────────────────────────────────
export const getStyles = (isDarkMode: boolean) => isDarkMode ? darkStyles : lightStyles;
export const getColors = (isDarkMode: boolean) => isDarkMode ? Colors.dark : Colors.light;
