import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions for mobile-first design (iPhone 12 Pro as reference)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// Breakpoints for different screen sizes
export const BREAKPOINTS = {
  xs: 320,   // Small phones
  sm: 375,   // iPhone SE, iPhone 12 mini
  md: 390,   // iPhone 12 Pro (base)
  lg: 414,   // iPhone 12 Pro Max
  xl: 428,   // iPhone 14 Pro Max
  xxl: 480,  // Large phones
} as const;

// Responsive scaling functions
export const scale = (size: number): number => {
  const scaleFactor = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(PixelRatio.roundToNearestPixel(size * scaleFactor));
};

export const verticalScale = (size: number): number => {
  const scaleFactor = SCREEN_HEIGHT / BASE_HEIGHT;
  return Math.round(PixelRatio.roundToNearestPixel(size * scaleFactor));
};

export const moderateScale = (size: number, factor: number = 0.5): number => {
  const scaleFactor = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(PixelRatio.roundToNearestPixel(size + (scaleFactor - 1) * factor));
};

// Screen size detection
export const isSmallScreen = (): boolean => SCREEN_WIDTH < BREAKPOINTS.sm;
export const isMediumScreen = (): boolean => SCREEN_WIDTH >= BREAKPOINTS.sm && SCREEN_WIDTH < BREAKPOINTS.lg;
export const isLargeScreen = (): boolean => SCREEN_WIDTH >= BREAKPOINTS.lg;
export const isTablet = (): boolean => SCREEN_WIDTH >= BREAKPOINTS.xl;

// Responsive spacing
export const spacing = {
  xs: scale(4),
  sm: scale(8),
  md: scale(16),
  lg: scale(24),
  xl: scale(32),
  xxl: scale(48),
} as const;

// Responsive font sizes
export const fontSize = {
  xs: scale(12),
  sm: scale(14),
  md: scale(16),
  lg: scale(18),
  xl: scale(20),
  xxl: scale(24),
  xxxl: scale(28),
  display: scale(32),
} as const;

// Responsive icon sizes
export const iconSize = {
  xs: scale(16),
  sm: scale(20),
  md: scale(24),
  lg: scale(28),
  xl: scale(32),
  xxl: scale(40),
} as const;

// Touch target sizes (minimum 44pt for accessibility)
export const touchTarget = {
  min: scale(44),
  sm: scale(48),
  md: scale(52),
  lg: scale(56),
} as const;

// Responsive layout helpers
export const layout = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  isLandscape: SCREEN_WIDTH > SCREEN_HEIGHT,
  safeAreaTop: Platform.OS === 'ios' ? 44 : 24,
  safeAreaBottom: Platform.OS === 'ios' ? 34 : 0,
} as const;

// Performance-optimized dimensions
export const performance = {
  // Reduce re-renders by memoizing dimensions
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  // Use for conditional rendering based on screen size
  shouldUseCompactLayout: SCREEN_WIDTH < BREAKPOINTS.md,
  shouldUseExpandedLayout: SCREEN_WIDTH >= BREAKPOINTS.lg,
} as const;

// Responsive grid system
export const grid = {
  columns: isSmallScreen() ? 1 : isMediumScreen() ? 2 : 3,
  gutter: spacing.md,
  margin: spacing.lg,
} as const;

// Typography scale
export const typography = {
  h1: {
    fontSize: fontSize.xxxl,
    lineHeight: scale(36),
    fontWeight: '700' as const,
  },
  h2: {
    fontSize: fontSize.xxl,
    lineHeight: scale(32),
    fontWeight: '600' as const,
  },
  h3: {
    fontSize: fontSize.xl,
    lineHeight: scale(28),
    fontWeight: '600' as const,
  },
  body: {
    fontSize: fontSize.md,
    lineHeight: scale(24),
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: fontSize.sm,
    lineHeight: scale(20),
    fontWeight: '400' as const,
  },
  button: {
    fontSize: fontSize.md,
    lineHeight: scale(24),
    fontWeight: '600' as const,
  },
} as const;

// Animation durations optimized for mobile
export const animation = {
  fast: 150,
  normal: 250,
  slow: 350,
  verySlow: 500,
} as const;

// Z-index scale
export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;