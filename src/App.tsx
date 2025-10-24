import React, { useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from 'react-query';
import Toast from 'react-native-toast-message';
import FlashMessage from 'react-native-flash-message';

import { AppNavigator } from './navigation/AppNavigator';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nProvider } from './contexts/I18nContext';
import { theme } from './constants/theme';
import { toastConfig } from './utils/toastConfig';
import { usePerformanceMonitor, analyzeBundleSize } from './utils/performance';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App: React.FC = () => {
  const { startTiming, endTiming } = usePerformanceMonitor();

  useEffect(() => {
    // Start performance monitoring
    startTiming('app_initialization');
    
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(theme.colors.primary);
    }
    StatusBar.setBarStyle('light-content');

    // Analyze bundle size in development
    if (__DEV__) {
      analyzeBundleSize();
    }

    // End initialization timing
    const initTime = endTiming('app_initialization');
    console.log(`App initialization took: ${initTime}ms`);
  }, [startTiming, endTiming]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <PaperProvider theme={theme}>
              <I18nProvider>
                <AuthProvider>
                  <NavigationContainer>
                    <AppNavigator />
                    <Toast config={toastConfig} />
                    <FlashMessage position="top" />
                  </NavigationContainer>
                </AuthProvider>
              </I18nProvider>
            </PaperProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;