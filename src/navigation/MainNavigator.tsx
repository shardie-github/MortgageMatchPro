import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

// Screens
import { HomeScreen } from '../screens/main/HomeScreen';
import { CalculatorScreen } from '../screens/main/CalculatorScreen';
import { RatesScreen } from '../screens/main/RatesScreen';
import { ScenariosScreen } from '../screens/main/ScenariosScreen';
import { DocumentsScreen } from '../screens/main/DocumentsScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { AffordabilityResultScreen } from '../screens/main/AffordabilityResultScreen';
import { RateDetailsScreen } from '../screens/main/RateDetailsScreen';
import { ScenarioComparisonScreen } from '../screens/main/ScenarioComparisonScreen';
import { DocumentViewerScreen } from '../screens/main/DocumentViewerScreen';
import { SettingsScreen } from '../screens/main/SettingsScreen';
import { NotificationsScreen } from '../screens/main/NotificationsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator();

const MainTabs = () => {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Calculator':
              iconName = 'calculate';
              break;
            case 'Rates':
              iconName = 'trending-up';
              break;
            case 'Scenarios':
              iconName = 'compare';
              break;
            case 'Documents':
              iconName = 'folder';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: t('navigation.home') }}
      />
      <Tab.Screen 
        name="Calculator" 
        component={CalculatorScreen}
        options={{ tabBarLabel: t('navigation.calculator') }}
      />
      <Tab.Screen 
        name="Rates" 
        component={RatesScreen}
        options={{ tabBarLabel: t('navigation.rates') }}
      />
      <Tab.Screen 
        name="Scenarios" 
        component={ScenariosScreen}
        options={{ tabBarLabel: t('navigation.scenarios') }}
      />
      <Tab.Screen 
        name="Documents" 
        component={DocumentsScreen}
        options={{ tabBarLabel: t('navigation.documents') }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabBarLabel: t('navigation.profile') }}
      />
    </Tab.Navigator>
  );
};

export const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen 
        name="AffordabilityResult" 
        component={AffordabilityResultScreen}
        options={{ 
          headerShown: true,
          title: 'Affordability Results',
          headerBackTitle: 'Back'
        }}
      />
      <Stack.Screen 
        name="RateDetails" 
        component={RateDetailsScreen}
        options={{ 
          headerShown: true,
          title: 'Rate Details',
          headerBackTitle: 'Back'
        }}
      />
      <Stack.Screen 
        name="ScenarioComparison" 
        component={ScenarioComparisonScreen}
        options={{ 
          headerShown: true,
          title: 'Scenario Comparison',
          headerBackTitle: 'Back'
        }}
      />
      <Stack.Screen 
        name="DocumentViewer" 
        component={DocumentViewerScreen}
        options={{ 
          headerShown: true,
          title: 'Document Viewer',
          headerBackTitle: 'Back'
        }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ 
          headerShown: true,
          title: 'Settings',
          headerBackTitle: 'Back'
        }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ 
          headerShown: true,
          title: 'Notifications',
          headerBackTitle: 'Back'
        }}
      />
    </Stack.Navigator>
  );
};