import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Animated } from 'react-native';
import { Text, useTheme, Surface, Chip, Button, ActivityIndicator, Menu, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetIssuesQuery, useUpdateIssueStatusMutation } from '../../api/issueApi';
import { useGetProjectQuery, useGetProjectWorkflowQuery } from '../../api/projectApi';
import { useGetSprintsQuery, useGetActiveSprintQuery } from '../../api/sprintApi';
import IssueCard from '../../components/issues/IssueCard';
import { BOARD_COLUMN_ORDER, STATUS_LABELS } from '../../constants';
import { getStatusColor } from '../../utils/helpers';
import { formatDate, getDaysRemaining, getSprintProgress } from '../../utils/dateUtils';
import colors from '../../theme/colors';
import AppToast from '../../components/common/AppToast';

const PRIORITIES = ['highest', 'high', 'medium', 'low', 'lowest'];
const ISSUE_TYPES = ['bug', 'task', 'story', 'epic', 'subtask'];
const PRIORITY_COLORS = { highest: '#DC2626', high: '#F59E0B', medium: '#3B82F6', low: '#10B981', lowest: '#8993A4' };

const STATUS_NAME_TO_KEY = {
  'to do': 'todo', 'todo': 'todo',
  'in progress': 'inProgress', 'inprogress': 'inProgress',
  'in review': 'inReview', 'inreview': 'inReview',
  'done': 'done', 'completed': 'done', 'blocked': 'blocked',
};

/* ─── Board column with drag-and-drop drop target ─── */
const BoardColumn = ({
  title, status, colKey, issues, theme, onIssuePress, onAddIssue,
  colKeyToStatusId, updateStatus, onStatusChanged,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [dropping, setDropping] = useState(false);
  const statusColor = getStatusColor(status);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const issueId  = e.dataTransfer.getData('issueId');
    const fromKey  = e.dataTransfer.getData('fromColKey');
    const statusId = colKeyToStatusId[colKey];
    if (!issueId || !statusId || fromKey === colKey) return;
    setDropping(true);
    try {
      await updateStatus({ id: issueId, statusId }).unwrap();
      onStatusChanged?.(`Moved to "${title}"`);
    } catch (_) {
      onStatusChanged?.('Failed to move issue', true);
    } finally {
      setDropping(false);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        width: 300, display: 'flex', flexDirection: 'column',
        borderRadius: 12, overflow: 'hidden',
        backgroundColor: dragOver
          ? statusColor + '14'
          : theme.colors.surfaceVariant,
        border: dragOver ? `2px dashed ${statusColor}` : '2px solid transparent',
        transition: 'background-color 0.15s, border-color 0.15s',
        maxHeight: '100%',
        position: 'relative',
      }}
    >
      {/* Column header */}
      <View style={[styles.columnHeader, {
        borderBottomColor: dragOver ? statusColor + '40' : theme.colors.outlineVariant,
        backgroundColor: dragOver ? statusColor + '10' : 'transparent',
      }]}>
        <View style={[styles.columnDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.columnTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.countBadge, { backgroundColor: theme.colors.surface }]}>
          <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, fontWeight: '600' }}>
            {issues.length}
          </Text>
        </View>
        {dropping && <ActivityIndicator size="small" color={statusColor} style={{ marginLeft: 6 }} />}
      </View>

      {/* Drop hint when dragging over empty column */}
      {dragOver && issues.length === 0 && (
        <View style={styles.dropHint}>
          <MaterialCommunityIcons name="arrow-down-circle-outline" size={24} color={statusColor} />
          <Text style={[styles.dropHintText, { color: statusColor }]}>Drop here</Text>
        </View>
      )}

      {/* Drop overlay stripe when dragging over non-empty column */}
      {dragOver && issues.length > 0 && (
        <View style={[styles.dropOverlay, { backgroundColor: statusColor + '08', borderColor: statusColor + '30' }]}>
          <Text style={[styles.dropOverlayText, { color: statusColor }]}>Drop to move</Text>
        </View>
      )}

      {/* Column scroll body */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.columnContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {issues.map(issue => (
          <DraggableIssue
            key={issue.id}
            issue={issue}
            colKey={colKey}
            onPress={() => onIssuePress(issue)}
          />
        ))}

        {issues.length === 0 && !dragOver && (
          <View style={styles.emptyColumn}>
            <MaterialCommunityIcons name="inbox-outline" size={26} color={theme.colors.outlineVariant} />
            <Text style={[styles.emptyColText, { color: theme.colors.onSurfaceVariant }]}>No issues</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.addIssueBtn, { borderColor: theme.colors.outline }]}
          onPress={() => onAddIssue(status)}
        >
          <MaterialCommunityIcons name="plus" size={15} color={theme.colors.onSurfaceVariant} />
          <Text style={[styles.addIssueTxt, { color: theme.colors.onSurfaceVariant }]}>Add Issue</Text>
        </TouchableOpacity>
      </ScrollView>
    </div>
  );
};

