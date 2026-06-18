import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
  Text, useTheme, Button, Surface, Portal, Dialog, Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetSprintsQuery, useStartSprintMutation, useCompleteSprintMutation } from '../../api/sprintApi';
import { useGetIssuesQuery } from '../../api/issueApi';
import { useAuth } from '../../hooks/useAuth';
import LoadingScreen from '../../components/common/LoadingScreen';
import AppToast from '../../components/common/AppToast';
import { formatDate, getDaysRemaining, getSprintProgress } from '../../utils/dateUtils';

const SPRINT_MANAGER_ROLES = ['super_admin', 'org_admin', 'project_manager'];

const PRIORITY_COLORS = {
  highest: '#DE350B', high: '#FF8B00', medium: '#0052CC', low: '#00875A', lowest: '#8993A4',
};
const PRIORITY_ICONS = {
  highest: 'arrow-up-bold', high: 'arrow-up', medium: 'minus',
  low: 'arrow-down', lowest: 'arrow-down-bold',
};
const TYPE_ICONS = {
  bug:     { icon: 'bug',                  color: '#DE350B' },
  task:    { icon: 'check-circle-outline', color: '#0052CC' },
  story:   { icon: 'bookmark',             color: '#00875A' },
  epic:    { icon: 'lightning-bolt',        color: '#6554C0' },
  subtask: { icon: 'minus-circle-outline', color: '#4C9AFF' },
};

