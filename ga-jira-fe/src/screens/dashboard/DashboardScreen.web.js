import React, { useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, ProgressBar, useTheme, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/authSlice';
import { useGetDashboardMetricsQuery } from '../../api/reportApi';
import { useGetActiveSprintQuery } from '../../api/sprintApi';
import { useGetIssuesQuery } from '../../api/issueApi';
import { useGetProjectsQuery } from '../../api/projectApi';
import IssueCard from '../../components/issues/IssueCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import { formatDate, getSprintProgress, getDaysRemaining } from '../../utils/dateUtils';
import colors from '../../theme/colors';

const ROLE_LABELS = { super_admin: 'Super Admin', org_admin: 'Supervisor', project_manager: 'Project Manager', team_lead: 'Team Lead', developer: 'Developer', reporter: 'Reporter', viewer: 'Viewer' };

/* ─── Stat tile ─── */
const StatTile = ({ icon, iconBg, iconColor, label, value, sub, onPress }) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      style={[styles.tile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
    >
      <View style={[styles.tileIcon, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
      <Text variant="headlineMedium" style={[styles.tileValue, { color: theme.colors.onSurface }]}>{value ?? 0}</Text>
      <Text variant="bodySmall" style={[styles.tileLabel, { color: theme.colors.onSurface }]}>{label}</Text>
      {!!sub && <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>{sub}</Text>}
    </TouchableOpacity>
  );
};

/* ─── Sprint progress ─── */
const SprintCard = ({ projectId, theme, navigation }) => {
  const { data } = useGetActiveSprintQuery(projectId, { skip: !projectId });
  const sprint = data?.data;
  if (!sprint) return null;
  const progress = getSprintProgress(sprint.startDate, sprint.endDate);
  const daysLeft = getDaysRemaining(sprint.endDate);
  const total = sprint.issues?.length || 0;
  const done = sprint.issues?.filter(i => i.status?.category === 'done').length || 0;
  return (
    <View style={[styles.sprintCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <View style={styles.sprintTop}>
        <View style={{ flex: 1 }}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 2 }}>ACTIVE SPRINT</Text>
          <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>{sprint.name}</Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {formatDate(sprint.startDate)} — {formatDate(sprint.endDate)}
          </Text>
        </View>
        <View style={[styles.daysChip, {
          backgroundColor: (daysLeft !== null && daysLeft < 0) ? '#FEE2E2' : '#DBEAFE',
        }]}>
          <Text variant="labelSmall" style={{ color: (daysLeft !== null && daysLeft < 0) ? '#991B1B' : '#1D4ED8', fontWeight: '700' }}>
            {daysLeft !== null ? (daysLeft >= 0 ? `${daysLeft}d left` : 'Overdue') : 'Active'}
          </Text>
        </View>
      </View>
      <ProgressBar progress={progress / 100} color={colors.primary} style={styles.sprintBar} />
      <View style={styles.sprintBottom}>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{done}/{total} issues done</Text>
        <Button compact mode="text" onPress={() => navigation.navigate('ProjectStack', { screen: 'Sprint', params: { projectId } })}>
          View Board
        </Button>
      </View>
    </View>
  );
};

/* ─── Section header ─── */
const SectionHeader = ({ title, action, onAction }) => {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{title}</Text>
      {!!action && <Button compact mode="text" onPress={onAction}>{action}</Button>}
    </View>
  );
};

/* ─── Main Dashboard ─── */
const DashboardScreen = ({ navigation }) => {
  const theme = useTheme();
  const user = useSelector(selectUser);
  const isAdmin = ['super_admin', 'org_admin', 'project_manager'].includes(user?.role);

  const { data: metricsResp, isLoading: mLoading, refetch: refetchMetrics } = useGetDashboardMetricsQuery();
  const { data: projectsData } = useGetProjectsQuery({ limit: 6 });
  const { data: myIssues, isLoading: iLoading, refetch: refetchIssues } = useGetIssuesQuery({
    assigneeId: user?.id, limit: 10,
  });

  const handleRefresh = useCallback(() => { refetchMetrics(); refetchIssues(); }, [refetchMetrics, refetchIssues]);

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  if (mLoading || iLoading) return <LoadingScreen message="Loading dashboard..." />;

  const m = metricsResp?.data || {};
  const projects = projectsData?.data?.data || [];
  const myTasksList = myIssues?.data?.data || [];

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* ── Compact greeting row ── */}
        <View style={styles.greetingRow}>
          <View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {greeting()},{' '}
              <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                {user?.firstName} {user?.lastName}
              </Text>
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.primary, marginTop: 1 }}>
              {ROLE_LABELS[user?.role] || user?.role} · General Aeronautics
            </Text>
          </View>
          <TouchableOpacity onPress={handleRefresh} style={[styles.refreshBtn, { backgroundColor: theme.colors.surfaceVariant }]}>
            <MaterialCommunityIcons name="refresh" size={17} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* ── Admin stat row ── */}
        {isAdmin ? (
          <>
            <View style={styles.statsGrid}>
              <StatTile icon="folder-multiple" iconBg="#DBEAFE" iconColor="#1D4ED8" label="Total Projects" value={m.totalProjects} sub="in org" onPress={() => navigation.navigate('Projects')} />
              <StatTile icon="alert-circle-outline" iconBg="#FEF3C7" iconColor="#D97706" label="Total Issues" value={m.totalIssues} sub="all projects" />
              <StatTile icon="progress-clock" iconBg="#EDE9FE" iconColor="#7C3AED" label="In Progress" value={m.inProgressCount} sub="org-wide" />
              <StatTile icon="check-circle-outline" iconBg="#D1FAE5" iconColor="#065F46" label="Done" value={m.doneCount} sub="org-wide" />
              <StatTile icon="clock-alert-outline" iconBg="#FEE2E2" iconColor="#DC2626" label="Overdue" value={m.overdueCount} sub="need attention" />
              <StatTile icon="lightning-bolt-outline" iconBg="#E0F2FE" iconColor="#0369A1" label="Active Sprints" value={m.activeSprintsCount} sub="running now" />
              <StatTile icon="account-group" iconBg="#F3E8FF" iconColor="#7C3AED" label="Team Members" value={m.totalMembers} sub="in org" />
              <StatTile icon="clipboard-check" iconBg="#DCFCE7" iconColor="#16A34A" label="My Open Tasks" value={m.myTasks} sub="assigned to me" />
            </View>

            {/* Admin: 2-column layout */}
            <View style={styles.twoCol}>

              {/* Left: Projects + Issues list */}
              <View style={styles.col}>
                {/* Active sprint of first project */}
                {projects[0] && (
                  <View style={styles.section}>
                    <SprintCard projectId={projects[0].id} theme={theme} navigation={navigation} />
                  </View>
                )}

                <View style={styles.section}>
                  <SectionHeader title="Recent Projects" action="View All" onAction={() => navigation.navigate('Projects')} />
                  {projects.length === 0 ? (
                    <EmptyBlock icon="folder-outline" label="No projects yet" theme={theme} />
                  ) : (
                    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                      {projects.map((p, i) => (
                        <React.Fragment key={p.id}>
                          <TouchableOpacity
                            style={styles.projectRow}
                            onPress={() => navigation.navigate('ProjectStack', { screen: 'ProjectDetail', params: { projectId: p.id } })}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.projectAvatar, { backgroundColor: p.color || colors.primary }]}>
                              <Text style={styles.projectAvatarText}>{p.key?.substring(0, 2)}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }} numberOfLines={1}>{p.name}</Text>
                              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{p.issueCount || 0} issues · {p.memberCount || 0} members</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.onSurfaceVariant} />
                          </TouchableOpacity>
                          {i < projects.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Right: My tasks + summary */}
              <View style={styles.colNarrow}>
                <View style={styles.section}>
                  <SectionHeader
                    title="My Assigned Tasks"
                    action="View All"
                    onAction={() => navigation.navigate('ProjectStack', { screen: 'IssueList' })}
                  />
                  {myTasksList.length === 0 ? (
                    <EmptyBlock icon="clipboard-check-outline" label="No tasks assigned to you" theme={theme} />
                  ) : (
                    <View style={{ gap: 8 }}>
                      {myTasksList.slice(0, 6).map(issue => (
                        <IssueCard
                          key={issue.id}
                          issue={issue}
                          onPress={() => navigation.navigate('ProjectStack', { screen: 'IssueDetail', params: { issueId: issue.id } })}
                        />
                      ))}
                    </View>
                  )}
                </View>

                {/* Issue breakdown */}
                <View style={styles.section}>
                  <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Issue Breakdown</Text>
                  <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    {[
                      { label: 'To Do',       value: m.todoCount,       color: '#6B7280' },
                      { label: 'In Progress',  value: m.inProgressCount, color: '#3B82F6' },
                      { label: 'Done',         value: m.doneCount,       color: '#10B981' },
                      { label: 'Overdue',      value: m.overdueCount,    color: '#EF4444' },
                    ].map(({ label, value, color }) => (
                      <View key={label} style={styles.breakdownRow}>
                        <View style={[styles.breakdownDot, { backgroundColor: color }]} />
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurface, flex: 1 }}>{label}</Text>
                        <View style={styles.breakdownBarWrap}>
                          <View style={[styles.breakdownBarFill, {
                            width: `${Math.max(4, ((value || 0) / Math.max(m.totalIssues || 1, 1)) * 100)}%`,
                            backgroundColor: color,
                          }]} />
                        </View>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, width: 28, textAlign: 'right' }}>{value || 0}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </>
        ) : (
          /* ── Developer / Reporter view ── */
          <>
            <View style={styles.statsGrid}>
              <StatTile icon="clipboard-check" iconBg="#DBEAFE" iconColor="#1D4ED8" label="My Tasks" value={m.myTasks} sub="open" />
              <StatTile icon="progress-clock" iconBg="#EDE9FE" iconColor="#7C3AED" label="In Progress" value={m.inProgress} sub="this sprint" />
              <StatTile icon="check-circle-outline" iconBg="#D1FAE5" iconColor="#065F46" label="Completed" value={m.completedToday} sub="today" />
              <StatTile icon="clock-alert-outline" iconBg="#FEE2E2" iconColor="#DC2626" label="Overdue" value={m.overdue} sub="past due" />
            </View>

            <View style={styles.twoCol}>
              <View style={styles.col}>
                {projects[0] && <View style={styles.section}><SprintCard projectId={projects[0].id} theme={theme} navigation={navigation} /></View>}
                <View style={styles.section}>
                  <SectionHeader title="My Tasks" action="View All" onAction={() => navigation.navigate('ProjectStack', { screen: 'IssueList' })} />
                  {myTasksList.length === 0
                    ? <EmptyBlock icon="clipboard-check-outline" label="No active tasks - you're all caught up!" theme={theme} />
                    : <View style={{ gap: 8 }}>{myTasksList.map(issue => (
                      <IssueCard key={issue.id} issue={issue}
                        onPress={() => navigation.navigate('ProjectStack', { screen: 'IssueDetail', params: { issueId: issue.id } })} />
                    ))}</View>
                  }
                </View>
              </View>
              <View style={styles.colNarrow}>
                <View style={styles.section}>
                  <SectionHeader title="Projects" action="View All" onAction={() => navigation.navigate('Projects')} />
                  {projects.length === 0
                    ? <EmptyBlock icon="folder-outline" label="No projects" theme={theme} />
                    : <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                      {projects.map((p, i) => (
                        <React.Fragment key={p.id}>
                          <TouchableOpacity
                            style={styles.projectRow}
                            onPress={() => navigation.navigate('ProjectStack', { screen: 'ProjectDetail', params: { projectId: p.id } })}
                          >
                            <View style={[styles.projectAvatar, { backgroundColor: p.color || colors.primary }]}>
                              <Text style={styles.projectAvatarText}>{p.key?.substring(0, 2)}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }} numberOfLines={1}>{p.name}</Text>
                              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{p.issueCount || 0} issues</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.onSurfaceVariant} />
                          </TouchableOpacity>
                          {i < projects.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </View>
                  }
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const EmptyBlock = ({ icon, label, theme }) => (
  <View style={[styles.emptyBlock, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
    <MaterialCommunityIcons name={icon} size={32} color={theme.colors.onSurfaceVariant} />
    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: 'center' }}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  greetingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 28, paddingTop: 14, paddingBottom: 2,
  },
  refreshBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14,
    paddingHorizontal: 28, paddingTop: 14, paddingBottom: 8,
  },
  tile: {
    minWidth: 140, flex: 1, borderRadius: 8, padding: 18,
    borderWidth: 1,
    alignItems: 'flex-start', gap: 4,
    boxShadow: '0px 10px 24px rgba(20,33,61,0.06)',
  },
  tileIcon: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  tileValue: { fontWeight: '800', lineHeight: 36 },
  tileLabel: { fontWeight: '600', fontSize: 13 },

  twoCol: { flexDirection: 'row', paddingHorizontal: 28, paddingTop: 14, paddingBottom: 40, gap: 20 },
  col: { flex: 3, gap: 0 },
  colNarrow: { flex: 2, gap: 0 },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontWeight: '700', fontSize: 14 },

  sprintCard: {
    borderRadius: 8, padding: 18,
    borderWidth: 1,
    boxShadow: '0px 10px 24px rgba(20,33,61,0.06)',
    marginBottom: 0,
  },
  sprintTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  daysChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sprintBar: { height: 8, borderRadius: 4 },
  sprintBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },

  card: { borderRadius: 8, overflow: 'hidden', borderWidth: 1, boxShadow: '0px 10px 24px rgba(20,33,61,0.05)' },
  projectRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  projectAvatar: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  projectAvatarText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0F2F5' },
  breakdownDot: { width: 10, height: 10, borderRadius: 5 },
  breakdownBarWrap: { flex: 1, height: 6, backgroundColor: '#EBECF0', borderRadius: 3, overflow: 'hidden' },
  breakdownBarFill: { height: '100%', borderRadius: 3 },

  emptyBlock: {
    borderRadius: 8, borderWidth: 1, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', paddingVertical: 32,
  },
});

export default DashboardScreen;