/* ─── Draggable issue wrapper ─── */
const DraggableIssue = ({ issue, colKey, onPress }) => {
  const [dragging, setDragging] = useState(false);

  const handleDragStart = (e) => {
    e.dataTransfer.setData('issueId', issue.id);
    e.dataTransfer.setData('fromColKey', colKey);
    e.dataTransfer.effectAllowed = 'move';
    setDragging(true);
  };

  const handleDragEnd = () => setDragging(false);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{
        cursor: dragging ? 'grabbing' : 'grab',
        opacity: dragging ? 0.45 : 1,
        transition: 'opacity 0.12s',
        marginBottom: 8,
        borderRadius: 10,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <IssueCard issue={issue} onPress={onPress} compact={false} />
    </div>
  );
};

/* ─── Main screen ─── */
const BoardScreen = ({ route, navigation }) => {
  const { projectId } = route.params;
  const theme = useTheme();
  const [sprintMenuOpen, setSprintMenuOpen]     = useState(false);
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [filterAssignee, setFilterAssignee]     = useState(null);
  const [filterPriority, setFilterPriority]     = useState(null);
  const [filterType, setFilterType]             = useState(null);
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false);
  const [typeMenuOpen, setTypeMenuOpen]         = useState(false);
  const [searchText, setSearchText]             = useState('');
  const [toast, setToast]                       = useState('');

  const { data: project }          = useGetProjectQuery(projectId);
  const { data: activeSprintResp } = useGetActiveSprintQuery(projectId);
  const { data: sprintsData }      = useGetSprintsQuery({ projectId });
  const { data: workflowData }     = useGetProjectWorkflowQuery(projectId, { skip: !projectId });

  const activeSprint = activeSprintResp?.data;
  const allSprints   = (sprintsData?.data?.data || []).filter(s => s.status !== 'completed');

  const displaySprint   = selectedSprintId
    ? allSprints.find(s => s.id === selectedSprintId)
    : activeSprint;
  const displaySprintId = displaySprint?.id;

  const issueQuery = displaySprintId
    ? { projectId, sprintId: displaySprintId, limit: 200 }
    : { projectId, limit: 200 };

  const { data: issuesData, isLoading, isFetching, refetch } = useGetIssuesQuery(issueQuery);
  const [updateStatus] = useUpdateIssueStatusMutation();

  const issues = issuesData?.data?.data || [];

  /* Build column-key → statusId map from project workflow */
  const colKeyToStatusId = useMemo(() => {
    const workflows = workflowData?.data || [];
    const wf = workflows.find(w => w.isDefault) || workflows[0];
    const statuses = wf?.statuses || [];
    const map = {};
    statuses.forEach(s => {
      const key = STATUS_NAME_TO_KEY[s.name?.toLowerCase()];
      if (key && !map[key]) map[key] = s.id;
    });
    return map;
  }, [workflowData]);

  const assignees = useMemo(() =>
    [...new Map(issues.filter(i => i.assignee).map(i => [i.assignee.id, i.assignee])).values()],
    [issues]
  );

  const filteredIssues = useMemo(() => issues.filter(i => {
    if (filterAssignee && i.assignee?.id !== filterAssignee) return false;
    if (filterPriority && i.priority !== filterPriority) return false;
    if (filterType && i.type !== filterType) return false;
    if (searchText && !i.title?.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  }), [issues, filterAssignee, filterPriority, filterType, searchText]);

  const activeFilterCount = [filterAssignee, filterPriority, filterType, searchText].filter(Boolean).length;

  const groupedIssues = BOARD_COLUMN_ORDER.reduce((acc, col) => {
    acc[col] = filteredIssues.filter(i => STATUS_NAME_TO_KEY[i.status?.name?.toLowerCase()] === col);
    return acc;
  }, {});

  const sprintProgress = displaySprint ? getSprintProgress(displaySprint.startDate, displaySprint.endDate) : 0;
  const daysLeft       = displaySprint ? getDaysRemaining(displaySprint.endDate) : null;
  const doneCount      = issues.filter(i => STATUS_NAME_TO_KEY[i.status?.name?.toLowerCase()] === 'done').length;

  const handleIssuePress  = useCallback(i => navigation.navigate('IssueDetail', { issueId: i.id }), [navigation]);
  const handleAddIssue    = useCallback(s => navigation.navigate('CreateIssue', { projectId, defaultStatus: s }), [navigation, projectId]);
  const handleStatusChange = useCallback(msg => { setToast(msg); refetch(); }, [refetch]);

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

      {/* ── Breadcrumb toolbar ── */}
      <Surface style={[styles.toolbar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]} elevation={0}>
        <View style={[styles.toolbarLeft, { minWidth: 0 }]}>
          <TouchableOpacity onPress={() => navigation.navigate('Projects')}>
            <Text style={{ color: theme.colors.primary, fontSize: 14 }}>Projects</Text>
          </TouchableOpacity>
          <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.onSurfaceVariant} style={{ marginHorizontal: 2 }} />
          <Text style={{ color: theme.colors.onSurface, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{projectName}</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.onSurfaceVariant} style={{ marginHorizontal: 2 }} />
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14 }}>Board</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Drag hint badge */}
          <View style={[styles.dragHintBadge, { backgroundColor: colors.brand.skyLight }]}>
            <MaterialCommunityIcons name="drag" size={12} color={colors.brand.navy} />
            <Text style={[styles.dragHintText, { color: colors.brand.navy }]}>Drag to move</Text>
          </View>
          <Button
            mode="contained" icon="plus"
            onPress={() => navigation.navigate('CreateIssue', { projectId })}
            contentStyle={{ height: 36 }}
            style={{ borderRadius: 8, flexShrink: 0 }}
          >
            Create Issue
          </Button>
        </View>
      </Surface>

      {/* ── Filter bar ── */}
      <View style={[styles.filterBar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
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

        {/* Assignee */}
        <Menu
          visible={assigneeMenuOpen} onDismiss={() => setAssigneeMenuOpen(false)}
          anchor={
            <Chip icon="account-outline" compact selected={!!filterAssignee}
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
            <Menu.Item key={a.id} title={`${a.firstName} ${a.lastName || ''}`.trim()}
              leadingIcon={filterAssignee === a.id ? 'check' : 'account-outline'}
              onPress={() => { setFilterAssignee(filterAssignee === a.id ? null : a.id); setAssigneeMenuOpen(false); }} />
          ))}
          {assignees.length === 0 && <Menu.Item title="No assignees" disabled />}
        </Menu>

        {/* Priority */}
        <Menu
          visible={priorityMenuOpen} onDismiss={() => setPriorityMenuOpen(false)}
          anchor={
            <Chip icon="flag-outline" compact selected={!!filterPriority}
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
            <Menu.Item key={p} title={p.charAt(0).toUpperCase() + p.slice(1)}
              leadingIcon={filterPriority === p ? 'check' : 'flag-outline'}
              titleStyle={{ color: PRIORITY_COLORS[p] }}
              onPress={() => { setFilterPriority(filterPriority === p ? null : p); setPriorityMenuOpen(false); }} />
          ))}
        </Menu>

        {/* Type */}
        <Menu
          visible={typeMenuOpen} onDismiss={() => setTypeMenuOpen(false)}
          anchor={
            <Chip icon="tag-outline" compact selected={!!filterType}
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
            <Menu.Item key={t} title={t.charAt(0).toUpperCase() + t.slice(1)}
              leadingIcon={filterType === t ? 'check' : 'tag-outline'}
              onPress={() => { setFilterType(filterType === t ? null : t); setTypeMenuOpen(false); }} />
          ))}
        </Menu>

        {activeFilterCount > 0 && (
          <Button compact mode="text" icon="close-circle-outline"
            onPress={() => { setFilterAssignee(null); setFilterPriority(null); setFilterType(null); setSearchText(''); }}
            textColor={theme.colors.error}
          >
            Clear ({activeFilterCount})
          </Button>
        )}

        <View style={{ flex: 1 }} />
        {isFetching && <ActivityIndicator size="small" color={theme.colors.primary} />}
      </View>

      {/* ── Sprint info bar ── */}
      {displaySprint ? (
        <View style={[styles.sprintBar, { backgroundColor: '#EFF6FF', borderBottomColor: '#BFDBFE' }]}>
          <View style={styles.sprintBarLeft}>
            <MaterialCommunityIcons name="lightning-bolt" size={15} color="#1D4ED8" />
            <Menu
              visible={sprintMenuOpen} onDismiss={() => setSprintMenuOpen(false)}
              anchor={
                <TouchableOpacity onPress={() => setSprintMenuOpen(true)} style={styles.sprintSelector}>
                  <Text style={{ color: '#1D4ED8', fontWeight: '700', fontSize: 13 }}>{displaySprint.name}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={15} color="#1D4ED8" />
                </TouchableOpacity>
              }
            >
              <Menu.Item title="Sprints" disabled />
              <Divider />
              {allSprints.map(s => (
                <Menu.Item key={s.id} title={s.name}
                  leadingIcon={selectedSprintId === s.id || (!selectedSprintId && s.id === activeSprint?.id) ? 'check' : 'lightning-bolt-outline'}
                  onPress={() => { setSelectedSprintId(s.id === activeSprint?.id ? null : s.id); setSprintMenuOpen(false); }} />
              ))}
            </Menu>
            {displaySprint.endDate && (
              <Text style={{ color: '#3B82F6', marginLeft: 8, fontSize: 12 }}>
                {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? 'Ends today' : 'Overdue'}
                {' · '}{formatDate(displaySprint.startDate)} – {formatDate(displaySprint.endDate)}
              </Text>
            )}
          </View>
          <View style={styles.sprintBarRight}>
            <Text style={{ color: '#6B7280', marginRight: 8, fontSize: 12 }}>{doneCount}/{issues.length} done</Text>
            <View style={[styles.progressTrack, { backgroundColor: '#BFDBFE' }]}>
              <View style={[styles.progressFill, { width: `${sprintProgress}%`, backgroundColor: '#1D4ED8' }]} />
            </View>
            <Text style={{ color: '#1D4ED8', marginLeft: 8, fontWeight: '700', fontSize: 12 }}>{Math.round(sprintProgress)}%</Text>
            <Button compact mode="outlined" onPress={() => navigation.navigate('Backlog', { projectId })}
              style={{ borderRadius: 6, marginLeft: 16, borderColor: '#BFDBFE' }} textColor="#1D4ED8">
              Backlog
            </Button>
          </View>
        </View>
      ) : (
        <View style={[styles.noSprintBanner, { backgroundColor: '#FFFBEB', borderBottomColor: '#FDE68A' }]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#D97706" />
          <Text style={{ color: '#92400E', marginLeft: 8, flex: 1, fontSize: 13 }}>
            No active sprint · showing all project issues
          </Text>
          <Button compact mode="outlined" onPress={() => navigation.navigate('Backlog', { projectId })}
            style={{ borderRadius: 6, borderColor: '#FDE68A' }} textColor="#D97706">
            Go to Backlog
          </Button>
        </View>
      )}

      {/* ── Board columns ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        style={styles.boardScroll}
        contentContainerStyle={styles.boardContent}
      >
        {BOARD_COLUMN_ORDER.map(colKey => (
          <BoardColumn
            key={colKey}
            title={STATUS_LABELS[colKey] || colKey}
            status={colKey}
            colKey={colKey}
            issues={groupedIssues[colKey] || []}
            theme={theme}
            onIssuePress={handleIssuePress}
            onAddIssue={handleAddIssue}
            colKeyToStatusId={colKeyToStatusId}
            updateStatus={updateStatus}
            onStatusChanged={handleStatusChange}
          />
        ))}
      </ScrollView>

      {!!toast && <AppToast message={toast} type="moved" onDone={() => setToast('')} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'column' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 1, gap: 16,
    boxShadow: '0px 1px 4px rgba(6,43,111,0.05)',
  },
  toolbarLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, overflow: 'hidden' },
  dragHintBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
  },
  dragHintText: { fontSize: 11, fontWeight: '600' },

  filterBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 6, borderBottomWidth: 1, gap: 8, flexWrap: 'wrap',
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, height: 34, gap: 6, minWidth: 180, maxWidth: 260,
  },
  searchInput: { flex: 1, fontSize: 13, height: '100%', borderWidth: 0, backgroundColor: 'transparent' },
  filterChip: { height: 34 },

  sprintBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 6, borderBottomWidth: 1,
  },
  sprintBarLeft:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sprintBarRight: { flexDirection: 'row', alignItems: 'center' },
  sprintSelector: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progressTrack: { height: 6, width: 100, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3 },
  noSprintBanner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 6, borderBottomWidth: 1,
  },

  boardScroll: { flex: 1 },
  boardContent: { padding: 16, gap: 12, alignItems: 'flex-start' },

  /* Column internals (RN parts) */
  columnHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1,
  },
  columnDot: { width: 10, height: 10, borderRadius: 5 },
  columnTitle: { flex: 1, fontWeight: '700', fontSize: 13 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, minWidth: 24, alignItems: 'center' },
  columnContent: { padding: 10, paddingBottom: 12 },

  dropHint: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  dropHintText: { fontSize: 13, fontWeight: '700' },
  dropOverlay: {
    position: 'absolute', top: 48, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-start', alignItems: 'center',
    paddingTop: 14, zIndex: 10, borderWidth: 1,
    pointerEvents: 'none',
  },
  dropOverlayText: { fontSize: 12, fontWeight: '700', opacity: 0.8 },

  emptyColumn: { paddingVertical: 32, alignItems: 'center', gap: 8 },
  emptyColText: { fontSize: 13 },

  addIssueBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: 10, marginTop: 4, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed',
  },
  addIssueTxt: { fontSize: 12 },

});

export default BoardScreen;