const SprintScreen = ({ route, navigation }) => {
  const { projectId, sprintId: routeSprintId } = route.params || {};
  const theme  = useTheme();
  const { user } = useAuth();
  const canManageSprint = SPRINT_MANAGER_ROLES.includes(user?.role);

  const [completeDialog, setCompleteDialog] = useState(null);
  const [startDialog, setStartDialog]       = useState(null);
  const [toast, setToast]                   = useState('');
  const [toastType, setToastType]           = useState('success');
  const [showCompleted, setShowCompleted]   = useState(false);

  const { data: sprintsData, isLoading, refetch } = useGetSprintsQuery({ projectId });
  const [completeSprint, { isLoading: completing }] = useCompleteSprintMutation();
  const [startSprint,   { isLoading: starting }]   = useStartSprintMutation();

  const allSprints      = sprintsData?.data?.data || [];
  const activeSprint    = allSprints.find(s => s.status === 'active');
  const plannedSprints  = allSprints.filter(s => s.status !== 'active' && s.status !== 'completed');
  const completedSprints = allSprints.filter(s => s.status === 'completed');

  // Which sprint to show in the detail view
  const focusedSprint = routeSprintId
    ? allSprints.find(s => s.id === routeSprintId) || activeSprint
    : activeSprint;

  // Fetch issues for focused sprint
  const { data: issuesData } = useGetIssuesQuery(
    { projectId, sprintId: focusedSprint?.id, limit: 200 },
    { skip: !focusedSprint?.id }
  );
  const sprintIssues = issuesData?.data?.data || [];

  const handleComplete = async () => {
    if (!completeDialog) return;
    try {
      await completeSprint({ id: completeDialog.id }).unwrap();
      setCompleteDialog(null);
      setToastType('success'); setToast(`"${completeDialog.name}" completed!`);
      refetch();
    } catch (err) {
      setToastType('error'); setToast(err?.data?.message || 'Failed to complete sprint');
    }
  };

  const handleStart = async () => {
    if (!startDialog) return;
    try {
      await startSprint({ id: startDialog.id }).unwrap();
      setStartDialog(null);
      setToastType('success'); setToast(`"${startDialog.name}" started!`);
      refetch();
    } catch (err) {
      setToastType('error'); setToast(err?.data?.message || 'Failed to start sprint');
    }
  };

  if (isLoading) return <LoadingScreen />;

  // Stats from issues
  const doneIssues   = sprintIssues.filter(i => i.status?.category === 'done').length;
  const totalPoints  = sprintIssues.reduce((s, i) => s + (i.storyPoints || 0), 0);
  const donePoints   = sprintIssues.filter(i => i.status?.category === 'done').reduce((s, i) => s + (i.storyPoints || 0), 0);
  const daysLeft     = focusedSprint ? getDaysRemaining(focusedSprint.endDate) : null;
  const progress     = focusedSprint ? getSprintProgress(focusedSprint.startDate, focusedSprint.endDate) : 0;
  const isActive     = focusedSprint?.status === 'active';

  // Status distribution
  const statusDist = {};
  sprintIssues.forEach(i => {
    const name = i.status?.name || 'Unknown';
    if (!statusDist[name]) statusDist[name] = { count: 0, color: i.status?.color || '#6B7280' };
    statusDist[name].count++;
  });

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>

      {/* ── Header ── */}
      <Surface
        style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}
        elevation={0}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={22} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerMid}>
          <MaterialCommunityIcons name="lightning-bolt" size={18} color={isActive ? '#1D4ED8' : '#6B7280'} />
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginLeft: 8 }}>
            {focusedSprint?.name || 'Sprints'}
          </Text>
          {focusedSprint && (
            <View style={[styles.statusBadge, { backgroundColor: isActive ? '#DBEAFE' : '#F3F4F6' }]}>
              <Text style={{ color: isActive ? '#1D4ED8' : '#6B7280', fontSize: 11, fontWeight: '700' }}>
                {isActive ? 'ACTIVE' : (focusedSprint.status || 'PLANNED').toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          {canManageSprint && focusedSprint && !isActive && focusedSprint.status !== 'completed' && !activeSprint && (
            <Button
              mode="contained"
              icon="play"
              onPress={() => setStartDialog(focusedSprint)}
              style={{ borderRadius: 8 }}
            >
              Start Sprint
            </Button>
          )}
          {canManageSprint && isActive && (
            <Button
              mode="outlined"
              icon="check-circle-outline"
              onPress={() => setCompleteDialog(focusedSprint)}
              style={{ borderRadius: 8, borderColor: '#10B981' }}
              textColor="#10B981"
            >
              Complete Sprint
            </Button>
          )}
          <Button
            mode="text"
            icon="view-column-outline"
            onPress={() => navigation.navigate('Board', { projectId })}
            style={{ borderRadius: 8 }}
          >
            Board
          </Button>
          <Button
            mode="text"
            icon="format-list-bulleted"
            onPress={() => navigation.navigate('Backlog', { projectId })}
            style={{ borderRadius: 8 }}
          >
            Backlog
          </Button>
        </View>
      </Surface>

      {/* ── Sprint dates/progress bar ── */}
      {focusedSprint && (
        <View style={[styles.progressStrip, { backgroundColor: isActive ? '#EFF6FF' : theme.colors.surfaceVariant, borderBottomColor: theme.colors.outlineVariant }]}>
          <View style={styles.progressLeft}>
            {focusedSprint.startDate && (
              <Text variant="labelSmall" style={{ color: '#6B7280' }}>
                {formatDate(focusedSprint.startDate)} – {focusedSprint.endDate ? formatDate(focusedSprint.endDate) : '…'}
              </Text>
            )}
            {focusedSprint.goal && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2, fontStyle: 'italic' }}>
                {focusedSprint.goal}
              </Text>
            )}
          </View>
          <View style={styles.progressRight}>
            {daysLeft !== null && (
              <Text variant="labelSmall" style={{ color: daysLeft >= 0 ? '#6B7280' : '#EF4444', marginRight: 12 }}>
                {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Ends today' : 'Overdue'}
              </Text>
            )}
            <View style={[styles.progressTrack, { backgroundColor: isActive ? '#BFDBFE' : theme.colors.outlineVariant }]}>
              <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: isActive ? '#1D4ED8' : '#9CA3AF' }]} />
            </View>
            <Text variant="labelSmall" style={{ color: isActive ? '#1D4ED8' : '#6B7280', marginLeft: 8, fontWeight: '700' }}>
              {Math.round(progress)}%
            </Text>
          </View>
        </View>
      )}

      <View style={styles.body}>

        {/* ── Main area: issue list ── */}
        <View style={styles.issueArea}>
          {/* Table column headers */}
          <View style={[styles.tableHead, { backgroundColor: theme.colors.surfaceVariant, borderBottomColor: theme.colors.outlineVariant }]}>
            <View style={{ width: 32 }} />
            <Text style={[styles.col, styles.colH, { flex: 4 }]}>ISSUE</Text>
            <Text style={[styles.col, styles.colH, { flex: 2 }]}>ASSIGNEE</Text>
            <Text style={[styles.col, styles.colH, { flex: 1.2 }]}>STATUS</Text>
            <Text style={[styles.col, styles.colH, { flex: 1 }]}>PRIORITY</Text>
            <Text style={[styles.col, styles.colH, { flex: 0.8 }]}>PTS</Text>
          </View>

          <ScrollView style={styles.issueScroll}>
            {sprintIssues.length === 0 && focusedSprint && (
              <View style={styles.emptyIssues}>
                <MaterialCommunityIcons name="inbox-outline" size={36} color={theme.colors.outlineVariant} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600', marginTop: 12 }}>
                  No issues in this sprint
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  Add issues from the Backlog view
                </Text>
                <Button
                  mode="outlined" icon="plus" compact
                  onPress={() => navigation.navigate('Backlog', { projectId })}
                  style={{ marginTop: 16, borderRadius: 8 }}
                >
                  Go to Backlog
                </Button>
              </View>
            )}

            {!focusedSprint && (
              <View style={styles.emptyIssues}>
                <MaterialCommunityIcons name="lightning-bolt-outline" size={36} color={theme.colors.outlineVariant} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600', marginTop: 12 }}>
                  No active sprint
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  Start a sprint from the Backlog to begin tracking
                </Text>
              </View>
            )}

            {sprintIssues.map((issue, idx) => {
              const typeInfo     = TYPE_ICONS[issue.type] || TYPE_ICONS.task;
              const priorityColor = PRIORITY_COLORS[issue.priority] || '#8993A4';
              const priorityIcon  = PRIORITY_ICONS[issue.priority] || 'minus';
              const statusColor   = issue.status?.color || '#6B7280';

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
                  <View style={{ width: 32, alignItems: 'center' }}>
                    <MaterialCommunityIcons name={typeInfo.icon} size={15} color={typeInfo.color} />
                  </View>

                  {/* Title + key */}
                  <View style={{ flex: 4, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 10 }}>
                    {!!issue.key && (
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{issue.key}</Text>
                    )}
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '500', flex: 1 }} numberOfLines={1}>
                      {issue.title}
                    </Text>
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
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                          {issue.assignee.firstName}
                        </Text>
                      </>
                    ) : (
                      <Text variant="labelSmall" style={{ color: theme.colors.outlineVariant }}>Unassigned</Text>
                    )}
                  </View>

                  {/* Status */}
                  <View style={{ flex: 1.2 }}>
                    <View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
                      <Text style={{ color: statusColor, fontSize: 10, fontWeight: '600' }} numberOfLines={1}>
                        {issue.status?.name || '—'}
                      </Text>
                    </View>
                  </View>

                  {/* Priority */}
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialCommunityIcons name={priorityIcon} size={13} color={priorityColor} />
                    <Text variant="labelSmall" style={{ color: priorityColor, textTransform: 'capitalize' }}>
                      {issue.priority || '—'}
                    </Text>
                  </View>

                  {/* Story points */}
                  <View style={{ flex: 0.8 }}>
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
            })}

            {/* ── Other sprints section ── */}
            {(plannedSprints.length > 0 || completedSprints.length > 0) && (
              <View style={styles.otherSprints}>
                {plannedSprints.length > 0 && (
                  <>
                    <View style={[styles.otherSprintHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
                      <MaterialCommunityIcons name="lightning-bolt-outline" size={14} color="#6B7280" />
                      <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginLeft: 6 }}>
                        Planned Sprints
                      </Text>
                    </View>
                    {plannedSprints.map(sp => (
                      <TouchableOpacity
                        key={sp.id}
                        style={[styles.sprintListRow, { borderBottomColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}
                        onPress={() => navigation.navigate('Sprint', { projectId, sprintId: sp.id })}
                      >
                        <MaterialCommunityIcons name="lightning-bolt-outline" size={14} color="#6B7280" style={{ marginRight: 8 }} />
                        <Text variant="bodySmall" style={{ flex: 1, color: theme.colors.onSurface, fontWeight: '500' }}>{sp.name}</Text>
                        {sp.startDate && (
                          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginRight: 12 }}>
                            {formatDate(sp.startDate)}
                          </Text>
                        )}
                        {canManageSprint && !activeSprint && (
                          <Button
                            compact mode="contained" onPress={(e) => { e.stopPropagation?.(); setStartDialog(sp); }}
                            style={{ borderRadius: 6 }} contentStyle={{ paddingHorizontal: 4 }}
                          >
                            Start
                          </Button>
                        )}
                        <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.onSurfaceVariant} style={{ marginLeft: 8 }} />
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {completedSprints.length > 0 && (
                  <>
                    <TouchableOpacity
                      style={[styles.otherSprintHeader, { borderBottomColor: theme.colors.outlineVariant }]}
                      onPress={() => setShowCompleted(v => !v)}
                    >
                      <MaterialCommunityIcons name={showCompleted ? 'chevron-down' : 'chevron-right'} size={14} color="#6B7280" />
                      <MaterialCommunityIcons name="check-circle-outline" size={14} color="#10B981" style={{ marginLeft: 4 }} />
                      <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginLeft: 6, flex: 1 }}>
                        Completed Sprints
                      </Text>
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {completedSprints.length}
                      </Text>
                    </TouchableOpacity>
                    {showCompleted && completedSprints.map(sp => (
                      <View
                        key={sp.id}
                        style={[styles.sprintListRow, { borderBottomColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}
                      >
                        <MaterialCommunityIcons name="check-circle-outline" size={14} color="#10B981" style={{ marginRight: 8 }} />
                        <Text variant="bodySmall" style={{ flex: 1, color: theme.colors.onSurface, fontWeight: '500' }}>{sp.name}</Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginRight: 12 }}>
                          Velocity: {sp.velocity || 0} pts
                        </Text>
                        {sp.completedAt && (
                          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {formatDate(sp.completedAt)}
                          </Text>
                        )}
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>

        {/* ── Stats sidebar ── */}
        <View style={[styles.statsSidebar, { backgroundColor: theme.colors.surface, borderLeftColor: theme.colors.outlineVariant }]}>
          <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 16 }}>
            Sprint Stats
          </Text>

          {/* Issues progress */}
          <StatBox
            label="Issues Done"
            value={`${doneIssues} / ${sprintIssues.length}`}
            icon="check-circle-outline"
            color="#10B981"
            theme={theme}
          />
          <StatBox
            label="Story Points"
            value={`${donePoints} / ${totalPoints}`}
            icon="star-circle-outline"
            color="#6554C0"
            theme={theme}
          />
          {daysLeft !== null && (
            <StatBox
              label="Days Remaining"
              value={daysLeft >= 0 ? `${daysLeft}d` : 'Overdue'}
              icon="calendar-clock"
              color={daysLeft >= 0 ? '#0052CC' : '#EF4444'}
              theme={theme}
            />
          )}

          {/* Completion donut-style */}
          {sprintIssues.length > 0 && (
            <View style={[styles.completionBar, { borderColor: theme.colors.outlineVariant }]}>
              <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 8 }}>
                <View style={{ flex: doneIssues, backgroundColor: '#10B981' }} />
                <View style={{ flex: sprintIssues.length - doneIssues, backgroundColor: theme.colors.surfaceVariant }} />
              </View>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {Math.round((doneIssues / sprintIssues.length) * 100)}% complete
              </Text>
            </View>
          )}

          <Divider style={{ marginVertical: 16 }} />

          {/* Status distribution */}
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0, marginBottom: 12 }}>
            By Status
          </Text>
          {Object.entries(statusDist).map(([name, { count, color }]) => (
            <View key={name} style={styles.distRow}>
              <View style={[styles.distDot, { backgroundColor: color }]} />
              <Text variant="labelSmall" style={{ flex: 1, color: theme.colors.onSurface }}>{name}</Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '700' }}>{count}</Text>
            </View>
          ))}
          {Object.keys(statusDist).length === 0 && (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>—</Text>
          )}

          <Divider style={{ marginVertical: 16 }} />

          {/* Quick actions */}
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0, marginBottom: 10 }}>
            Actions
          </Text>
          <Button
            mode="outlined" icon="view-column-outline" compact
            onPress={() => navigation.navigate('Board', { projectId })}
            style={{ borderRadius: 8, marginBottom: 8 }}
          >
            View Board
          </Button>
          <Button
            mode="outlined" icon="format-list-bulleted" compact
            onPress={() => navigation.navigate('Backlog', { projectId })}
            style={{ borderRadius: 8, marginBottom: 8 }}
          >
            Backlog
          </Button>
          <Button
            mode="outlined" icon="cog-outline" compact
            onPress={() => navigation.navigate('ProjectSettings', { projectId })}
            style={{ borderRadius: 8 }}
          >
            Settings
          </Button>
        </View>
      </View>

      {/* ── Dialogs ── */}
      <Portal>
        {/* Complete Sprint Dialog */}
        <Dialog
          visible={!!completeDialog}
          onDismiss={() => setCompleteDialog(null)}
          style={{ maxWidth: 460, alignSelf: 'center', width: '100%' }}
        >
          <Dialog.Title>Complete Sprint</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Complete "{completeDialog?.name}"?
            </Text>
            {sprintIssues.length > 0 && sprintIssues.length - doneIssues > 0 && (
              <View style={[styles.incompleteWarning, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#D97706" />
                <Text variant="bodySmall" style={{ color: '#92400E', marginLeft: 8, flex: 1 }}>
                  {sprintIssues.length - doneIssues} issue{sprintIssues.length - doneIssues !== 1 ? 's' : ''} are not done and will move to the backlog.
                </Text>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCompleteDialog(null)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleComplete}
              loading={completing}
              buttonColor="#10B981"
            >
              Complete Sprint
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Start Sprint Dialog */}
        <Dialog
          visible={!!startDialog}
          onDismiss={() => setStartDialog(null)}
          style={{ maxWidth: 440, alignSelf: 'center', width: '100%' }}
        >
          <Dialog.Title>Start Sprint</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Start "{startDialog?.name}"? This will become the active sprint for the board.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setStartDialog(null)}>Cancel</Button>
            <Button mode="contained" onPress={handleStart} loading={starting}>
              Start Sprint
            </Button>
          </Dialog.Actions>
        </Dialog>

      </Portal>

      {!!toast && <AppToast message={toast} type={toastType} onDone={() => setToast('')} />}
    </View>
  );
};

