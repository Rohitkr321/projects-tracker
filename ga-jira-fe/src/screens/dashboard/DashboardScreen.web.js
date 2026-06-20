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

const ROLE_LABELS = {
  super_admin: 'Super Admin', org_admin: 'Supervisor', project_manager: 'Project Manager',
  team_lead: 'Team Lead', developer: 'Developer', reporter: 'Reporter', viewer: 'Viewer',
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const initials = (u) => `${u?.firstName?.[0] || ''}${u?.lastName?.[0] || ''}`.toUpperCase();

/* ─── Stat tile ─── */
const StatTile = ({ icon, iconBg, iconColor, label, value, sub, onPress }) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      style={[styles.tile, {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.outlineVariant,
        borderLeftColor: iconColor,
      }]}
    >
      <View style={styles.tileRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.tileValue, { color: theme.colors.onSurface }]}>{value ?? 0}</Text>
          <Text style={[styles.tileLabel, { color: theme.colors.onSurface }]}>{label}</Text>
          {!!sub && <Text style={[styles.tileSub, { color: theme.colors.onSurfaceVariant }]}>{sub}</Text>}
        </View>
        <View style={[styles.tileIcon, { backgroundColor: iconBg }]}>
          <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

/* ─── Sprint card ─── */
const SprintCard = ({ projectId, theme, navigation }) => {
  const { data } = useGetActiveSprintQuery(projectId, { skip: !projectId });
  const sprint = data?.data;
  if (!sprint) return null;
  const progress = getSprintProgress(sprint.startDate, sprint.endDate);
  const daysLeft = getDaysRemaining(sprint.endDate);
  const total = sprint.issues?.length || 0;
  const done = sprint.issues?.filter(i => i.status?.category === 'done').length || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const overdue = daysLeft !== null && daysLeft < 0;

  return (
    <View style={[styles.sprintCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <View style={styles.sprintAccent} />
      <View style={styles.sprintInner}>
        <View style={styles.sprintTop}>
          <View style={{ flex: 1 }}>
            <View style={styles.sprintLabelRow}>
              <MaterialCommunityIcons name="lightning-bolt" size={13} color={colors.brand.sky} />
              <Text style={styles.sprintBadgeText}>ACTIVE SPRINT</Text>
            </View>
            <Text style={[styles.sprintName, { color: theme.colors.onSurface }]}>{sprint.name}</Text>
            <Text style={[styles.sprintDates, { color: theme.colors.onSurfaceVariant }]}>
              {formatDate(sprint.startDate)} — {formatDate(sprint.endDate)}
            </Text>
          </View>
          <View style={[styles.daysChip, { backgroundColor: overdue ? '#FEE2E2' : '#DBEAFE' }]}>
            <Text style={[styles.daysChipText, { color: overdue ? '#991B1B' : '#1D4ED8' }]}>
              {daysLeft !== null ? (daysLeft >= 0 ? `${daysLeft}d left` : 'Overdue') : 'Active'}
            </Text>
          </View>
        </View>

        <View style={styles.sprintProgressSection}>
          <View style={styles.sprintProgressHeader}>
            <Text style={[styles.sprintProgressLabel, { color: theme.colors.onSurfaceVariant }]}>
              {done} of {total} issues completed
            </Text>
            <Text style={[styles.sprintPct, { color: colors.brand.navy }]}>{pct}%</Text>
          </View>
          <ProgressBar
            progress={pct / 100}
            color={colors.primary}
            style={styles.sprintBar}
          />
        </View>

        <View style={styles.sprintFooter}>
          <View style={styles.sprintStats}>
            <View style={styles.sprintStat}>
              <View style={[styles.sprintStatDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.sprintStatText, { color: theme.colors.onSurfaceVariant }]}>{done} done</Text>
            </View>
            <View style={styles.sprintStat}>
              <View style={[styles.sprintStatDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={[styles.sprintStatText, { color: theme.colors.onSurfaceVariant }]}>{total - done} remaining</Text>
            </View>
          </View>
          <Button
            compact
            mode="contained-tonal"
            style={styles.sprintBtn}
            labelStyle={styles.sprintBtnLabel}
            onPress={() => navigation.navigate('ProjectStack', { screen: 'Sprint', params: { projectId } })}
          >
            View Board
          </Button>
        </View>
      </View>
    </View>
  );
};

/* ─── Section header ─── */
const SectionHeader = ({ title, action, onAction }) => {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionAccentBar} />
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{title}</Text>
      </View>
      {!!action && (
        <Button compact mode="text" onPress={onAction} labelStyle={styles.viewAllLabel}>
          {action}
        </Button>
      )}
    </View>
  );
};

/* ─── Empty block ─── */
const EmptyBlock = ({ icon, label, theme }) => (
  <View style={[styles.emptyBlock, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
    <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.surfaceVariant }]}>
      <MaterialCommunityIcons name={icon} size={28} color={theme.colors.onSurfaceVariant} />
    </View>
    <Text style={[styles.emptyLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
  </View>
);

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

  if (mLoading || iLoading) return <LoadingScreen message="Loading dashboard..." />;

  const m = metricsResp?.data || {};
  const projects = projectsData?.data?.data || [];
  const myTasksList = myIssues?.data?.data || [];
  const totalIssues = Math.max(m.totalIssues || 1, 1);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* ── Hero greeting banner ── */}
        <View style={[styles.hero, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
          <View style={styles.heroLeft}>
            <View style={[styles.heroIconBadge, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons name="view-dashboard" size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={[styles.heroGreeting, { color: theme.colors.onSurfaceVariant }]}>Operational dashboard</Text>
              <Text style={[styles.heroName, { color: theme.colors.onSurface }]}>{greeting()}, {user?.firstName} {user?.lastName}</Text>
              <View style={styles.heroMetaRow}>
              <View style={[styles.heroBadge, { backgroundColor: colors.secondaryContainer, borderColor: colors.secondaryLight }]}>
                <Text style={[styles.heroBadgeText, { color: colors.secondaryDark }]}>{ROLE_LABELS[user?.role] || user?.role}</Text>
              </View>
              <Text style={styles.heroDot}>·</Text>
              <Text style={[styles.heroOrg, { color: theme.colors.onSurfaceVariant }]}>General Aeronautics</Text>
            </View>
          </View>
          </View>
          <View style={styles.heroRight}>
            <View style={[styles.heroPulseCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
              <Text style={[styles.heroPulseLabel, { color: theme.colors.onSurfaceVariant }]}>Workload</Text>
              <Text style={[styles.heroPulseValue, { color: theme.colors.onSurface }]}>{m.totalIssues || 0} issues</Text>
              <View style={styles.heroPulseRow}>
                <View style={styles.heroPulseItem}>
                  <View style={[styles.heroPulseDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.heroPulseText, { color: theme.colors.onSurfaceVariant }]}>{m.doneCount || 0} done</Text>
                </View>
                <View style={styles.heroPulseItem}>
                  <View style={[styles.heroPulseDot, { backgroundColor: colors.warning }]} />
                  <Text style={[styles.heroPulseText, { color: theme.colors.onSurfaceVariant }]}>{m.overdueCount || 0} overdue</Text>
                </View>
              </View>
            </View>
            <View style={[styles.heroAvatar, { backgroundColor: colors.brand.navy }]}>
              <Text style={styles.heroAvatarText}>{initials(user)}</Text>
            </View>
            <TouchableOpacity
              onPress={handleRefresh}
              style={[styles.heroRefreshBtn, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}
              activeOpacity={0.82}
            >
              <MaterialCommunityIcons name="refresh" size={17} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>

        {isAdmin ? (
          <>
            {/* ── Admin stats grid ── */}
            <View style={styles.statsSection}>
              <View style={styles.statsRow}>
                <StatTile icon="folder-multiple"      iconBg="#DBEAFE" iconColor="#1D4ED8" label="Total Projects"  value={m.totalProjects}      sub="in org"         onPress={() => navigation.navigate('Projects')} />
                <StatTile icon="alert-circle-outline" iconBg="#FEF3C7" iconColor="#D97706" label="Total Issues"    value={m.totalIssues}        sub="all projects" />
                <StatTile icon="progress-clock"       iconBg="#EDE9FE" iconColor="#7C3AED" label="In Progress"     value={m.inProgressCount}    sub="org-wide" />
                <StatTile icon="eye-check-outline"    iconBg="#FFF7ED" iconColor="#EA580C" label="In Review"       value={m.inReviewCount}      sub="org-wide" />
                <StatTile icon="check-circle-outline" iconBg="#D1FAE5" iconColor="#059669" label="Done"            value={m.doneCount}          sub="org-wide" />
              </View>
              <View style={styles.statsRow}>
                <StatTile icon="clock-alert-outline"  iconBg="#FEE2E2" iconColor="#DC2626" label="Overdue"         value={m.overdueCount}       sub="need attention" />
                <StatTile icon="lightning-bolt"       iconBg="#E0F2FE" iconColor="#0369A1" label="Active Sprints"  value={m.activeSprintsCount} sub="running now" />
                <StatTile icon="account-group"        iconBg="#F3E8FF" iconColor="#7C3AED" label="Team Members"    value={m.totalMembers}       sub="in org" />
                <StatTile icon="clipboard-check"      iconBg="#DCFCE7" iconColor="#16A34A" label="My Open Tasks"   value={m.myTasks}            sub="assigned to me" />
              </View>
            </View>

            {/* ── Two-column layout ── */}
            <View style={styles.twoCol}>
              {/* Left */}
              <View style={styles.col}>
                {projects.map(p => (
                  <View key={p.id} style={styles.section}>
                    <SprintCard projectId={p.id} theme={theme} navigation={navigation} />
                  </View>
                ))}
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
                              <Text style={[styles.projectName, { color: theme.colors.onSurface }]} numberOfLines={1}>{p.name}</Text>
                              <Text style={[styles.projectMeta, { color: theme.colors.onSurfaceVariant }]}>{p.issueCount || 0} issues · {p.memberCount || 0} members</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
                          </TouchableOpacity>
                          {i < projects.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Right */}
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
                      {myTasksList.slice(0, 5).map(issue => (
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
                  <SectionHeader title="Issue Breakdown" />
                  <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                    {[
                      { label: 'To Do',       value: m.todoCount,       color: '#6B7280' },
                      { label: 'In Progress', value: m.inProgressCount, color: '#3B82F6' },
                      { label: 'In Review',   value: m.inReviewCount,   color: '#EA580C' },
                      { label: 'Done',        value: m.doneCount,       color: '#10B981' },
                      { label: 'Overdue',     value: m.overdueCount,    color: '#EF4444' },
                    ].map(({ label, value, color }) => {
                      const pct = Math.round(((value || 0) / totalIssues) * 100);
                      return (
                        <View key={label} style={styles.breakdownRow}>
                          <View style={[styles.breakdownDot, { backgroundColor: color }]} />
                          <Text style={[styles.breakdownLabel, { color: theme.colors.onSurface }]}>{label}</Text>
                          <View style={styles.breakdownBarWrap}>
                            <View style={[styles.breakdownBarFill, {
                              width: `${Math.max(3, ((value || 0) / totalIssues) * 100)}%`,
                              backgroundColor: color,
                            }]} />
                          </View>
                          <Text style={[styles.breakdownCount, { color: theme.colors.onSurfaceVariant }]}>{value || 0}</Text>
                          <Text style={[styles.breakdownPct, { color }]}>{pct}%</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>
          </>
        ) : (
          /* ── Developer / Reporter view ── */
          <>
            <View style={styles.statsSection}>
              <View style={styles.statsRow}>
                <StatTile icon="clipboard-check"      iconBg="#DBEAFE" iconColor="#1D4ED8" label="My Tasks"    value={m.myTasks}          sub="open" />
                <StatTile icon="progress-clock"       iconBg="#EDE9FE" iconColor="#7C3AED" label="In Progress" value={m.inProgress}        sub="this sprint" />
                <StatTile icon="check-circle-outline" iconBg="#D1FAE5" iconColor="#059669" label="Completed"   value={m.completedToday}    sub="today" />
                <StatTile icon="clock-alert-outline"  iconBg="#FEE2E2" iconColor="#DC2626" label="Overdue"     value={m.overdue}           sub="past due" />
              </View>
            </View>

            <View style={styles.twoCol}>
              <View style={styles.col}>
                {projects.map(p => (
                <View key={p.id} style={styles.section}>
                  <SprintCard projectId={p.id} theme={theme} navigation={navigation} />
                </View>
              ))}
                <View style={styles.section}>
                  <SectionHeader title="My Tasks" action="View All" onAction={() => navigation.navigate('ProjectStack', { screen: 'IssueList' })} />
                  {myTasksList.length === 0
                    ? <EmptyBlock icon="clipboard-check-outline" label="No active tasks — you're all caught up!" theme={theme} />
                    : <View style={{ gap: 8 }}>{myTasksList.slice(0, 5).map(issue => (
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
                            <TouchableOpacity style={styles.projectRow}
                              onPress={() => navigation.navigate('ProjectStack', { screen: 'ProjectDetail', params: { projectId: p.id } })}>
                              <View style={[styles.projectAvatar, { backgroundColor: p.color || colors.primary }]}>
                                <Text style={styles.projectAvatarText}>{p.key?.substring(0, 2)}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.projectName, { color: theme.colors.onSurface }]} numberOfLines={1}>{p.name}</Text>
                                <Text style={[styles.projectMeta, { color: theme.colors.onSurfaceVariant }]}>{p.issueCount || 0} issues</Text>
                              </View>
                              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
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

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Hero */
  hero: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 28, paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 20,
  },
  heroLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  heroIconBadge: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  heroCopy: { flex: 1, minWidth: 0 },
  heroGreeting: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0, marginBottom: 3 },
  heroName: { fontSize: 23, fontWeight: '900', letterSpacing: 0, marginBottom: 8 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  heroBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4 },
  heroBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0 },
  heroDot: { display: 'none' },
  heroOrgPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4 },
  heroOrg: { fontSize: 11, fontWeight: '700' },
  heroRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroPulseCard: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, minWidth: 170 },
  heroPulseLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0 },
  heroPulseValue: { fontSize: 16, fontWeight: '900', marginTop: 1 },
  heroPulseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  heroPulseItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroPulseDot: { width: 7, height: 7, borderRadius: 4 },
  heroPulseText: { fontSize: 11, fontWeight: '700' },
  heroAvatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  heroAvatarText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15, letterSpacing: 0 },
  heroRefreshBtn: {
    width: 36, height: 36, borderRadius: 9, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
    outlineStyle: 'none',
  },

  /* Stats */
  statsSection: { paddingHorizontal: 28, paddingTop: 18, paddingBottom: 4, gap: 12 },
  statsRow: { flexDirection: 'row', gap: 12 },
  tile: {
    flex: 1, borderRadius: 10, padding: 16,
    borderWidth: 1, borderLeftWidth: 3,
    boxShadow: '0px 2px 8px rgba(6,43,111,0.06)',
    outlineStyle: 'none',
  },
  tileRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  tileValue: { fontSize: 28, fontWeight: '800', lineHeight: 34, color: colors.brand.navy, letterSpacing: 0 },
  tileLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  tileSub: { fontSize: 11, marginTop: 3 },
  tileIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  /* Two-column */
  twoCol: { flexDirection: 'row', paddingHorizontal: 28, paddingTop: 20, paddingBottom: 40, gap: 20 },
  col: { flex: 3, gap: 0 },
  colNarrow: { flex: 2, gap: 0 },
  section: { marginBottom: 24 },

  /* Section headers */
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccentBar: { width: 3, height: 16, borderRadius: 2, backgroundColor: colors.brand.navy },
  sectionTitle: { fontWeight: '700', fontSize: 14, letterSpacing: 0 },
  viewAllLabel: { fontSize: 12 },

  /* Sprint card */
  sprintCard: {
    borderRadius: 10, borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0px 2px 12px rgba(6,43,111,0.08)',
  },
  sprintAccent: { height: 4, backgroundColor: colors.brand.navy },
  sprintInner: { padding: 18 },
  sprintTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  sprintLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  sprintBadgeText: { fontSize: 10, fontWeight: '700', color: colors.brand.sky, letterSpacing: 0.8 },
  sprintName: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  sprintDates: { fontSize: 12 },
  daysChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  daysChipText: { fontSize: 11, fontWeight: '700' },
  sprintProgressSection: { marginBottom: 14 },
  sprintProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sprintProgressLabel: { fontSize: 12 },
  sprintPct: { fontSize: 13, fontWeight: '800' },
  sprintBar: { height: 8, borderRadius: 4 },
  sprintFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sprintStats: { flexDirection: 'row', gap: 16 },
  sprintStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sprintStatDot: { width: 8, height: 8, borderRadius: 4 },
  sprintStatText: { fontSize: 12 },
  sprintBtn: { borderRadius: 7 },
  sprintBtnLabel: { fontSize: 12, fontWeight: '600' },

  /* Card */
  card: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, boxShadow: '0px 2px 8px rgba(6,43,111,0.05)' },

  /* Project rows */
  projectRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  projectAvatar: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  projectAvatarText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  projectName: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  projectMeta: { fontSize: 11 },

  /* Breakdown */
  breakdownRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0F2F5',
  },
  breakdownDot: { width: 9, height: 9, borderRadius: 4.5 },
  breakdownLabel: { fontSize: 12, fontWeight: '500', width: 72 },
  breakdownBarWrap: { flex: 1, height: 6, backgroundColor: '#EBECF0', borderRadius: 3, overflow: 'hidden' },
  breakdownBarFill: { height: '100%', borderRadius: 3 },
  breakdownCount: { fontSize: 12, width: 22, textAlign: 'right', fontWeight: '600' },
  breakdownPct: { fontSize: 11, width: 34, textAlign: 'right', fontWeight: '700' },

  /* Empty */
  emptyBlock: {
    borderRadius: 10, borderWidth: 1, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', paddingVertical: 36, gap: 10,
  },
  emptyIconWrap: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  emptyLabel: { fontSize: 13, textAlign: 'center' },
});

export default DashboardScreen;
