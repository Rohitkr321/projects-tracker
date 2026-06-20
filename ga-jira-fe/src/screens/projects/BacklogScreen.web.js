import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Text, useTheme, Button, Surface, Portal, Dialog, ActivityIndicator, Divider, Menu } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetIssuesQuery, useCreateIssueMutation, useBulkUpdateIssuesMutation, useMoveIssuesToSprintMutation } from '../../api/issueApi';
import { useGetSprintsQuery, useStartSprintMutation } from '../../api/sprintApi';
import { useGetProjectQuery, useGetProjectWorkflowQuery } from '../../api/projectApi';
import Avatar from '../../components/common/Avatar';
import LoadingScreen from '../../components/common/LoadingScreen';
import { ISSUE_TYPE_LABELS, PRIORITY_LABELS } from '../../constants';
import {
  getIssueTypeColor,
  getIssueTypeIcon,
  getPriorityColor,
  getPriorityIcon,
} from '../../utils/helpers';
import { formatDate } from '../../utils/dateUtils';
import colors from '../../theme/colors';
import AppToast from '../../components/common/AppToast';

const NAVY = colors.brand.navy;

const PRIORITY_COLORS = {
  highest: colors.priority.highest,
  high: colors.priority.high,
  medium: colors.priority.medium,
  low: colors.priority.low,
  lowest: colors.priority.lowest,
};

const TYPE_VALUES = Object.keys(ISSUE_TYPE_LABELS);
const PRIORITY_VALUES = Object.keys(PRIORITY_LABELS);

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

