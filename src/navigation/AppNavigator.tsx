import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { BrokerNavigator } from './BrokerNavigator';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { LoadingScreen } from '../screens/LoadingScreen';

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { user, isLoading, isFirstTime } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isFirstTime ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : !user ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : user.subscriptionTier === 'broker' ? (
        <Stack.Screen name="Main" component={BrokerNavigator} />
      ) : (
        <Stack.Screen name="Main" component={MainNavigator} />
      )}
    </Stack.Navigator>
  );
};