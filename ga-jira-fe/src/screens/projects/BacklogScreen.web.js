import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Text, useTheme, Button, Chip, Surface, Portal, Dialog } from 'react-native-paper';

const Toast = ({ message, onDone }) => {
  const [opacity] = useState(new Animated.Value(0));
  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2600),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onDone?.());
  }, []);
  return (
    <Animated.View style={[toastStyle, { opacity }]}>
      <Text style={{ color: '#fff', fontSize: 14 }}>{message}</Text>
    </Animated.View>
  );
};
const toastStyle = {
  position: 'absolute', top: 20, right: 24,
  backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 12,
  borderRadius: 10, zIndex: 9999,
  shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
};
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetIssuesQuery, useCreateIssueMutation } from '../../api/issueApi';
import { useGetSprintsQuery, useStartSprintMutation } from '../../api/sprintApi';
import { useGetProjectWorkflowQuery } from '../../api/projectApi';
import LoadingScreen from '../../components/common/LoadingScreen';
import { ISSUE_TYPE_LABELS, PRIORITY_LABELS } from '../../constants';

const PRIORITY_COLORS = {
  highest: '#DE350B', high: '#FF8B00', medium: '#0052CC', low: '#00875A', lowest: '#8993A4',
};
const PRIORITY_ICONS = {
  highest: 'arrow-up-bold', high: 'arrow-up', medium: 'minus', low: 'arrow-down', lowest: 'arrow-down-bold',
};
const TYPE_ICONS = {
  bug:     { icon: 'bug',                  color: '#DE350B' },
  task:    { icon: 'check-circle-outline', color: '#0052CC' },
  story:   { icon: 'bookmark',             color: '#00875A' },
  epic:    { icon: 'lightning-bolt',        color: '#6554C0' },
  subtask: { icon: 'minus-circle-outline', color: '#4C9AFF' },
};