const BacklogScreen = ({ route, navigation }) => {
  const { projectId } = route.params;
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 1180;

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState(null);
  const [filterPriority, setFilterPriority] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [startSprintTarget, setStartSprintTarget] = useState(null);
  const [snack, setSnack] = useState('');
  const [snackType, setSnackType] = useState('success');
  const [inlineOpen, setInlineOpen] = useState(false);
  const [inlineTitle, setInlineTitle] = useState('');
  const [inlineType, setInlineType] = useState('task');
  const titleRef = useRef(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkPriorityOpen, setBulkPriorityOpen] = useState(false);
  const [bulkSprintOpen, setBulkSprintOpen] = useState(false);

  const issueParams = { projectId, limit: 500 };
  if (search) issueParams.search = search;
  if (filterType) issueParams.type = filterType;
  if (filterPriority) issueParams.priority = filterPriority;

  const { data: projectResp } = useGetProjectQuery(projectId);
  const { data: issuesData, isLoading, isFetching, refetch } = useGetIssuesQuery(issueParams);
  const { data: sprintsData, refetch: refetchSprints } = useGetSprintsQuery({ projectId });
  const { data: workflowData } = useGetProjectWorkflowQuery(projectId, { skip: !projectId });
  const [createIssue, { isLoading: creating }] = useCreateIssueMutation();
  const [startSprint, { isLoading: startingSprint }] = useStartSprintMutation();
  const [bulkUpdate] = useBulkUpdateIssuesMutation();
  const [moveToSprint] = useMoveIssuesToSprintMutation();

  const project = projectResp?.data || projectResp || {};
  const accent = project.color || NAVY;
  const allIssues = issuesData?.data?.data || [];
  const sprints = (sprintsData?.data?.data || [])
    .filter((s) => s.status !== 'completed')
    .sort((a, b) => (a.status === 'active' ? -1 : b.status === 'active' ? 1 : 0));

  const { issuesBySprint, backlogIssues } = useMemo(() => {
    const bySprint = {};
    const backlog = [];
    allIssues.forEach((issue) => {
      if (issue.sprintId) {
        if (!bySprint[issue.sprintId]) bySprint[issue.sprintId] = [];
        bySprint[issue.sprintId].push(issue);
      } else {
        backlog.push(issue);
      }
    });
    return { issuesBySprint: bySprint, backlogIssues: backlog };
  }, [allIssues]);

  const workflows = workflowData?.data || [];
  const defaultWF = workflows.find((w) => w.isDefault) || workflows[0];
  const firstStatus = [...(defaultWF?.statuses || [])].sort((a, b) => a.order - b.order)[0];
  const activeSprintCount = sprints.filter((s) => s.status === 'active').length;
  const plannedSprintCount = sprints.filter((s) => s.status !== 'active').length;
  const highPriorityCount = allIssues.filter((issue) => ['highest', 'high'].includes(issue.priority)).length;
  const activeFilterCount = [search, filterType, filterPriority].filter(Boolean).length;

  const handleQuickCreate = async () => {
    if (!inlineTitle.trim()) return;
    try {
      await createIssue({
        projectId,
        body: {
          title: inlineTitle.trim(),
          type: inlineType,
          priority: 'medium',
          projectId,
          workflowStatusId: firstStatus?.id,
        },
      }).unwrap();
      setInlineTitle('');
      setInlineType('task');
      setInlineOpen(false);
      refetch();
      setSnackType('success');
      setSnack('Issue created in backlog');
    } catch (err) {
      setSnackType('error');
      setSnack(err?.data?.message || 'Failed to create issue');
    }
  };

  const handleStartSprint = async () => {
    if (!startSprintTarget) return;
    try {
      await startSprint({ id: startSprintTarget.id }).unwrap();
      setStartSprintTarget(null);
      setSnackType('success');
      setSnack(`${startSprintTarget.name} started`);
      refetchSprints();
      refetch();
    } catch (err) {
      setSnackType('error');
      setSnack(err?.data?.message || 'Failed to start sprint');
    }
  };

  const toggleCollapse = (id) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  const clearFilters = () => {
    setSearch('');
    setFilterType(null);
    setFilterPriority(null);
  };

  const toggleSelect = (id) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSelection = () => setSelected(new Set());

  const handleBulkPriority = async (priority) => {
    try {
      await bulkUpdate({ issueIds: [...selected], priority }).unwrap();
      setSnackType('success'); setSnack(`Priority updated for ${selected.size} issue${selected.size !== 1 ? 's' : ''}`);
      clearSelection(); refetch();
    } catch { setSnackType('error'); setSnack('Failed to update priority'); }
    setBulkPriorityOpen(false);
  };

  const handleBulkMoveToSprint = async (sprintId) => {
    try {
      await moveToSprint({ issueIds: [...selected], sprintId }).unwrap();
      setSnackType('success');
      setSnack(sprintId ? `${selected.size} issue${selected.size !== 1 ? 's' : ''} moved to sprint` : `${selected.size} issue${selected.size !== 1 ? 's' : ''} moved to backlog`);
      clearSelection(); refetch(); refetchSprints();
    } catch { setSnackType('error'); setSnack('Failed to move issues'); }
    setBulkSprintOpen(false);
  };

  if (isLoading) return <LoadingScreen />;

  const renderIssueRow = (issue) => (
    <IssueListRow
      key={issue.id}
      issue={issue}
      theme={theme}
      selected={selected.has(issue.id)}
      onToggle={() => toggleSelect(issue.id)}
      onPress={() => navigation.navigate('IssueDetail', { issueId: issue.id })}
    />
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Surface style={[styles.backlogHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]} elevation={0}>
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
              <Text style={[styles.headerEyebrow, { color: theme.colors.onSurfaceVariant }]}>Project backlog</Text>
              <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                {project.name || 'Project'}
              </Text>
              <View style={styles.headerMetaRow}>
                <MetaPill icon="pound" label={project.key || 'KEY'} tone={accent} theme={theme} />
                <MetaPill icon="tray-full" label={`${backlogIssues.length} backlog`} theme={theme} />
                <MetaPill icon="lightning-bolt-outline" label={`${sprints.length} sprints`} theme={theme} />
              </View>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Button
              icon="view-column-outline"
              mode="outlined"
              compact
              onPress={() => navigation.navigate('Board', { projectId })}
              style={[styles.headerButton, { borderColor: theme.colors.outlineVariant }]}
              labelStyle={[styles.outlinedActionLabel, { color: accent }]}
            >
              Board
            </Button>
            <Button
              icon="chart-gantt"
              mode="outlined"
              compact
              onPress={() => navigation.navigate('Timeline', { projectId })}
              style={[styles.headerButton, { borderColor: theme.colors.outlineVariant }]}
              labelStyle={[styles.outlinedActionLabel, { color: accent }]}
            >
              Timeline
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
          <MetricTile icon="ticket-outline" value={allIssues.length} label="Visible issues" tone={colors.info} theme={theme} />
          <MetricTile icon="tray-full" value={backlogIssues.length} label="Backlog queue" tone="#7C5EA7" theme={theme} />
          <MetricTile icon="lightning-bolt" value={activeSprintCount} label="Active sprint" tone={colors.warning} theme={theme} />
          <MetricTile icon="calendar-clock" value={plannedSprintCount} label="Planned sprints" tone={colors.success} theme={theme} />
          <MetricTile icon="alert-circle-outline" value={highPriorityCount} label="High priority" tone={colors.danger} theme={theme} />
        </View>
      </Surface>

      <Surface style={[styles.filterPanel, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]} elevation={0}>
        <View style={[styles.searchWrap, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
          <MaterialCommunityIcons name="magnify" size={15} color={theme.colors.onSurfaceVariant} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search backlog issues..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: 13,
              color: theme.colors.onSurface,
              fontFamily: 'inherit',
            }}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={13} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterGroup}>
          {TYPE_VALUES.map((value) => (
            <FilterPill
              key={value}
              label={ISSUE_TYPE_LABELS[value]}
              active={filterType === value}
              color={getIssueTypeColor(value)}
              icon={getIssueTypeIcon(value)}
              theme={theme}
              onPress={() => setFilterType(filterType === value ? null : value)}
            />
          ))}
        </View>

        <View style={styles.filterDivider} />

        <View style={styles.filterGroup}>
          {PRIORITY_VALUES.map((value) => (
            <FilterPill
              key={value}
              label={PRIORITY_LABELS[value]}
              active={filterPriority === value}
              color={PRIORITY_COLORS[value] || getPriorityColor(value)}
              icon={getPriorityIcon(value)}
              theme={theme}
              onPress={() => setFilterPriority(filterPriority === value ? null : value)}
            />
          ))}
        </View>

        {activeFilterCount > 0 && (
          <Button compact mode="text" icon="close-circle-outline" textColor={theme.colors.error} onPress={clearFilters}>
            Clear ({activeFilterCount})
          </Button>
        )}

        <View style={{ flex: 1 }} />
        {isFetching && <ActivityIndicator size="small" color={theme.colors.primary} />}
      </Surface>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
        {sprints.map((sprint) => {
          const sprintIssues = issuesBySprint[sprint.id] || [];
          const isCollapsed = collapsed[sprint.id];
          const isActive = sprint.status === 'active';
          const doneCount = sprintIssues.filter((issue) => issue.status?.category === 'done').length;
          const totalCount = sprintIssues.length;
          const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

          return (
            <Surface key={sprint.id} style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={0}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleCollapse(sprint.id)} activeOpacity={0.85}>
                <View style={[styles.sectionIcon, { backgroundColor: isActive ? `${accent}12` : theme.colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name={isActive ? 'lightning-bolt' : 'lightning-bolt-outline'} size={17} color={isActive ? accent : theme.colors.onSurfaceVariant} />
                </View>
                <View style={styles.sectionTitleBlock}>
                  <View style={styles.sectionTitleRow}>
                    <MaterialCommunityIcons name={isCollapsed ? 'chevron-right' : 'chevron-down'} size={17} color={theme.colors.onSurfaceVariant} />
                    <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>{sprint.name}</Text>
                    <StatusPill active={isActive} theme={theme} accent={accent} />
                  </View>
                  <Text style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                    {sprint.startDate ? formatDate(sprint.startDate) : 'No start date'}
                    {sprint.endDate ? ` to ${formatDate(sprint.endDate)}` : ''}
                    {` - ${totalCount} issue${totalCount !== 1 ? 's' : ''}`}
                  </Text>
                </View>

                <View style={styles.sectionProgressWrap}>
                  <Text style={[styles.progressText, { color: theme.colors.onSurfaceVariant }]}>{doneCount}/{totalCount} done</Text>
                  <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: isActive ? accent : colors.success }]} />
                  </View>
                </View>

                {isActive ? (
                  <Button
                    compact
                    mode="contained"
                    onPress={() => navigation.navigate('Board', { projectId })}
                    style={[styles.sectionButton, { backgroundColor: accent }]}
                    labelStyle={styles.containedActionLabel}
                  >
                    View Board
                  </Button>
                ) : (
                  <Button
                    compact
                    mode="outlined"
                    onPress={() => setStartSprintTarget(sprint)}
                    style={[styles.sectionButton, { borderColor: theme.colors.outlineVariant }]}
                    labelStyle={[styles.outlinedActionLabel, { color: accent }]}
                  >
                    Start Sprint
                  </Button>
                )}
              </TouchableOpacity>

              {!isCollapsed && (
                <View style={[styles.sectionBody, { borderTopColor: theme.colors.outlineVariant }]}>
                  <IssueListHeader theme={theme} />
                  {sprintIssues.length === 0 ? (
                    <EmptySection icon="tray" text="No issues in this sprint" theme={theme} />
                  ) : (
                    sprintIssues.map(renderIssueRow)
                  )}
                </View>
              )}
            </Surface>
          );
        })}

        <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={0}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${accent}12` }]}>
              <MaterialCommunityIcons name="tray-full" size={17} color={accent} />
            </View>
            <View style={styles.sectionTitleBlock}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Backlog queue</Text>
                <View style={[styles.countPill, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <Text style={[styles.countPillText, { color: theme.colors.onSurfaceVariant }]}>{backlogIssues.length}</Text>
                </View>
              </View>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                Issues not assigned to a sprint
              </Text>
            </View>
          </View>

          <View style={[styles.sectionBody, { borderTopColor: theme.colors.outlineVariant }]}>
            <IssueListHeader theme={theme} />
            {backlogIssues.length === 0 && !inlineOpen ? (
              <EmptySection icon="inbox-arrow-down-outline" text="Backlog is empty" theme={theme} />
            ) : (
              backlogIssues.map(renderIssueRow)
            )}

            {!inlineOpen ? (
              <TouchableOpacity
                style={[styles.addRow, { backgroundColor: `${accent}08`, borderTopColor: theme.colors.outlineVariant }]}
                onPress={() => { setInlineOpen(true); setTimeout(() => titleRef.current?.focus(), 60); }}
              >
                <View style={[styles.addIcon, { backgroundColor: `${accent}14` }]}>
                  <MaterialCommunityIcons name="plus" size={14} color={accent} />
                </View>
                <Text style={[styles.addLabel, { color: accent }]}>Create issue in backlog</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.inlineForm, { borderTopColor: `${accent}28`, backgroundColor: theme.colors.background }]}>
                <View style={styles.inlineTypeRow}>
                  {TYPE_VALUES.map((value) => (
                    <FilterPill
                      key={value}
                      label={ISSUE_TYPE_LABELS[value]}
                      active={inlineType === value}
                      color={getIssueTypeColor(value)}
                      icon={getIssueTypeIcon(value)}
                      theme={theme}
                      onPress={() => setInlineType(value)}
                    />
                  ))}
                </View>

                <input
                  ref={titleRef}
                  value={inlineTitle}
                  onChange={(e) => setInlineTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inlineTitle.trim()) handleQuickCreate();
                    if (e.key === 'Escape') {
                      setInlineOpen(false);
                      setInlineTitle('');
                    }
                  }}
                  placeholder="Issue title - Enter to save, Esc to cancel"
                  style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    color: theme.colors.onSurface,
                    backgroundColor: 'transparent',
                    padding: '6px 0',
                    boxSizing: 'border-box',
                  }}
                />

                <View style={styles.inlineActions}>
                  <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>Goes to Backlog - no sprint</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button compact mode="text" onPress={() => { setInlineOpen(false); setInlineTitle(''); }}>Cancel</Button>
                    <Button
                      compact
                      mode="contained"
                      onPress={handleQuickCreate}
                      loading={creating}
                      disabled={!inlineTitle.trim() || creating}
                      style={[styles.headerButton, { backgroundColor: accent }]}
                      labelStyle={styles.containedActionLabel}
                    >
                      Save
                    </Button>
                  </View>
                </View>
              </View>
            )}
          </View>
        </Surface>
      </ScrollView>

      {selected.size > 0 && (
        <View style={[styles.bulkBar, { backgroundColor: NAVY }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.bulkCountBadge}>
              <Text style={styles.bulkCountText}>{selected.size}</Text>
            </View>
            <Text style={styles.bulkBarLabel}>{selected.size} issue{selected.size !== 1 ? 's' : ''} selected</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Menu
              visible={bulkSprintOpen}
              onDismiss={() => setBulkSprintOpen(false)}
              anchor={
                <Button compact mode="outlined" icon="lightning-bolt-outline"
                  onPress={() => setBulkSprintOpen(true)}
                  style={{ borderColor: 'rgba(255,255,255,0.35)', borderRadius: 8 }} textColor="#fff">
                  Move to Sprint
                </Button>
              }
            >
              <Menu.Item title="Backlog (remove from sprint)" leadingIcon="tray-full"
                onPress={() => handleBulkMoveToSprint(null)} />
              <Divider />
              {sprints.map(s => (
                <Menu.Item key={s.id} title={s.name}
                  leadingIcon={s.status === 'active' ? 'lightning-bolt' : 'lightning-bolt-outline'}
                  onPress={() => handleBulkMoveToSprint(s.id)} />
              ))}
            </Menu>
            <Menu
              visible={bulkPriorityOpen}
              onDismiss={() => setBulkPriorityOpen(false)}
              anchor={
                <Button compact mode="outlined" icon="flag-outline"
                  onPress={() => setBulkPriorityOpen(true)}
                  style={{ borderColor: 'rgba(255,255,255,0.35)', borderRadius: 8 }} textColor="#fff">
                  Set Priority
                </Button>
              }
            >
              {PRIORITY_VALUES.map(p => (
                <Menu.Item key={p} title={PRIORITY_LABELS[p]}
                  leadingIcon={getPriorityIcon(p)}
                  onPress={() => handleBulkPriority(p)} />
              ))}
            </Menu>
            <TouchableOpacity onPress={clearSelection} style={styles.bulkClearBtn}>
              <MaterialCommunityIcons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Portal>
        <Dialog
          visible={!!startSprintTarget}
          onDismiss={() => setStartSprintTarget(null)}
          style={styles.dialog}
        >
          <Dialog.Title style={{ fontWeight: '900' }}>Start Sprint</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Start "{startSprintTarget?.name}"? This will make it the active sprint.
            </Text>
            <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
              Only one sprint can be active at a time.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setStartSprintTarget(null)}>Cancel</Button>
            <Button mode="contained" onPress={handleStartSprint} loading={startingSprint}>Start Sprint</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {!!snack && <AppToast message={snack} type={snackType} onDone={() => setSnack('')} />}
    </View>
  );
};

const IssueListRow = ({ issue, theme, selected, onToggle, onPress }) => {
  const typeColor = getIssueTypeColor(issue.type);
  const priorityColor = getPriorityColor(issue.priority);
  const statusColor = issue.status?.color || theme.colors.onSurfaceVariant;

  return (
    <View style={[styles.issueRow, { borderBottomColor: theme.colors.outlineVariant }, selected && { backgroundColor: theme.colors.primaryContainer }]}>
      <TouchableOpacity onPress={onToggle} style={styles.checkboxWrap} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <View style={[styles.checkbox, { borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant, backgroundColor: selected ? theme.colors.primary : 'transparent' }]}>
          {selected && <MaterialCommunityIcons name="check" size={11} color="#fff" />}
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }} onPress={onPress} activeOpacity={0.82}>
        <View style={[styles.issueTypeIcon, { backgroundColor: `${typeColor}14` }]}>
          <MaterialCommunityIcons name={getIssueTypeIcon(issue.type)} size={15} color={typeColor} />
        </View>

        <View style={styles.issueTitleCell}>
          <View style={styles.issueTitleLine}>
            <Text style={[styles.issueKey, { color: theme.colors.onSurfaceVariant }]}>{issue.key}</Text>
            <Text style={[styles.issueTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>{issue.title}</Text>
          </View>
          <View style={styles.issueMetaLine}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.issueMetaText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
              {issue.status?.name || 'Unknown'}
            </Text>
          </View>
        </View>

        <View style={styles.assigneeCell}>
          <Avatar user={issue.assignee} size={28} />
          <Text style={[styles.assigneeText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
            {personName(issue.assignee)}
          </Text>
        </View>

        <View style={styles.priorityCell}>
          <MaterialCommunityIcons name={getPriorityIcon(issue.priority)} size={13} color={priorityColor} />
          <Text style={[styles.priorityText, { color: priorityColor }]}>{PRIORITY_LABELS[issue.priority] || titleCase(issue.priority || 'Medium')}</Text>
        </View>

        <Text style={[styles.typeText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
          {ISSUE_TYPE_LABELS[issue.type] || titleCase(issue.type || 'Task')}
        </Text>

        <View style={styles.pointsCell}>
          {issue.storyPoints != null ? (
            <View style={[styles.pointsBadge, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
              <Text style={[styles.pointsText, { color: theme.colors.onSurface }]}>{issue.storyPoints}</Text>
            </View>
          ) : (
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>-</Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const IssueListHeader = ({ theme }) => (
  <View style={[styles.listHeader, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.outlineVariant }]}>
    <View style={{ width: 36 }} />
    <View style={{ width: 34 }} />
    <Text style={[styles.listHeaderText, { flex: 4, color: theme.colors.onSurfaceVariant }]}>Issue</Text>
    <Text style={[styles.listHeaderText, { flex: 1.6, color: theme.colors.onSurfaceVariant }]}>Assignee</Text>
    <Text style={[styles.listHeaderText, { flex: 1.1, color: theme.colors.onSurfaceVariant }]}>Priority</Text>
    <Text style={[styles.listHeaderText, { flex: 0.9, color: theme.colors.onSurfaceVariant }]}>Type</Text>
    <Text style={[styles.listHeaderText, { flex: 0.5, color: theme.colors.onSurfaceVariant, textAlign: 'center' }]}>Pts</Text>
  </View>
);

const EmptySection = ({ icon, text, theme }) => (
  <View style={styles.emptySection}>
    <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.surfaceVariant }]}>
      <MaterialCommunityIcons name={icon} size={24} color={theme.colors.onSurfaceVariant} />
    </View>
    <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>{text}</Text>
  </View>
);

const StatusPill = ({ active, theme, accent }) => (
  <View style={[
    styles.statusPill,
    {
      backgroundColor: active ? `${accent}12` : theme.colors.surfaceVariant,
      borderColor: active ? `${accent}28` : theme.colors.outlineVariant,
    },
  ]}>
    <View style={[styles.statusPillDot, { backgroundColor: active ? accent : theme.colors.onSurfaceVariant }]} />
    <Text style={[styles.statusPillText, { color: active ? accent : theme.colors.onSurfaceVariant }]}>
      {active ? 'Active' : 'Planned'}
    </Text>
  </View>
);

const FilterPill = ({ label, active, color, icon, theme, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.filterPill,
      {
        backgroundColor: active ? `${color}12` : theme.colors.background,
        borderColor: active ? `${color}32` : theme.colors.outlineVariant,
      },
    ]}
  >
    {!!icon && <MaterialCommunityIcons name={icon} size={13} color={active ? color : theme.colors.onSurfaceVariant} />}
    <Text style={[styles.filterPillText, { color: active ? color : theme.colors.onSurfaceVariant }]}>{label}</Text>
  </TouchableOpacity>
);

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
  root: { flex: 1 },

  backlogHeader: {
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    minWidth: 260,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
  },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.borderVariant,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '800',
  },

  scroll: { flex: 1 },
  scrollContent: {
    padding: 28,
    gap: 16,
    paddingBottom: 80,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 8px 20px rgba(20,33,61,0.06)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  sectionTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    minWidth: 0,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  sectionProgressWrap: {
    width: 180,
    gap: 6,
    flexShrink: 0,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
  },
  progressTrack: {
    height: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  sectionButton: {
    borderRadius: 8,
    minWidth: 106,
  },
  sectionBody: {
    borderTopWidth: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
  },
  countPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '900',
  },

  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  listHeaderText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  checkboxWrap: {
    width: 36,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    cursor: 'pointer',
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  issueTypeIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  issueTitleCell: {
    flex: 4,
    minWidth: 0,
    gap: 4,
  },
  issueTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  issueKey: {
    fontSize: 11,
    fontWeight: '900',
    flexShrink: 0,
  },
  issueTitle: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
    minWidth: 0,
  },
  issueMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  issueMetaText: {
    fontSize: 11,
    fontWeight: '700',
  },
  assigneeCell: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  assigneeText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  priorityCell: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '800',
  },
  typeText: {
    flex: 0.9,
    fontSize: 12,
    fontWeight: '700',
  },
  pointsCell: {
    flex: 0.5,
    alignItems: 'center',
  },
  pointsBadge: {
    minWidth: 30,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsText: {
    fontSize: 11,
    fontWeight: '900',
  },
  emptySection: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
  },
  emptyIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '700',
  },

  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    cursor: 'pointer',
  },
  addIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addLabel: {
    fontSize: 13,
    fontWeight: '900',
  },
  inlineForm: {
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 10,
  },
  inlineTypeRow: {
    flexDirection: 'row',
    gap: 7,
    flexWrap: 'wrap',
  },
  inlineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bulkBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 12,
    zIndex: 100,
    flexWrap: 'wrap',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.18)',
  },
  bulkCountBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulkCountText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  bulkBarLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },
  bulkClearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },
  dialog: {
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
    borderRadius: 8,
  },
});

export default BacklogScreen;
