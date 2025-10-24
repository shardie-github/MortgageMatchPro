import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

// Broker Screens
import { BrokerDashboardScreen } from '../screens/broker/BrokerDashboardScreen';
import { LeadsScreen } from '../screens/broker/LeadsScreen';
import { AnalyticsScreen } from '../screens/broker/AnalyticsScreen';
import { CommissionsScreen } from '../screens/broker/CommissionsScreen';
import { BrokerSettingsScreen } from '../screens/broker/BrokerSettingsScreen';
import { LeadDetailsScreen } from '../screens/broker/LeadDetailsScreen';
import { CommissionDetailsScreen } from '../screens/broker/CommissionDetailsScreen';
import { ReportsScreen } from '../screens/broker/ReportsScreen';
import { CustomDrawerContent } from '../components/broker/CustomDrawerContent';

const Drawer = createDrawerNavigator<BrokerStackParamList>();
const Stack = createStackNavigator();

const BrokerStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="Dashboard" component={BrokerDashboardScreen} />
      <Stack.Screen 
        name="Leads" 
        component={LeadsScreen}
        options={{ 
          headerShown: true,
          title: 'Lead Management',
          headerBackTitle: 'Dashboard'
        }}
      />
      <Stack.Screen 
        name="Analytics" 
        component={AnalyticsScreen}
        options={{ 
          headerShown: true,
          title: 'Analytics',
          headerBackTitle: 'Dashboard'
        }}
      />
      <Stack.Screen 
        name="Commissions" 
        component={CommissionsScreen}
        options={{ 
          headerShown: true,
          title: 'Commissions',
          headerBackTitle: 'Dashboard'
        }}
      />
      <Stack.Screen 
        name="Settings" 
        component={BrokerSettingsScreen}
        options={{ 
          headerShown: true,
          title: 'Settings',
          headerBackTitle: 'Dashboard'
        }}
      />
      <Stack.Screen 
        name="LeadDetails" 
        component={LeadDetailsScreen}
        options={{ 
          headerShown: true,
          title: 'Lead Details',
          headerBackTitle: 'Leads'
        }}
      />
      <Stack.Screen 
        name="CommissionDetails" 
        component={CommissionDetailsScreen}
        options={{ 
          headerShown: true,
          title: 'Commission Details',
          headerBackTitle: 'Commissions'
        }}
      />
      <Stack.Screen 
        name="Reports" 
        component={ReportsScreen}
        options={{ 
          headerShown: true,
          title: 'Reports',
          headerBackTitle: 'Analytics'
        }}
      />
    </Stack.Navigator>
  );
};

export const BrokerNavigator: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: theme.colors.surface,
          width: 280,
        },
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.onSurfaceVariant,
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '500',
        },
      }}
    >
      <Drawer.Screen 
        name="Dashboard" 
        component={BrokerStack}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="dashboard" size={size} color={color} />
          ),
          drawerLabel: t('broker.dashboard'),
        }}
      />
    </Drawer.Navigator>
  );
};