const BacklogScreen = ({ route, navigation }) => {
  const { projectId } = route.params;
  const theme = useTheme();
  const [search, setSearch]               = useState('');
  const [filterType, setFilterType]       = useState(null);
  const [filterPriority, setFilterPriority] = useState(null);
  const [collapsed, setCollapsed]         = useState({});
  const [startSprintTarget, setStartSprintTarget] = useState(null);
  const [snack, setSnack]                 = useState('');
  const [inlineOpen, setInlineOpen]       = useState(false);
  const [inlineTitle, setInlineTitle]     = useState('');
  const [inlineType, setInlineType]       = useState('task');
  const titleRef = useRef(null);

  // ── Query: strip null/undefined values so URLSearchParams doesn't serialize them as "null" ──
  const issueParams = { projectId, limit: 500 };
  if (search)        issueParams.search   = search;
  if (filterType)    issueParams.type     = filterType;
  if (filterPriority) issueParams.priority = filterPriority;

  const { data: issuesData, isLoading, refetch } = useGetIssuesQuery(issueParams);
  const { data: sprintsData, refetch: refetchSprints } = useGetSprintsQuery({ projectId });
  const { data: workflowData } = useGetProjectWorkflowQuery(projectId, { skip: !projectId });
  const [createIssue,  { isLoading: creating }]       = useCreateIssueMutation();
  const [startSprint,  { isLoading: startingSprint }] = useStartSprintMutation();

  const allIssues = issuesData?.data?.data || [];
  const sprints   = (sprintsData?.data?.data || [])
    .filter(s => s.status !== 'completed')
    .sort((a, b) => (a.status === 'active' ? -1 : b.status === 'active' ? 1 : 0));

  // Group issues by sprint; unassigned → backlog
  const issuesBySprint = {};
  const backlogIssues  = [];
  allIssues.forEach(issue => {
    if (issue.sprintId) {
      if (!issuesBySprint[issue.sprintId]) issuesBySprint[issue.sprintId] = [];
      issuesBySprint[issue.sprintId].push(issue);
    } else {
      backlogIssues.push(issue);
    }
  });

  const workflows   = workflowData?.data || [];
  const defaultWF   = workflows.find(w => w.isDefault) || workflows[0];
  const firstStatus = [...(defaultWF?.statuses || [])].sort((a, b) => a.order - b.order)[0];

  const handleQuickCreate = async () => {
    if (!inlineTitle.trim()) return;
    try {
      await createIssue({
        title:            inlineTitle.trim(),
        type:             inlineType,
        priority:         'medium',
        projectId,
        workflowStatusId: firstStatus?.id,
      }).unwrap();
      setInlineTitle('');
      setInlineType('task');
      setInlineOpen(false);
      refetch();
      setSnack('Issue created in backlog');
    } catch (err) {
      setSnack(err?.data?.message || 'Failed to create issue');
    }
  };

  const handleStartSprint = async () => {
    if (!startSprintTarget) return;
    try {
      await startSprint({ id: startSprintTarget.id }).unwrap();
      setStartSprintTarget(null);
      setSnack(`"${startSprintTarget.name}" started!`);
      refetchSprints();
      refetch();
    } catch (err) {
      setSnack(err?.data?.message || 'Failed to start sprint');
    }
  };

  const toggleCollapse = (id) => setCollapsed(p => ({ ...p, [id]: !p[id] }));

  if (isLoading) return <LoadingScreen />;

  const renderIssueRow = (issue, idx) => {
    const typeInfo      = TYPE_ICONS[issue.type] || TYPE_ICONS.task;
    const priorityColor = PRIORITY_COLORS[issue.priority] || '#8993A4';
    const priorityIcon  = PRIORITY_ICONS[issue.priority] || 'minus';
    const assigneeName  = issue.assignee
      ? `${issue.assignee.firstName} ${issue.assignee.lastName || ''}`.trim()
      : null;

    return (
      <TouchableOpacity
        key={issue.id}
        style={[styles.issueRow, {
          backgroundColor:   idx % 2 === 0 ? theme.colors.surface : theme.colors.background,
          borderBottomColor: theme.colors.outlineVariant,
        }]}
        onPress={() => navigation.navigate('IssueDetail', { issueId: issue.id })}
        activeOpacity={0.8}
      >
        {/* Drag handle */}
        <View style={{ width: 32, alignItems: 'center' }}>
          <MaterialCommunityIcons name="drag-vertical" size={16} color={theme.colors.outlineVariant} />
        </View>

        {/* Issue key + title + status pill */}
        <View style={{ flex: 4, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 12 }}>
          <MaterialCommunityIcons name={typeInfo.icon} size={14} color={typeInfo.color} />
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {!!issue.key && (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{issue.key}</Text>
            )}
            <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '500', flex: 1 }} numberOfLines={1}>
              {issue.title}
            </Text>
          </View>
          {!!issue.status?.name && (
            <View style={[styles.statusPill, { backgroundColor: (issue.status.color || '#6B7280') + '20' }]}>
              <Text style={{ color: issue.status.color || '#6B7280', fontSize: 10, fontWeight: '600' }}>
                {issue.status.name}
              </Text>
            </View>
          )}
        </View>

        {/* Assignee */}
        <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {issue.assignee ? (
            <>
              <View style={[styles.assigneeAvatar, { backgroundColor: '#0052CC20' }]}>
                <Text style={{ color: '#0052CC', fontSize: 10, fontWeight: '700' }}>
                  {issue.assignee.firstName?.[0]}{issue.assignee.lastName?.[0] || ''}
                </Text>
              </View>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{assigneeName}</Text>
            </>
          ) : (
            <Text variant="labelSmall" style={{ color: theme.colors.outlineVariant }}>Unassigned</Text>
          )}
        </View>

        {/* Priority */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MaterialCommunityIcons name={priorityIcon} size={13} color={priorityColor} />
          <Text variant="labelSmall" style={{ color: priorityColor, textTransform: 'capitalize' }}>
            {issue.priority || '—'}
          </Text>
        </View>

        {/* Type */}
        <View style={{ flex: 1 }}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textTransform: 'capitalize' }}>
            {issue.type || '—'}
          </Text>
        </View>

        {/* Story Points */}
        <View style={{ flex: 1 }}>
          {issue.storyPoints != null ? (
            <View style={[styles.pointsBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{issue.storyPoints}</Text>
            </View>
          ) : (
            <Text variant="labelSmall" style={{ color: theme.colors.outlineVariant }}>—</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>

      {/* ── Toolbar ── */}
      <Surface
        style={[styles.toolbar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}
        elevation={0}
      >
        <View style={styles.toolbarLeft}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ProjectDetail', { projectId })}
            style={styles.breadcrumb}
          >
            <MaterialCommunityIcons name="chevron-left" size={18} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Back</Text>
          </TouchableOpacity>

          <View style={[styles.searchWrap, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}>
            <MaterialCommunityIcons name="magnify" size={16} color={theme.colors.onSurfaceVariant} style={{ marginRight: 6 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search issues..."
              style={{
                flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent',
                fontSize: 14, color: theme.colors.onSurface, fontFamily: 'inherit',
              }}
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialCommunityIcons name="close" size={14} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.toolbarRight}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Type:</Text>
          {Object.entries(ISSUE_TYPE_LABELS).map(([value, label]) => (
            <Chip
              key={value}
              selected={filterType === value}
              onPress={() => setFilterType(filterType === value ? null : value)}
              compact
              style={[styles.filterChip, filterType === value && { backgroundColor: theme.colors.primaryContainer }]}
              textStyle={{ fontSize: 11, color: filterType === value ? theme.colors.primary : theme.colors.onSurfaceVariant }}
            >
              {label}
            </Chip>
          ))}
          <View style={[styles.separator, { backgroundColor: theme.colors.outlineVariant }]} />
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Priority:</Text>
          {Object.entries(PRIORITY_LABELS).slice(0, 3).map(([value, label]) => (
            <Chip
              key={value}
              selected={filterPriority === value}
              onPress={() => setFilterPriority(filterPriority === value ? null : value)}
              compact
              style={[styles.filterChip, filterPriority === value && { backgroundColor: theme.colors.primaryContainer }]}
              textStyle={{ fontSize: 11, color: filterPriority === value ? theme.colors.primary : theme.colors.onSurfaceVariant }}
            >
              {label}
            </Chip>
          ))}
          <Button
            mode="contained" icon="plus" compact
            onPress={() => navigation.navigate('CreateIssue', { projectId })}
            style={{ borderRadius: 6, marginLeft: 8 }}
          >
            Create Issue
          </Button>
        </View>
      </Surface>

      {/* ── Column headers ── */}
      <View style={[styles.tableHeader, { backgroundColor: theme.colors.surfaceVariant, borderBottomColor: theme.colors.outlineVariant }]}>
        <View style={{ width: 32 }} />
        <Text variant="labelSmall" style={[styles.colHeader, { flex: 4 }]}>ISSUE</Text>
        <Text variant="labelSmall" style={[styles.colHeader, { flex: 2 }]}>ASSIGNEE</Text>
        <Text variant="labelSmall" style={[styles.colHeader, { flex: 1 }]}>PRIORITY</Text>
        <Text variant="labelSmall" style={[styles.colHeader, { flex: 1 }]}>TYPE</Text>
        <Text variant="labelSmall" style={[styles.colHeader, { flex: 1 }]}>STORY PTS</Text>
      </View>

      <ScrollView style={styles.scroll}>

        {/* ── Sprint sections ── */}
        {sprints.map(sprint => {
          const sprintIssues = issuesBySprint[sprint.id] || [];
          const isCollapsed  = collapsed[sprint.id];
          const isActive     = sprint.status === 'active';
          const statusColor  = isActive ? '#1D4ED8' : '#6B7280';
          const statusBg     = isActive ? '#DBEAFE' : '#F3F4F6';
          const doneCount    = sprintIssues.filter(i => i.status?.category === 'done').length;

          return (
            <View key={sprint.id}>
              <TouchableOpacity
                style={[styles.sprintHeader, {
                  backgroundColor:   isActive ? '#F0F7FF' : theme.colors.surface,
                  borderBottomColor: theme.colors.outlineVariant,
                  borderLeftWidth:   3,
                  borderLeftColor:   isActive ? '#1D4ED8' : 'transparent',
                }]}
                onPress={() => toggleCollapse(sprint.id)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={isCollapsed ? 'chevron-right' : 'chevron-down'}
                  size={16}
                  color={theme.colors.onSurfaceVariant}
                />
                <MaterialCommunityIcons
                  name={isActive ? 'lightning-bolt' : 'lightning-bolt-outline'}
                  size={14}
                  color={statusColor}
                  style={{ marginLeft: 6 }}
                />
                <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginLeft: 6, flex: 1 }}>
                  {sprint.name}
                </Text>
                <View style={[styles.sprintStatusBadge, { backgroundColor: statusBg }]}>
                  <Text style={{ color: statusColor, fontWeight: '700', fontSize: 10, letterSpacing: 0 }}>
                    {isActive ? 'ACTIVE' : 'PLANNED'}
                  </Text>
                </View>
                {sprintIssues.length > 0 && (
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginHorizontal: 10 }}>
                    {doneCount}/{sprintIssues.length} done
                  </Text>
                )}
                {sprintIssues.length === 0 && (
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginHorizontal: 10 }}>
                    0 issues
                  </Text>
                )}
                {isActive ? (
                  <Button
                    compact
                    mode="contained"
                    onPress={() => navigation.navigate('Board', { projectId })}
                    style={{ borderRadius: 6 }}
                    contentStyle={{ paddingHorizontal: 6 }}
                  >
                    View Board
                  </Button>
                ) : (
                  <Button
                    compact
                    mode="outlined"
                    onPress={() => setStartSprintTarget(sprint)}
                    style={{ borderRadius: 6 }}
                    contentStyle={{ paddingHorizontal: 6 }}
                  >
                    Start Sprint
                  </Button>
                )}
              </TouchableOpacity>

              {!isCollapsed && (
                sprintIssues.length === 0 ? (
                  <View style={[styles.sprintEmpty, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
                    <MaterialCommunityIcons name="inbox-outline" size={16} color={theme.colors.outlineVariant} style={{ marginRight: 8 }} />
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      No issues assigned to this sprint
                    </Text>
                  </View>
                ) : (
                  sprintIssues.map((issue, idx) => renderIssueRow(issue, idx))
                )
              )}
            </View>
          );
        })}

        {/* ── Backlog section ── */}
        <View style={[styles.sectionHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
          <MaterialCommunityIcons name="inbox-outline" size={16} color={theme.colors.onSurfaceVariant} />
          <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginLeft: 8 }}>
            Backlog
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8 }}>
            ({backlogIssues.length} issue{backlogIssues.length !== 1 ? 's' : ''})
          </Text>
        </View>

        {backlogIssues.length === 0 && !inlineOpen && (
          <View style={[styles.empty, { backgroundColor: theme.colors.surface }]}>
            <MaterialCommunityIcons name="inbox" size={36} color={theme.colors.outlineVariant} style={{ marginBottom: 10 }} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600', marginBottom: 4 }}>
              Backlog is empty
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              Create issues to add them here, or move sprint issues back to backlog.
            </Text>
          </View>
        )}

        {backlogIssues.map((issue, idx) => renderIssueRow(issue, idx))}

        {/* ── Inline quick-create ── */}
        {!inlineOpen ? (
          <TouchableOpacity
            style={[styles.addIssueRow, { borderTopColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}
            onPress={() => { setInlineOpen(true); setTimeout(() => titleRef.current?.focus(), 60); }}
          >
            <MaterialCommunityIcons name="plus" size={16} color={theme.colors.primary} />
            <Text variant="bodySmall" style={{ color: theme.colors.primary, marginLeft: 8, fontWeight: '600' }}>
              Create Issue
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6 }}>
              — adds to backlog
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.inlineForm, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.primary }]}>
            <View style={styles.inlineTypeRow}>
              {Object.entries(ISSUE_TYPE_LABELS).map(([val, label]) => {
                const tm     = TYPE_ICONS[val] || TYPE_ICONS.task;
                const active = inlineType === val;
                return (
                  <TouchableOpacity
                    key={val}
                    onPress={() => setInlineType(val)}
                    style={[styles.inlineTypeChip, {
                      borderColor:     active ? tm.color : theme.colors.outlineVariant,
                      backgroundColor: active ? tm.color + '15' : 'transparent',
                    }]}
                  >
                    <MaterialCommunityIcons name={tm.icon} size={12} color={active ? tm.color : theme.colors.onSurfaceVariant} />
                    <Text style={{ fontSize: 11, color: active ? tm.color : theme.colors.onSurfaceVariant, marginLeft: 4, fontWeight: active ? '700' : '400' }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <input
              ref={titleRef}
              value={inlineTitle}
              onChange={e => setInlineTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && inlineTitle.trim()) handleQuickCreate();
                if (e.key === 'Escape') { setInlineOpen(false); setInlineTitle(''); }
              }}
              placeholder="Issue title — Enter to save, Esc to cancel"
              style={{
                width: '100%', border: 'none', outline: 'none',
                fontSize: 14, fontFamily: 'inherit',
                color: theme.colors.onSurface, backgroundColor: 'transparent',
                padding: '4px 0', boxSizing: 'border-box',
              }}
            />

            <View style={styles.inlineActions}>
              <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>Goes to Backlog · no sprint</Text>
              <View style={styles.inlineBtns}>
                <Button compact mode="text" onPress={() => { setInlineOpen(false); setInlineTitle(''); }}>Cancel</Button>
                <Button
                  compact mode="contained"
                  onPress={handleQuickCreate}
                  loading={creating}
                  disabled={!inlineTitle.trim() || creating}
                  style={{ borderRadius: 6 }}
                >
                  Save
                </Button>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Dialogs ── */}
      <Portal>
        <Dialog
          visible={!!startSprintTarget}
          onDismiss={() => setStartSprintTarget(null)}
          style={{ maxWidth: 440, alignSelf: 'center', width: '100%' }}
        >
          <Dialog.Title>Start Sprint</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Start "{startSprintTarget?.name}"? This will make it the active sprint.
              Only one sprint can be active at a time.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setStartSprintTarget(null)}>Cancel</Button>
            <Button mode="contained" onPress={handleStartSprint} loading={startingSprint}>
              Start Sprint
            </Button>
          </Dialog.Actions>
        </Dialog>

      </Portal>
      {!!snack && <Toast message={snack} onDone={() => setSnack('')} />}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },

  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 12,
    borderBottomWidth: 1, gap: 16, flexWrap: 'wrap',
  },
  toolbarLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  breadcrumb:   { flexDirection: 'row', alignItems: 'center', gap: 2 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, height: 36, minWidth: 220,
  },
  filterChip: { borderRadius: 14, height: 26 },
  separator:  { width: 1, height: 20 },

  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1,
  },
  colHeader: { textTransform: 'uppercase', letterSpacing: 0, fontSize: 11, color: '#6B7280' },

  scroll: { flex: 1 },

  sprintHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sprintStatusBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  sprintEmpty: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 52, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopWidth:    StyleSheet.hairlineWidth,
    marginTop: 8,
  },

  issueRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    cursor: 'pointer',
  },
  statusPill: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 4,
  },
  assigneeAvatar: {
    width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  pointsBadge: {
    width: 28, height: 22, borderRadius: 4, justifyContent: 'center', alignItems: 'center',
  },

  empty: {
    alignItems: 'center', paddingVertical: 48, paddingHorizontal: 40,
  },

  addIssueRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 48, paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    cursor: 'pointer',
  },

  inlineForm: {
    paddingHorizontal: 48, paddingVertical: 14,
    borderTopWidth: 2, gap: 10,
  },
  inlineTypeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  inlineTypeChip: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  inlineActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inlineBtns:   { flexDirection: 'row', gap: 6 },
});

export default BacklogScreen;
