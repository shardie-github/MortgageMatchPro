import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { useI18n } from '../../contexts/I18nContext';
import { spacing } from '../../constants/theme';

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  onPress: () => void;
}

const quickActions: QuickAction[] = [
  {
    id: 'calculator',
    title: 'Calculate Affordability',
    icon: '🧮',
    color: '#1e40af',
    onPress: () => {/* Navigate to calculator */},
  },
  {
    id: 'rates',
    title: 'View Rates',
    icon: '📈',
    color: '#059669',
    onPress: () => {/* Navigate to rates */},
  },
  {
    id: 'scenarios',
    title: 'Compare Scenarios',
    icon: '⚖️',
    color: '#7c3aed',
    onPress: () => {/* Navigate to scenarios */},
  },
  {
    id: 'documents',
    title: 'Upload Documents',
    icon: '📄',
    color: '#dc2626',
    onPress: () => {/* Navigate to documents */},
  },
];

export const QuickActionsCard: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useI18n();

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          Quick Actions
        </Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionButton, { backgroundColor: action.color }]}
              onPress={action.onPress}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: spacing.lg,
    marginBottom: spacing.md,
  },
  content: {
    padding: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    aspectRatio: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    padding: spacing.sm,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  actionTitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});