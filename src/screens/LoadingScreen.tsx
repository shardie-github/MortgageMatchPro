import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';

export const LoadingScreen: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator 
        size="large" 
        color={theme.colors.primary} 
        style={styles.spinner}
      />
      <Text style={[styles.text, { color: theme.colors.onBackground }]}>
        Loading MortgageMatch Pro...
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  spinner: {
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
  },
});