import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import {
  Text, Surface, useTheme, Button,
  Dialog, Portal, TextInput,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  useGetProjectQuery,
  useGetProjectMembersQuery,
  useGetProjectStatsQuery,
} from '../../api/projectApi';
import { useGetSprintsQuery, useGetActiveSprintQuery, useCreateSprintMutation } from '../../api/sprintApi';
import { useGetProjectIssuesQuery, useGetIssuesQuery, useMoveIssuesToSprintMutation } from '../../api/issueApi';
import LoadingScreen from '../../components/common/LoadingScreen';
import Avatar from '../../components/common/Avatar';
import AppToast from '../../components/common/AppToast';
import { formatDate, formatRelative, getSprintProgress, getDaysRemaining } from '../../utils/dateUtils';
import { ROLE_LABELS } from '../../constants';
import colors from '../../theme/colors';

const NAVY = colors.brand.navy;

const TAB_OVERVIEW = 'overview';
const TAB_BOARD = 'board';
const TAB_BACKLOG = 'backlog';
const TAB_SPRINTS = 'sprints';
const TAB_MEMBERS = 'members';
const TAB_ROADMAP = 'roadmap';
const TAB_CALENDAR = 'calendar';

const tabs = [TAB_OVERVIEW, TAB_BOARD, TAB_BACKLOG, TAB_SPRINTS, TAB_ROADMAP, TAB_CALENDAR, TAB_MEMBERS];
const TAB_LABEL = {
  overview: 'Overview',
  board: 'Board',
  backlog: 'Backlog',
  sprints: 'Sprints',
  roadmap: 'Roadmap',
  calendar: 'Calendar',
  members: 'Members',
};
const TAB_ICON = {
  overview: 'view-dashboard-outline',
  board: 'view-column-outline',
  backlog: 'format-list-bulleted',
  sprints: 'lightning-bolt-outline',
  roadmap: 'chart-gantt',
  calendar: 'calendar-month-outline',
  members: 'account-group-outline',
};

const SPRINT_STATUS_CFG = {
  active: {
    bg: colors.infoLight,
    text: colors.info,
    dot: colors.info,
    icon: 'play-circle-outline',
    label: 'Active',
  },
  future: {
    bg: colors.surfaceVariant,
    text: colors.onSurfaceVariant,
    dot: '#8C98A8',
    icon: 'clock-outline',
    label: 'Planned',
  },
  completed: {
    bg: colors.successLight,
    text: colors.success,
    dot: colors.success,
    icon: 'check-circle-outline',
    label: 'Completed',
  },
};

const PROJECT_STATUS_TONES = {
  active: {
    bg: colors.successLight,
    text: colors.success,
    icon: 'check-circle-outline',
    label: 'Active',
  },
  archived: {
    bg: colors.warningLight,
    text: colors.warning,
    icon: 'archive-outline',
    label: 'Archived',
  },
  on_hold: {
    bg: '#FFF4E6',
    text: '#A85B00',
    icon: 'pause-circle-outline',
    label: 'On Hold',
  },
};

const ISSUE_TYPE_ICONS = {
  bug: 'bug-outline',
  story: 'bookmark-outline',
  task: 'checkbox-marked-circle-outline',
  epic: 'hexagon-outline',
  subtask: 'subdirectory-arrow-right',
  risk: 'alert-outline',
  incident: 'alert-octagon-outline',
};

const PRIORITY_TONES = {
  highest: { bg: colors.dangerLight, text: colors.danger },
  high: { bg: colors.dangerLight, text: colors.danger },
  medium: { bg: colors.warningLight, text: colors.warning },
  low: { bg: colors.successLight, text: colors.success },
  lowest: { bg: colors.successLight, text: colors.success },
};

const clampPercent = (value) => Math.min(100, Math.max(0, Math.round(value || 0)));

const titleCase = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());

const getInitials = (project) =>
  (project?.key || project?.name || 'PR').substring(0, 2).toUpperCase();

const getPersonName = (user) => {
  if (!user) return 'Unassigned';
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return fullName || user.email || user.name || 'Unassigned';
};

