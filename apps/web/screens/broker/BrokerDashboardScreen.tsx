import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Text, Card, FAB, useTheme } from 'react-native-paper';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { mortgageService } from '../../services/mortgageService';
import { DashboardMetrics, Lead, CommissionReport } from '../../types';
import { spacing, shadows } from '../../constants/theme';
import { BrokerMetricsCard } from '../../components/broker/BrokerMetricsCard';
import { LeadStatusChart } from '../../components/broker/LeadStatusChart';
import { RecentLeadsTable } from '../../components/broker/RecentLeadsTable';
import { CommissionSummaryCard } from '../../components/broker/CommissionSummaryCard';
import { PerformanceChart } from '../../components/broker/PerformanceChart';

const { width } = Dimensions.get('window');
const chartWidth = width - (spacing.lg * 2);

export const BrokerDashboardScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [commissions, setCommissions] = useState<CommissionReport[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBrokerData();
  }, []);

  const loadBrokerData = async () => {
    try {
      setLoading(true);
      const [metricsData, leadsData, commissionsData] = await Promise.all([
        mortgageService.getBrokerMetrics(),
        mortgageService.getLeads(),
        mortgageService.getCommissions(),
      ]);
      
      setMetrics(metricsData);
      setRecentLeads(leadsData.slice(0, 10));
      setCommissions(commissionsData);
    } catch (error) {
      console.error('Error loading broker data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBrokerData();
    setRefreshing(false);
  };

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(30, 64, 175, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text>Loading broker dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onBackground }]}>
            Broker Dashboard
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Welcome back, {user?.firstName || 'Broker'}
          </Text>
        </View>

        {/* Key Metrics */}
        {metrics && (
          <View style={styles.metricsContainer}>
            <BrokerMetricsCard
              title="Total Leads"
              value={metrics.totalLeads.toString()}
              change="+12%"
              changeType="positive"
              icon="👥"
            />
            <BrokerMetricsCard
              title="Converted"
              value={metrics.convertedLeads.toString()}
              change="+8%"
              changeType="positive"
              icon="✅"
            />
            <BrokerMetricsCard
              title="Conversion Rate"
              value={`${metrics.conversionRate.toFixed(1)}%`}
              change="+2.3%"
              changeType="positive"
              icon="📈"
            />
            <BrokerMetricsCard
              title="Commission"
              value={`$${metrics.totalCommission.toLocaleString()}`}
              change="+15.2%"
              changeType="positive"
              icon="💰"
            />
          </View>
        )}

        {/* Performance Chart */}
        <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.chartTitle, { color: theme.colors.onSurface }]}>
              Monthly Performance
            </Text>
            <PerformanceChart data={metrics?.monthlyTrends || []} />
          </Card.Content>
        </Card>

        {/* Lead Status Distribution */}
        <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.chartTitle, { color: theme.colors.onSurface }]}>
              Lead Status Distribution
            </Text>
            <LeadStatusChart leads={recentLeads} />
          </Card.Content>
        </Card>

        {/* Commission Summary */}
        <CommissionSummaryCard commissions={commissions} />

        {/* Recent Leads Table */}
        <Card style={[styles.tableCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.chartTitle, { color: theme.colors.onSurface }]}>
              Recent Leads
            </Text>
            <RecentLeadsTable leads={recentLeads} />
          </Card.Content>
        </Card>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => {/* Navigate to create lead */}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  chartCard: {
    margin: spacing.lg,
    marginTop: 0,
    ...shadows.md,
  },
  tableCard: {
    margin: spacing.lg,
    marginTop: 0,
    ...shadows.md,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  bottomSpacing: {
    height: 100,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});