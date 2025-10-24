import React, { memo, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Switch } from 'react-native';
import { Card, Title, Paragraph, Button, useTheme } from 'react-native-paper';
import { ResponsiveContainer } from '../ui/ResponsiveContainer';
import { ResponsiveText } from '../ui/ResponsiveText';
import { ResponsiveButton } from '../ui/ResponsiveButton';
import { usePerformanceMonitor, getBundleSizeInfo, getMemoryInfo } from '../../utils/performance';
import { spacing, fontSize } from '../../utils/responsive';

interface PerformanceDashboardProps {
  visible?: boolean;
  onClose?: () => void;
}

export const PerformanceDashboard = memo<PerformanceDashboardProps>(({
  visible = false,
  onClose,
}) => {
  const theme = useTheme();
  const { getAllMetrics, clearMetrics, logSummary } = usePerformanceMonitor();
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [bundleInfo, setBundleInfo] = useState(getBundleSizeInfo());
  const [memoryInfo, setMemoryInfo] = useState(getMemoryInfo());
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);

  useEffect(() => {
    if (visible && monitoringEnabled) {
      const interval = setInterval(() => {
        setMetrics(getAllMetrics());
        setBundleInfo(getBundleSizeInfo());
        setMemoryInfo(getMemoryInfo());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [visible, monitoringEnabled, getAllMetrics]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getPerformanceStatus = (value: number, threshold: number): 'good' | 'warning' | 'critical' => {
    if (value <= threshold * 0.8) return 'good';
    if (value <= threshold) return 'warning';
    return 'critical';
  };

  const getStatusColor = (status: 'good' | 'warning' | 'critical'): string => {
    switch (status) {
      case 'good': return '#22c55e';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (!visible) return null;

  return (
    <ResponsiveContainer
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      padding="lg"
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Title style={[styles.title, { color: theme.colors.onBackground }]}>
            Performance Dashboard
          </Title>
          <View style={styles.toggleContainer}>
            <ResponsiveText variant="caption">Monitoring</ResponsiveText>
            <Switch
              value={monitoringEnabled}
              onValueChange={setMonitoringEnabled}
              trackColor={{ false: '#767577', true: '#1e40af' }}
              thumbColor={monitoringEnabled ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Bundle Size Metrics */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Bundle Size
            </Title>
            <View style={styles.metricRow}>
              <ResponsiveText variant="body">Current Size:</ResponsiveText>
              <ResponsiveText 
                variant="body" 
                style={{ 
                  color: bundleInfo.isOverTarget ? '#ef4444' : '#22c55e',
                  fontWeight: '600'
                }}
              >
                {bundleInfo.estimatedBundleSize}
              </ResponsiveText>
            </View>
            <View style={styles.metricRow}>
              <ResponsiveText variant="body">Target Size:</ResponsiveText>
              <ResponsiveText variant="body" style={{ fontWeight: '600' }}>
                {bundleInfo.targetBundleSize}
              </ResponsiveText>
            </View>
            <View style={styles.metricRow}>
              <ResponsiveText variant="body">Screen Resolution:</ResponsiveText>
              <ResponsiveText variant="body" style={{ fontWeight: '600' }}>
                {bundleInfo.screenWidth}x{bundleInfo.screenHeight}
              </ResponsiveText>
            </View>
          </Card.Content>
        </Card>

        {/* Memory Usage */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Memory Usage
            </Title>
            <View style={styles.metricRow}>
              <ResponsiveText variant="body">Used Heap:</ResponsiveText>
              <ResponsiveText variant="body" style={{ fontWeight: '600' }}>
                {formatBytes(memoryInfo.usedJSHeapSize)}
              </ResponsiveText>
            </View>
            <View style={styles.metricRow}>
              <ResponsiveText variant="body">Total Heap:</ResponsiveText>
              <ResponsiveText variant="body" style={{ fontWeight: '600' }}>
                {formatBytes(memoryInfo.totalJSHeapSize)}
              </ResponsiveText>
            </View>
            <View style={styles.metricRow}>
              <ResponsiveText variant="body">Heap Limit:</ResponsiveText>
              <ResponsiveText variant="body" style={{ fontWeight: '600' }}>
                {formatBytes(memoryInfo.jsHeapSizeLimit)}
              </ResponsiveText>
            </View>
          </Card.Content>
        </Card>

        {/* Performance Metrics */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Performance Metrics
            </Title>
            {Object.entries(metrics).length > 0 ? (
              Object.entries(metrics).map(([key, value]) => {
                const status = getPerformanceStatus(value, 1000); // 1 second threshold
                return (
                  <View key={key} style={styles.metricRow}>
                    <ResponsiveText variant="body">{key}:</ResponsiveText>
                    <ResponsiveText 
                      variant="body" 
                      style={{ 
                        color: getStatusColor(status),
                        fontWeight: '600'
                      }}
                    >
                      {formatTime(value)}
                    </ResponsiveText>
                  </View>
                );
              })
            ) : (
              <ResponsiveText variant="body" style={{ fontStyle: 'italic' }}>
                No performance metrics recorded yet
              </ResponsiveText>
            )}
          </Card.Content>
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <ResponsiveButton
            title="Clear Metrics"
            onPress={clearMetrics}
            variant="outline"
            style={styles.actionButton}
          />
          <ResponsiveButton
            title="Export Logs"
            onPress={logSummary}
            variant="outline"
            style={styles.actionButton}
          />
          {onClose && (
            <ResponsiveButton
              title="Close"
              onPress={onClose}
              variant="primary"
              style={styles.actionButton}
            />
          )}
        </View>
      </ScrollView>
    </ResponsiveContainer>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  card: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
  },
});

PerformanceDashboard.displayName = 'PerformanceDashboard';