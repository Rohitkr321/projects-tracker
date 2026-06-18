import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
  Text, Surface, useTheme, ProgressBar, Button,
  Dialog, Portal, TextInput,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetProjectQuery, useGetProjectMembersQuery } from '../../api/projectApi';
import { useGetSprintsQuery, useGetActiveSprintQuery, useCreateSprintMutation } from '../../api/sprintApi';
import { useGetProjectIssuesQuery, useGetIssuesQuery, useMoveIssuesToSprintMutation } from '../../api/issueApi';
import LoadingScreen from '../../components/common/LoadingScreen';
import Avatar from '../../components/common/Avatar';
import AppToast from '../../components/common/AppToast';
import { formatDate, getSprintProgress, getDaysRemaining } from '../../utils/dateUtils';
import { ROLE_LABELS } from '../../constants';
import colors from '../../theme/colors';

const NAVY = '#0F2557';

const SPRINT_STATUS_CFG = {
  active:    { bg: '#DBEAFE', text: '#1D4ED8', dot: '#3B82F6', icon: 'play-circle',         label: 'Active'    },
  future:    { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF', icon: 'clock-outline',        label: 'Planned'   },
  completed: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981', icon: 'check-circle-outline', label: 'Completed' },
};

const TAB_OVERVIEW = 'overview';
const TAB_BOARD    = 'board';
const TAB_BACKLOG  = 'backlog';
const TAB_SPRINTS  = 'sprints';
const TAB_MEMBERS  = 'members';

const tabs      = [TAB_OVERVIEW, TAB_BOARD, TAB_BACKLOG, TAB_SPRINTS, TAB_MEMBERS];
const TAB_LABEL = { overview: 'Overview', board: 'Board', backlog: 'Backlog', sprints: 'Sprints', members: 'Members' };
const TAB_ICON  = { overview: 'view-dashboard-outline', board: 'view-column-outline', backlog: 'format-list-bulleted', sprints: 'lightning-bolt-outline', members: 'account-group-outline' };

const ProjectDetailScreen = ({ route, navigation }) => {
  const { projectId } = route.params;
  const theme = useTheme();
  const [activeTab, setActiveTab]       = useState(TAB_OVERVIEW);
  const [sprintDialog, setSprintDialog] = useState(false);
  const [sprintName, setSprintName]     = useState('');
  const [sprintGoal, setSprintGoal]     = useState('');
  const [addIssuesDialog, setAddIssuesDialog]   = useState(null);
  const [selectedIssueIds, setSelectedIssueIds] = useState([]);
  const [toast, setToast]     = useState('');
  const [toastType, setToastType] = useState('success');
  const showToast = (msg, type = 'success') => { setToastType(type); setToast(msg); };

  const { data: projectResp, isLoading } = useGetProjectQuery(projectId);
  const { data: membersResp }            = useGetProjectMembersQuery(projectId);
  const { data: activeSprintResp }       = useGetActiveSprintQuery(projectId);
  const { data: sprintsResp, refetch: refetchSprints } = useGetSprintsQuery({ projectId });
  const { data: issuesResp }             = useGetProjectIssuesQuery({ projectId, limit: 20 });
  const [createSprint,     { isLoading: creatingSprint }] = useCreateSprintMutation();
  const [moveIssuesToSprint, { isLoading: movingIssues }] = useMoveIssuesToSprintMutation();
  const { data: backlogResp } = useGetIssuesQuery({ projectId, noSprint: 'true', limit: 200 });
  const backlogIssues = backlogResp?.data?.data || [];

  const handleAddIssuesToSprint = async () => {
    if (!selectedIssueIds.length || !addIssuesDialog) return;
    try {
      await moveIssuesToSprint({ issueIds: selectedIssueIds, sprintId: addIssuesDialog }).unwrap();
      setAddIssuesDialog(null); setSelectedIssueIds([]);
      refetchSprints();
      showToast(`${selectedIssueIds.length} issue(s) added to sprint`);
    } catch (err) {
      showToast(err?.data?.message || 'Failed to move issues', 'error');
    }
  };

  const toggleIssue = (id) =>
    setSelectedIssueIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleCreateSprint = async () => {
    if (!sprintName.trim()) return;
    try {
      await createSprint({ projectId, name: sprintName.trim(), goal: sprintGoal.trim() || undefined }).unwrap();
      setSprintDialog(false); setSprintName(''); setSprintGoal('');
      refetchSprints();
      showToast('Sprint created successfully');
    } catch (err) {
      showToast(err?.data?.message || 'Failed to create sprint', 'error');
    }
  };

  if (isLoading) return <LoadingScreen />;
  const project = projectResp?.data;
  if (!project) return null;

  const members      = membersResp?.data || [];
  const activeSprint = activeSprintResp?.data;
  const sprintsList  = sprintsResp?.data?.data || [];
  const issuesList   = issuesResp?.data?.data || [];

  const sprintProgress   = activeSprint ? getSprintProgress(activeSprint.startDate, activeSprint.endDate) : 0;
  const daysLeft         = activeSprint ? getDaysRemaining(activeSprint.endDate) : null;
  const completedIssues  = activeSprint?.issues?.filter(i => i.status?.category === 'done').length || 0;
  const totalSprintIssues = activeSprint?.issues?.length || 0;
  const pctDone          = totalSprintIssues > 0 ? Math.round((completedIssues / totalSprintIssues) * 100) : 0;

  const issuesByStatus = issuesList.reduce((acc, issue) => {
    const name = issue.status?.name || 'Unknown';
    if (!acc[name]) acc[name] = { count: 0, color: issue.status?.color || '#6B7280' };
    acc[name].count++;
    return acc;
  }, {});

  const handleTabPress = (tab) => {
    if (tab === TAB_BOARD)   { navigation.navigate('Board',   { projectId }); return; }
    if (tab === TAB_BACKLOG) { navigation.navigate('Backlog', { projectId }); return; }
    setActiveTab(tab);
  };

  const isDark = theme.dark;
  const cardBg = theme.colors.surface;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>

      {/* ── Project top bar ── */}
      <Surface style={[styles.topBar, { backgroundColor: cardBg, borderBottomColor: theme.colors.outlineVariant }]} elevation={0}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Projects')}
          style={[styles.backBtn, { backgroundColor: theme.colors.surfaceVariant }]}
        >
          <MaterialCommunityIcons name="chevron-left" size={18} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
        <View style={[styles.projectAvatar, { backgroundColor: project.color || NAVY }]}>
          <Text style={styles.projectAvatarText}>{project.key?.substring(0, 2)}</Text>
        </View>
        <View style={styles.projectMeta}>
          <Text style={[styles.projectName, { color: theme.colors.onSurface }]}>{project.name}</Text>
          <Text style={[styles.projectSub,  { color: theme.colors.onSurfaceVariant }]}>
            {project.key} · {project.type || 'scrum'}
          </Text>
        </View>
        <View style={styles.topBarRight}>
          <Button
            icon="plus" mode="contained" compact
            onPress={() => navigation.navigate('CreateIssue', { projectId })}
            style={styles.createBtn}
            labelStyle={{ fontSize: 13 }}
          >
            Create Issue
          </Button>
          <TouchableOpacity
            onPress={() => navigation.navigate('ProjectSettings', { projectId })}
            style={[styles.settingsBtn, { backgroundColor: theme.colors.surfaceVariant }]}
          >
            <MaterialCommunityIcons name="cog-outline" size={18} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </Surface>

      {/* ── Tab nav ── */}
      <View style={[styles.tabNav, { backgroundColor: cardBg, borderBottomColor: theme.colors.outlineVariant }]}>
        {tabs.map((tab) => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => handleTabPress(tab)}
              style={[styles.tabItem, active && { borderBottomColor: NAVY, borderBottomWidth: 2 }]}
            >
              <MaterialCommunityIcons
                name={TAB_ICON[tab]} size={15}
                color={active ? NAVY : theme.colors.onSurfaceVariant}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.tabLabel, { color: active ? NAVY : theme.colors.onSurfaceVariant, fontWeight: active ? '700' : '500' }]}>
                {TAB_LABEL[tab]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Content ── */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>

        {/* ══════════════ OVERVIEW ══════════════ */}
        {activeTab === TAB_OVERVIEW && (
          <View style={styles.overviewGrid}>

            {/* Left column */}
            <View style={styles.leftCol}>

              {/* Active Sprint Card */}
              {activeSprint ? (
                <Surface style={[styles.card, { backgroundColor: cardBg }]} elevation={1}>
                  {/* Header banner */}
                  <View style={[styles.sprintCardBanner, { backgroundColor: NAVY }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sprintBannerLabel}>ACTIVE SPRINT</Text>
                      <Text style={styles.sprintBannerName}>{activeSprint.name}</Text>
                      {!!activeSprint.goal && (
                        <Text style={styles.sprintBannerGoal} numberOfLines={1}>{activeSprint.goal}</Text>
                      )}
                    </View>
                    <View style={[styles.daysLeftBadge, {
                      backgroundColor: daysLeft !== null && daysLeft < 0 ? '#EF4444' : '#ffffff22',
                    }]}>
                      <Text style={styles.daysLeftNum}>
                        {daysLeft !== null ? (daysLeft >= 0 ? daysLeft : '!') : '—'}
                      </Text>
                      <Text style={styles.daysLeftLbl}>
                        {daysLeft !== null ? (daysLeft >= 0 ? 'days left' : 'overdue') : 'days'}
                      </Text>
                    </View>
                  </View>

                  {/* Stats row */}
                  <View style={styles.sprintStatsRow}>
                    <SprintStat
                      icon="check-circle-outline" color="#10B981"
                      value={`${completedIssues}/${totalSprintIssues}`}
                      label="Done"
                    />
                    <View style={styles.statDivider} />
                    <SprintStat
                      icon="percent-outline" color="#6554C0"
                      value={`${pctDone}%`}
                      label="Complete"
                    />
                    <View style={styles.statDivider} />
                    <SprintStat
                      icon="calendar-range-outline" color="#0369A1"
                      value={formatDate(activeSprint.startDate)}
                      label="Started"
                    />
                  </View>

                  {/* Progress bar */}
                  <View style={styles.sprintProgressWrap}>
                    <View style={styles.sprintProgressTrack}>
                      <View style={[styles.sprintProgressFill, { width: `${pctDone}%` }]} />
                    </View>
                  </View>

                  {/* Assignee cluster */}
                  {activeSprint.issues?.length > 0 && (
                    <View style={styles.assigneeCluster}>
                      {[...new Map(
                        activeSprint.issues
                          .filter(i => i.assignee)
                          .map(i => [i.assignee.id, i.assignee])
                      ).values()].slice(0, 5).map((u, idx) => (
                        <View key={u.id} style={[styles.clusterAvatar, { marginLeft: idx === 0 ? 0 : -8, zIndex: 10 - idx }]}>
                          <Avatar user={u} size={28} />
                        </View>
                      ))}
                      <Text style={[styles.assigneeLabel, { color: theme.colors.onSurfaceVariant }]}>
                        {totalSprintIssues - completedIssues} remaining
                      </Text>
                    </View>
                  )}

                  <Button
                    mode="contained"
                    icon="view-column-outline"
                    compact
                    onPress={() => navigation.navigate('Sprint', { projectId })}
                    style={[styles.viewBoardBtn, { backgroundColor: NAVY }]}
                    labelStyle={{ color: '#fff', fontSize: 13 }}
                  >
                    View Sprint Board
                  </Button>
                </Surface>
              ) : (
                <Surface style={[styles.card, { backgroundColor: cardBg }]} elevation={1}>
                  <View style={styles.emptySprintWrap}>
                    <View style={[styles.emptySprintIcon, { backgroundColor: '#EFF6FF' }]}>
                      <MaterialCommunityIcons name="lightning-bolt-outline" size={28} color={NAVY} />
                    </View>
                    <Text style={[styles.emptySprintTitle, { color: theme.colors.onSurface }]}>No Active Sprint</Text>
                    <Text style={[styles.emptySprintSub, { color: theme.colors.onSurfaceVariant }]}>
                      Start a sprint to begin tracking progress
                    </Text>
                    <Button
                      mode="contained" icon="plus" compact
                      onPress={() => { setActiveTab(TAB_SPRINTS); setSprintDialog(true); }}
                      style={[styles.viewBoardBtn, { backgroundColor: NAVY }]}
                      labelStyle={{ color: '#fff' }}
                    >
                      Create Sprint
                    </Button>
                  </View>
                </Surface>
              )}

              {/* Issue Distribution */}
              <Surface style={[styles.card, { backgroundColor: cardBg }]} elevation={1}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.cardIconWrap, { backgroundColor: '#EFF6FF' }]}>
                      <MaterialCommunityIcons name="chart-bar" size={14} color={NAVY} />
                    </View>
                    <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Issue Distribution</Text>
                  </View>
                  <View style={[styles.totalBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text style={[styles.totalBadgeText, { color: theme.colors.onSurfaceVariant }]}>{issuesList.length} total</Text>
                  </View>
                </View>
                {Object.entries(issuesByStatus).length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No issues yet</Text>
                ) : (
                  Object.entries(issuesByStatus).map(([name, { count, color: sc }]) => {
                    const pct = Math.max(4, (count / Math.max(issuesList.length, 1)) * 100);
                    return (
                      <View key={name} style={styles.distRow}>
                        <View style={[styles.distDot, { backgroundColor: sc }]} />
                        <Text style={[styles.distLabel, { color: theme.colors.onSurface }]}>{name}</Text>
                        <View style={styles.distBarWrap}>
                          <View style={[styles.distBarFill, { width: `${pct}%`, backgroundColor: sc }]} />
                        </View>
                        <Text style={[styles.distCount, { color: theme.colors.onSurfaceVariant }]}>
                          {count}
                        </Text>
                        <Text style={[styles.distPct, { color: sc }]}>
                          {Math.round((count / Math.max(issuesList.length, 1)) * 100)}%
                        </Text>
                      </View>
                    );
                  })
                )}
              </Surface>
            </View>

            {/* Right column */}
            <View style={styles.rightCol}>

              {/* About */}
              {!!project.description && (
                <Surface style={[styles.card, { backgroundColor: cardBg }]} elevation={1}>
                  <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.cardIconWrap, { backgroundColor: '#F0FDF4' }]}>
                        <MaterialCommunityIcons name="information-outline" size={14} color="#15803D" />
                      </View>
                      <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>About</Text>
                    </View>
                  </View>
                  <Text style={[styles.aboutText, { color: theme.colors.onSurfaceVariant }]}>
                    {project.description}
                  </Text>
                </Surface>
              )}

              {/* Team */}
              <Surface style={[styles.card, { backgroundColor: cardBg }]} elevation={1}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.cardIconWrap, { backgroundColor: '#FFF7ED' }]}>
                      <MaterialCommunityIcons name="account-group-outline" size={14} color="#D97706" />
                    </View>
                    <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Team ({members.length})</Text>
                  </View>
                  <TouchableOpacity onPress={() => setActiveTab(TAB_MEMBERS)}>
                    <Text style={[styles.viewAllLink, { color: NAVY }]}>View All</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.memberGrid}>
                  {members.slice(0, 8).map((member) => (
                    <View key={member.id} style={styles.memberItem}>
                      <Avatar user={member.user} size={38} />
                      <Text style={[styles.memberName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                        {member.user?.firstName}
                      </Text>
                    </View>
                  ))}
                  {members.length > 8 && (
                    <View style={styles.memberItem}>
                      <View style={[styles.moreMembersCircle, { backgroundColor: NAVY }]}>
                        <Text style={styles.moreMembersText}>+{members.length - 8}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </Surface>

              {/* Project Info */}
              <Surface style={[styles.card, { backgroundColor: cardBg }]} elevation={1}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.cardIconWrap, { backgroundColor: '#F5F3FF' }]}>
                      <MaterialCommunityIcons name="folder-information-outline" size={14} color="#7C3AED" />
                    </View>
                    <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Project Info</Text>
                  </View>
                </View>
                <InfoRow label="Key"    value={project.key}           theme={theme} />
                <InfoRow label="Type"   value={project.type || 'scrum'} theme={theme} />
                <InfoRow
                  label="Status"
                  value={project.status || 'active'}
                  theme={theme}
                  valueColor={project.status === 'active' ? '#10B981' : project.status === 'archived' ? '#D97706' : undefined}
                />
                {!!project.startDate && <InfoRow label="Start" value={formatDate(project.startDate)} theme={theme} />}
                {!!project.endDate   && <InfoRow label="End"   value={formatDate(project.endDate)}   theme={theme} />}
              </Surface>
            </View>
          </View>
        )}

        {/* ══════════════ SPRINTS ══════════════ */}
        {activeTab === TAB_SPRINTS && (
          <View>
            <View style={styles.tabContentHeader}>
              <View>
                <Text style={[styles.tabContentTitle, { color: theme.colors.onSurface }]}>Sprints</Text>
                <Text style={[styles.tabContentSub, { color: theme.colors.onSurfaceVariant }]}>
                  {sprintsList.length} sprint{sprintsList.length !== 1 ? 's' : ''} · {sprintsList.filter(s => s.status === 'active').length} active
                </Text>
              </View>
              <Button mode="contained" icon="plus" compact onPress={() => setSprintDialog(true)}
                style={{ backgroundColor: NAVY, borderRadius: 8 }} labelStyle={{ color: '#fff', fontSize: 13 }}>
                Create Sprint
              </Button>
            </View>

            {sprintsList.length === 0 ? (
              <Surface style={[styles.card, { backgroundColor: cardBg, alignItems: 'center', paddingVertical: 56 }]} elevation={1}>
                <View style={[styles.emptySprintIcon, { backgroundColor: '#EFF6FF', marginBottom: 12 }]}>
                  <MaterialCommunityIcons name="lightning-bolt-outline" size={28} color={NAVY} />
                </View>
                <Text style={{ color: theme.colors.onSurface, fontWeight: '600', marginBottom: 4 }}>No sprints yet</Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>Create a sprint to start planning</Text>
              </Surface>
            ) : (
              <View style={styles.sprintList}>
                {sprintsList.map((sprint) => {
                  const cfg      = SPRINT_STATUS_CFG[sprint.status] || SPRINT_STATUS_CFG.future;
                  const isActive = sprint.status === 'active';
                  const isDone   = sprint.status === 'completed';
                  const sp       = isActive ? getSprintProgress(sprint.startDate, sprint.endDate) : (isDone ? 100 : 0);
                  const dl       = isActive ? getDaysRemaining(sprint.endDate) : null;
                  const issueCount = sprint.issues?.length || 0;

                  const bubbleBg   = isActive ? NAVY : isDone ? '#059669' : (isDark ? '#374151' : '#F3F4F6');
                  const bubbleFg   = (isActive || isDone) ? '#fff' : theme.colors.onSurface;
                  const bubbleSub  = isActive ? '#BFDBFE' : isDone ? '#A7F3D0' : theme.colors.onSurfaceVariant;

                  return (
                    <TouchableOpacity
                      key={sprint.id}
                      activeOpacity={0.88}
                      onPress={() => navigation.navigate('Sprint', { sprintId: sprint.id, projectId })}
                      style={[styles.sprintRow, { backgroundColor: cardBg, borderLeftColor: cfg.dot }]}
                    >
                      {/* ── Left: info ── */}
                      <View style={{ flex: 1, gap: 7 }}>

                        {/* Title + status pill */}
                        <View style={styles.sprintRowTitle}>
                          <View style={[styles.sprintIconWrap, { backgroundColor: cfg.dot + '20' }]}>
                            <MaterialCommunityIcons name={cfg.icon} size={14} color={cfg.dot} />
                          </View>
                          <Text style={[styles.sprintRowName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                            {sprint.name}
                          </Text>
                          <View style={[styles.sprintStatusPill, { backgroundColor: cfg.bg, borderColor: cfg.dot + '50' }]}>
                            <View style={[styles.sprintStatusDot, { backgroundColor: cfg.dot }]} />
                            <Text style={[styles.sprintStatusText, { color: cfg.text }]}>{cfg.label.toUpperCase()}</Text>
                          </View>
                        </View>

                        {/* Goal */}
                        {!!sprint.goal && (
                          <Text style={[styles.sprintGoalText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                            {sprint.goal}
                          </Text>
                        )}

                        {/* Meta chips */}
                        <View style={styles.sprintRowMeta}>
                          {(sprint.startDate || sprint.endDate) && (
                            <View style={[styles.metaChip, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC' }]}>
                              <MaterialCommunityIcons name="calendar-range-outline" size={11} color="#9CA3AF" />
                              <Text style={styles.metaChipText}>
                                {sprint.startDate ? formatDate(sprint.startDate) : '—'}
                                {sprint.endDate ? ` → ${formatDate(sprint.endDate)}` : ''}
                              </Text>
                            </View>
                          )}
                          {isActive && dl !== null && (
                            <View style={[styles.metaChip, {
                              backgroundColor: dl < 0 ? '#FEF2F2' : dl <= 3 ? '#FFF7ED' : '#EFF6FF',
                              borderColor:     dl < 0 ? '#FCA5A5' : dl <= 3 ? '#FCD34D' : '#93C5FD',
                              borderWidth: 1,
                            }]}>
                              <MaterialCommunityIcons
                                name="clock-alert-outline" size={11}
                                color={dl < 0 ? '#DC2626' : dl <= 3 ? '#D97706' : '#2563EB'}
                              />
                              <Text style={[styles.metaChipText, {
                                color: dl < 0 ? '#DC2626' : dl <= 3 ? '#B45309' : '#1D4ED8',
                                fontWeight: '700',
                              }]}>
                                {dl >= 0 ? `${dl}d left` : 'Overdue'}
                              </Text>
                            </View>
                          )}
                          {isDone && (
                            <View style={[styles.metaChip, { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7', borderWidth: 1 }]}>
                              <MaterialCommunityIcons name="flag-checkered" size={11} color="#059669" />
                              <Text style={[styles.metaChipText, { color: '#065F46', fontWeight: '600' }]}>Sprint closed</Text>
                            </View>
                          )}
                        </View>

                        {/* Progress bar + percentage */}
                        {(isActive || isDone) && (
                          <View style={styles.progressBarRow}>
                            <View style={styles.sprintRowProgressTrack}>
                              <View style={[styles.sprintRowProgressFill, {
                                width: `${sp}%`,
                                backgroundColor: isDone ? '#10B981' : NAVY,
                              }]} />
                            </View>
                            <Text style={[styles.progressPct, { color: isDone ? '#059669' : NAVY }]}>{sp}%</Text>
                          </View>
                        )}
                      </View>

                      {/* ── Right: count + actions ── */}
                      <View style={styles.sprintRowRight}>
                        {/* Issue count badge */}
                        <View style={[styles.issueCountBubble, { backgroundColor: bubbleBg }]}>
                          <Text style={[styles.issueCountNum, { color: bubbleFg }]}>{issueCount}</Text>
                          <Text style={[styles.issueCountLbl, { color: bubbleSub }]}>issues</Text>
                        </View>

                        {/* Add Issues — only for active or planned sprints */}
                        {!isDone ? (
                          <TouchableOpacity
                            style={[styles.addIssueBtn, {
                              backgroundColor: isActive ? NAVY + '10' : 'transparent',
                              borderColor: isActive ? NAVY + '40' : theme.colors.outlineVariant,
                            }]}
                            onPress={(e) => { e?.stopPropagation?.(); setAddIssuesDialog(sprint.id); setSelectedIssueIds([]); }}
                          >
                            <MaterialCommunityIcons name="plus" size={13} color={isActive ? NAVY : theme.colors.onSurfaceVariant} />
                            <Text style={[styles.addIssueBtnText, { color: isActive ? NAVY : theme.colors.onSurfaceVariant, fontWeight: isActive ? '700' : '500' }]}>
                              Add Issues
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={[styles.addIssueBtn, { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' }]}>
                            <MaterialCommunityIcons name="check" size={13} color="#059669" />
                            <Text style={[styles.addIssueBtnText, { color: '#065F46', fontWeight: '600' }]}>Done</Text>
                          </View>
                        )}

                        <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.outlineVariant} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ══════════════ MEMBERS ══════════════ */}
        {activeTab === TAB_MEMBERS && (
          <View>
            <View style={[styles.membersTableHeader, { backgroundColor: NAVY }]}>
              <Text style={[styles.membersTableHeaderCell, { flex: 2 }]}>MEMBER</Text>
              <Text style={[styles.membersTableHeaderCell, { flex: 2 }]}>EMAIL</Text>
              <Text style={[styles.membersTableHeaderCell, { flex: 1 }]}>ROLE</Text>
            </View>
            {members.map((member, idx) => (
              <View
                key={member.id}
                style={[styles.tableRow, {
                  backgroundColor: idx % 2 === 0 ? cardBg : theme.colors.background,
                  borderBottomColor: theme.colors.outlineVariant,
                }]}
              >
                <View style={[styles.tableCell, { flex: 2 }]}>
                  <Avatar user={member.user} size={32} />
                  <Text style={[styles.tableCellName, { color: theme.colors.onSurface }]}>
                    {member.user ? `${member.user.firstName} ${member.user.lastName || ''}`.trim() : '—'}
                  </Text>
                </View>
                <Text style={[styles.tableCellEmail, { flex: 2, color: theme.colors.onSurfaceVariant }]}>
                  {member.user?.email || '—'}
                </Text>
                <View style={[styles.tableCell, { flex: 1 }]}>
                  <View style={[styles.roleBadge, { backgroundColor: NAVY + '18' }]}>
                    <Text style={[styles.roleBadgeText, { color: NAVY }]}>
                      {ROLE_LABELS[member.role] || member.role}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Create Sprint Dialog ── */}
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

        {/* Add backlog issues to sprint */}
        <Dialog visible={!!addIssuesDialog} onDismiss={() => setAddIssuesDialog(null)} style={[styles.dialog, { maxWidth: 560 }]}>
          <Dialog.Title>Add Issues to Sprint</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            <ScrollView>
              {backlogIssues.length === 0 ? (
                <Text style={[styles.emptyText, { padding: 16, color: theme.colors.onSurfaceVariant }]}>
                  No backlog issues available.
                </Text>
              ) : (
                backlogIssues.map(issue => {
                  const selected = selectedIssueIds.includes(issue.id);
                  return (
                    <TouchableOpacity
                      key={issue.id}
                      onPress={() => toggleIssue(issue.id)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
                        backgroundColor: selected ? theme.colors.primaryContainer : 'transparent',
                        borderRadius: 8, marginHorizontal: 4, marginBottom: 2,
                      }}
                    >
                      <View style={{
                        width: 20, height: 20, borderRadius: 4, borderWidth: 2,
                        borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
                        backgroundColor: selected ? theme.colors.primary : 'transparent',
                        justifyContent: 'center', alignItems: 'center',
                      }}>
                        {selected && <MaterialCommunityIcons name="check" size={12} color="#fff" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.colors.onSurface, fontWeight: selected ? '600' : '400', fontSize: 13 }} numberOfLines={1}>
                          {issue.title}
                        </Text>
                        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, marginTop: 1 }}>
                          {issue.key} · {issue.type} · {issue.priority || 'medium'}
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
            <Button mode="contained" onPress={handleAddIssuesToSprint} loading={movingIssues}
              disabled={selectedIssueIds.length === 0 || movingIssues}>
              Add {selectedIssueIds.length > 0 ? `(${selectedIssueIds.length})` : ''} Issues
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {!!toast && <AppToast message={toast} type={toastType} onDone={() => setToast('')} />}
    </View>
  );
};

/* ── Sub-components ── */

const SprintStat = ({ icon, color, value, label }) => (
  <View style={styles.sprintStatItem}>
    <MaterialCommunityIcons name={icon} size={16} color={color} />
    <Text style={styles.sprintStatValue}>{value}</Text>
    <Text style={styles.sprintStatLabel}>{label}</Text>
  </View>
);

const InfoRow = ({ label, value, theme, valueColor }) => (
  <View style={styles.infoRow}>
    <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
    <Text style={[styles.infoValue, { color: valueColor || theme.colors.onSurface }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Top bar */
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 28, paddingVertical: 12,
    borderBottomWidth: 1, gap: 12,
  },
  backBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  projectAvatar: { width: 42, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  projectAvatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  projectMeta: { flex: 1 },
  projectName: { fontSize: 15, fontWeight: '700' },
  projectSub:  { fontSize: 12, marginTop: 1 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  createBtn:   { borderRadius: 8 },
  settingsBtn: { padding: 8, borderRadius: 8 },

  /* Tab nav */
  tabNav: {
    flexDirection: 'row', paddingHorizontal: 28,
    borderBottomWidth: 1, gap: 4,
  },
  tabItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: 12, marginBottom: -1,
  },
  tabLabel: { fontSize: 13 },

  /* Content */
  content: { flex: 1 },
  contentInner: { padding: 28, paddingTop: 24, paddingBottom: 56 },

  /* Overview grid */
  overviewGrid: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  leftCol: { flex: 3, gap: 20 },
  rightCol: { flex: 2, gap: 20 },

  /* Card shell */
  card: { borderRadius: 14, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, paddingBottom: 12 },
  cardIconWrap: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 13, fontWeight: '700' },

  /* Active sprint card */
  sprintCardBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 18, paddingBottom: 16, gap: 12,
  },
  sprintBannerLabel: { color: '#93C5FD', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 3 },
  sprintBannerName:  { color: '#fff', fontSize: 17, fontWeight: '800' },
  sprintBannerGoal:  { color: '#BFDBFE', fontSize: 12, marginTop: 3, fontStyle: 'italic' },
  daysLeftBadge: {
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
    alignItems: 'center', justifyContent: 'center', minWidth: 64,
  },
  daysLeftNum: { color: '#fff', fontSize: 20, fontWeight: '800' },
  daysLeftLbl: { color: '#BFDBFE', fontSize: 10, fontWeight: '600', marginTop: 1 },

  /* Sprint stat row */
  sprintStatsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9',
  },
  sprintStatItem: { flex: 1, alignItems: 'center', gap: 3 },
  sprintStatValue: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  sprintStatLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  statDivider: { width: 1, height: 32, backgroundColor: '#E2E8F0' },

  /* Sprint progress */
  sprintProgressWrap: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 4 },
  sprintProgressTrack: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  sprintProgressFill:  { height: '100%', backgroundColor: '#10B981', borderRadius: 4 },

  /* Assignee cluster */
  assigneeCluster: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 12, gap: 10,
  },
  clusterAvatar: { borderRadius: 14, borderWidth: 2, borderColor: '#fff' },
  assigneeLabel: { fontSize: 12, fontWeight: '500', marginLeft: 4 },

  viewBoardBtn: { margin: 18, marginTop: 4, borderRadius: 8 },

  /* Empty sprint */
  emptySprintWrap: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24, gap: 8 },
  emptySprintIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  emptySprintTitle: { fontSize: 15, fontWeight: '700' },
  emptySprintSub:   { fontSize: 13, textAlign: 'center' },

  /* Issue distribution */
  totalBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  totalBadgeText: { fontSize: 11, fontWeight: '600' },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, marginBottom: 10 },
  distDot: { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  distLabel: { fontSize: 12, width: 90 },
  distBarWrap: { flex: 1, height: 7, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  distBarFill: { height: '100%', borderRadius: 4 },
  distCount: { fontSize: 12, fontWeight: '700', width: 22, textAlign: 'right' },
  distPct:   { fontSize: 11, fontWeight: '600', width: 34, textAlign: 'right' },
  emptyText: { fontStyle: 'italic', fontSize: 13, paddingHorizontal: 18, paddingBottom: 12 },

  /* About */
  aboutText: { fontSize: 13, lineHeight: 20, paddingHorizontal: 18, paddingBottom: 16 },

  /* Team */
  viewAllLink: { fontSize: 13, fontWeight: '600' },
  memberGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 18, paddingTop: 4 },
  memberItem: { alignItems: 'center', width: 52 },
  memberName: { fontSize: 10, marginTop: 4, textAlign: 'center' },
  moreMembersCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  moreMembersText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  /* Project Info */
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9',
  },
  infoLabel: { fontSize: 12, width: 56 },
  infoValue: { fontSize: 13, fontWeight: '600', flex: 1, textTransform: 'capitalize' },

  /* Sprint list */
  tabContentHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  tabContentTitle: { fontSize: 16, fontWeight: '800' },
  tabContentSub:   { fontSize: 12, marginTop: 2 },

  sprintList: { gap: 12 },
  sprintRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderLeftWidth: 5,
    padding: 18, gap: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
  },
  sprintIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  sprintRowTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'nowrap' },
  sprintRowName:  { fontSize: 14, fontWeight: '700', flex: 1 },
  sprintStatusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1, flexShrink: 0,
  },
  sprintStatusDot: { width: 6, height: 6, borderRadius: 3 },
  sprintStatusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  sprintGoalText:   { fontSize: 12, fontStyle: 'italic', marginLeft: 2 },
  sprintRowMeta:    { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  metaChipText: { fontSize: 11, color: '#6B7280' },
  progressBarRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sprintRowProgressTrack: { flex: 1, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  sprintRowProgressFill:  { height: '100%', borderRadius: 3 },
  progressPct:            { fontSize: 11, fontWeight: '700', minWidth: 30, textAlign: 'right' },

  sprintRowRight: { alignItems: 'center', gap: 10, minWidth: 90 },
  issueCountBubble: {
    width: 60, height: 60, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  issueCountNum: { fontSize: 20, fontWeight: '800' },
  issueCountLbl: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  addIssueBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  addIssueBtnText: { fontSize: 11 },

  /* Members table */
  membersTableHeader: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 11,
    borderRadius: 12, borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
  },
  membersTableHeaderCell: {
    color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5,
    textTransform: 'uppercase', paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, alignItems: 'center',
  },
  tableCell:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tableCellName: { fontSize: 13, fontWeight: '500' },
  tableCellEmail:{ fontSize: 13, paddingHorizontal: 4 },
  roleBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  dialog: { maxWidth: 480, alignSelf: 'center', width: '100%' },
});

export default ProjectDetailScreen;
