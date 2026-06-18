import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Text, useTheme, Surface, Chip, Button, ActivityIndicator, Menu, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetIssuesQuery, useUpdateIssueStatusMutation } from '../../api/issueApi';
import { useGetProjectQuery } from '../../api/projectApi';
import { useGetSprintsQuery, useGetActiveSprintQuery } from '../../api/sprintApi';
import IssueCard from '../../components/issues/IssueCard';
import { BOARD_COLUMN_ORDER, STATUS_LABELS } from '../../constants';
import { getStatusColor } from '../../utils/helpers';
import { formatDate, getDaysRemaining, getSprintProgress } from '../../utils/dateUtils';

const PRIORITIES = ['highest', 'high', 'medium', 'low', 'lowest'];
const ISSUE_TYPES = ['bug', 'task', 'story', 'epic', 'subtask'];
const PRIORITY_COLORS = { highest: '#DE350B', high: '#FF8B00', medium: '#0052CC', low: '#00875A', lowest: '#8993A4' };

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

const BoardColumn = ({ title, status, issues, theme, onIssuePress, onAddIssue }) => {
  const statusColor = getStatusColor(status);

  return (
    <View style={[styles.column, { backgroundColor: theme.colors.surfaceVariant }]}>
      {/* Column Header */}
      <View style={[styles.columnHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
        <View style={[styles.columnDot, { backgroundColor: statusColor }]} />
        <Text
          variant="labelLarge"
          style={[styles.columnTitle, { color: theme.colors.onSurface }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <View style={[styles.countBadge, { backgroundColor: theme.colors.surface }]}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {issues.length}
          </Text>
        </View>
      </View>

      {/* Column Body — scrolls independently */}
      <ScrollView
        style={styles.columnBody}
        contentContainerStyle={styles.columnContent}
        showsVerticalScrollIndicator={false}
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
            <MaterialCommunityIcons
              name="inbox-outline"
              size={28}
              color={theme.colors.outlineVariant}
            />
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: 'center' }}
            >
              No issues
            </Text>
          </View>
        )}

        {/* Add Issue — dashed button at column bottom */}
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
  const [sprintMenuOpen, setSprintMenuOpen]       = useState(false);
  const [selectedSprintId, setSelectedSprintId]   = useState(null);
  const [filterAssignee, setFilterAssignee]       = useState(null);
  const [filterPriority, setFilterPriority]       = useState(null);
  const [filterType, setFilterType]               = useState(null);
  const [assigneeMenuOpen, setAssigneeMenuOpen]   = useState(false);
  const [priorityMenuOpen, setPriorityMenuOpen]   = useState(false);
  const [typeMenuOpen, setTypeMenuOpen]           = useState(false);
  const [searchText, setSearchText]               = useState('');

  const { data: project }         = useGetProjectQuery(projectId);
  const { data: activeSprintResp } = useGetActiveSprintQuery(projectId);
  const { data: sprintsData }      = useGetSprintsQuery({ projectId });

  const activeSprint = activeSprintResp?.data;
  const allSprints   = (sprintsData?.data?.data || []).filter(s => s.status !== 'completed');

  // Determine which sprint to display
  const displaySprint   = selectedSprintId
    ? allSprints.find(s => s.id === selectedSprintId)
    : activeSprint;
  const displaySprintId = displaySprint?.id;

  // If a sprint is selected, fetch its issues; otherwise fetch all project issues
  const issueQuery = displaySprintId
    ? { projectId, sprintId: displaySprintId, limit: 200 }
    : { projectId, limit: 200 };

  const {
    data: issuesData,
    isLoading,
    isFetching,
    refetch,
  } = useGetIssuesQuery(issueQuery);
  const [updateStatus] = useUpdateIssueStatusMutation();

  const issues = issuesData?.data?.data || [];

  // Unique assignees for filter menu
  const assignees = useMemo(() =>
    [...new Map(issues.filter(i => i.assignee).map(i => [i.assignee.id, i.assignee])).values()],
    [issues]
  );

  // Apply client-side filters
  const filteredIssues = useMemo(() => issues.filter(i => {
    if (filterAssignee && i.assignee?.id !== filterAssignee) return false;
    if (filterPriority && i.priority !== filterPriority) return false;
    if (filterType && i.type !== filterType) return false;
    if (searchText && !i.title?.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  }), [issues, filterAssignee, filterPriority, filterType, searchText]);

  const activeFilterCount = [filterAssignee, filterPriority, filterType, searchText].filter(Boolean).length;

  const groupedIssues = BOARD_COLUMN_ORDER.reduce((acc, col) => {
    acc[col] = filteredIssues.filter((i) => {
      const key = STATUS_NAME_TO_KEY[i.status?.name?.toLowerCase()];
      return key === col;
    });
    return acc;
  }, {});

  const sprintProgress = displaySprint ? getSprintProgress(displaySprint.startDate, displaySprint.endDate) : 0;
  const daysLeft       = displaySprint ? getDaysRemaining(displaySprint.endDate) : null;
  const doneCount      = issues.filter(i => {
    const key = STATUS_NAME_TO_KEY[i.status?.name?.toLowerCase()];
    return key === 'done';
  }).length;

  const handleIssuePress = useCallback(
    (issue) => {
      navigation.navigate('IssueDetail', { issueId: issue.id });
    },
    [navigation],
  );

  const handleAddIssue = useCallback(
    (status) => {
      navigation.navigate('CreateIssue', { projectId, defaultStatus: status });
    },
    [navigation, projectId],
  );

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const projectName = project?.data?.name || project?.name || 'Project';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Top Toolbar: breadcrumb + create button ── */}
      <Surface
        style={[styles.toolbar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}
        elevation={0}
      >
        <View style={[styles.toolbarLeft, { minWidth: 0 }]}>
          <TouchableOpacity onPress={() => navigation.navigate('Projects')}>
            <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>Projects</Text>
          </TouchableOpacity>
          <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.onSurfaceVariant} style={styles.breadcrumbSep} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }} numberOfLines={1}>{projectName}</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.onSurfaceVariant} style={styles.breadcrumbSep} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Board</Text>
        </View>

        <Button
          mode="contained"
          icon="plus"
          onPress={() => navigation.navigate('CreateIssue', { projectId })}
          contentStyle={{ height: 36 }}
          style={{ borderRadius: 8, flexShrink: 0 }}
        >
          Create Issue
        </Button>
      </Surface>

      {/* ── Filter bar ── */}
      <View style={[styles.filterBar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
          <MaterialCommunityIcons name="magnify" size={16} color={theme.colors.onSurfaceVariant} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search issues..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
            style={[styles.searchInput, { color: theme.colors.onSurface, outlineStyle: 'none' }]}
          />
          {!!searchText && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <MaterialCommunityIcons name="close-circle" size={14} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>

        {/* Assignee filter */}
        <Menu
          visible={assigneeMenuOpen}
          onDismiss={() => setAssigneeMenuOpen(false)}
          anchor={
            <Chip
              icon="account-outline"
              compact
              selected={!!filterAssignee}
              onPress={() => setAssigneeMenuOpen(true)}
              onClose={filterAssignee ? () => setFilterAssignee(null) : undefined}
              closeIcon={filterAssignee ? 'close' : undefined}
              style={[styles.filterChip, filterAssignee ? { backgroundColor: theme.colors.primaryContainer } : { backgroundColor: theme.colors.surfaceVariant }]}
              textStyle={{ fontSize: 12, color: filterAssignee ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }}
            >
              {filterAssignee ? (assignees.find(a => a.id === filterAssignee)?.firstName || 'Assignee') : 'Assignee'}
            </Chip>
          }
        >
          <Menu.Item title="All Assignees" onPress={() => { setFilterAssignee(null); setAssigneeMenuOpen(false); }} />
          <Divider />
          {assignees.map(a => (
            <Menu.Item
              key={a.id}
              title={`${a.firstName} ${a.lastName || ''}`.trim()}
              leadingIcon={filterAssignee === a.id ? 'check' : 'account-outline'}
              onPress={() => { setFilterAssignee(filterAssignee === a.id ? null : a.id); setAssigneeMenuOpen(false); }}
            />
          ))}
          {assignees.length === 0 && <Menu.Item title="No assignees" disabled />}
        </Menu>

        {/* Priority filter */}
        <Menu
          visible={priorityMenuOpen}
          onDismiss={() => setPriorityMenuOpen(false)}
          anchor={
            <Chip
              icon="flag-outline"
              compact
              selected={!!filterPriority}
              onPress={() => setPriorityMenuOpen(true)}
              onClose={filterPriority ? () => setFilterPriority(null) : undefined}
              closeIcon={filterPriority ? 'close' : undefined}
              style={[styles.filterChip, filterPriority ? { backgroundColor: theme.colors.primaryContainer } : { backgroundColor: theme.colors.surfaceVariant }]}
              textStyle={{ fontSize: 12, color: filterPriority ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }}
            >
              {filterPriority ? filterPriority.charAt(0).toUpperCase() + filterPriority.slice(1) : 'Priority'}
            </Chip>
          }
        >
          <Menu.Item title="All Priorities" onPress={() => { setFilterPriority(null); setPriorityMenuOpen(false); }} />
          <Divider />
          {PRIORITIES.map(p => (
            <Menu.Item
              key={p}
              title={p.charAt(0).toUpperCase() + p.slice(1)}
              leadingIcon={filterPriority === p ? 'check' : 'flag-outline'}
              titleStyle={{ color: PRIORITY_COLORS[p] }}
              onPress={() => { setFilterPriority(filterPriority === p ? null : p); setPriorityMenuOpen(false); }}
            />
          ))}
        </Menu>

        {/* Type filter */}
        <Menu
          visible={typeMenuOpen}
          onDismiss={() => setTypeMenuOpen(false)}
          anchor={
            <Chip
              icon="tag-outline"
              compact
              selected={!!filterType}
              onPress={() => setTypeMenuOpen(true)}
              onClose={filterType ? () => setFilterType(null) : undefined}
              closeIcon={filterType ? 'close' : undefined}
              style={[styles.filterChip, filterType ? { backgroundColor: theme.colors.primaryContainer } : { backgroundColor: theme.colors.surfaceVariant }]}
              textStyle={{ fontSize: 12, color: filterType ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }}
            >
              {filterType ? filterType.charAt(0).toUpperCase() + filterType.slice(1) : 'Type'}
            </Chip>
          }
        >
          <Menu.Item title="All Types" onPress={() => { setFilterType(null); setTypeMenuOpen(false); }} />
          <Divider />
          {ISSUE_TYPES.map(t => (
            <Menu.Item
              key={t}
              title={t.charAt(0).toUpperCase() + t.slice(1)}
              leadingIcon={filterType === t ? 'check' : 'tag-outline'}
              onPress={() => { setFilterType(filterType === t ? null : t); setTypeMenuOpen(false); }}
            />
          ))}
        </Menu>

        {/* Clear all */}
        {activeFilterCount > 0 && (
          <Button
            compact mode="text"
            icon="close-circle-outline"
            onPress={() => { setFilterAssignee(null); setFilterPriority(null); setFilterType(null); setSearchText(''); }}
            textColor={theme.colors.error}
          >
            Clear ({activeFilterCount})
          </Button>
        )}

        <View style={{ flex: 1 }} />
        {isFetching && <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginLeft: 8 }} />}
      </View>

      {/* ── Sprint info bar ── */}
      {displaySprint ? (
        <View style={[styles.sprintBar, { backgroundColor: '#EFF6FF', borderBottomColor: '#BFDBFE' }]}>
          <View style={styles.sprintBarLeft}>
            <MaterialCommunityIcons name="lightning-bolt" size={16} color="#1D4ED8" />
            <Menu
              visible={sprintMenuOpen}
              onDismiss={() => setSprintMenuOpen(false)}
              anchor={
                <TouchableOpacity onPress={() => setSprintMenuOpen(true)} style={styles.sprintSelector}>
                  <Text variant="labelLarge" style={{ color: '#1D4ED8', fontWeight: '700' }}>
                    {displaySprint.name}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={16} color="#1D4ED8" />
                </TouchableOpacity>
              }
            >
              <Menu.Item title="Active Sprint" disabled />
              <Divider />
              {allSprints.map(s => (
                <Menu.Item
                  key={s.id}
                  title={s.name}
                  leadingIcon={selectedSprintId === s.id || (!selectedSprintId && s.id === activeSprint?.id) ? 'check' : 'lightning-bolt-outline'}
                  onPress={() => { setSelectedSprintId(s.id === activeSprint?.id ? null : s.id); setSprintMenuOpen(false); }}
                />
              ))}
            </Menu>
            {displaySprint.endDate && (
              <Text variant="bodySmall" style={{ color: '#3B82F6', marginLeft: 8 }}>
                {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? 'Ends today' : 'Overdue'}
                {' · '}{formatDate(displaySprint.startDate)} – {formatDate(displaySprint.endDate)}
              </Text>
            )}
          </View>
          <View style={styles.sprintBarRight}>
            <Text variant="labelSmall" style={{ color: '#6B7280', marginRight: 8 }}>
              {doneCount}/{issues.length} done
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: '#BFDBFE' }]}>
              <View style={[styles.progressFill, { width: `${sprintProgress}%`, backgroundColor: '#1D4ED8' }]} />
            </View>
            <Text variant="labelSmall" style={{ color: '#1D4ED8', marginLeft: 8, fontWeight: '700' }}>
              {Math.round(sprintProgress)}%
            </Text>
            <Button
              compact mode="outlined"
              onPress={() => navigation.navigate('Backlog', { projectId })}
              style={{ borderRadius: 6, marginLeft: 16, borderColor: '#BFDBFE' }}
              textColor="#1D4ED8"
            >
              Backlog
            </Button>
          </View>
        </View>
      ) : (
        <View style={[styles.noSprintBanner, { backgroundColor: '#FFFBEB', borderBottomColor: '#FDE68A' }]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#D97706" />
          <Text variant="bodySmall" style={{ color: '#92400E', marginLeft: 8, flex: 1 }}>
            No active sprint · showing all project issues
          </Text>
          <Button
            compact mode="outlined"
            onPress={() => navigation.navigate('Backlog', { projectId })}
            style={{ borderRadius: 6, borderColor: '#FDE68A' }}
            textColor="#D97706"
          >
            Go to Backlog
          </Button>
        </View>
      )}

      {/* Board scroll area — horizontal, fills remaining height */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Toolbar ── */
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 16,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  breadcrumbSep: {
    marginHorizontal: 2,
  },

  /* ── Filter bar ── */
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderBottomWidth: 1,
    gap: 8,
    flexWrap: 'wrap',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 34,
    gap: 6,
    minWidth: 180,
    maxWidth: 260,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  filterChip: {
    height: 34,
  },

  /* ── Sprint bar ── */
  sprintBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 6,
    borderBottomWidth: 1,
  },
  sprintBarLeft:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sprintBarRight: { flexDirection: 'row', alignItems: 'center' },
  sprintSelector: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progressTrack: { height: 6, width: 100, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3 },
  noSprintBanner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 6,
    borderBottomWidth: 1,
  },

  /* ── Board area ── */
  boardScroll: {
    flex: 1,
  },
  boardContent: {
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },

  /* ── Column ── */
  column: {
    width: 300,
    borderRadius: 12,
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    // Use a fixed max height so columns don't grow taller than the board area.
    // On web this maps to CSS max-height and works with overflow scroll.
    maxHeight: '100%',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  columnDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  columnTitle: {
    flex: 1,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  columnBody: {
    flex: 1,
  },
  columnContent: {
    padding: 10,
    gap: 8,
    paddingBottom: 12,
  },
  issueWrapper: {},
  emptyColumn: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  addIssueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});

export default BoardScreen;
