import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions } from 'react-native';
import { Text, useTheme, Surface, Chip, Button, ActivityIndicator, Menu, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetIssuesQuery, useUpdateIssueStatusMutation } from '../../api/issueApi';
import { useGetProjectQuery, useGetProjectWorkflowQuery, useGetProjectMembersQuery } from '../../api/projectApi';
import { useGetSprintsQuery, useGetActiveSprintQuery } from '../../api/sprintApi';
import Avatar from '../../components/common/Avatar';
import { BOARD_COLUMN_ORDER, STATUS_LABELS, PRIORITY_LABELS, ISSUE_TYPE_LABELS } from '../../constants';
import {
  getStatusColor,
  getIssueTypeIcon,
  getIssueTypeColor,
  getPriorityColor,
  getPriorityIcon,
} from '../../utils/helpers';
import { formatDate, formatRelative, getDaysRemaining, getSprintProgress, isOverdue } from '../../utils/dateUtils';
import colors from '../../theme/colors';
import AppToast from '../../components/common/AppToast';
import { useProjectScrollbar } from '../../hooks/useProjectScrollbar';

const NAVY = colors.brand.navy;
const PRIORITIES = ['highest', 'high', 'medium', 'low', 'lowest'];
const ISSUE_TYPES = ['bug', 'story', 'task', 'epic', 'subtask'];

const STATUS_NAME_TO_KEY = {
  'to do': 'todo',
  todo: 'todo',
  'in progress': 'inProgress',
  inprogress: 'inProgress',
  'in review': 'inReview',
  inreview: 'inReview',
  done: 'done',
  completed: 'done',
  blocked: 'blocked',
};

const titleCase = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());

const projectInitials = (project) => (project?.key || project?.name || 'PR').substring(0, 2).toUpperCase();

const personName = (user) => {
  if (!user) return 'Unassigned';
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return fullName || user.email || user.name || 'Unassigned';
};

const clampPercent = (value) => Math.min(100, Math.max(0, Math.round(value || 0)));