const ProjectDetailScreen = ({ route, navigation }) => {
  const { projectId } = route.params;
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 1180;
  const isNarrow = width < 820;

  const [activeTab, setActiveTab] = useState(TAB_OVERVIEW);
  const [sprintDialog, setSprintDialog] = useState(false);
  const [sprintName, setSprintName] = useState('');
  const [sprintGoal, setSprintGoal] = useState('');
  const [addIssuesDialog, setAddIssuesDialog] = useState(null);
  const [selectedIssueIds, setSelectedIssueIds] = useState([]);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');
  const showToast = (msg, type = 'success') => { setToastType(type); setToast(msg); };

  const { data: projectResp, isLoading } = useGetProjectQuery(projectId);
  const { data: membersResp } = useGetProjectMembersQuery(projectId);
  const { data: statsResp } = useGetProjectStatsQuery(projectId);
  const { data: activeSprintResp } = useGetActiveSprintQuery(projectId);
  const { data: sprintsResp, refetch: refetchSprints } = useGetSprintsQuery({ projectId });
  const { data: issuesResp } = useGetProjectIssuesQuery({ projectId, limit: 20 });
  const { data: backlogResp } = useGetIssuesQuery({ projectId, noSprint: 'true', limit: 200 });
  const [createSprint, { isLoading: creatingSprint }] = useCreateSprintMutation();
  const [moveIssuesToSprint, { isLoading: movingIssues }] = useMoveIssuesToSprintMutation();

  const backlogIssues = backlogResp?.data?.data || [];

  const handleAddIssuesToSprint = async () => {
    if (!selectedIssueIds.length || !addIssuesDialog) return;
    try {
      await moveIssuesToSprint({ issueIds: selectedIssueIds, sprintId: addIssuesDialog }).unwrap();
      setAddIssuesDialog(null);
      setSelectedIssueIds([]);
      refetchSprints();
      showToast(`${selectedIssueIds.length} issue(s) added to sprint`);
    } catch (err) {
      showToast(err?.data?.message || 'Failed to move issues', 'error');
    }
  };

  const toggleIssue = (id) =>
    setSelectedIssueIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  const handleCreateSprint = async () => {
    if (!sprintName.trim()) return;
    try {
      await createSprint({ projectId, name: sprintName.trim(), goal: sprintGoal.trim() || undefined }).unwrap();
      setSprintDialog(false);
      setSprintName('');
      setSprintGoal('');
      refetchSprints();
      showToast('Sprint created successfully');
    } catch (err) {
      showToast(err?.data?.message || 'Failed to create sprint', 'error');
    }
  };

  if (isLoading) return <LoadingScreen />;
  const project = projectResp?.data;
  if (!project) return null;

  const members = membersResp?.data || [];
  const activeSprint = activeSprintResp?.data;
  const sprintsList = sprintsResp?.data?.data || [];
  const issuesList = issuesResp?.data?.data || [];
  const stats = statsResp?.data || {};
  const cardBg = theme.colors.surface;
  const accent = project.color || NAVY;
  const accentSoft = `${accent}12`;
  const accentMid = `${accent}28`;
  const statusTone = PROJECT_STATUS_TONES[project.status || 'active'] || PROJECT_STATUS_TONES.active;

  const sprintProgress = activeSprint ? getSprintProgress(activeSprint.startDate, activeSprint.endDate) : 0;
  const daysLeft = activeSprint ? getDaysRemaining(activeSprint.endDate) : null;
  const completedIssues = activeSprint?.issues?.filter((i) => i.status?.category === 'done').length || 0;
  const totalSprintIssues = activeSprint?.issues?.length || 0;
  const sprintDonePct = totalSprintIssues > 0 ? clampPercent((completedIssues / totalSprintIssues) * 100) : 0;
  const activeSprintAssignees = activeSprint?.issues?.length
    ? [...new Map(
      activeSprint.issues
        .filter((issue) => issue.assignee)
        .map((issue) => [issue.assignee.id, issue.assignee])
    ).values()]
    : [];

  const totalIssues = stats.totalIssues ?? issuesResp?.data?.pagination?.total ?? issuesList.length;
  const doneIssues = stats.doneIssues ?? issuesList.filter((issue) => issue.status?.category === 'done').length;
  const donePct = totalIssues > 0 ? clampPercent((doneIssues / totalIssues) * 100) : 0;
  const backlogCount = backlogResp?.data?.pagination?.total ?? backlogIssues.length;
  const activeSprintCount = sprintsList.filter((sprint) => sprint.status === 'active').length;
  const futureSprintCount = sprintsList.filter((sprint) => sprint.status === 'future').length;
  const completedSprintCount = sprintsList.filter((sprint) => sprint.status === 'completed').length;
  const highPriorityCount = issuesList.filter((issue) => ['highest', 'high'].includes(issue.priority)).length;
  const unassignedCount = issuesList.filter((issue) => !issue.assignee).length;

  const issuesByStatus = issuesList.reduce((acc, issue) => {
    const name = issue.status?.name || 'Unknown';
    if (!acc[name]) acc[name] = { count: 0, color: issue.status?.color || colors.onSurfaceVariant };
    acc[name].count += 1;
    return acc;
  }, {});

  const statusEntries = Object.entries(issuesByStatus)
    .sort(([, a], [, b]) => b.count - a.count);

  const handleTabPress = (tab) => {
    if (tab === TAB_BOARD) {
      navigation.navigate('Board', { projectId });
      return;
    }
    if (tab === TAB_BACKLOG) {
      navigation.navigate('Backlog', { projectId });
      return;
    }
    if (tab === TAB_ROADMAP) {
      navigation.navigate('Roadmap', { projectId });
      return;
    }
    if (tab === TAB_CALENDAR) {
      navigation.navigate('Calendar', { projectId });
      return;
    }
    setActiveTab(tab);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Surface style={[styles.projectHeader, { backgroundColor: cardBg, borderBottomColor: theme.colors.outlineVariant }]} elevation={0}>
        <View style={[styles.headerMainRow, isCompact && styles.headerMainRowCompact]}>
          <View style={styles.headerIdentity}>
            <View style={styles.headerTitleRow}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Projects')}
                style={[styles.backBtn, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}
              >
                <MaterialCommunityIcons name="arrow-left" size={18} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>

              <View style={[styles.projectAvatar, { backgroundColor: accent }]}>
                <Text style={styles.projectAvatarText}>{getInitials(project)}</Text>
              </View>

              <View style={styles.projectTitleBlock}>
                <View style={styles.eyebrowRow}>
                  <Text style={[styles.projectEyebrow, { color: theme.colors.onSurfaceVariant }]}>Project details</Text>
                  <StatusPill tone={statusTone} />
                </View>
                <Text style={[styles.projectName, { color: theme.colors.onSurface }]} numberOfLines={2}>
                  {project.name}
                </Text>
                <View style={styles.metaPillRow}>
                  <MetaPill icon="pound" label={project.key} tone={accent} theme={theme} />
                  <MetaPill icon="source-branch" label={titleCase(project.type || 'scrum')} theme={theme} />
                  <MetaPill
                    icon={project.isPrivate ? 'lock-outline' : 'lock-open-outline'}
                    label={project.isPrivate ? 'Private' : 'Org visible'}
                    theme={theme}
                  />
                </View>
              </View>
            </View>

            <Text style={[styles.projectDescription, { color: theme.colors.onSurfaceVariant }]} numberOfLines={3}>
              {project.description || 'No project description yet.'}
            </Text>
          </View>

          <View style={[styles.headerActions, isNarrow && styles.headerActionsNarrow]}>
            <Button
              icon="view-column-outline"
              mode="outlined"
              compact
              onPress={() => navigation.navigate('Board', { projectId })}
              style={[styles.headerButton, { borderColor: theme.colors.outlineVariant }]}
              labelStyle={[styles.headerButtonLabel, { color: theme.colors.primary }]}
            >
              Board
            </Button>
            <Button
              icon="format-list-bulleted"
              mode="outlined"
              compact
              onPress={() => navigation.navigate('Backlog', { projectId })}
              style={[styles.headerButton, { borderColor: theme.colors.outlineVariant }]}
              labelStyle={[styles.headerButtonLabel, { color: theme.colors.primary }]}
            >
              Backlog
            </Button>
            <Button
              icon="plus"
              mode="contained"
              compact
              onPress={() => navigation.navigate('CreateIssue', { projectId })}
              style={[styles.headerButton, { backgroundColor: accent }]}
              labelStyle={styles.containedButtonLabel}
            >
              Create Issue
            </Button>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProjectSettings', { projectId })}
              style={[styles.settingsBtn, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}
            >
              <MaterialCommunityIcons name="cog-outline" size={18} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.headerMetrics, isCompact && styles.headerMetricsCompact]}>
          <MetricTile
            icon="ticket-confirmation-outline"
            value={totalIssues}
            label="Total issues"
            detail={`${doneIssues} done`}
            tone={colors.info}
            theme={theme}
          />
          <MetricTile
            icon="check-decagram-outline"
            value={`${donePct}%`}
            label="Completion"
            detail="All tracked work"
            tone={colors.success}
            theme={theme}
          />
          <MetricTile
            icon="lightning-bolt-outline"
            value={sprintsList.length}
            label="Sprints"
            detail={`${activeSprintCount} active`}
            tone={colors.warning}
            theme={theme}
          />
          <MetricTile
            icon="account-group-outline"
            value={members.length}
            label="Team"
            detail={members.length === 1 ? 'member' : 'members'}
            tone="#7C5EA7"
            theme={theme}
          />
        </View>
      </Surface>

      <View style={[styles.tabShell, { backgroundColor: cardBg, borderBottomColor: theme.colors.outlineVariant }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabNav}>
          {tabs.map((tab) => {
            const active = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => handleTabPress(tab)}
                style={[
                  styles.tabItem,
                  {
                    backgroundColor: active ? accentSoft : 'transparent',
                    borderColor: active ? accentMid : 'transparent',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={TAB_ICON[tab]}
                  size={16}
                  color={active ? accent : theme.colors.onSurfaceVariant}
                />
                <Text style={[
                  styles.tabLabel,
                  { color: active ? accent : theme.colors.onSurfaceVariant, fontWeight: active ? '800' : '600' },
                ]}>
                  {TAB_LABEL[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={[styles.contentInner, isNarrow && styles.contentInnerNarrow]}>
        {activeTab === TAB_OVERVIEW && (
          <View style={[styles.overviewGrid, isCompact && styles.overviewGridStack]}>
            <View style={styles.primaryCol}>
              <Surface style={[styles.panel, { backgroundColor: cardBg, borderColor: theme.colors.outlineVariant }]} elevation={0}>
                <SectionHeader
                  icon="target"
                  title="Sprint focus"
                  subtitle={activeSprint ? 'Current sprint execution' : 'No sprint is running'}
                  tone={accent}
                  theme={theme}
                  action={activeSprint ? (
                    <Button
                      mode="contained"
                      compact
                      icon="arrow-right"
                      onPress={() => navigation.navigate('Sprint', { projectId })}
                      style={[styles.smallActionButton, { backgroundColor: accent }]}
                      labelStyle={styles.smallActionLabel}
                    >
                      Open Sprint
                    </Button>
                  ) : null}
                />

                {activeSprint ? (
                  <View style={styles.sprintFocusBody}>
                    <View style={[styles.sprintFeature, { backgroundColor: accentSoft, borderColor: accentMid }]}>
                      <View style={styles.sprintFeatureMain}>
                        <Text style={[styles.sprintKicker, { color: accent }]}>Active sprint</Text>
                        <Text style={[styles.sprintFeatureName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                          {activeSprint.name}
                        </Text>
                        {!!activeSprint.goal && (
                          <Text style={[styles.sprintFeatureGoal, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
                            {activeSprint.goal}
                          </Text>
                        )}
                      </View>
                      <View style={[
                        styles.daysBadge,
                        { backgroundColor: daysLeft !== null && daysLeft < 0 ? colors.danger : accent },
                      ]}>
                        <Text style={styles.daysBadgeValue}>
                          {daysLeft !== null ? (daysLeft >= 0 ? daysLeft : '!') : '-'}
                        </Text>
                        <Text style={styles.daysBadgeLabel}>
                          {daysLeft !== null ? (daysLeft >= 0 ? 'days left' : 'overdue') : 'days'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.progressHeader}>
                      <Text style={[styles.progressTitle, { color: theme.colors.onSurface }]}>Sprint progress</Text>
                      <Text style={[styles.progressValue, { color: accent }]}>{sprintDonePct}% done</Text>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
                      <View style={[styles.progressFill, { width: `${sprintDonePct}%`, backgroundColor: colors.success }]} />
                    </View>

                    <View style={[styles.sprintStatGrid, isNarrow && styles.sprintStatGridNarrow]}>
                      <SprintStat icon="check-circle-outline" color={colors.success} value={`${completedIssues}/${totalSprintIssues}`} label="Closed" theme={theme} />
                      <SprintStat icon="clock-outline" color={colors.info} value={`${sprintProgress}%`} label="Timeline" theme={theme} />
                      <SprintStat icon="ticket-outline" color={colors.warning} value={totalSprintIssues - completedIssues} label="Remaining" theme={theme} />
                    </View>

                    <View style={[styles.sprintFooter, { borderTopColor: theme.colors.outlineVariant }]}>
                      <View style={styles.avatarCluster}>
                        {activeSprintAssignees.slice(0, 5).map((user, idx) => (
                          <View
                            key={user.id}
                            style={[styles.clusterAvatar, { marginLeft: idx === 0 ? 0 : -8, zIndex: 10 - idx }]}
                          >
                            <Avatar user={user} size={30} />
                          </View>
                        ))}
                        {activeSprintAssignees.length === 0 && (
                          <Text style={[styles.subtleText, { color: theme.colors.onSurfaceVariant }]}>No assignees yet</Text>
                        )}
                      </View>
                      <Text style={[styles.subtleText, { color: theme.colors.onSurfaceVariant }]}>
                        {formatDate(activeSprint.startDate)} {activeSprint.endDate ? `to ${formatDate(activeSprint.endDate)}` : ''}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptySprintPanel}>
                    <View style={[styles.emptyIconLarge, { backgroundColor: accentSoft }]}>
                      <MaterialCommunityIcons name="lightning-bolt-outline" size={30} color={accent} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Ready for the next sprint</Text>
                    <Text style={[styles.emptyCopy, { color: theme.colors.onSurfaceVariant }]}>
                      Create a sprint when the backlog is ready to pull into focused execution.
                    </Text>
                    <View style={styles.emptyActions}>
                      <Button
                        mode="contained"
                        icon="plus"
                        compact
                        onPress={() => { setActiveTab(TAB_SPRINTS); setSprintDialog(true); }}
                        style={[styles.smallActionButton, { backgroundColor: accent }]}
                        labelStyle={styles.smallActionLabel}
                      >
                        Create Sprint
                      </Button>
                      <Button
                        mode="outlined"
                        icon="format-list-bulleted"
                        compact
                        onPress={() => navigation.navigate('Backlog', { projectId })}
                        style={[styles.smallActionButton, { borderColor: theme.colors.outlineVariant }]}
                        labelStyle={[styles.outlinedActionLabel, { color: accent }]}
                      >
                        View Backlog
                      </Button>
                    </View>
                  </View>
                )}
              </Surface>

              <View style={[styles.dualPanels, isNarrow && styles.dualPanelsStack]}>
                <Surface style={[styles.panel, styles.flexPanel, { backgroundColor: cardBg, borderColor: theme.colors.outlineVariant }]} elevation={0}>
                  <SectionHeader
                    icon="chart-bar"
                    title="Issue health"
                    subtitle={`${totalIssues} total across the project`}
                    tone={colors.info}
                    theme={theme}
                  />
                  {statusEntries.length === 0 ? (
                    <EmptyInline icon="playlist-remove" title="No issues yet" theme={theme} />
                  ) : (
                    <View style={styles.distributionBody}>
                      <View style={styles.healthSummary}>
                        <View>
                          <Text style={[styles.healthValue, { color: theme.colors.onSurface }]}>{donePct}%</Text>
                          <Text style={[styles.healthLabel, { color: theme.colors.onSurfaceVariant }]}>completion</Text>
                        </View>
                        <View style={styles.healthProgressWrap}>
                          <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
                            <View style={[styles.progressFill, { width: `${donePct}%`, backgroundColor: colors.success }]} />
                          </View>
                          <Text style={[styles.subtleText, { color: theme.colors.onSurfaceVariant }]}>
                            {doneIssues} closed, {Math.max(totalIssues - doneIssues, 0)} open
                          </Text>
                        </View>
                      </View>

                      {statusEntries.map(([name, { count, color }]) => {
                        const pct = totalIssues > 0 ? clampPercent((count / totalIssues) * 100) : 0;
                        return (
                          <View key={name} style={styles.distRow}>
                            <View style={[styles.distDot, { backgroundColor: color }]} />
                            <Text style={[styles.distLabel, { color: theme.colors.onSurface }]} numberOfLines={1}>{name}</Text>
                            <View style={[styles.distBarWrap, { backgroundColor: theme.colors.surfaceVariant }]}>
                              <View style={[styles.distBarFill, { width: `${Math.max(pct, 4)}%`, backgroundColor: color }]} />
                            </View>
                            <Text style={[styles.distCount, { color: theme.colors.onSurfaceVariant }]}>{count}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </Surface>

                <Surface style={[styles.panel, styles.flexPanel, { backgroundColor: cardBg, borderColor: theme.colors.outlineVariant }]} elevation={0}>
                  <SectionHeader
                    icon="gauge"
                    title="Workload"
                    subtitle="Current project signals"
                    tone={colors.warning}
                    theme={theme}
                  />
                  <View style={styles.workloadList}>
                    <WorkloadItem icon="tray-full" label="Backlog" value={backlogCount} tone={colors.info} theme={theme} />
                    <WorkloadItem icon="alert-circle-outline" label="High priority" value={highPriorityCount} tone={colors.danger} theme={theme} />
                    <WorkloadItem icon="account-off-outline" label="Unassigned" value={unassignedCount} tone={colors.warning} theme={theme} />
                    <WorkloadItem icon="lightning-bolt" label="In sprint" value={totalSprintIssues} tone={colors.success} theme={theme} />
                  </View>
                </Surface>
              </View>

              <Surface style={[styles.panel, { backgroundColor: cardBg, borderColor: theme.colors.outlineVariant }]} elevation={0}>
                <SectionHeader
                  icon="timeline-text-outline"
                  title="Recent work"
                  subtitle={issuesList.length ? 'Latest issues in this project' : 'No issue activity yet'}
                  tone="#7C5EA7"
                  theme={theme}
                  action={issuesList.length ? (
                    <TouchableOpacity onPress={() => navigation.navigate('Backlog', { projectId })} style={styles.textAction}>
                      <Text style={[styles.textActionLabel, { color: accent }]}>View backlog</Text>
                      <MaterialCommunityIcons name="arrow-right" size={15} color={accent} />
                    </TouchableOpacity>
                  ) : null}
                />
                {issuesList.length === 0 ? (
                  <EmptyInline icon="ticket-outline" title="Create the first issue to start tracking work" theme={theme} />
                ) : (
                  <View style={[styles.recentList, { borderColor: theme.colors.outlineVariant }]}>
                    {issuesList.slice(0, 6).map((issue) => (
                      <RecentIssueRow
                        key={issue.id}
                        issue={issue}
                        theme={theme}
                        onPress={() => navigation.navigate('IssueDetail', { issueId: issue.id })}
                      />
                    ))}
                  </View>
                )}
              </Surface>
            </View>

            <View style={styles.secondaryCol}>
              <Surface style={[styles.panel, { backgroundColor: cardBg, borderColor: theme.colors.outlineVariant }]} elevation={0}>
                <SectionHeader
                  icon="folder-information-outline"
                  title="Project profile"
                  subtitle="Core details"
                  tone={accent}
                  theme={theme}
                />
                <View style={styles.infoList}>
                  <InfoRow label="Key" value={project.key} theme={theme} />
                  <InfoRow label="Type" value={titleCase(project.type || 'scrum')} theme={theme} />
                  <InfoRow label="Lead" value={getPersonName(project.lead)} theme={theme} />
                  <InfoRow label="Status" value={statusTone.label} valueColor={statusTone.text} theme={theme} />
                  <InfoRow label="Start" value={project.startDate ? formatDate(project.startDate) : 'Not set'} theme={theme} />
                  <InfoRow label="End" value={project.endDate ? formatDate(project.endDate) : 'Not set'} theme={theme} />
                </View>
              </Surface>

              <Surface style={[styles.panel, { backgroundColor: cardBg, borderColor: theme.colors.outlineVariant }]} elevation={0}>
                <SectionHeader
                  icon="account-multiple-outline"
                  title={`Team (${members.length})`}
                  subtitle="Project access"
                  tone="#7C5EA7"
                  theme={theme}
                  action={members.length ? (
                    <TouchableOpacity onPress={() => setActiveTab(TAB_MEMBERS)} style={styles.textAction}>
                      <Text style={[styles.textActionLabel, { color: accent }]}>View all</Text>
                      <MaterialCommunityIcons name="arrow-right" size={15} color={accent} />
                    </TouchableOpacity>
                  ) : null}
                />
                {members.length === 0 ? (
                  <EmptyInline icon="account-plus-outline" title="No members assigned" theme={theme} />
                ) : (
                  <View style={styles.teamPreviewList}>
                    {members.slice(0, 5).map((member) => (
                      <View key={member.id} style={styles.teamPreviewRow}>
                        <Avatar user={member.user} size={34} />
                        <View style={styles.teamPreviewText}>
                          <Text style={[styles.teamPreviewName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                            {getPersonName(member.user)}
                          </Text>
                          <Text style={[styles.teamPreviewRole, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                            {ROLE_LABELS[member.role] || titleCase(member.role)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </Surface>

              <Surface style={[styles.panel, { backgroundColor: cardBg, borderColor: theme.colors.outlineVariant }]} elevation={0}>
                <SectionHeader
                  icon="map-marker-path"
                  title="Planning"
                  subtitle="Sprint and queue snapshot"
                  tone={colors.success}
                  theme={theme}
                />
                <View style={styles.planningGrid}>
                  <PlanningTile label="Active" value={activeSprintCount} color={colors.info} theme={theme} />
                  <PlanningTile label="Planned" value={futureSprintCount} color={colors.warning} theme={theme} />
                  <PlanningTile label="Done" value={completedSprintCount} color={colors.success} theme={theme} />
                  <PlanningTile label="Backlog" value={backlogCount} color="#7C5EA7" theme={theme} />
                </View>
              </Surface>
            </View>
          </View>
        )}

        {activeTab === TAB_SPRINTS && (
          <View>
            <View style={[styles.tabContentHeader, isNarrow && styles.tabContentHeaderStack]}>
              <View>
                <Text style={[styles.tabContentTitle, { color: theme.colors.onSurface }]}>Sprints</Text>
                <Text style={[styles.tabContentSub, { color: theme.colors.onSurfaceVariant }]}>
                  {sprintsList.length} total, {activeSprintCount} active, {futureSprintCount} planned
                </Text>
              </View>
              <Button
                mode="contained"
                icon="plus"
                compact
                onPress={() => setSprintDialog(true)}
                style={[styles.smallActionButton, { backgroundColor: accent }]}
                labelStyle={styles.smallActionLabel}
              >
                Create Sprint
              </Button>
            </View>

            {sprintsList.length === 0 ? (
              <Surface style={[styles.panel, styles.emptyStatePanel, { backgroundColor: cardBg, borderColor: theme.colors.outlineVariant }]} elevation={0}>
                <View style={[styles.emptyIconLarge, { backgroundColor: accentSoft }]}>
                  <MaterialCommunityIcons name="lightning-bolt-outline" size={30} color={accent} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No sprints yet</Text>
                <Text style={[styles.emptyCopy, { color: theme.colors.onSurfaceVariant }]}>Plan a sprint when the team is ready to commit work.</Text>
              </Surface>
            ) : (
              <View style={styles.sprintList}>
                {sprintsList.map((sprint) => {
                  const cfg = SPRINT_STATUS_CFG[sprint.status] || SPRINT_STATUS_CFG.future;
                  const isActive = sprint.status === 'active';
                  const isDone = sprint.status === 'completed';
                  const sp = isActive ? getSprintProgress(sprint.startDate, sprint.endDate) : (isDone ? 100 : 0);
                  const dl = isActive ? getDaysRemaining(sprint.endDate) : null;
                  const issueCount = sprint.issues?.length || 0;

                  return (
                    <TouchableOpacity
                      key={sprint.id}
                      activeOpacity={0.88}
                      onPress={() => navigation.navigate('Sprint', { sprintId: sprint.id, projectId })}
                      style={[
                        styles.sprintRow,
                        {
                          backgroundColor: cardBg,
                          borderColor: theme.colors.outlineVariant,
                          borderTopColor: cfg.dot,
                          flexBasis: isNarrow ? '100%' : isCompact ? '48%' : '31%',
                          maxWidth: isNarrow ? '100%' : isCompact ? '49%' : '32%',
                        },
                      ]}
                    >
                      <View style={styles.sprintCardTop}>
                        <View style={[styles.sprintIconWrap, { backgroundColor: cfg.bg }]}>
                          <MaterialCommunityIcons name={cfg.icon} size={18} color={cfg.dot} />
                        </View>
                        <View style={styles.sprintRowMain}>
                          <Text style={[styles.sprintRowName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                            {sprint.name}
                          </Text>
                          <View style={styles.sprintRowMeta}>
                            {(sprint.startDate || sprint.endDate) && (
                              <MetaChip
                                icon="calendar-range-outline"
                                label={`${sprint.startDate ? formatDate(sprint.startDate) : 'Not set'}${sprint.endDate ? ` to ${formatDate(sprint.endDate)}` : ''}`}
                                theme={theme}
                              />
                            )}
                          </View>
                        </View>
                        <View style={[styles.sprintStatusPill, { backgroundColor: cfg.bg, borderColor: `${cfg.dot}38` }]}>
                          <View style={[styles.sprintStatusDot, { backgroundColor: cfg.dot }]} />
                          <Text style={[styles.sprintStatusText, { color: cfg.text }]}>{cfg.label}</Text>
                        </View>
                      </View>

                      {!!sprint.goal && (
                        <Text style={[styles.sprintGoalText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
                          {sprint.goal}
                        </Text>
                      )}

                      <View style={styles.sprintCardMetrics}>
                        <View style={[styles.sprintMiniMetric, { backgroundColor: `${cfg.dot}12`, borderColor: `${cfg.dot}30` }]}>
                          <Text style={[styles.sprintMiniValue, { color: cfg.text }]}>{issueCount}</Text>
                          <Text style={[styles.sprintMiniLabel, { color: theme.colors.onSurfaceVariant }]}>Issues</Text>
                        </View>
                        <View style={[styles.sprintMiniMetric, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
                          <Text style={[styles.sprintMiniValue, { color: isDone ? colors.success : accent }]}>{isActive || isDone ? `${sp}%` : '-'}</Text>
                          <Text style={[styles.sprintMiniLabel, { color: theme.colors.onSurfaceVariant }]}>Progress</Text>
                        </View>
                        {isActive && dl !== null && (
                          <View style={[styles.sprintMiniMetric, {
                            backgroundColor: dl < 0 ? colors.dangerLight : dl <= 3 ? colors.warningLight : colors.infoLight,
                            borderColor: dl < 0 ? `${colors.danger}30` : dl <= 3 ? `${colors.warning}30` : `${colors.info}30`,
                          }]}>
                            <Text style={[styles.sprintMiniValue, { color: dl < 0 ? colors.danger : dl <= 3 ? colors.warning : colors.info }]}>
                              {dl >= 0 ? `${dl}d` : 'Late'}
                            </Text>
                            <Text style={[styles.sprintMiniLabel, { color: theme.colors.onSurfaceVariant }]}>Left</Text>
                          </View>
                        )}
                      </View>

                      {(isActive || isDone) && (
                        <View style={styles.progressBarRow}>
                          <View style={[styles.sprintRowProgressTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
                            <View style={[
                              styles.sprintRowProgressFill,
                              { width: `${sp}%`, backgroundColor: isDone ? colors.success : accent },
                            ]} />
                          </View>
                          <Text style={[styles.progressPct, { color: isDone ? colors.success : accent }]}>{sp}%</Text>
                        </View>
                      )}

                      <View style={[styles.sprintCardFooter, { borderTopColor: theme.colors.outlineVariant }]}>
                        {!isDone ? (
                          <TouchableOpacity
                            style={[styles.addIssueBtn, { backgroundColor: isActive ? accentSoft : 'transparent', borderColor: isActive ? accentMid : theme.colors.outlineVariant }]}
                            onPress={(e) => { e?.stopPropagation?.(); setAddIssuesDialog(sprint.id); setSelectedIssueIds([]); }}
                          >
                            <MaterialCommunityIcons name="plus" size={13} color={isActive ? accent : theme.colors.onSurfaceVariant} />
                            <Text style={[styles.addIssueBtnText, { color: isActive ? accent : theme.colors.onSurfaceVariant }]}>Add issues</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={[styles.addIssueBtn, { backgroundColor: colors.successLight, borderColor: `${colors.success}30` }]}>
                            <MaterialCommunityIcons name="check" size={13} color={colors.success} />
                            <Text style={[styles.addIssueBtnText, { color: colors.success }]}>Done</Text>
                          </View>
                        )}
                        <View style={styles.sprintOpenHint}>
                          <Text style={[styles.sprintOpenText, { color: theme.colors.onSurfaceVariant }]}>Open</Text>
                          <View style={[styles.sprintStatusPill, { backgroundColor: cfg.bg, borderColor: `${cfg.dot}38` }]}>
                            <MaterialCommunityIcons name="chevron-right" size={15} color={cfg.dot} />
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {activeTab === TAB_MEMBERS && (
          <View>
            <View style={[styles.tabContentHeader, isNarrow && styles.tabContentHeaderStack]}>
              <View>
                <Text style={[styles.tabContentTitle, { color: theme.colors.onSurface }]}>Members</Text>
                <Text style={[styles.tabContentSub, { color: theme.colors.onSurfaceVariant }]}>
                  {members.length} people with access to this project
                </Text>
              </View>
              <Button
                mode="outlined"
                icon="cog-outline"
                compact
                onPress={() => navigation.navigate('ProjectSettings', { projectId })}
                style={[styles.smallActionButton, { borderColor: theme.colors.outlineVariant }]}
                labelStyle={[styles.outlinedActionLabel, { color: accent }]}
              >
                Manage Access
              </Button>
            </View>

            {members.length === 0 ? (
              <Surface style={[styles.panel, styles.emptyStatePanel, { backgroundColor: cardBg, borderColor: theme.colors.outlineVariant }]} elevation={0}>
                <View style={[styles.emptyIconLarge, { backgroundColor: accentSoft }]}>
                  <MaterialCommunityIcons name="account-plus-outline" size={30} color={accent} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No members yet</Text>
                <Text style={[styles.emptyCopy, { color: theme.colors.onSurfaceVariant }]}>Add members from project settings.</Text>
              </Surface>
            ) : (
              <Surface style={[styles.memberDirectory, { backgroundColor: cardBg, borderColor: theme.colors.outlineVariant }]} elevation={0}>
                <View style={[styles.memberHeaderRow, { borderBottomColor: theme.colors.outlineVariant }]}>
                  <Text style={[styles.memberHeaderCell, { flex: 2.2, color: theme.colors.onSurfaceVariant }]}>Member</Text>
                  <Text style={[styles.memberHeaderCell, { flex: 2, color: theme.colors.onSurfaceVariant }]}>Email</Text>
                  <Text style={[styles.memberHeaderCell, { flex: 1, color: theme.colors.onSurfaceVariant }]}>Role</Text>
                </View>
                {members.map((member) => (
                  <View key={member.id} style={[styles.memberRow, { borderBottomColor: theme.colors.outlineVariant }]}>
                    <View style={[styles.memberCell, { flex: 2.2 }]}>
                      <Avatar user={member.user} size={36} />
                      <View style={styles.memberNameBlock}>
                        <Text style={[styles.memberName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                          {getPersonName(member.user)}
                        </Text>
                        <Text style={[styles.memberRoleSmall, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                          {titleCase(member.user?.role || 'user')}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.memberEmail, { flex: 2, color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                      {member.user?.email || '-'}
                    </Text>
                    <View style={[styles.memberCell, { flex: 1 }]}>
                      <View style={[styles.roleBadge, { backgroundColor: accentSoft, borderColor: accentMid }]}>
                        <Text style={[styles.roleBadgeText, { color: accent }]}>
                          {ROLE_LABELS[member.role] || titleCase(member.role)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </Surface>
            )}
          </View>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={sprintDialog} onDismiss={() => setSprintDialog(false)} style={styles.dialog}>
          <Dialog.Title>Create Sprint</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <TextInput label="Sprint name *" value={sprintName} onChangeText={setSprintName} mode="outlined" autoFocus />
            <TextInput label="Sprint goal (optional)" value={sprintGoal} onChangeText={setSprintGoal} mode="outlined" multiline numberOfLines={2} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSprintDialog(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleCreateSprint} loading={creatingSprint} disabled={!sprintName.trim()}>Create</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!addIssuesDialog} onDismiss={() => setAddIssuesDialog(null)} style={[styles.dialog, { maxWidth: 560 }]}>
          <Dialog.Title>Add Issues to Sprint</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            <ScrollView>
              {backlogIssues.length === 0 ? (
                <Text style={[styles.emptyDialogText, { color: theme.colors.onSurfaceVariant }]}>
                  No backlog issues available.
                </Text>
              ) : (
                backlogIssues.map((issue) => {
                  const selected = selectedIssueIds.includes(issue.id);
                  return (
                    <TouchableOpacity
                      key={issue.id}
                      onPress={() => toggleIssue(issue.id)}
                      style={[
                        styles.dialogIssueRow,
                        { backgroundColor: selected ? theme.colors.primaryContainer : 'transparent' },
                      ]}
                    >
                      <View style={[
                        styles.dialogCheckbox,
                        {
                          borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
                          backgroundColor: selected ? theme.colors.primary : 'transparent',
                        },
                      ]}>
                        {selected && <MaterialCommunityIcons name="check" size={12} color="#fff" />}
                      </View>
                      <View style={styles.dialogIssueText}>
                        <Text style={{ color: theme.colors.onSurface, fontWeight: selected ? '700' : '500', fontSize: 13 }} numberOfLines={1}>
                          {issue.title}
                        </Text>
                        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, marginTop: 2 }}>
                          {issue.key} - {titleCase(issue.type)} - {titleCase(issue.priority || 'medium')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setAddIssuesDialog(null)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleAddIssuesToSprint}
              loading={movingIssues}
              disabled={selectedIssueIds.length === 0 || movingIssues}
            >
              Add {selectedIssueIds.length > 0 ? `(${selectedIssueIds.length})` : ''} Issues
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {!!toast && <AppToast message={toast} type={toastType} onDone={() => setToast('')} />}
    </View>
  );
};

const MetricTile = ({ icon, value, label, detail, tone, theme }) => (
  <View style={[styles.metricTile, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
    <View style={[styles.metricIconWrap, { backgroundColor: `${tone}14` }]}>
      <MaterialCommunityIcons name={icon} size={18} color={tone} />
    </View>
    <View style={styles.metricTextBlock}>
      <Text style={[styles.metricValue, { color: theme.colors.onSurface }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{label}</Text>
      {!!detail && <Text style={[styles.metricDetail, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{detail}</Text>}
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
    <MaterialCommunityIcons name={icon} size={13} color={tone || theme.colors.onSurfaceVariant} />
    <Text style={[styles.metaPillText, { color: tone || theme.colors.onSurfaceVariant }]} numberOfLines={1}>{label}</Text>
  </View>
);

const StatusPill = ({ tone }) => (
  <View style={[styles.statusPill, { backgroundColor: tone.bg, borderColor: `${tone.text}24` }]}>
    <MaterialCommunityIcons name={tone.icon} size={12} color={tone.text} />
    <Text style={[styles.statusPillText, { color: tone.text }]}>{tone.label}</Text>
  </View>
);

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

const SprintStat = ({ icon, color, value, label, theme }) => (
  <View style={[styles.sprintStatItem, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
    <MaterialCommunityIcons name={icon} size={17} color={color} />
    <Text style={[styles.sprintStatValue, { color: theme.colors.onSurface }]}>{value}</Text>
    <Text style={[styles.sprintStatLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
  </View>
);

const WorkloadItem = ({ icon, label, value, tone, theme }) => (
  <View style={[styles.workloadItem, { borderColor: theme.colors.outlineVariant }]}>
    <View style={[styles.workloadIcon, { backgroundColor: `${tone}14` }]}>
      <MaterialCommunityIcons name={icon} size={16} color={tone} />
    </View>
    <Text style={[styles.workloadLabel, { color: theme.colors.onSurface }]}>{label}</Text>
    <Text style={[styles.workloadValue, { color: tone }]}>{value}</Text>
  </View>
);

const RecentIssueRow = ({ issue, theme, onPress }) => {
  const typeColor = colors.issueType[issue.type] || colors.info;
  const priorityTone = PRIORITY_TONES[issue.priority || 'medium'] || PRIORITY_TONES.medium;

  return (
    <TouchableOpacity onPress={onPress} style={[styles.recentIssueRow, { borderBottomColor: theme.colors.outlineVariant }]}>
      <View style={[styles.issueTypeIcon, { backgroundColor: `${typeColor}14` }]}>
        <MaterialCommunityIcons name={ISSUE_TYPE_ICONS[issue.type] || 'ticket-outline'} size={15} color={typeColor} />
      </View>
      <View style={styles.recentIssueMain}>
        <View style={styles.issueTitleLine}>
          <Text style={[styles.issueKey, { color: theme.colors.onSurfaceVariant }]}>{issue.key}</Text>
          <Text style={[styles.issueTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>{issue.title}</Text>
        </View>
        <View style={styles.issueMetaLine}>
          <View style={[styles.issueStatusDot, { backgroundColor: issue.status?.color || theme.colors.onSurfaceVariant }]} />
          <Text style={[styles.issueMetaText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
            {issue.status?.name || 'Unknown'} - {getPersonName(issue.assignee)}
          </Text>
        </View>
      </View>
      <View style={[styles.priorityBadge, { backgroundColor: priorityTone.bg, borderColor: `${priorityTone.text}24` }]}>
        <Text style={[styles.priorityBadgeText, { color: priorityTone.text }]}>{titleCase(issue.priority || 'medium')}</Text>
      </View>
      <Text style={[styles.issueUpdated, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
        {formatRelative(issue.updatedAt || issue.createdAt)}
      </Text>
    </TouchableOpacity>
  );
};

const EmptyInline = ({ icon, title, theme }) => (
  <View style={styles.emptyInline}>
    <MaterialCommunityIcons name={icon} size={22} color={theme.colors.onSurfaceVariant} />
    <Text style={[styles.emptyInlineText, { color: theme.colors.onSurfaceVariant }]}>{title}</Text>
  </View>
);

const InfoRow = ({ label, value, theme, valueColor }) => (
  <View style={[styles.infoRow, { borderBottomColor: theme.colors.outlineVariant }]}>
    <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
    <Text style={[styles.infoValue, { color: valueColor || theme.colors.onSurface }]} numberOfLines={1}>{value}</Text>
  </View>
);

const PlanningTile = ({ label, value, color, theme }) => (
  <View style={[styles.planningTile, { backgroundColor: `${color}12`, borderColor: `${color}28` }]}>
    <Text style={[styles.planningValue, { color }]}>{value}</Text>
    <Text style={[styles.planningLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
  </View>
);

const MetaChip = ({ icon, label, tone, theme }) => (
  <View style={[
    styles.metaChip,
    {
      backgroundColor: tone ? `${tone}12` : theme.colors.background,
      borderColor: tone ? `${tone}28` : theme.colors.outlineVariant,
    },
  ]}>
    <MaterialCommunityIcons name={icon} size={12} color={tone || theme.colors.onSurfaceVariant} />
    <Text style={[styles.metaChipText, { color: tone || theme.colors.onSurfaceVariant }]} numberOfLines={1}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1 },

  projectHeader: {
    borderBottomWidth: 1,
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 18,
    gap: 18,
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 24,
  },
  headerMainRowCompact: {
    flexDirection: 'column',
  },
  headerIdentity: {
    flex: 1,
    gap: 12,
    minWidth: 0,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
    width: 54,
    height: 54,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectAvatarText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
  },
  projectTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  projectEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  projectName: {
    fontSize: 24,
    fontWeight: '900',
  },
  projectDescription: {
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 880,
  },
  metaPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 160,
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 10,
    maxWidth: 520,
  },
  headerActionsNarrow: {
    justifyContent: 'flex-start',
    width: '100%',
  },
  headerButton: {
    borderRadius: 8,
    borderWidth: 1,
  },
  headerButtonLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  containedButtonLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerMetrics: {
    flexDirection: 'row',
    gap: 12,
  },
  headerMetricsCompact: {
    flexWrap: 'wrap',
  },
  metricTile: {
    flex: 1,
    minWidth: 190,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metricIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  metricDetail: {
    fontSize: 11,
    marginTop: 1,
  },

  tabShell: {
    borderBottomWidth: 1,
  },
  tabNav: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    gap: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 13,
  },

  content: {
    flex: 1,
  },
  contentInner: {
    padding: 32,
    paddingBottom: 56,
  },
  contentInnerNarrow: {
    padding: 18,
    paddingBottom: 40,
  },
  overviewGrid: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'flex-start',
  },
  overviewGridStack: {
    flexDirection: 'column',
  },
  primaryCol: {
    flex: 1.65,
    gap: 20,
    minWidth: 0,
    width: '100%',
  },
  secondaryCol: {
    flex: 1,
    gap: 20,
    minWidth: 320,
    width: '100%',
  },
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
    overflow: 'hidden',
    boxShadow: '0 8px 20px rgba(20,33,61,0.06)',
  },
  flexPanel: {
    flex: 1,
  },
  dualPanels: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'stretch',
  },
  dualPanelsStack: {
    flexDirection: 'column',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  smallActionButton: {
    borderRadius: 8,
  },
  smallActionLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  outlinedActionLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  textAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
  },
  textActionLabel: {
    fontSize: 12,
    fontWeight: '800',
  },

  sprintFocusBody: {
    gap: 14,
  },
  sprintFeature: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  sprintFeatureMain: {
    flex: 1,
    minWidth: 0,
  },
  sprintKicker: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sprintFeatureName: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },
  sprintFeatureGoal: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  daysBadge: {
    width: 76,
    height: 76,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  daysBadgeValue: {
    color: '#fff',
    fontSize: 25,
    fontWeight: '900',
  },
  daysBadgeLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  progressTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '900',
  },
  progressTrack: {
    height: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  sprintStatGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  sprintStatGridNarrow: {
    flexDirection: 'column',
  },
  sprintStatItem: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  sprintStatValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  sprintStatLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  sprintFooter: {
    borderTopWidth: 1,
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  avatarCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
  },
  clusterAvatar: {
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#fff',
  },
  subtleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptySprintPanel: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  emptyIconLarge: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyCopy: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 420,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 6,
  },

  distributionBody: {
    gap: 12,
  },
  healthSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  healthValue: {
    fontSize: 27,
    fontWeight: '900',
  },
  healthLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  healthProgressWrap: {
    flex: 1,
    gap: 7,
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    flexShrink: 0,
  },
  distLabel: {
    width: 94,
    fontSize: 12,
    fontWeight: '700',
  },
  distBarWrap: {
    flex: 1,
    height: 7,
    borderRadius: 8,
    overflow: 'hidden',
  },
  distBarFill: {
    height: '100%',
    borderRadius: 8,
  },
  distCount: {
    width: 24,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '900',
  },
  workloadList: {
    gap: 10,
  },
  workloadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 11,
    gap: 10,
  },
  workloadIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workloadLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  workloadValue: {
    fontSize: 18,
    fontWeight: '900',
  },

  recentList: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  recentIssueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  issueTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  recentIssueMain: {
    flex: 1,
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
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: '800',
  },
  issueMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  issueStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  issueMetaText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  priorityBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  issueUpdated: {
    width: 82,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  emptyInline: {
    minHeight: 104,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyInlineText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  infoList: {
    marginTop: -4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '900',
  },
  teamPreviewList: {
    gap: 12,
  },
  teamPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  teamPreviewText: {
    flex: 1,
    minWidth: 0,
  },
  teamPreviewName: {
    fontSize: 13,
    fontWeight: '900',
  },
  teamPreviewRole: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  planningGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  planningTile: {
    width: '47%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  planningValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  planningLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },

  tabContentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    gap: 14,
  },
  tabContentHeaderStack: {
    alignItems: 'flex-start',
    flexDirection: 'column',
  },
  tabContentTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  tabContentSub: {
    fontSize: 13,
    marginTop: 3,
  },
  sprintList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'stretch',
  },
  sprintRow: {
    minWidth: 300,
    borderRadius: 8,
    borderWidth: 1,
    borderTopWidth: 4,
    padding: 16,
    gap: 14,
    boxShadow: '0 8px 20px rgba(20,33,61,0.06)',
  },
  sprintCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sprintIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  sprintRowMain: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  sprintRowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  sprintRowName: {
    fontSize: 15,
    fontWeight: '900',
    flex: 1,
    minWidth: 0,
  },
  sprintStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
  },
  sprintStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sprintStatusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  sprintGoalText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    minHeight: 36,
  },
  sprintRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 260,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  sprintRowProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  sprintRowProgressFill: {
    height: '100%',
    borderRadius: 8,
  },
  progressPct: {
    fontSize: 11,
    fontWeight: '900',
    width: 34,
    textAlign: 'right',
  },
  sprintCardMetrics: {
    flexDirection: 'row',
    gap: 10,
  },
  sprintMiniMetric: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  sprintMiniValue: {
    fontSize: 17,
    fontWeight: '900',
  },
  sprintMiniLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 1,
  },
  issueCountBubble: {
    width: 62,
    height: 58,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  issueCountNum: {
    fontSize: 19,
    fontWeight: '900',
  },
  issueCountLbl: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 1,
  },
  addIssueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  addIssueBtnText: {
    fontSize: 11,
    fontWeight: '900',
  },
  sprintCardFooter: {
    borderTopWidth: 1,
    paddingTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sprintOpenHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sprintOpenText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyStatePanel: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
    gap: 10,
  },

  memberDirectory: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0 8px 20px rgba(20,33,61,0.06)',
  },
  memberHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  memberHeaderCell: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    gap: 12,
  },
  memberCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  memberNameBlock: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '900',
  },
  memberRoleSmall: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  memberEmail: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 0,
  },
  roleBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },

  dialog: {
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
    borderRadius: 8,
  },
  emptyDialogText: {
    padding: 16,
    fontSize: 13,
    fontStyle: 'italic',
  },
  dialogIssueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    marginBottom: 2,
  },
  dialogCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogIssueText: {
    flex: 1,
    minWidth: 0,
  },
});

export default ProjectDetailScreen;
