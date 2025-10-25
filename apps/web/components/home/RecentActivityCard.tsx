import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, Avatar, Badge, useTheme } from 'react-native-paper';
import { Lead } from '../../types';
import { spacing } from '../../constants/theme';

interface RecentActivityCardProps {
  leads: Lead[];
}

export const RecentActivityCard: React.FC<RecentActivityCardProps> = ({ leads }) => {
  const { theme } = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'converted':
        return theme.colors.secondary;
      case 'contacted':
        return theme.colors.primary;
      case 'pending':
        return '#f59e0b';
      case 'rejected':
        return theme.colors.error;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'converted':
        return '✓';
      case 'contacted':
        return '📞';
      case 'pending':
        return '⏳';
      case 'rejected':
        return '✗';
      default:
        return '?';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          Recent Activity
        </Text>
        <View style={styles.leadsList}>
          {leads.map((lead) => (
            <TouchableOpacity
              key={lead.id}
              style={styles.leadItem}
              onPress={() => {/* Navigate to lead details */}}
            >
              <Avatar.Text
                size={40}
                label={lead.name.charAt(0).toUpperCase()}
                style={{ backgroundColor: theme.colors.primaryContainer }}
              />
              <View style={styles.leadInfo}>
                <Text style={[styles.leadName, { color: theme.colors.onSurface }]}>
                  {lead.name}
                </Text>
                <Text style={[styles.leadEmail, { color: theme.colors.onSurfaceVariant }]}>
                  {lead.email}
                </Text>
                <Text style={[styles.leadTime, { color: theme.colors.onSurfaceVariant }]}>
                  {formatDate(lead.createdAt)}
                </Text>
              </View>
              <View style={styles.leadStatus}>
                <Badge
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(lead.status) }
                  ]}
                >
                  {getStatusIcon(lead.status)}
                </Badge>
                <Text style={[styles.leadScore, { color: theme.colors.onSurfaceVariant }]}>
                  Score: {lead.leadScore}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        {leads.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              No recent activity
            </Text>
          </View>
        )}
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
    marginBottom: spacing.md,
  },
  leadsList: {
    gap: spacing.sm,
  },
  leadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  leadInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  leadEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  leadTime: {
    fontSize: 12,
  },
  leadStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    marginBottom: spacing.xs,
  },
  leadScore: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    fontSize: 16,
  },
});