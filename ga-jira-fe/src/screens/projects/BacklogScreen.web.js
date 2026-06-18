import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme, Button, Surface, Portal, Dialog, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetIssuesQuery, useCreateIssueMutation } from '../../api/issueApi';
import { useGetSprintsQuery, useStartSprintMutation } from '../../api/sprintApi';
import { useGetProjectWorkflowQuery } from '../../api/projectApi';
import LoadingScreen from '../../components/common/LoadingScreen';
import { ISSUE_TYPE_LABELS, PRIORITY_LABELS } from '../../constants';
import { formatDate } from '../../utils/dateUtils';
import colors from '../../theme/colors';
import AppToast from '../../components/common/AppToast';

const PRIORITY_COLORS = {
  highest: '#DC2626', high: '#F59E0B', medium: '#3B82F6', low: '#10B981', lowest: '#8993A4',
};
const PRIORITY_ICONS = {
  highest: 'arrow-up-bold', high: 'arrow-up', medium: 'minus', low: 'arrow-down', lowest: 'arrow-down-bold',
};
const TYPE_ICONS = {
  bug:     { icon: 'bug',                  color: '#DC2626' },
  task:    { icon: 'check-circle-outline', color: '#3B82F6' },
  story:   { icon: 'bookmark',             color: '#10B981' },
  epic:    { icon: 'lightning-bolt',        color: '#7C3AED' },
  subtask: { icon: 'minus-circle-outline', color: '#6B7280' },
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
  const [snackType, setSnackType]         = useState('success');
  const [inlineOpen, setInlineOpen]       = useState(false);
  const [inlineTitle, setInlineTitle]     = useState('');
  const [inlineType, setInlineType]       = useState('task');
  const titleRef = useRef(null);

  const issueParams = { projectId, limit: 500 };
  if (search)         issueParams.search   = search;
  if (filterType)     issueParams.type     = filterType;
  if (filterPriority) issueParams.priority = filterPriority;

  const { data: issuesData, isLoading, refetch }     = useGetIssuesQuery(issueParams);
  const { data: sprintsData, refetch: refetchSprints } = useGetSprintsQuery({ projectId });
  const { data: workflowData }                        = useGetProjectWorkflowQuery(projectId, { skip: !projectId });
  const [createIssue,  { isLoading: creating }]       = useCreateIssueMutation();
  const [startSprint,  { isLoading: startingSprint }] = useStartSprintMutation();

  const allIssues = issuesData?.data?.data || [];
  const sprints   = (sprintsData?.data?.data || [])
    .filter(s => s.status !== 'completed')
    .sort((a, b) => (a.status === 'active' ? -1 : b.status === 'active' ? 1 : 0));

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
        title: inlineTitle.trim(), type: inlineType, priority: 'medium',
        projectId, workflowStatusId: firstStatus?.id,
      }).unwrap();
      setInlineTitle(''); setInlineType('task'); setInlineOpen(false);
      refetch(); setSnackType('success'); setSnack('Issue created in backlog');
    } catch (err) {
      setSnackType('error'); setSnack(err?.data?.message || 'Failed to create issue');
    }
  };

  const handleStartSprint = async () => {
    if (!startSprintTarget) return;
    try {
      await startSprint({ id: startSprintTarget.id }).unwrap();
      setStartSprintTarget(null);
      setSnackType('success'); setSnack(`"${startSprintTarget.name}" started!`);
      refetchSprints(); refetch();
    } catch (err) {
      setSnackType('error'); setSnack(err?.data?.message || 'Failed to start sprint');
    }
  };

  const toggleCollapse = (id) => setCollapsed(p => ({ ...p, [id]: !p[id] }));

  if (isLoading) return <LoadingScreen />;

  /* ─── Issue row ─── */
  const renderIssueRow = (issue, idx) => {
    const typeInfo      = TYPE_ICONS[issue.type] || TYPE_ICONS.task;
    const priorityColor = PRIORITY_COLORS[issue.priority] || '#8993A4';
    const priorityIcon  = PRIORITY_ICONS[issue.priority] || 'minus';
    const statusColor   = issue.status?.color || '#6B7280';
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
        <View style={styles.dragHandle}>
          <MaterialCommunityIcons name="drag-vertical" size={15} color={theme.colors.outlineVariant} />
        </View>

        {/* Type icon */}
        <View style={styles.typeCell}>
          <MaterialCommunityIcons name={typeInfo.icon} size={15} color={typeInfo.color} />
        </View>

        {/* Key + Title */}
        <View style={styles.titleCell}>
          {!!issue.key && (
            <Text style={[styles.issueKey, { color: theme.colors.onSurfaceVariant }]}>{issue.key}</Text>
          )}
          <Text style={[styles.issueTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {issue.title}
          </Text>
          {!!issue.status?.name && (
            <View style={[styles.statusPill, { backgroundColor: statusColor + '18', borderColor: statusColor + '40' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusPillText, { color: statusColor }]}>{issue.status.name}</Text>
            </View>
          )}
        </View>

        {/* Assignee */}
        <View style={styles.assigneeCell}>
          {issue.assignee ? (
            <>
              <View style={[styles.assigneeAvatar, { backgroundColor: colors.brand.navy + '20' }]}>
                <Text style={[styles.assigneeInitials, { color: colors.brand.navy }]}>
                  {issue.assignee.firstName?.[0]}{issue.assignee.lastName?.[0] || ''}
                </Text>
              </View>
              <Text style={[styles.assigneeName, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                {assigneeName}
              </Text>
            </>
          ) : (
            <Text style={[styles.unassigned, { color: theme.colors.outlineVariant }]}>Unassigned</Text>
          )}
        </View>

        {/* Priority */}
        <View style={styles.priorityCell}>
          <MaterialCommunityIcons name={priorityIcon} size={13} color={priorityColor} />
          <Text style={[styles.priorityText, { color: priorityColor }]}>
            {(issue.priority || '—').charAt(0).toUpperCase() + (issue.priority || '').slice(1)}
          </Text>
        </View>

        {/* Type label */}
        <View style={styles.typeTextCell}>
          <Text style={[styles.typeText, { color: theme.colors.onSurfaceVariant }]}>
            {(issue.type || '—').charAt(0).toUpperCase() + (issue.type || '').slice(1)}
          </Text>
        </View>

        {/* Story Points */}
        <View style={styles.pointsCell}>
          {issue.storyPoints != null ? (
            <View style={[styles.pointsBadge, { backgroundColor: colors.brand.navy + '12', borderColor: colors.brand.navy + '30' }]}>
              <Text style={[styles.pointsText, { color: colors.brand.navy }]}>{issue.storyPoints}</Text>
            </View>
          ) : (
            <Text style={{ color: theme.colors.outlineVariant, fontSize: 12 }}>—</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>

      {/* ── Toolbar ── */}
      <Surface style={[styles.toolbar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]} elevation={0}>
        <View style={styles.toolbarLeft}>
          <TouchableOpacity onPress={() => navigation.navigate('ProjectDetail', { projectId })} style={styles.breadcrumb}>
            <MaterialCommunityIcons name="chevron-left" size={18} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.breadcrumbText, { color: theme.colors.onSurfaceVariant }]}>Back</Text>
          </TouchableOpacity>

          <View style={[styles.searchWrap, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
            <MaterialCommunityIcons name="magnify" size={15} color={theme.colors.onSurfaceVariant} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search issues..."
              style={{
                flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent',
                fontSize: 13, color: theme.colors.onSurface, fontFamily: 'inherit',
              }}
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialCommunityIcons name="close-circle" size={13} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.toolbarRight}>
          <Text style={[styles.filterLabel, { color: theme.colors.onSurfaceVariant }]}>Type:</Text>
          {Object.entries(ISSUE_TYPE_LABELS).map(([value, label]) => {
            const active = filterType === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => setFilterType(active ? null : value)}
                style={[styles.filterBtn, {
                  backgroundColor: active ? '#0F2557' : theme.colors.background,
                  borderColor: active ? '#0F2557' : theme.colors.outlineVariant,
                }]}
              >
                <Text style={[styles.filterBtnText, { color: active ? '#fff' : theme.colors.onSurfaceVariant }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
          <View style={[styles.sep, { backgroundColor: theme.colors.outlineVariant }]} />
          <Text style={[styles.filterLabel, { color: theme.colors.onSurfaceVariant }]}>Priority:</Text>
          {Object.entries(PRIORITY_LABELS).slice(0, 3).map(([value, label]) => {
            const active = filterPriority === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => setFilterPriority(active ? null : value)}
                style={[styles.filterBtn, {
                  backgroundColor: active ? '#0F2557' : theme.colors.background,
                  borderColor: active ? '#0F2557' : theme.colors.outlineVariant,
                }]}
              >
                <Text style={[styles.filterBtnText, { color: active ? '#fff' : theme.colors.onSurfaceVariant }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
          <Button
            mode="contained" icon="plus" compact
            onPress={() => navigation.navigate('CreateIssue', { projectId })}
            style={styles.createBtn}
          >
            Create Issue
          </Button>
        </View>
      </Surface>

      {/* ── Table column headers ── */}
      <View style={[styles.tableHead, { backgroundColor: colors.brand.navy }]}>
        <View style={{ width: 28 }} />
        <View style={{ width: 26 }} />
        <Text style={[styles.colHead, { flex: 4 }]}>ISSUE</Text>
        <Text style={[styles.colHead, { flex: 2 }]}>ASSIGNEE</Text>
        <Text style={[styles.colHead, { flex: 1.2 }]}>PRIORITY</Text>
        <Text style={[styles.colHead, { flex: 1 }]}>TYPE</Text>
        <Text style={[styles.colHead, { flex: 0.8, textAlign: 'center' }]}>PTS</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Sprint sections ── */}
        {sprints.map(sprint => {
          const sprintIssues = issuesBySprint[sprint.id] || [];
          const isCollapsed  = collapsed[sprint.id];
          const isActive     = sprint.status === 'active';
          const doneCount    = sprintIssues.filter(i => i.status?.category === 'done').length;
          const totalCount   = sprintIssues.length;
          const progress     = totalCount > 0 ? doneCount / totalCount : 0;

          return (
            <View key={sprint.id}>
              {/* Sprint header */}
              <TouchableOpacity
                style={[styles.sprintHeader, {
                  backgroundColor:   isActive ? '#F0F7FF' : theme.colors.surface,
                  borderBottomColor: theme.colors.outlineVariant,
                  borderLeftColor:   isActive ? colors.brand.navy : 'transparent',
                }]}
                onPress={() => toggleCollapse(sprint.id)}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name={isCollapsed ? 'chevron-right' : 'chevron-down'}
                  size={15} color={theme.colors.onSurfaceVariant}
                />
                <MaterialCommunityIcons
                  name={isActive ? 'lightning-bolt' : 'lightning-bolt-outline'}
                  size={14} color={isActive ? colors.brand.navy : '#6B7280'}
                  style={{ marginLeft: 6 }}
                />

                <View style={{ flex: 1, marginLeft: 6, gap: 3 }}>
                  <View style={styles.sprintNameRow}>
                    <Text style={[styles.sprintName, { color: theme.colors.onSurface }]}>{sprint.name}</Text>
                    <View style={[styles.sprintBadge, {
                      backgroundColor: isActive ? '#DBEAFE' : '#F3F4F6',
                    }]}>
                      <Text style={[styles.sprintBadgeText, { color: isActive ? '#1D4ED8' : '#6B7280' }]}>
                        {isActive ? 'ACTIVE' : 'PLANNED'}
                      </Text>
                    </View>
                    {sprint.startDate && (
                      <Text style={[styles.sprintDates, { color: theme.colors.onSurfaceVariant }]}>
                        {formatDate(sprint.startDate)}{sprint.endDate ? ` → ${formatDate(sprint.endDate)}` : ''}
                      </Text>
                    )}
                  </View>

                  {totalCount > 0 && (
                    <View style={styles.sprintProgressRow}>
                      <View style={[styles.progressTrack, { backgroundColor: theme.colors.outlineVariant }]}>
                        <View style={[styles.progressFill, {
                          width: `${Math.round(progress * 100)}%`,
                          backgroundColor: isActive ? colors.brand.navy : '#9CA3AF',
                        }]} />
                      </View>
                      <Text style={[styles.progressText, { color: theme.colors.onSurfaceVariant }]}>
                        {doneCount}/{totalCount} done
                      </Text>
                    </View>
                  )}
                  {totalCount === 0 && (
                    <Text style={[styles.sprintEmpty, { color: theme.colors.onSurfaceVariant }]}>No issues</Text>
                  )}
                </View>

                <View style={styles.sprintActions}>
                  {isActive ? (
                    <Button compact mode="contained" onPress={() => navigation.navigate('Board', { projectId })}
                      style={styles.sprintBtn} contentStyle={{ paddingHorizontal: 6 }}>
                      View Board
                    </Button>
                  ) : (
                    <Button compact mode="outlined" onPress={() => setStartSprintTarget(sprint)}
                      style={styles.sprintBtn} contentStyle={{ paddingHorizontal: 6 }}>
                      Start Sprint
                    </Button>
                  )}
                </View>
              </TouchableOpacity>

              {/* Sprint issues */}
              {!isCollapsed && (
                sprintIssues.length === 0 ? (
                  <View style={[styles.emptyRow, {
                    backgroundColor: theme.colors.surface,
                    borderBottomColor: theme.colors.outlineVariant,
                  }]}>
                    <MaterialCommunityIcons name="inbox-outline" size={15} color={theme.colors.outlineVariant} />
                    <Text style={[styles.emptyRowText, { color: theme.colors.onSurfaceVariant }]}>
                      No issues in this sprint
                    </Text>
                  </View>
                ) : (
                  sprintIssues.map((issue, idx) => renderIssueRow(issue, idx))
                )
              )}
            </View>
          );
        })}

        {/* ── Backlog section header ── */}
        <View style={[styles.backlogHeader, {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.outlineVariant,
          borderTopColor: theme.colors.outlineVariant,
        }]}>
          <MaterialCommunityIcons name="inbox-outline" size={15} color={theme.colors.onSurfaceVariant} />
          <Text style={[styles.backlogTitle, { color: theme.colors.onSurface }]}>Backlog</Text>
          <View style={[styles.backlogCount, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.backlogCountText, { color: theme.colors.onSurfaceVariant }]}>
              {backlogIssues.length}
            </Text>
          </View>
          <Text style={[styles.backlogSub, { color: theme.colors.onSurfaceVariant }]}>
            issue{backlogIssues.length !== 1 ? 's' : ''} not in any sprint
          </Text>
        </View>

        {/* Backlog empty state */}
        {backlogIssues.length === 0 && !inlineOpen && (
          <View style={[styles.empty, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.brand.skyLight }]}>
              <MaterialCommunityIcons name="inbox-arrow-down-outline" size={30} color={colors.brand.navy} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Backlog is empty</Text>
            <Text style={[styles.emptySub, { color: theme.colors.onSurfaceVariant }]}>
              Create issues below or drag sprint issues back to backlog
            </Text>
          </View>
        )}

        {backlogIssues.map((issue, idx) => renderIssueRow(issue, idx))}

        {/* ── Inline quick-create ── */}
        {!inlineOpen ? (
          <TouchableOpacity
            style={[styles.addRow, { borderTopColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}
            onPress={() => { setInlineOpen(true); setTimeout(() => titleRef.current?.focus(), 60); }}
          >
            <View style={[styles.addIcon, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons name="plus" size={14} color={theme.colors.primary} />
            </View>
            <Text style={[styles.addLabel, { color: theme.colors.primary }]}>Create Issue</Text>
            <Text style={[styles.addHint, { color: theme.colors.onSurfaceVariant }]}>— adds to backlog</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.inlineForm, { backgroundColor: theme.colors.surface, borderTopColor: colors.brand.navy }]}>
            <View style={styles.inlineTypeRow}>
              {Object.entries(ISSUE_TYPE_LABELS).map(([val, label]) => {
                const tm     = TYPE_ICONS[val] || TYPE_ICONS.task;
                const active = inlineType === val;
                return (
                  <TouchableOpacity
                    key={val}
                    onPress={() => setInlineType(val)}
                    style={[styles.typeChip, {
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
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Button compact mode="text" onPress={() => { setInlineOpen(false); setInlineTitle(''); }}>Cancel</Button>
                <Button compact mode="contained" onPress={handleQuickCreate}
                  loading={creating} disabled={!inlineTitle.trim() || creating} style={{ borderRadius: 6 }}>
                  Save
                </Button>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* ── Dialogs ── */}
      <Portal>
        <Dialog visible={!!startSprintTarget} onDismiss={() => setStartSprintTarget(null)}
          style={{ maxWidth: 440, alignSelf: 'center', width: '100%', borderRadius: 12 }}>
          <Dialog.Title style={{ fontWeight: '800' }}>Start Sprint</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Start "{startSprintTarget?.name}"? This will make it the active sprint.{'\n'}
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

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Toolbar */
  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 1, gap: 16, flexWrap: 'wrap',
    boxShadow: '0px 1px 4px rgba(6,43,111,0.05)',
  },
  toolbarLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toolbarRight:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  breadcrumb:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  breadcrumbText: { fontSize: 13, color: '#6B7280' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1,
    borderRadius: 8, paddingHorizontal: 10, height: 36, minWidth: 220,
  },
  filterLabel:    { fontSize: 11, fontWeight: '600' },
  filterBtn:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  filterBtnText:  { fontSize: 11, fontWeight: '600' },
  sep:            { width: 1, height: 20 },
  createBtn:   { borderRadius: 6, marginLeft: 8 },

  /* Table head */
  tableHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  colHead: {
    fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 4,
  },

  scroll: { flex: 1 },

  /* Sprint header */
  sprintHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 4,
  },
  sprintNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  sprintName: { fontSize: 13, fontWeight: '700' },
  sprintBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  sprintBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  sprintDates: { fontSize: 11 },
  sprintProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, maxWidth: 180, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 2 },
  progressText:  { fontSize: 11 },
  sprintEmpty:   { fontSize: 11 },
  sprintActions: { marginLeft: 12 },
  sprintBtn:     { borderRadius: 6 },

  emptyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 52, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emptyRowText: { fontSize: 13 },

  /* Backlog header */
  backlogHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
  },
  backlogTitle:     { fontSize: 13, fontWeight: '700' },
  backlogCount:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  backlogCountText: { fontSize: 11, fontWeight: '700' },
  backlogSub:       { fontSize: 12 },

  /* Empty */
  empty: {
    alignItems: 'center', paddingVertical: 48, gap: 10,
  },
  emptyIconWrap: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: '700' },
  emptySub:   { fontSize: 12, textAlign: 'center', maxWidth: 280 },

  /* Issue row */
  issueRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    cursor: 'pointer',
  },
  dragHandle:  { width: 28, alignItems: 'center' },
  typeCell:    { width: 26, alignItems: 'center' },
  titleCell:   { flex: 4, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 12, flexWrap: 'wrap' },
  issueKey:    { fontSize: 11, fontWeight: '600' },
  issueTitle:  { fontSize: 13, fontWeight: '500', flex: 1 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1,
  },
  statusDot:     { width: 5, height: 5, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  assigneeCell:   { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 8 },
  assigneeAvatar: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  assigneeInitials: { fontSize: 9, fontWeight: '800' },
  assigneeName: { fontSize: 12, flex: 1 },
  unassigned:   { fontSize: 12 },
  priorityCell: { flex: 1.2, flexDirection: 'row', alignItems: 'center', gap: 4 },
  priorityText: { fontSize: 12, fontWeight: '600' },
  typeTextCell: { flex: 1 },
  typeText:     { fontSize: 12 },
  pointsCell:   { flex: 0.8, alignItems: 'center' },
  pointsBadge:  { width: 28, height: 22, borderRadius: 4, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  pointsText:   { fontSize: 11, fontWeight: '700' },

  /* Add row */
  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 44, paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth, cursor: 'pointer',
  },
  addIcon:  { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  addLabel: { fontSize: 13, fontWeight: '600' },
  addHint:  { fontSize: 12 },

  /* Inline form */
  inlineForm: {
    paddingHorizontal: 44, paddingVertical: 14,
    borderTopWidth: 2, gap: 10,
  },
  inlineTypeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  typeChip: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  inlineActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

});

export default BacklogScreen;
