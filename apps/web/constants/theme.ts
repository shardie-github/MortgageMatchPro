import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1e40af', // Blue-800
    primaryContainer: '#dbeafe', // Blue-100
    secondary: '#059669', // Green-600
    secondaryContainer: '#d1fae5', // Green-100
    tertiary: '#7c3aed', // Violet-600
    tertiaryContainer: '#ede9fe', // Violet-100
    surface: '#ffffff',
    surfaceVariant: '#f8fafc', // Gray-50
    background: '#ffffff',
    error: '#dc2626', // Red-600
    errorContainer: '#fef2f2', // Red-50
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onTertiary: '#ffffff',
    onSurface: '#1f2937', // Gray-800
    onSurfaceVariant: '#6b7280', // Gray-500
    onBackground: '#1f2937', // Gray-800
    onError: '#ffffff',
    outline: '#d1d5db', // Gray-300
    outlineVariant: '#e5e7eb', // Gray-200
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#374151', // Gray-700
    inverseOnSurface: '#f9fafb', // Gray-50
    inversePrimary: '#93c5fd', // Blue-300
    elevation: {
      level0: 'transparent',
      level1: '#ffffff',
      level2: '#ffffff',
      level3: '#ffffff',
      level4: '#ffffff',
      level5: '#ffffff',
    },
  },
  roundness: 12,
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: 'System',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500' as const,
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300' as const,
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100' as const,
    },
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};