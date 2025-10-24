module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-.*|@react-navigation|@react-native-community|react-native-vector-icons|react-native-paper|react-native-chart-kit|react-native-svg|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|react-native-localize|react-native-keychain|react-native-biometrics|react-native-document-picker|react-native-image-picker|react-native-permissions|react-native-calendars|react-native-date-picker|react-native-modal|react-native-skeleton-placeholder|react-native-linear-gradient|react-native-splash-screen|react-native-device-info|react-native-config|react-native-push-notification|react-native-share|react-native-fs|react-native-pdf|react-native-webview|react-native-sqlite-storage|@react-native-async-storage|react-native-encrypted-storage|react-native-keyboard-aware-scroll-view|react-native-toast-message|react-native-flash-message)/)',
  ],
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};