import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { spacing } from '../../constants/theme';

interface MetricsCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: string;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  change,
  changeType,
  icon,
}) => {
  const { theme } = useTheme();

  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return theme.colors.secondary;
      case 'negative':
        return theme.colors.error;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case 'positive':
        return '↗️';
      case 'negative':
        return '↘️';
      default:
        return '→';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={[styles.title, { color: theme.colors.onSurfaceVariant }]}>
          {title}
        </Text>
      </View>
      <Text style={[styles.value, { color: theme.colors.onSurface }]}>
        {value}
      </Text>
      <View style={styles.changeContainer}>
        <Text style={styles.changeIcon}>{getChangeIcon()}</Text>
        <Text style={[styles.change, { color: getChangeColor() }]}>
          {change}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '48%',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  icon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeIcon: {
    fontSize: 12,
    marginRight: 2,
  },
  change: {
    fontSize: 12,
    fontWeight: '500',
  },
});