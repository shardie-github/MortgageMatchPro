import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from 'react-query';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Screens
import AuthScreen from './screens/auth/AuthScreen';
import DashboardScreen from './screens/dashboard/DashboardScreen';
import CalculatorScreen from './screens/calculator/CalculatorScreen';
import ProfileScreen from './screens/profile/ProfileScreen';
import DocumentsScreen from './screens/documents/DocumentsScreen';
import SettingsScreen from './screens/settings/SettingsScreen';

// Store
import { useAuthStore } from './store/authStore';

// Theme
import { theme } from './constants/theme';

const Stack = createStackNavigator();
const queryClient = new QueryClient();

const App = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PaperProvider theme={theme}>
            <NavigationContainer>
              <StatusBar barStyle="dark-content" backgroundColor="#fff" />
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                }}
              >
                {isAuthenticated ? (
                  <>
                    <Stack.Screen name="Dashboard" component={DashboardScreen} />
                    <Stack.Screen name="Calculator" component={CalculatorScreen} />
                    <Stack.Screen name="Profile" component={ProfileScreen} />
                    <Stack.Screen name="Documents" component={DocumentsScreen} />
                    <Stack.Screen name="Settings" component={SettingsScreen} />
                  </>
                ) : (
                  <Stack.Screen name="Auth" component={AuthScreen} />
                )}
              </Stack.Navigator>
            </NavigationContainer>
          </PaperProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;