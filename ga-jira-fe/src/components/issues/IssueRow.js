import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PropTypes from 'prop-types';
import Avatar from '../common/Avatar';
import PriorityBadge from '../common/PriorityBadge';
import StatusBadge from './StatusBadge';
import { getIssueTypeIcon, getIssueTypeColor } from '../../utils/helpers';
import { formatDate, isOverdue } from '../../utils/dateUtils';

const IssueRow = ({ issue, onPress, selected, onSelect, showCheckbox }) => {
  const theme = useTheme();
  const overdue = isOverdue(issue.dueDate);

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={showCheckbox ? () => onSelect?.(issue.id) : undefined}
      activeOpacity={0.7}
      style={[
        styles.row,
        { backgroundColor: selected ? theme.colors.primaryContainer + '40' : 'transparent' },
      ]}
    >
      {showCheckbox && (
        <TouchableOpacity
          onPress={() => onSelect?.(issue.id)}
          style={styles.checkbox}
        >
          <MaterialCommunityIcons
            name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={20}
            color={selected ? theme.colors.primary : theme.colors.onSurfaceVariant}
          />
        </TouchableOpacity>
      )}

      <View style={styles.typeIcon}>
        <MaterialCommunityIcons
          name={getIssueTypeIcon(issue.type)}
          size={16}
          color={getIssueTypeColor(issue.type)}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {issue.key}
          </Text>
          <PriorityBadge priority={issue.priority} showLabel={false} size="small" />
        </View>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurface }}
          numberOfLines={1}
        >
          {issue.title}
        </Text>
        <View style={styles.bottomRow}>
          <StatusBadge status={issue.status} size="small" />
          {issue.dueDate && (
            <Text
              variant="labelSmall"
              style={{ color: overdue ? theme.colors.error : theme.colors.onSurfaceVariant }}
            >
              Due {formatDate(issue.dueDate)}
            </Text>
          )}
          {issue.storyPoints > 0 && (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {issue.storyPoints} pts
            </Text>
          )}
        </View>
      </View>

      <Avatar user={issue.assignee} size={28} style={styles.avatar} />
    </TouchableOpacity>
  );
};

IssueRow.propTypes = {
  issue: PropTypes.object.isRequired,
  onPress: PropTypes.func,
  selected: PropTypes.bool,
  onSelect: PropTypes.func,
  showCheckbox: PropTypes.bool,
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  checkbox: { marginRight: 4 },
  typeIcon: { width: 20, alignItems: 'center' },
  content: { flex: 1, gap: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  avatar: { marginLeft: 4 },
});

export default IssueRow;