const StatBox = ({ label, value, icon, color, theme }) => (
  <View style={[styles.statBox, { backgroundColor: color + '10' }]}>
    <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
      <MaterialCommunityIcons name={icon} size={16} color={color} />
    </View>
    <View>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
      <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'column' },

  /* ── Header ── */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 8,
    borderBottomWidth: 1, gap: 16,
  },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headerMid: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },

  /* ── Progress strip ── */
  progressStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  progressLeft:  { flex: 1 },
  progressRight: { flexDirection: 'row', alignItems: 'center' },
  progressTrack: { height: 8, width: 120, borderRadius: 4, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 4 },

  /* ── Body ── */
  body: { flex: 1, flexDirection: 'row' },

  /* ── Issue area ── */
  issueArea:  { flex: 1, overflow: 'hidden' },
  issueScroll: { flex: 1 },

  tableHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1,
  },
  col:  { paddingHorizontal: 6 },
  colH: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0 },

  issueRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    cursor: 'pointer',
  },
  assigneeAvatar: {
    width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start',
  },
  pointsBadge: {
    width: 28, height: 22, borderRadius: 4, justifyContent: 'center', alignItems: 'center',
  },

  emptyIssues: {
    alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40,
  },

  /* ── Other sprints ── */
  otherSprints: { marginTop: 24 },
  otherSprintHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sprintListRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    cursor: 'pointer',
  },

  /* ── Stats sidebar ── */
  statsSidebar: {
    width: 240, borderLeftWidth: StyleSheet.hairlineWidth,
    padding: 20,
  },
  statBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 10, marginBottom: 10,
  },
  statIcon: {
    width: 32, height: 32, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  completionBar: {
    padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 4,
  },
  distRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  distDot: { width: 8, height: 8, borderRadius: 4 },

  incompleteWarning: {
    flexDirection: 'row', alignItems: 'flex-start',
    borderWidth: 1, borderRadius: 8,
    padding: 12, marginTop: 12,
  },

});

export default SprintScreen;
