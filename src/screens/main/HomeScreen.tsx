import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Text, Card, FAB, useTheme } from 'react-native-paper';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { mortgageService } from '../../services/mortgageService';
import { DashboardMetrics, Lead } from '../../types';
import { spacing, shadows } from '../../constants/theme';
import { QuickActionsCard } from '../../components/home/QuickActionsCard';
import { MetricsCard } from '../../components/home/MetricsCard';
import { RecentActivityCard } from '../../components/home/RecentActivityCard';
import { MarketInsightsCard } from '../../components/home/MarketInsightsCard';

const { width } = Dimensions.get('window');
const chartWidth = width - (spacing.lg * 2);

export const HomeScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [metricsData, leadsData] = await Promise.all([
        mortgageService.getDashboardMetrics(),
        mortgageService.getLeads(),
      ]);
      
      setMetrics(metricsData);
      setRecentLeads(leadsData.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
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
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
  };

  const monthlyData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [12, 19, 15, 25, 22, 30],
        color: (opacity = 1) => `rgba(30, 64, 175, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const leadSourceData = [
    {
      name: 'Website',
      population: 45,
      color: '#1e40af',
      legendFontColor: theme.colors.onSurface,
      legendFontSize: 12,
    },
    {
      name: 'Referral',
      population: 25,
      color: '#059669',
      legendFontColor: theme.colors.onSurface,
      legendFontSize: 12,
    },
    {
      name: 'Social Media',
      population: 20,
      color: '#7c3aed',
      legendFontColor: theme.colors.onSurface,
      legendFontSize: 12,
    },
    {
      name: 'Other',
      population: 10,
      color: '#dc2626',
      legendFontColor: theme.colors.onSurface,
      legendFontSize: 12,
    },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text>Loading...</Text>
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
        {/* Welcome Header */}
        <View style={styles.header}>
          <Text style={[styles.welcomeText, { color: theme.colors.onSurfaceVariant }]}>
            Welcome back,
          </Text>
          <Text style={[styles.userName, { color: theme.colors.onBackground }]}>
            {user?.firstName || 'User'}
          </Text>
        </View>

        {/* Quick Actions */}
        <QuickActionsCard />

        {/* Key Metrics */}
        {metrics && (
          <View style={styles.metricsContainer}>
            <MetricsCard
              title="Total Leads"
              value={metrics.totalLeads.toString()}
              change="+12%"
              changeType="positive"
              icon="👥"
            />
            <MetricsCard
              title="Conversion Rate"
              value={`${metrics.conversionRate.toFixed(1)}%`}
              change="+2.3%"
              changeType="positive"
              icon="📈"
            />
            <MetricsCard
              title="Total Commission"
              value={`$${metrics.totalCommission.toLocaleString()}`}
              change="+8.5%"
              changeType="positive"
              icon="💰"
            />
            <MetricsCard
              title="Active Leads"
              value={metrics.activeLeads.toString()}
              change="+5"
              changeType="positive"
              icon="⚡"
            />
          </View>
        )}

        {/* Monthly Trends Chart */}
        <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.chartTitle, { color: theme.colors.onSurface }]}>
              Monthly Performance
            </Text>
            <LineChart
              data={monthlyData}
              width={chartWidth}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </Card.Content>
        </Card>

        {/* Lead Sources Chart */}
        <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.chartTitle, { color: theme.colors.onSurface }]}>
              Lead Sources
            </Text>
            <PieChart
              data={leadSourceData}
              width={chartWidth}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
            />
          </Card.Content>
        </Card>

        {/* Recent Activity */}
        <RecentActivityCard leads={recentLeads} />

        {/* Market Insights */}
        <MarketInsightsCard />

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
  welcomeText: {
    fontSize: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
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
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
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