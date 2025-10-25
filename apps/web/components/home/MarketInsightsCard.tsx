import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { spacing } from '../../constants/theme';

interface MarketInsight {
  id: string;
  title: string;
  value: string;
  change: string;
  changeType: 'up' | 'down' | 'stable';
  description: string;
}

const marketInsights: MarketInsight[] = [
  {
    id: 'rates',
    title: 'Average Mortgage Rate',
    value: '6.25%',
    change: '+0.15%',
    changeType: 'up',
    description: 'Rates increased slightly this week',
  },
  {
    id: 'inventory',
    title: 'Housing Inventory',
    value: '2.1 months',
    change: '-0.3 months',
    changeType: 'down',
    description: 'Inventory remains tight',
  },
  {
    id: 'prices',
    title: 'Median Home Price',
    value: '$425,000',
    change: '+2.1%',
    changeType: 'up',
    description: 'Prices continue to rise',
  },
];

export const MarketInsightsCard: React.FC = () => {
  const { theme } = useTheme();

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'up':
        return '📈';
      case 'down':
        return '📉';
      default:
        return '➡️';
    }
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'up':
        return theme.colors.error;
      case 'down':
        return theme.colors.secondary;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          Market Insights
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Current market conditions and trends
        </Text>
        
        <View style={styles.insightsList}>
          {marketInsights.map((insight) => (
            <View key={insight.id} style={styles.insightItem}>
              <View style={styles.insightHeader}>
                <Text style={[styles.insightTitle, { color: theme.colors.onSurface }]}>
                  {insight.title}
                </Text>
                <View style={styles.changeContainer}>
                  <Text style={styles.changeIcon}>
                    {getChangeIcon(insight.changeType)}
                  </Text>
                  <Text style={[styles.change, { color: getChangeColor(insight.changeType) }]}>
                    {insight.change}
                  </Text>
                </View>
              </View>
              <Text style={[styles.insightValue, { color: theme.colors.primary }]}>
                {insight.value}
              </Text>
              <Text style={[styles.insightDescription, { color: theme.colors.onSurfaceVariant }]}>
                {insight.description}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}>
            Data updated 2 hours ago
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: spacing.lg,
    marginTop: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: spacing.md,
  },
  insightsList: {
    gap: spacing.md,
  },
  insightItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  change: {
    fontSize: 14,
    fontWeight: '500',
  },
  insightValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  insightDescription: {
    fontSize: 14,
  },
  footer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});