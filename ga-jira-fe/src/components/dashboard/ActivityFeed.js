import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PropTypes from 'prop-types';
import Avatar from '../common/Avatar';
import { formatRelative } from '../../utils/dateUtils';
import { getIssueTypeIcon, getIssueTypeColor } from '../../utils/helpers';

const getActivityIcon = (type) => {
  const icons = {
    created: 'plus-circle',
    updated: 'pencil',
    commented: 'comment',
    status_changed: 'swap-horizontal',
    assigned: 'account-arrow-right',
    sprint_started: 'play-circle',
    sprint_completed: 'check-circle',
    attachment_added: 'paperclip',
    deleted: 'delete',
  };
  return icons[type] || 'circle-medium';
};

const ActivityItem = ({ activity, theme }) => {
  return (
    <View style={styles.activityItem}>
      <View style={styles.activityLeft}>
        <Avatar user={activity.user} size={32} />
        <View style={[styles.activityLine, { backgroundColor: theme.colors.outline }]} />
      </View>
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
            {activity.user ? `${activity.user.firstName} ${activity.user.lastName || ''}`.trim() : 'Someone'}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {' '}{activity.action}
          </Text>
        </View>
        {activity.issue && (
          <View style={styles.issueRef}>
            <MaterialCommunityIcons
              name={getIssueTypeIcon(activity.issue.type)}
              size={12}
              color={getIssueTypeColor(activity.issue.type)}
            />
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.primary }}
              numberOfLines={1}
            >
              {activity.issue.key} - {activity.issue.title}
            </Text>
          </View>
        )}
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
          {formatRelative(activity.createdAt)}
        </Text>
      </View>
    </View>
  );
};

const ActivityFeed = ({ activities = [], style }) => {
  const theme = useTheme();

  if (!activities.length) {
    return (
      <View style={[styles.empty, style]}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          No recent activity
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {activities.map((activity, index) => (
        <ActivityItem key={activity.id || index} activity={activity} theme={theme} />
      ))}
    </View>
  );
};

ActivityFeed.propTypes = {
  activities: PropTypes.array,
  style: PropTypes.object,
};

const styles = StyleSheet.create({
  container: { gap: 0 },
  activityItem: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  activityLeft: { alignItems: 'center', width: 32 },
  activityLine: { width: 1, flex: 1, marginTop: 4, marginBottom: -4 },
  activityContent: { flex: 1, paddingBottom: 12 },
  activityHeader: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  issueRef: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  empty: { padding: 16, alignItems: 'center' },
});

export default ActivityFeed;