const BoardColumn = ({
  title,
  status,
  colKey,
  issues,
  theme,
  accent,
  onIssuePress,
  onAddIssue,
  colKeyToStatusId,
  updateStatus,
  onStatusChanged,
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
    const issueId = e.dataTransfer.getData('issueId');
    const fromKey = e.dataTransfer.getData('fromColKey');
    const statusId = colKeyToStatusId[colKey];
    if (!issueId || !statusId || fromKey === colKey) return;

    setDropping(true);
    try {
      await updateStatus({ id: issueId, statusId }).unwrap();
      onStatusChanged?.(`Moved to ${title}`);
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
        width: 326,
        minWidth: 326,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: theme.colors.surface,
        border: dragOver ? `2px dashed ${statusColor}` : `1px solid ${theme.colors.outlineVariant}`,
        boxShadow: dragOver ? `0 12px 26px ${statusColor}22` : '0 8px 20px rgba(20,33,61,0.06)',
        transition: 'background-color 0.15s, border-color 0.15s, box-shadow 0.15s',
        maxHeight: '100%',
        position: 'relative',
      }}
    >
      <View style={[styles.columnHeader, { backgroundColor: dragOver ? `${statusColor}10` : theme.colors.background, borderBottomColor: theme.colors.outlineVariant }]}>
        <View style={[styles.columnIcon, { backgroundColor: `${statusColor}16` }]}>
          <View style={[styles.columnDot, { backgroundColor: statusColor }]} />
        </View>
        <View style={styles.columnTitleWrap}>
          <Text style={[styles.columnTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.columnSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            {issues.length} issue{issues.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
          <Text style={[styles.countBadgeText, { color: theme.colors.onSurfaceVariant }]}>
            {issues.length}
          </Text>
        </View>
        {dropping && <ActivityIndicator size="small" color={statusColor} style={{ marginLeft: 6 }} />}
      </View>

      {dragOver && (
        <View style={[styles.dropOverlay, { backgroundColor: `${statusColor}10`, borderColor: `${statusColor}30` }]}>
          <MaterialCommunityIcons name="arrow-down-circle-outline" size={18} color={statusColor} />
          <Text style={[styles.dropOverlayText, { color: statusColor }]}>Drop to move</Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.columnContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {issues.map((issue) => (
          <DraggableIssue
            key={issue.id}
            issue={issue}
            theme={theme}
            colKey={colKey}
            onPress={() => onIssuePress(issue)}
          />
        ))}

        {issues.length === 0 && !dragOver && (
          <View style={styles.emptyColumn}>
            <View style={[styles.emptyColumnIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="tray" size={22} color={theme.colors.onSurfaceVariant} />
            </View>
            <Text style={[styles.emptyColText, { color: theme.colors.onSurfaceVariant }]}>No issues here</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.addIssueBtn, { borderColor: `${accent}28`, backgroundColor: `${accent}08` }]}
          onPress={() => onAddIssue(status)}
        >
          <MaterialCommunityIcons name="plus" size={15} color={accent} />
          <Text style={[styles.addIssueTxt, { color: accent }]}>Add Issue</Text>
        </TouchableOpacity>
      </ScrollView>
    </div>
  );
};

const DraggableIssue = ({ issue, theme, colKey, onPress }) => {
  const [dragging, setDragging] = useState(false);

  const handleDragStart = (e) => {
    e.dataTransfer.setData('issueId', issue.id);
    e.dataTransfer.setData('fromColKey', colKey);
    e.dataTransfer.effectAllowed = 'move';
    setDragging(true);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => setDragging(false)}
      style={{
        cursor: dragging ? 'grabbing' : 'grab',
        opacity: dragging ? 0.45 : 1,
        transition: 'opacity 0.12s, transform 0.12s',
        marginBottom: 10,
        borderRadius: 8,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <BoardIssueCard issue={issue} theme={theme} onPress={onPress} />
    </div>
  );
};

const BoardIssueCard = ({ issue, theme, onPress }) => {
  const overdue = isOverdue(issue.dueDate);
  const typeColor = getIssueTypeColor(issue.type);
  const priorityColor = getPriorityColor(issue.priority);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82}>
      <Surface
        style={[
          styles.issueCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: overdue ? theme.colors.error : theme.colors.outlineVariant,
          },
        ]}
        elevation={0}
      >
        <View style={styles.issueCardTop}>
          <View style={styles.issueKeyWrap}>
            <View style={[styles.issueTypeBubble, { backgroundColor: `${typeColor}14` }]}>
              <MaterialCommunityIcons name={getIssueTypeIcon(issue.type)} size={14} color={typeColor} />
            </View>
            <Text style={[styles.issueKey, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
              {issue.key}
            </Text>
          </View>
          <View style={[styles.priorityMini, { backgroundColor: `${priorityColor}12`, borderColor: `${priorityColor}28` }]}>
            <MaterialCommunityIcons name={getPriorityIcon(issue.priority)} size={12} color={priorityColor} />
            <Text style={[styles.priorityMiniText, { color: priorityColor }]}>
              {PRIORITY_LABELS[issue.priority] || titleCase(issue.priority || 'Medium')}
            </Text>
          </View>
        </View>

        <Text style={[styles.issueCardTitle, { color: theme.colors.onSurface }]} numberOfLines={2}>
          {issue.title}
        </Text>

        {!!issue.description && (
          <Text style={[styles.issueCardDesc, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
            {issue.description}
          </Text>
        )}

        <View style={styles.issueCardMeta}>
          {issue.dueDate ? (
            <View style={styles.issueMetaItem}>
              <MaterialCommunityIcons name="calendar" size={12} color={overdue ? theme.colors.error : theme.colors.onSurfaceVariant} />
              <Text style={[styles.issueMetaText, { color: overdue ? theme.colors.error : theme.colors.onSurfaceVariant }]}>
                {formatRelative(issue.dueDate)}
              </Text>
            </View>
          ) : (
            <View style={styles.issueMetaItem}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={12} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.issueMetaText, { color: theme.colors.onSurfaceVariant }]}>No due date</Text>
            </View>
          )}

          {issue.storyPoints > 0 && (
            <View style={[styles.pointsBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text style={[styles.pointsText, { color: theme.colors.onSurfaceVariant }]}>
                {issue.storyPoints}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.issueCardFooter, { borderTopColor: theme.colors.outlineVariant }]}>
          <View style={styles.assigneeMini}>
            <Avatar user={issue.assignee} size={26} />
            <Text style={[styles.assigneeMiniText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
              {personName(issue.assignee)}
            </Text>
          </View>
          <MaterialCommunityIcons name="drag" size={15} color={theme.colors.onSurfaceVariant} />
        </View>
      </Surface>
    </TouchableOpacity>
  );
};

const BoardScreen = ({ route, navigation }) => {
  const { projectId } = route.params;
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 1180;

  const [sprintMenuOpen, setSprintMenuOpen] = useState(false);
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [filterAssignee, setFilterAssignee] = useState(null);
  const [filterPriority, setFilterPriority] = useState(null);
  const [filterType, setFilterType] = useState(null);
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('moved');

  const { data: projectResp } = useGetProjectQuery(projectId);
  const { data: membersResp } = useGetProjectMembersQuery(projectId);
  const { data: activeSprintResp } = useGetActiveSprintQuery(projectId);
  const { data: sprintsData } = useGetSprintsQuery({ projectId });
  const { data: workflowData } = useGetProjectWorkflowQuery(projectId, { skip: !projectId });

  const project = projectResp?.data || projectResp || {};
  const members = membersResp?.data || [];
  const accent = project.color || NAVY;
  useProjectScrollbar(project.color);
  const activeSprint = activeSprintResp?.data;
  const allSprints = (sprintsData?.data?.data || []).filter((s) => s.status !== 'completed');

  const displaySprint = selectedSprintId
    ? allSprints.find((s) => s.id === selectedSprintId)
    : activeSprint;
  const displaySprintId = displaySprint?.id;

  const issueQuery = displaySprintId
    ? { projectId, sprintId: displaySprintId, limit: 200 }
    : { projectId, limit: 200 };

  const { data: issuesData, isLoading, isFetching, refetch } = useGetIssuesQuery(issueQuery);
  const [updateStatus] = useUpdateIssueStatusMutation();

  const issues = issuesData?.data?.data || [];

  const colKeyToStatusId = useMemo(() => {
    const workflows = workflowData?.data || [];
    const wf = workflows.find((w) => w.isDefault) || workflows[0];
    const statuses = wf?.statuses || [];
    const map = {};
    statuses.forEach((s) => {
      const key = STATUS_NAME_TO_KEY[s.name?.toLowerCase()];
      if (key && !map[key]) map[key] = s.id;
    });
    return map;
  }, [workflowData]);

  const assignees = useMemo(() =>
    [...new Map(issues.filter((i) => i.assignee).map((i) => [i.assignee.id, i.assignee])).values()],
  [issues]);

  const filteredIssues = useMemo(() => issues.filter((i) => {
    const haystack = `${i.title || ''} ${i.key || ''}`.toLowerCase();
    if (filterAssignee && i.assignee?.id !== filterAssignee) return false;
    if (filterPriority && i.priority !== filterPriority) return false;
    if (filterType && i.type !== filterType) return false;
    if (searchText && !haystack.includes(searchText.toLowerCase())) return false;
    return true;
  }), [issues, filterAssignee, filterPriority, filterType, searchText]);

  const activeFilterCount = [filterAssignee, filterPriority, filterType, searchText].filter(Boolean).length;

  const groupedIssues = BOARD_COLUMN_ORDER.reduce((acc, col) => {
    acc[col] = filteredIssues.filter((i) => STATUS_NAME_TO_KEY[i.status?.name?.toLowerCase()] === col);
    return acc;
  }, {});

  const sprintProgress = displaySprint ? getSprintProgress(displaySprint.startDate, displaySprint.endDate) : 0;
  const daysLeft = displaySprint ? getDaysRemaining(displaySprint.endDate) : null;
  const doneCount = filteredIssues.filter((i) => STATUS_NAME_TO_KEY[i.status?.name?.toLowerCase()] === 'done').length;
  const openCount = Math.max(filteredIssues.length - doneCount, 0);
  const highPriorityCount = filteredIssues.filter((i) => ['highest', 'high'].includes(i.priority)).length;
  const donePct = filteredIssues.length > 0 ? clampPercent((doneCount / filteredIssues.length) * 100) : 0;

  const handleIssuePress = useCallback((i) => navigation.navigate('IssueDetail', { issueId: i.id }), [navigation]);
  const handleAddIssue = useCallback((s) => navigation.navigate('CreateIssue', { projectId, defaultStatus: s }), [navigation, projectId]);
  const handleStatusChange = useCallback((msg, isError = false) => {
    setToastType(isError ? 'error' : 'moved');
    setToast(msg);
    refetch();
  }, [refetch]);

  const clearFilters = () => {
    setFilterAssignee(null);
    setFilterPriority(null);
    setFilterType(null);
    setSearchText('');
  };

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={[styles.boardHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]} elevation={0}>
        <View style={[styles.headerTop, isCompact && styles.headerTopCompact]}>
          <View style={styles.headerIdentity}>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProjectDetail', { projectId })}
              style={[styles.backBtn, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
            <View style={[styles.projectAvatar, { backgroundColor: accent }]}>
              <Text style={styles.projectAvatarText}>{projectInitials(project)}</Text>
            </View>
            <View style={styles.titleBlock}>
              <Text style={[styles.headerEyebrow, { color: theme.colors.onSurfaceVariant }]}>Project board</Text>
              <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                {project.name || 'Project'}
              </Text>
              <View style={styles.headerMetaRow}>
                <MetaPill icon="pound" label={project.key || 'KEY'} tone={accent} theme={theme} />
                <MetaPill icon="drag" label="Drag enabled" theme={theme} />
                <MetaPill icon="view-column-outline" label={`${filteredIssues.length} shown`} theme={theme} />
              </View>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Button
              icon="format-list-bulleted"
              mode="outlined"
              compact
              onPress={() => navigation.navigate('Backlog', { projectId })}
              style={[styles.headerButton, { borderColor: theme.colors.outlineVariant }]}
              labelStyle={[styles.outlinedActionLabel, { color: accent }]}
            >
              Backlog
            </Button>
            <Button
              icon="plus"
              mode="contained"
              compact
              onPress={() => navigation.navigate('CreateIssue', { projectId })}
              style={[styles.headerButton, { backgroundColor: accent }]}
              labelStyle={styles.containedActionLabel}
            >
              Create Issue
            </Button>
          </View>
        </View>

        <View style={[styles.headerStats, isCompact && styles.headerStatsWrap]}>
          <MetricTile icon="ticket-outline" value={filteredIssues.length} label="Visible work" tone={colors.info} theme={theme} />
          <MetricTile icon="check-circle-outline" value={`${donePct}%`} label={`${doneCount} done`} tone={colors.success} theme={theme} />
          <MetricTile icon="progress-clock" value={openCount} label="Open issues" tone={colors.warning} theme={theme} />
          <MetricTile icon="alert-circle-outline" value={highPriorityCount} label="High priority" tone={colors.danger} theme={theme} />
          <MetricTile icon="account-group-outline" value={members.length || assignees.length} label="Team" tone="#7C5EA7" theme={theme} />
        </View>
      </Surface>

      <Surface style={[styles.filterPanel, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]} elevation={0}>
        <View style={[styles.searchBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
          <MaterialCommunityIcons name="magnify" size={16} color={theme.colors.onSurfaceVariant} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search board issues..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
            style={[styles.searchInput, { color: theme.colors.onSurface, outlineStyle: 'none' }]}
          />
          {!!searchText && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <MaterialCommunityIcons name="close-circle" size={14} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>

        <Menu
          visible={sprintMenuOpen}
          onDismiss={() => setSprintMenuOpen(false)}
          anchor={
            <Chip
              icon="lightning-bolt-outline"
              compact
              selected={!!displaySprint}
              onPress={() => setSprintMenuOpen(true)}
              style={[styles.filterChip, { backgroundColor: displaySprint ? `${accent}12` : theme.colors.background, borderColor: displaySprint ? `${accent}28` : theme.colors.outlineVariant }]}
              textStyle={{ fontSize: 12, color: displaySprint ? accent : theme.colors.onSurfaceVariant, fontWeight: '700' }}
            >
              {displaySprint ? displaySprint.name : 'All issues'}
            </Chip>
          }
        >
          <Menu.Item title="All project issues" leadingIcon={!displaySprint ? 'check' : 'view-list-outline'} onPress={() => { setSelectedSprintId('all'); setSprintMenuOpen(false); }} />
          <Divider />
          {allSprints.map((s) => (
            <Menu.Item
              key={s.id}
              title={s.name}
              leadingIcon={displaySprint?.id === s.id ? 'check' : 'lightning-bolt-outline'}
              onPress={() => { setSelectedSprintId(s.id === activeSprint?.id ? null : s.id); setSprintMenuOpen(false); }}
            />
          ))}
        </Menu>

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
              style={[styles.filterChip, { backgroundColor: filterAssignee ? `${accent}12` : theme.colors.background, borderColor: filterAssignee ? `${accent}28` : theme.colors.outlineVariant }]}
              textStyle={{ fontSize: 12, color: filterAssignee ? accent : theme.colors.onSurfaceVariant, fontWeight: '700' }}
            >
              {filterAssignee ? (assignees.find((a) => a.id === filterAssignee)?.firstName || 'Assignee') : 'Assignee'}
            </Chip>
          }
        >
          <Menu.Item title="All Assignees" onPress={() => { setFilterAssignee(null); setAssigneeMenuOpen(false); }} />
          <Divider />
          {assignees.map((a) => (
            <Menu.Item
              key={a.id}
              title={personName(a)}
              leadingIcon={filterAssignee === a.id ? 'check' : 'account-outline'}
              onPress={() => { setFilterAssignee(filterAssignee === a.id ? null : a.id); setAssigneeMenuOpen(false); }}
            />
          ))}
          {assignees.length === 0 && <Menu.Item title="No assignees" disabled />}
        </Menu>

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
              style={[styles.filterChip, { backgroundColor: filterPriority ? `${getPriorityColor(filterPriority)}12` : theme.colors.background, borderColor: filterPriority ? `${getPriorityColor(filterPriority)}28` : theme.colors.outlineVariant }]}
              textStyle={{ fontSize: 12, color: filterPriority ? getPriorityColor(filterPriority) : theme.colors.onSurfaceVariant, fontWeight: '700' }}
            >
              {filterPriority ? PRIORITY_LABELS[filterPriority] : 'Priority'}
            </Chip>
          }
        >
          <Menu.Item title="All Priorities" onPress={() => { setFilterPriority(null); setPriorityMenuOpen(false); }} />
          <Divider />
          {PRIORITIES.map((p) => (
            <Menu.Item
              key={p}
              title={PRIORITY_LABELS[p]}
              leadingIcon={filterPriority === p ? 'check' : getPriorityIcon(p)}
              titleStyle={{ color: getPriorityColor(p) }}
              onPress={() => { setFilterPriority(filterPriority === p ? null : p); setPriorityMenuOpen(false); }}
            />
          ))}
        </Menu>

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
              style={[styles.filterChip, { backgroundColor: filterType ? `${getIssueTypeColor(filterType)}12` : theme.colors.background, borderColor: filterType ? `${getIssueTypeColor(filterType)}28` : theme.colors.outlineVariant }]}
              textStyle={{ fontSize: 12, color: filterType ? getIssueTypeColor(filterType) : theme.colors.onSurfaceVariant, fontWeight: '700' }}
            >
              {filterType ? ISSUE_TYPE_LABELS[filterType] : 'Type'}
            </Chip>
          }
        >
          <Menu.Item title="All Types" onPress={() => { setFilterType(null); setTypeMenuOpen(false); }} />
          <Divider />
          {ISSUE_TYPES.map((t) => (
            <Menu.Item
              key={t}
              title={ISSUE_TYPE_LABELS[t]}
              leadingIcon={filterType === t ? 'check' : getIssueTypeIcon(t)}
              onPress={() => { setFilterType(filterType === t ? null : t); setTypeMenuOpen(false); }}
            />
          ))}
        </Menu>

        {activeFilterCount > 0 && (
          <Button compact mode="text" icon="close-circle-outline" onPress={clearFilters} textColor={theme.colors.error}>
            Clear ({activeFilterCount})
          </Button>
        )}

        <View style={{ flex: 1 }} />
        {isFetching && <ActivityIndicator size="small" color={theme.colors.primary} />}
      </Surface>

      {displaySprint ? (
        <Surface style={[styles.sprintStrip, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]} elevation={0}>
          <View style={styles.sprintStripLeft}>
            <View style={[styles.sprintIcon, { backgroundColor: `${accent}12` }]}>
              <MaterialCommunityIcons name="lightning-bolt" size={16} color={accent} />
            </View>
            <View>
              <Text style={[styles.sprintStripTitle, { color: theme.colors.onSurface }]}>{displaySprint.name}</Text>
              <Text style={[styles.sprintStripSub, { color: theme.colors.onSurfaceVariant }]}>
                {displaySprint.startDate ? formatDate(displaySprint.startDate) : 'No start date'}
                {displaySprint.endDate ? ` to ${formatDate(displaySprint.endDate)}` : ''}
                {daysLeft !== null ? ` - ${daysLeft >= 0 ? `${daysLeft}d left` : 'Overdue'}` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.sprintStripRight}>
            <Text style={[styles.sprintDoneText, { color: theme.colors.onSurfaceVariant }]}>{doneCount}/{filteredIssues.length} done</Text>
            <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View style={[styles.progressFill, { width: `${sprintProgress}%`, backgroundColor: accent }]} />
            </View>
            <Text style={[styles.sprintPct, { color: accent }]}>{Math.round(sprintProgress)}%</Text>
          </View>
        </Surface>
      ) : (
        <Surface style={[styles.sprintStrip, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]} elevation={0}>
          <View style={styles.sprintStripLeft}>
            <View style={[styles.sprintIcon, { backgroundColor: colors.warningLight }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.warning} />
            </View>
            <View>
              <Text style={[styles.sprintStripTitle, { color: theme.colors.onSurface }]}>No active sprint</Text>
              <Text style={[styles.sprintStripSub, { color: theme.colors.onSurfaceVariant }]}>Showing project issues across all sprint states</Text>
            </View>
          </View>
          <Button
            compact
            mode="outlined"
            onPress={() => navigation.navigate('Backlog', { projectId })}
            style={[styles.headerButton, { borderColor: theme.colors.outlineVariant }]}
            labelStyle={[styles.outlinedActionLabel, { color: accent }]}
          >
            Go to Backlog
          </Button>
        </Surface>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        style={styles.boardScroll}
        contentContainerStyle={styles.boardContent}
      >
        {BOARD_COLUMN_ORDER.map((colKey) => (
          <BoardColumn
            key={colKey}
            title={STATUS_LABELS[colKey] || colKey}
            status={colKey}
            colKey={colKey}
            issues={groupedIssues[colKey] || []}
            theme={theme}
            accent={accent}
            onIssuePress={handleIssuePress}
            onAddIssue={handleAddIssue}
            colKeyToStatusId={colKeyToStatusId}
            updateStatus={updateStatus}
            onStatusChanged={handleStatusChange}
          />
        ))}
      </ScrollView>

      {!!toast && <AppToast message={toast} type={toastType} onDone={() => setToast('')} />}
    </View>
  );
};

const MetricTile = ({ icon, value, label, tone, theme }) => (
  <View style={[styles.metricTile, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
    <View style={[styles.metricIcon, { backgroundColor: `${tone}14` }]}>
      <MaterialCommunityIcons name={icon} size={16} color={tone} />
    </View>
    <View style={styles.metricText}>
      <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{label}</Text>
    </View>
  </View>
);

const MetaPill = ({ icon, label, tone, theme }) => (
  <View style={[
    styles.metaPill,
    {
      backgroundColor: tone ? `${tone}12` : theme.colors.surfaceVariant,
      borderColor: tone ? `${tone}28` : theme.colors.outlineVariant,
    },
  ]}>
    <MaterialCommunityIcons name={icon} size={12} color={tone || theme.colors.onSurfaceVariant} />
    <Text style={[styles.metaPillText, { color: tone || theme.colors.onSurfaceVariant }]} numberOfLines={1}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'column' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  boardHeader: {
    borderBottomWidth: 1,
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
  },
  headerTopCompact: {
    flexDirection: 'column',
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectAvatar: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectAvatarText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 23,
    fontWeight: '900',
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 180,
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    flexWrap: 'wrap',
  },
  headerButton: {
    borderRadius: 8,
    borderWidth: 1,
  },
  outlinedActionLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  containedActionLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  headerStats: {
    flexDirection: 'row',
    gap: 12,
  },
  headerStatsWrap: {
    flexWrap: 'wrap',
  },
  metricTile: {
    flex: 1,
    minWidth: 150,
    borderWidth: 1,
    borderRadius: 8,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricText: {
    flex: 1,
    minWidth: 0,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '900',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1,
  },

  filterPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
    flexWrap: 'wrap',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    gap: 7,
    minWidth: 240,
    maxWidth: 320,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  filterChip: {
    height: 36,
    borderWidth: 1,
  },

  sprintStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 16,
  },
  sprintStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    flex: 1,
  },
  sprintIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sprintStripTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  sprintStripSub: {
    fontSize: 12,
    marginTop: 2,
  },
  sprintStripRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flexShrink: 0,
  },
  sprintDoneText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    width: 140,
    height: 7,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  sprintPct: {
    fontSize: 12,
    fontWeight: '900',
    width: 34,
  },

  boardScroll: { flex: 1 },
  boardContent: {
    padding: 20,
    gap: 16,
    alignItems: 'flex-start',
  },

  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  columnIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  columnDot: { width: 9, height: 9, borderRadius: 5 },
  columnTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  columnTitle: { fontWeight: '900', fontSize: 13 },
  columnSubtitle: { fontSize: 11, marginTop: 1, fontWeight: '600' },
  countBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    minWidth: 26,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  columnContent: { padding: 12, paddingBottom: 14 },

  dropOverlay: {
    position: 'absolute',
    top: 55,
    left: 10,
    right: 10,
    paddingVertical: 9,
    zIndex: 10,
    borderWidth: 1,
    borderRadius: 8,
    pointerEvents: 'none',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dropOverlayText: { fontSize: 12, fontWeight: '900' },

  emptyColumn: {
    minHeight: 130,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  emptyColumnIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyColText: { fontSize: 13, fontWeight: '700' },

  addIssueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 11,
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addIssueTxt: { fontSize: 12, fontWeight: '800' },

  issueCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    boxShadow: '0 4px 12px rgba(20,33,61,0.07)',
  },
  issueCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  issueKeyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
    flex: 1,
  },
  issueTypeBubble: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  issueKey: {
    fontSize: 11,
    fontWeight: '900',
  },
  priorityMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexShrink: 0,
  },
  priorityMiniText: {
    fontSize: 10,
    fontWeight: '900',
  },
  issueCardTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  issueCardDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  issueCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  issueMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
    flex: 1,
  },
  issueMetaText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pointsBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 7,
  },
  pointsText: {
    fontSize: 11,
    fontWeight: '900',
  },
  issueCardFooter: {
    borderTopWidth: 1,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  assigneeMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    minWidth: 0,
  },
  assigneeMiniText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
});

export default BoardScreen;
