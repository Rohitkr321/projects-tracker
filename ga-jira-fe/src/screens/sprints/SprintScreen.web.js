import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import {
  Text, useTheme, Button, Surface, Portal, Dialog, Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetSprintsQuery, useStartSprintMutation, useCompleteSprintMutation } from '../../api/sprintApi';
import { useGetIssuesQuery } from '../../api/issueApi';
import { useGetBurndownReportQuery } from '../../api/reportApi';
import { useGetProjectQuery } from '../../api/projectApi';
import { useAuth } from '../../hooks/useAuth';
import { useProjectScrollbar } from '../../hooks/useProjectScrollbar';
import LoadingScreen from '../../components/common/LoadingScreen';
import AppToast from '../../components/common/AppToast';
import Avatar from '../../components/common/Avatar';
import { formatDate, getDaysRemaining, getSprintProgress } from '../../utils/dateUtils';
import colors from '../../theme/colors';

const SPRINT_MANAGER_ROLES = ['super_admin', 'org_admin', 'project_manager'];
const NAVY = colors.brand.navy;

const PRIORITY_COLORS = {
  highest: colors.priority.highest,
  high: colors.priority.high,
  medium: colors.priority.medium,
  low: colors.priority.low,
  lowest: colors.priority.lowest,
};
const PRIORITY_ICONS = {
  highest: 'arrow-up-bold',
  high: 'arrow-up',
  medium: 'minus',
  low: 'arrow-down',
  lowest: 'arrow-down-bold',
};
const TYPE_ICONS = {
  bug: { icon: 'bug-outline', color: colors.issueType.bug },
  task: { icon: 'check-circle-outline', color: colors.issueType.task },
  story: { icon: 'bookmark-outline', color: colors.issueType.story },
  epic: { icon: 'lightning-bolt-outline', color: colors.issueType.epic },
  subtask: { icon: 'subdirectory-arrow-right', color: colors.issueType.subtask },
};

const titleCase = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());

const personName = (user) => {
  if (!user) return 'Unassigned';
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return fullName || user.email || user.name || 'Unassigned';
};

