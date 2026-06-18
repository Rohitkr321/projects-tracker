import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PropTypes from 'prop-types';
import Avatar from '../common/Avatar';
import PriorityBadge from '../common/PriorityBadge';
import StatusBadge from './StatusBadge';
import { getIssueTypeIcon, getIssueTypeColor, truncateText } from '../../utils/helpers';
import { formatRelative, isOverdue } from '../../utils/dateUtils';

const IssueCard = ({ issue, onPress, style, compact = false }) => {
  const theme = useTheme();
  const overdue = isOverdue(issue.dueDate);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Surface
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
          overdue && styles.overdueCard,
          style,
        ]}
        elevation={1}
      >
        <View style={styles.header}>
          <View style={styles.typeAndKey}>
            <MaterialCommunityIcons
              name={getIssueTypeIcon(issue.type)}
              size={14}
              color={getIssueTypeColor(issue.type)}
            />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {issue.key}
            </Text>
          </View>
          <StatusBadge status={issue.status} size="small" />
        </View>

        <Text
          variant="bodyMedium"
          style={[styles.title, { color: theme.colors.onSurface }]}
          numberOfLines={2}
        >
          {issue.title}
        </Text>

        {!compact && (
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <PriorityBadge priority={issue.priority} showLabel={false} />
              {issue.dueDate && (
                <View style={styles.dueDate}>
                  <MaterialCommunityIcons
                    name="calendar"
                    size={12}
                    color={overdue ? theme.colors.error : theme.colors.onSurfaceVariant}
                  />
                  <Text
                    variant="labelSmall"
                    style={{ color: overdue ? theme.colors.error : theme.colors.onSurfaceVariant }}
                  >
                    {formatRelative(issue.dueDate)}
                  </Text>
                </View>
              )}
              {issue.storyPoints > 0 && (
                <View style={[styles.storyPoints, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {issue.storyPoints}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.footerRight}>
              {issue.commentCount > 0 && (
                <View style={styles.commentCount}>
                  <MaterialCommunityIcons
                    name="comment-outline"
                    size={12}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {issue.commentCount}
                  </Text>
                </View>
              )}
              <Avatar user={issue.assignee} size={24} />
            </View>
          </View>
        )}
      </Surface>
    </TouchableOpacity>
  );
};

IssueCard.propTypes = {
  issue: PropTypes.shape({
    id: PropTypes.string.isRequired,
    key: PropTypes.string,
    title: PropTypes.string.isRequired,
    type: PropTypes.string,
    status: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    priority: PropTypes.string,
    assignee: PropTypes.object,
    dueDate: PropTypes.string,
    storyPoints: PropTypes.number,
    commentCount: PropTypes.number,
  }).isRequired,
  onPress: PropTypes.func,
  style: PropTypes.object,
  compact: PropTypes.bool,
};

const styles = StyleSheet.create({
  card: { borderRadius: 8, padding: 12, marginBottom: 0, borderWidth: 1 },
  overdueCard: { borderLeftWidth: 3, borderLeftColor: '#DE350B' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeAndKey: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { marginBottom: 10, lineHeight: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dueDate: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  storyPoints: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  commentCount: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});

export default IssueCard;
