import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Text, useTheme, FAB, Surface, Chip, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetProjectIssuesQuery, useUpdateIssueStatusMutation } from '../../api/issueApi';
import { useGetProjectQuery } from '../../api/projectApi';
import IssueCard from '../../components/issues/IssueCard';
import EmptyState from '../../components/common/EmptyState';
import { BOARD_COLUMN_ORDER, STATUS_LABELS } from '../../constants';
import colors from '../../theme/colors';
import { getStatusColor } from '../../utils/helpers';

const BoardColumn = ({ title, status, issues, theme, onIssuePress, onAddIssue }) => {
  const statusColor = getStatusColor(status);

  return (
    <View style={[styles.column, { backgroundColor: theme.colors.surfaceVariant }]}>
      <View style={styles.columnHeader}>
        <View style={[styles.columnDot, { backgroundColor: statusColor }]} />
        <Text variant="labelMedium" style={[styles.columnTitle, { color: theme.colors.onSurface }]}>
          {title}
        </Text>
        <View style={[styles.countBadge, { backgroundColor: theme.colors.surface }]}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {issues.length}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.columnContent}
        nestedScrollEnabled
      >
        {issues.map((issue) => (
          <View key={issue.id} style={styles.issueWrapper}>
            <IssueCard
              issue={issue}
              onPress={() => onIssuePress(issue)}
              compact={false}
            />
          </View>
        ))}

        {issues.length === 0 && (
          <View style={styles.emptyColumn}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              No issues
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.addIssueBtn, { borderColor: theme.colors.outline }]}
          onPress={() => onAddIssue(status)}
        >
          <MaterialCommunityIcons name="plus" size={16} color={theme.colors.onSurfaceVariant} />
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Add Issue
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const BoardScreen = ({ route, navigation }) => {
  const { projectId } = route.params;
  const theme = useTheme();

  const { data: project } = useGetProjectQuery(projectId);
  const {
    data: issuesData,
    isLoading,
    refetch,
    isFetching,
  } = useGetProjectIssuesQuery({ projectId });
  const [updateStatus] = useUpdateIssueStatusMutation();

  const issues = issuesData?.data?.data || [];

  const STATUS_NAME_TO_KEY = {
    'to do': 'todo',
    'todo': 'todo',
    'in progress': 'inProgress',
    'inprogress': 'inProgress',
    'in review': 'inReview',
    'inreview': 'inReview',
    'done': 'done',
    'completed': 'done',
    'blocked': 'blocked',
  };

  const groupedIssues = BOARD_COLUMN_ORDER.reduce((acc, col) => {
    acc[col] = issues.filter(i => {
      const key = STATUS_NAME_TO_KEY[i.status?.name?.toLowerCase()];
      return key === col;
    });
    return acc;
  }, {});

  const handleIssuePress = useCallback((issue) => {
    navigation.navigate('IssueDetail', { issueId: issue.id });
  }, [navigation]);

  const handleAddIssue = useCallback((status) => {
    navigation.navigate('CreateIssue', { projectId, defaultStatus: status });
  }, [navigation, projectId]);

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Board Header */}
      <Surface style={[styles.boardHeader, { backgroundColor: theme.colors.surface }]} elevation={0}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterChips}>
            <Chip
              icon="filter-variant"
              compact
              style={{ backgroundColor: theme.colors.surfaceVariant }}
              textStyle={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}
            >
              Filter
            </Chip>
            <Chip
              icon="account"
              compact
              style={{ backgroundColor: theme.colors.surfaceVariant }}
              textStyle={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}
            >
              Assignee
            </Chip>
            <Chip
              icon="flag"
              compact
              style={{ backgroundColor: theme.colors.surfaceVariant }}
              textStyle={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}
            >
              Priority
            </Chip>
          </View>
        </ScrollView>
      </Surface>

      {/* Board Columns */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} colors={[theme.colors.primary]} />
        }
        style={styles.boardScroll}
        contentContainerStyle={styles.boardContent}
      >
        {BOARD_COLUMN_ORDER.map((status) => (
          <BoardColumn
            key={status}
            title={STATUS_LABELS[status] || status}
            status={status}
            issues={groupedIssues[status] || []}
            theme={theme}
            onIssuePress={handleIssuePress}
            onAddIssue={handleAddIssue}
          />
        ))}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('CreateIssue', { projectId })}
        color="#FFFFFF"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  boardHeader: { paddingHorizontal: 16, paddingVertical: 10 },
  filterChips: { flexDirection: 'row', gap: 8 },
  boardScroll: { flex: 1 },
  boardContent: { padding: 12, gap: 12 },
  column: {
    width: 280,
    borderRadius: 12,
    maxHeight: '100%',
    overflow: 'hidden',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    paddingBottom: 8,
  },
  columnDot: { width: 10, height: 10, borderRadius: 5 },
  columnTitle: { flex: 1, fontWeight: '600' },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  columnContent: { padding: 8, gap: 8, paddingBottom: 16 },
  issueWrapper: {},
  emptyColumn: { padding: 20, alignItems: 'center' },
  addIssueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  fab: { position: 'absolute', bottom: 24, right: 24 },
});

export default BoardScreen;