const SprintScreen = ({ route, navigation }) => {
  const { projectId, sprintId: routeSprintId } = route.params || {};
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 1180;
  const { user } = useAuth();
  const canManageSprint = SPRINT_MANAGER_ROLES.includes(user?.role);

  const [completeDialog, setCompleteDialog] = useState(null);
  const [startDialog, setStartDialog] = useState(null);
  const [startEndDate, setStartEndDate] = useState('');
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: sprintsData, isLoading, refetch } = useGetSprintsQuery({ projectId });
  const [completeSprint, { isLoading: completing }] = useCompleteSprintMutation();
  const [startSprint, { isLoading: starting }] = useStartSprintMutation();

  const { data: projectResp } = useGetProjectQuery(projectId, { skip: !projectId });
  const project = projectResp?.data;
  useProjectScrollbar(project?.color);
  const accent = project?.color || NAVY;

  const allSprints = sprintsData?.data?.data || [];
  const activeSprint = allSprints.find((s) => s.status === 'active');
  const plannedSprints = allSprints.filter((s) => s.status !== 'active' && s.status !== 'completed');
  const completedSprints = allSprints.filter((s) => s.status === 'completed');

  const focusedSprint = routeSprintId
    ? allSprints.find((s) => s.id === routeSprintId) || activeSprint
    : activeSprint;

  const { data: issuesData } = useGetIssuesQuery(
    { projectId, sprintId: focusedSprint?.id, limit: 200 },
    { skip: !focusedSprint?.id }
  );
  const sprintIssues = issuesData?.data?.data || [];

  const { data: burndownData } = useGetBurndownReportQuery(
    { sprintId: focusedSprint?.id },
    { skip: !focusedSprint?.id || focusedSprint?.status === 'planned' }
  );
  const burndown = burndownData?.data || burndownData;

  const handleComplete = async () => {
    if (!completeDialog) return;
    try {
      await completeSprint({ id: completeDialog.id }).unwrap();
      setCompleteDialog(null);
      setToastType('success');
      setToast(`${completeDialog.name} completed`);
      refetch();
    } catch (err) {
      setToastType('error');
      setToast(err?.data?.message || 'Failed to complete sprint');
    }
  };

  const handleStart = async () => {
    if (!startDialog) return;
    try {
      await startSprint({ id: startDialog.id, endDate: startEndDate || undefined }).unwrap();
      setStartDialog(null);
      setStartEndDate('');
      setToastType('success');
      setToast(`${startDialog.name} started`);
      refetch();
    } catch (err) {
      setToastType('error');
      setToast(err?.data?.message || 'Failed to start sprint');
    }
  };

  if (isLoading) return <LoadingScreen />;

  const doneIssues = sprintIssues.filter((i) => i.status?.category === 'done').length;
  const totalPoints = sprintIssues.reduce((s, i) => s + (i.storyPoints || 0), 0);
  const donePoints = sprintIssues
    .filter((i) => i.status?.category === 'done')
    .reduce((s, i) => s + (i.storyPoints || 0), 0);
  const daysLeft = focusedSprint ? getDaysRemaining(focusedSprint.endDate) : null;
  const progress = focusedSprint ? getSprintProgress(focusedSprint.startDate, focusedSprint.endDate) : 0;
  const isActive = focusedSprint?.status === 'active';
  const completePct = sprintIssues.length ? Math.round((doneIssues / sprintIssues.length) * 100) : 0;
  const remainingIssues = Math.max(sprintIssues.length - doneIssues, 0);

  const statusDist = {};
  sprintIssues.forEach((i) => {
    const name = i.status?.name || 'Unknown';
    if (!statusDist[name]) statusDist[name] = { count: 0, color: i.status?.color || colors.onSurfaceVariant };
    statusDist[name].count += 1;
  });

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Surface style={[styles.hero, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]} elevation={0}>
        <View style={[styles.heroTop, isCompact && styles.heroTopCompact]}>
          <View style={styles.heroIdentity}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.backBtn, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
            <View style={[styles.sprintAvatar, { backgroundColor: isActive ? accent : colors.onSurfaceVariant }]}>
              <MaterialCommunityIcons name="lightning-bolt" size={24} color="#fff" />
            </View>
            <View style={styles.heroTextBlock}>
              <View style={styles.eyebrowRow}>
                <Text style={[styles.eyebrow, { color: theme.colors.onSurfaceVariant }]}>Sprint workspace</Text>
                {focusedSprint && <SprintStatusBadge sprint={focusedSprint} isActive={isActive} theme={theme} />}
              </View>
              <Text style={[styles.heroTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                {focusedSprint?.name || 'Sprints'}
              </Text>
              <Text style={[styles.heroSubtitle, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
                {focusedSprint?.goal || 'Track sprint scope, progress, and delivery health.'}
              </Text>
            </View>
          </View>

          <View style={styles.heroActions}>
            {canManageSprint && focusedSprint && !isActive && focusedSprint.status !== 'completed' && !activeSprint && (
              <Button
                mode="contained"
                icon="play"
                onPress={() => setStartDialog(focusedSprint)}
                style={[styles.actionButton, { backgroundColor: accent }]}
                labelStyle={styles.containedLabel}
              >
                Start Sprint
              </Button>
            )}
            {canManageSprint && isActive && (
              <Button
                mode="outlined"
                icon="check-circle-outline"
                onPress={() => setCompleteDialog(focusedSprint)}
                style={[styles.actionButton, { borderColor: colors.success }]}
                labelStyle={[styles.outlinedLabel, { color: colors.success }]}
              >
                Complete
              </Button>
            )}
            <Button
              mode="outlined"
              icon="view-column-outline"
              onPress={() => navigation.navigate('Board', { projectId })}
              style={[styles.actionButton, { borderColor: theme.colors.outlineVariant }]}
              labelStyle={[styles.outlinedLabel, { color: theme.colors.primary }]}
            >
              Board
            </Button>
            <Button
              mode="outlined"
              icon="format-list-bulleted"
              onPress={() => navigation.navigate('Backlog', { projectId })}
              style={[styles.actionButton, { borderColor: theme.colors.outlineVariant }]}
              labelStyle={[styles.outlinedLabel, { color: theme.colors.primary }]}
            >
              Backlog
            </Button>
          </View>
        </View>

        <View style={[styles.heroMetrics, isCompact && styles.heroMetricsWrap]}>
          <MetricTile icon="ticket-outline" value={sprintIssues.length} label="Issues" detail={`${remainingIssues} open`} tone={colors.info} theme={theme} />
          <MetricTile icon="check-decagram-outline" value={`${completePct}%`} label="Done" detail={`${doneIssues} closed`} tone={colors.success} theme={theme} />
          <MetricTile icon="star-circle-outline" value={`${donePoints}/${totalPoints}`} label="Story points" detail="completed" tone="#7C5EA7" theme={theme} />
          <MetricTile icon="calendar-clock" value={daysLeft !== null ? (daysLeft >= 0 ? `${daysLeft}d` : 'Late') : '-'} label="Time left" detail={focusedSprint?.endDate ? formatDate(focusedSprint.endDate) : 'No end date'} tone={daysLeft !== null && daysLeft < 0 ? colors.danger : colors.warning} theme={theme} />
        </View>

        {focusedSprint && (
          <View style={[styles.progressPanel, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
            <View style={styles.progressPanelTop}>
              <View>
                <Text style={[styles.progressTitle, { color: theme.colors.onSurface }]}>Timeline progress</Text>
                <Text style={[styles.progressSub, { color: theme.colors.onSurfaceVariant }]}>
                  {focusedSprint.startDate ? formatDate(focusedSprint.startDate) : 'No start date'}
                  {focusedSprint.endDate ? ` to ${formatDate(focusedSprint.endDate)}` : ''}
                </Text>
              </View>
              <Text style={[styles.progressValue, { color: isActive ? accent : colors.onSurfaceVariant }]}>
                {Math.round(progress)}%
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: isActive ? accent : colors.onSurfaceVariant }]} />
            </View>
          </View>
        )}
      </Surface>

      <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageContent}>
        <View style={[styles.layoutGrid, isCompact && styles.layoutGridStack]}>
          <View style={styles.mainColumn}>
            <Surface style={[styles.sectionPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={0}>
              <SectionHeader
                icon="format-list-checks"
                title="Sprint issues"
                subtitle={focusedSprint ? `${sprintIssues.length} issue${sprintIssues.length !== 1 ? 's' : ''} in scope` : 'No sprint selected'}
                tone={accent}
                theme={theme}
                action={focusedSprint ? (
                  <Button
                    mode="outlined"
                    icon="plus"
                    compact
                    onPress={() => navigation.navigate('Backlog', { projectId })}
                    style={[styles.smallButton, { borderColor: theme.colors.outlineVariant }]}
                    labelStyle={[styles.outlinedLabel, { color: accent }]}
                  >
                    Add From Backlog
                  </Button>
                ) : null}
              />

              {!focusedSprint && (
                <EmptyState
                  icon="lightning-bolt-outline"
                  title="No active sprint"
                  subtitle="Start a sprint from the backlog to begin tracking."
                  theme={theme}
                />
              )}

              {focusedSprint && sprintIssues.length === 0 && (
                <EmptyState
                  icon="inbox-outline"
                  title="No issues in this sprint"
                  subtitle="Add issues from backlog when the team is ready."
                  theme={theme}
                  action={() => navigation.navigate('Backlog', { projectId })}
                />
              )}

              {sprintIssues.length > 0 && (
                <View style={styles.issueList}>
                  {sprintIssues.map((issue) => (
                    <SprintIssueRow
                      key={issue.id}
                      issue={issue}
                      theme={theme}
                      onPress={() => navigation.navigate('IssueDetail', { issueId: issue.id })}
                    />
                  ))}
                </View>
              )}
            </Surface>

            {(plannedSprints.length > 0 || completedSprints.length > 0) && (
              <Surface style={[styles.sectionPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={0}>
                <SectionHeader
                  icon="calendar-text-outline"
                  title="Other sprints"
                  subtitle="Planned and completed sprint history"
                  tone={colors.warning}
                  theme={theme}
                />

                {plannedSprints.length > 0 && (
                  <View style={styles.sprintGrid}>
                    {plannedSprints.map((sp) => (
                      <TouchableOpacity
                        key={sp.id}
                        style={[styles.smallSprintCard, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.background }]}
                        onPress={() => navigation.navigate('Sprint', { projectId, sprintId: sp.id })}
                      >
                        <View style={[styles.smallSprintIcon, { backgroundColor: colors.warningLight }]}>
                          <MaterialCommunityIcons name="lightning-bolt-outline" size={16} color={colors.warning} />
                        </View>
                        <View style={styles.smallSprintText}>
                          <Text style={[styles.smallSprintName, { color: theme.colors.onSurface }]} numberOfLines={1}>{sp.name}</Text>
                          <Text style={[styles.smallSprintMeta, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                            {sp.startDate ? formatDate(sp.startDate) : 'No start date'}
                          </Text>
                        </View>
                        {canManageSprint && !activeSprint && (
                          <Button
                            compact
                            mode="contained"
                            onPress={(e) => { e.stopPropagation?.(); setStartDialog(sp); }}
                            style={[styles.smallButton, { backgroundColor: accent }]}
                            labelStyle={styles.containedLabel}
                          >
                            Start
                          </Button>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {completedSprints.length > 0 && (
                  <View style={{ marginTop: plannedSprints.length ? 14 : 0 }}>
                    <TouchableOpacity
                      style={[styles.completedToggle, { borderColor: theme.colors.outlineVariant }]}
                      onPress={() => setShowCompleted((v) => !v)}
                    >
                      <MaterialCommunityIcons name={showCompleted ? 'chevron-down' : 'chevron-right'} size={16} color={theme.colors.onSurfaceVariant} />
                      <MaterialCommunityIcons name="check-circle-outline" size={16} color={colors.success} />
                      <Text style={[styles.completedTitle, { color: theme.colors.onSurface }]}>Completed sprints</Text>
                      <Text style={[styles.completedCount, { color: theme.colors.onSurfaceVariant }]}>{completedSprints.length}</Text>
                    </TouchableOpacity>
                    {showCompleted && (
                      <View style={styles.completedList}>
                        {completedSprints.map((sp) => (
                          <View key={sp.id} style={[styles.completedRow, { borderColor: theme.colors.outlineVariant }]}>
                            <Text style={[styles.completedName, { color: theme.colors.onSurface }]} numberOfLines={1}>{sp.name}</Text>
                            <Text style={[styles.completedMeta, { color: theme.colors.onSurfaceVariant }]}>Velocity: {sp.velocity || 0} pts</Text>
                            {!!sp.completedAt && <Text style={[styles.completedMeta, { color: theme.colors.onSurfaceVariant }]}>{formatDate(sp.completedAt)}</Text>}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </Surface>
            )}
          </View>

          <View style={styles.sideColumn}>
            <Surface style={[styles.sectionPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={0}>
              <SectionHeader
                icon="chart-donut"
                title="Delivery health"
                subtitle="Sprint status snapshot"
                tone={colors.success}
                theme={theme}
              />

              <StatBox label="Issues Done" value={`${doneIssues} / ${sprintIssues.length}`} icon="check-circle-outline" color={colors.success} theme={theme} />
              <StatBox label="Story Points" value={`${donePoints} / ${totalPoints}`} icon="star-circle-outline" color="#7C5EA7" theme={theme} />
              {daysLeft !== null && (
                <StatBox
                  label="Days Remaining"
                  value={daysLeft >= 0 ? `${daysLeft}d` : 'Overdue'}
                  icon="calendar-clock"
                  color={daysLeft >= 0 ? colors.info : colors.danger}
                  theme={theme}
                />
              )}

              {sprintIssues.length > 0 && (
                <View style={[styles.completionCard, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.background }]}>
                  <View style={styles.completionHeader}>
                    <Text style={[styles.completionValue, { color: theme.colors.onSurface }]}>{completePct}%</Text>
                    <Text style={[styles.completionLabel, { color: theme.colors.onSurfaceVariant }]}>issue completion</Text>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <View style={[styles.progressFill, { width: `${completePct}%`, backgroundColor: colors.success }]} />
                  </View>
                </View>
              )}
            </Surface>

            <Surface style={[styles.sectionPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={0}>
              <SectionHeader
                icon="view-list-outline"
                title="By status"
                subtitle="Workflow distribution"
                tone={colors.info}
                theme={theme}
              />
              {Object.entries(statusDist).map(([name, { count, color }]) => (
                <View key={name} style={styles.distRow}>
                  <View style={[styles.distDot, { backgroundColor: color }]} />
                  <Text style={[styles.distName, { color: theme.colors.onSurface }]} numberOfLines={1}>{name}</Text>
                  <Text style={[styles.distCount, { color: theme.colors.onSurfaceVariant }]}>{count}</Text>
                </View>
              ))}
              {Object.keys(statusDist).length === 0 && (
                <Text style={[styles.emptySmall, { color: theme.colors.onSurfaceVariant }]}>No issue statuses yet</Text>
              )}

              {burndown?.data?.length > 1 && (
                <>
                  <Divider style={{ marginVertical: 16 }} />
                  <Text style={[styles.chartTitle, { color: theme.colors.onSurfaceVariant }]}>Burndown</Text>
                  <BurndownChart data={burndown.data} total={burndown.total} theme={theme} accent={accent} />
                </>
              )}
            </Surface>

            <Surface style={[styles.sectionPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={0}>
              <SectionHeader
                icon="cursor-default-click-outline"
                title="Actions"
                subtitle="Jump to project tools"
                tone="#7C5EA7"
                theme={theme}
              />
              <View style={styles.actionStack}>
                <Button mode="outlined" icon="view-column-outline" compact onPress={() => navigation.navigate('Board', { projectId })} style={[styles.actionButton, { borderColor: theme.colors.outlineVariant }]}>View Board</Button>
                <Button mode="outlined" icon="format-list-bulleted" compact onPress={() => navigation.navigate('Backlog', { projectId })} style={[styles.actionButton, { borderColor: theme.colors.outlineVariant }]}>Backlog</Button>
                <Button mode="outlined" icon="cog-outline" compact onPress={() => navigation.navigate('ProjectSettings', { projectId })} style={[styles.actionButton, { borderColor: theme.colors.outlineVariant }]}>Settings</Button>
              </View>
            </Surface>
          </View>
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={!!completeDialog} onDismiss={() => setCompleteDialog(null)} style={styles.dialog}>
          <Dialog.Title>Complete Sprint</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Complete "{completeDialog?.name}"?</Text>
            {sprintIssues.length > 0 && sprintIssues.length - doneIssues > 0 && (
              <View style={[styles.incompleteWarning, { backgroundColor: colors.warningLight, borderColor: '#FED7AA' }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.warning} />
                <Text variant="bodySmall" style={{ color: '#92400E', marginLeft: 8, flex: 1 }}>
                  {sprintIssues.length - doneIssues} issue{sprintIssues.length - doneIssues !== 1 ? 's' : ''} are not done and will move to the backlog.
                </Text>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCompleteDialog(null)}>Cancel</Button>
            <Button mode="contained" onPress={handleComplete} loading={completing} buttonColor={colors.success}>
              Complete Sprint
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!startDialog} onDismiss={() => { setStartDialog(null); setStartEndDate(''); }} style={[styles.dialog, { maxWidth: 440 }]}>
          <Dialog.Title style={{ fontSize: 17, fontWeight: '900' }}>Start Sprint</Dialog.Title>
          <Dialog.Content style={{ gap: 14 }}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Starting "{startDialog?.name}" will make it the active sprint on the board.
            </Text>

            {/* End date picker */}
            <View style={{
              borderWidth: 1, borderRadius: 8,
              borderColor: (startEndDate || startDialog?.endDate) ? '#10B981' : theme.colors.outline,
              backgroundColor: theme.dark ? '#0D1B2E' : '#F8FAFC',
              overflow: 'hidden',
            }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                paddingHorizontal: 12, paddingTop: 10, paddingBottom: 2,
              }}>
                <MaterialCommunityIcons
                  name="calendar-end"
                  size={15}
                  color={(startEndDate || startDialog?.endDate) ? '#10B981' : theme.colors.onSurfaceVariant}
                />
                <Text style={{
                  fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5,
                  color: (startEndDate || startDialog?.endDate) ? '#10B981' : theme.colors.onSurfaceVariant,
                }}>End date *</Text>
              </View>
              <input
                type="date"
                value={startEndDate || (startDialog?.endDate ? startDialog.endDate.split('T')[0] : '')}
                min={(() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; })()}
                onChange={(e) => setStartEndDate(e.target.value)}
                style={{
                  display: 'block', width: '100%', padding: '4px 12px 10px',
                  border: 'none', outline: 'none', boxSizing: 'border-box',
                  fontSize: 14, fontWeight: '700',
                  backgroundColor: 'transparent',
                  color: theme.dark ? '#E2E8F0' : '#0F172A',
                  colorScheme: theme.dark ? 'dark' : 'light',
                  cursor: 'pointer',
                }}
              />
            </View>
            <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>
              End date is required and must be at least 1 week from today.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => { setStartDialog(null); setStartEndDate(''); }}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleStart}
              loading={starting}
              disabled={!startEndDate && !startDialog?.endDate}
            >
              Start Sprint
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {!!toast && <AppToast message={toast} type={toastType} onDone={() => setToast('')} />}
    </View>
  );
};

const SprintIssueRow = ({ issue, theme, onPress }) => {
  const typeInfo = TYPE_ICONS[issue.type] || TYPE_ICONS.task;
  const priorityColor = PRIORITY_COLORS[issue.priority] || colors.onSurfaceVariant;
  const priorityIcon = PRIORITY_ICONS[issue.priority] || 'minus';
  const statusColor = issue.status?.color || colors.onSurfaceVariant;

  return (
    <TouchableOpacity
      style={[styles.issueRow, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.background }]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={[styles.issueTypeIcon, { backgroundColor: `${typeInfo.color}14` }]}>
        <MaterialCommunityIcons name={typeInfo.icon} size={16} color={typeInfo.color} />
      </View>
      <View style={styles.issueMain}>
        <View style={styles.issueTitleLine}>
          <Text style={[styles.issueKey, { color: theme.colors.onSurfaceVariant }]}>{issue.key}</Text>
          <Text style={[styles.issueTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>{issue.title}</Text>
        </View>
        <View style={styles.issueMetaLine}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.issueMetaText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{issue.status?.name || 'Unknown'}</Text>
        </View>
      </View>
      <View style={styles.issueAssignee}>
        <Avatar user={issue.assignee} size={30} />
        <Text style={[styles.issueAssigneeText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{personName(issue.assignee)}</Text>
      </View>
      <View style={[styles.priorityPill, { backgroundColor: `${priorityColor}12`, borderColor: `${priorityColor}28` }]}>
        <MaterialCommunityIcons name={priorityIcon} size={13} color={priorityColor} />
        <Text style={[styles.priorityText, { color: priorityColor }]}>{titleCase(issue.priority || 'medium')}</Text>
      </View>
      <View style={[styles.pointsBadge, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
        <Text style={[styles.pointsText, { color: theme.colors.onSurfaceVariant }]}>{issue.storyPoints != null ? issue.storyPoints : '-'}</Text>
      </View>
    </TouchableOpacity>
  );
};

const SectionHeader = ({ icon, title, subtitle, tone, theme, action }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderLeft}>
      <View style={[styles.sectionIcon, { backgroundColor: `${tone}14` }]}>
        <MaterialCommunityIcons name={icon} size={17} color={tone} />
      </View>
      <View style={styles.sectionTitleBlock}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{title}</Text>
        {!!subtitle && <Text style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>{subtitle}</Text>}
      </View>
    </View>
    {action}
  </View>
);

const MetricTile = ({ icon, value, label, detail, tone, theme }) => (
  <View style={[styles.metricTile, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
    <View style={[styles.metricIcon, { backgroundColor: `${tone}14` }]}>
      <MaterialCommunityIcons name={icon} size={17} color={tone} />
    </View>
    <View style={styles.metricCopy}>
      <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      {!!detail && <Text style={[styles.metricDetail, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{detail}</Text>}
    </View>
  </View>
);

const SprintStatusBadge = ({ sprint, isActive, theme }) => {
  const isDone = sprint.status === 'completed';
  const tone = isDone ? colors.success : isActive ? colors.info : colors.warning;
  const label = isDone ? 'Completed' : isActive ? 'Active' : titleCase(sprint.status || 'planned');

  return (
    <View style={[styles.statusBadge, { backgroundColor: `${tone}14`, borderColor: `${tone}30` }]}>
      <View style={[styles.statusBadgeDot, { backgroundColor: tone }]} />
      <Text style={[styles.statusBadgeText, { color: tone }]}>{label}</Text>
    </View>
  );
};

const StatBox = ({ label, value, icon, color, theme }) => (
  <View style={[styles.statBox, { backgroundColor: `${color}10`, borderColor: `${color}24` }]}>
    <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
      <MaterialCommunityIcons name={icon} size={16} color={color} />
    </View>
    <View style={styles.statCopy}>
      <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>{value}</Text>
    </View>
  </View>
);

const EmptyState = ({ icon, title, subtitle, theme, action }) => (
  <View style={styles.emptyState}>
    <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
      <MaterialCommunityIcons name={icon} size={28} color={theme.colors.onSurfaceVariant} />
    </View>
    <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>{title}</Text>
    <Text style={[styles.emptySub, { color: theme.colors.onSurfaceVariant }]}>{subtitle}</Text>
    {!!action && (
      <Button mode="outlined" icon="plus" compact onPress={action} style={styles.smallButton}>
        Go to Backlog
      </Button>
    )}
  </View>
);

const BurndownChart = ({ data, total, accent }) => {
  if (!data || data.length < 2) return null;
  const W = 280;
  const H = 138;
  const PAD = { t: 8, r: 8, b: 28, l: 32 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const n = data.length;
  const maxY = Math.max(total || 0, ...data.map((d) => d.remaining), 1);

  const toX = (i) => PAD.l + (i / Math.max(n - 1, 1)) * iW;
  const toY = (v) => PAD.t + (1 - Math.min(v, maxY) / maxY) * iH;

  const idealPts = `${toX(0)},${toY(maxY)} ${toX(n - 1)},${toY(0)}`;
  const actualPts = data.map((d, i) => `${toX(i)},${toY(d.remaining)}`).join(' ');
  const areaBot = PAD.t + iH;
  const step = Math.max(1, Math.floor(n / 4));
  const xLabels = data.reduce((acc, d, i) => {
    if (i % step === 0 || i === n - 1) {
      const dt = new Date(d.date);
      acc.push({ i, label: `${dt.getMonth() + 1}/${dt.getDate()}` });
    }
    return acc;
  }, []);

  return (
    <svg width={W} height={H} style={{ overflow: 'visible', display: 'block' }}>
      {[0, 0.5, 1].map((pct) => {
        const y = toY(maxY * pct);
        const val = Math.round(maxY * (1 - pct));
        return (
          <g key={pct}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#E2E8F0" strokeWidth={1} />
            <text x={PAD.l - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#94A3B8">{val}</text>
          </g>
        );
      })}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + iH} stroke="#CBD5E1" strokeWidth={1} />
      <line x1={PAD.l} y1={PAD.t + iH} x2={W - PAD.r} y2={PAD.t + iH} stroke="#CBD5E1" strokeWidth={1} />
      <polyline points={idealPts} fill="none" stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="5,3" />
      <polygon points={`${toX(0)},${areaBot} ${actualPts} ${toX(n - 1)},${areaBot}`} fill="#DBEAFE" opacity="0.55" />
      <polyline points={actualPts} fill="none" stroke={accent || NAVY} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {xLabels.map(({ i, label }) => (
        <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="#94A3B8">{label}</text>
      ))}
    </svg>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'column' },

  hero: {
    borderBottomWidth: 1,
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 16,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
  },
  heroTopCompact: { flexDirection: 'column' },
  heroIdentity: {
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
  sprintAvatar: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextBlock: { flex: 1, minWidth: 0, gap: 5 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  eyebrow: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  heroTitle: { fontSize: 23, fontWeight: '900' },
  heroSubtitle: { fontSize: 13, lineHeight: 19 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  actionButton: { borderRadius: 8, borderWidth: 1 },
  smallButton: { borderRadius: 8 },
  containedLabel: { color: '#fff', fontSize: 12, fontWeight: '800' },
  outlinedLabel: { fontSize: 12, fontWeight: '800' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: '900' },
  heroMetrics: { flexDirection: 'row', gap: 12 },
  heroMetricsWrap: { flexWrap: 'wrap' },
  metricTile: {
    flex: 1,
    minWidth: 170,
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
  metricCopy: { flex: 1, minWidth: 0 },
  metricValue: { fontSize: 17, fontWeight: '900' },
  metricLabel: { fontSize: 11, fontWeight: '800', marginTop: 1 },
  metricDetail: { fontSize: 11, marginTop: 1 },
  progressPanel: { borderWidth: 1, borderRadius: 8, padding: 12, gap: 10 },
  progressPanelTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  progressTitle: { fontSize: 12, fontWeight: '900' },
  progressSub: { fontSize: 11, marginTop: 2 },
  progressValue: { fontSize: 13, fontWeight: '900' },
  progressTrack: { height: 8, borderRadius: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 8 },

  pageScroll: { flex: 1 },
  pageContent: { padding: 28, paddingBottom: 56 },
  layoutGrid: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  layoutGridStack: { flexDirection: 'column' },
  mainColumn: { flex: 1.65, gap: 18, minWidth: 0, width: '100%' },
  sideColumn: { flex: 1, gap: 18, minWidth: 320, width: '100%' },
  sectionPanel: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 18,
    boxShadow: '0 8px 20px rgba(20,33,61,0.06)',
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  sectionIcon: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionTitleBlock: { flex: 1, minWidth: 0 },
  sectionTitle: { fontSize: 14, fontWeight: '900' },
  sectionSubtitle: { fontSize: 12, marginTop: 2 },

  issueList: { gap: 10 },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    cursor: 'pointer',
  },
  issueTypeIcon: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  issueMain: { flex: 1.8, minWidth: 0, gap: 4 },
  issueTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  issueKey: { fontSize: 11, fontWeight: '900', flexShrink: 0 },
  issueTitle: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '800' },
  issueMetaLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  issueMetaText: { fontSize: 11, fontWeight: '700' },
  issueAssignee: { flex: 0.9, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  issueAssigneeText: { flex: 1, fontSize: 12, fontWeight: '700' },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexShrink: 0,
  },
  priorityText: { fontSize: 11, fontWeight: '900' },
  pointsBadge: { minWidth: 30, height: 28, borderWidth: 1, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  pointsText: { fontSize: 11, fontWeight: '900' },
  emptyState: { minHeight: 190, alignItems: 'center', justifyContent: 'center', gap: 9, padding: 24 },
  emptyIcon: { width: 58, height: 58, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '900' },
  emptySub: { fontSize: 13, textAlign: 'center', maxWidth: 360, lineHeight: 19 },

  sprintGrid: { gap: 10 },
  smallSprintCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 8, padding: 12 },
  smallSprintIcon: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  smallSprintText: { flex: 1, minWidth: 0 },
  smallSprintName: { fontSize: 13, fontWeight: '900' },
  smallSprintMeta: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  completedToggle: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 8, padding: 11 },
  completedTitle: { flex: 1, fontSize: 13, fontWeight: '900' },
  completedCount: { fontSize: 12, fontWeight: '900' },
  completedList: { gap: 8, marginTop: 10 },
  completedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 8, padding: 10 },
  completedName: { flex: 1, fontSize: 12, fontWeight: '800' },
  completedMeta: { fontSize: 11, fontWeight: '700' },

  statBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 10 },
  statIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statCopy: { flex: 1, minWidth: 0 },
  statLabel: { fontSize: 11, fontWeight: '700' },
  statValue: { fontSize: 15, fontWeight: '900', marginTop: 2 },
  completionCard: { borderWidth: 1, borderRadius: 8, padding: 12, gap: 9 },
  completionHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  completionValue: { fontSize: 24, fontWeight: '900' },
  completionLabel: { fontSize: 11, fontWeight: '800' },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  distDot: { width: 9, height: 9, borderRadius: 5 },
  distName: { flex: 1, fontSize: 12, fontWeight: '800' },
  distCount: { fontSize: 12, fontWeight: '900' },
  emptySmall: { fontSize: 12, fontWeight: '700' },
  chartTitle: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 10 },
  actionStack: { gap: 9 },

  dialog: { maxWidth: 460, alignSelf: 'center', width: '100%', borderRadius: 8 },
  incompleteWarning: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 12 },
});

export default SprintScreen;
