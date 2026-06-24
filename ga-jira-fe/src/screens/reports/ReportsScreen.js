import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme, ActivityIndicator, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetProjectStatsQuery, useGetProjectsQuery } from '../../api/projectApi';
import { useGetSprintsQuery } from '../../api/sprintApi';
import { useGetCumulativeFlowReportQuery, useGetVelocityReportQuery } from '../../api/reportApi';

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'view-dashboard-outline' },
  { key: 'velocity', label: 'Velocity', icon: 'lightning-bolt' },
  { key: 'flow', label: 'Flow', icon: 'chart-areaspline' },
  { key: 'time', label: 'Time', icon: 'clock-outline' },
];

const RANGE_OPTIONS = [
  { label: '30d', value: 30 },
  { label: '60d', value: 60 },
  { label: '90d', value: 90 },
];

const CFD_COLORS = { done: '#10B981', inProgress: '#3B82F6', todo: '#94A3B8' };
const CHART_H = 150;
const BAR_W = 10;
const BAR_GAP = 3;

/* ─── Stat Block ─── */
const StatBlock = ({ label, value, icon, color, theme }) => (
  <View style={[styles.statBlock, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, borderLeftColor: color || theme.colors.primary }]}>
    <View style={[styles.statIcon, { backgroundColor: (color || theme.colors.primary) + '18' }]}>
      <MaterialCommunityIcons name={icon} size={18} color={color || theme.colors.primary} />
    </View>
    <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>{value ?? 0}</Text>
    <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
  </View>
);

/* ─── Velocity Bar Chart ─── */
const VelocityChart = ({ sprints, avgVelocity, theme }) => {
  if (!sprints.length) return (
    <View style={styles.emptyChart}>
      <MaterialCommunityIcons name="lightning-bolt-outline" size={36} color={theme.colors.outlineVariant} />
      <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No completed sprints yet</Text>
    </View>
  );

  const maxV = Math.max(...sprints.map(s => Math.max(s.totalPoints || 0, s.completedPoints || 0, 1)));

  return (
    <View>
      <View style={styles.velocityLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#CBD5E1' }]} />
          <Text style={[styles.legendLabel, { color: theme.colors.onSurfaceVariant }]}>Committed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#0F2557' }]} />
          <Text style={[styles.legendLabel, { color: theme.colors.onSurfaceVariant }]}>Completed</Text>
        </View>
        {avgVelocity > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F5A623', borderRadius: 0 }]} />
            <Text style={[styles.legendLabel, { color: theme.colors.onSurfaceVariant }]}>Avg {avgVelocity}pt</Text>
          </View>
        )}
      </View>
      {sprints.map((sprint, i) => {
        const commitPct = Math.min(((sprint.totalPoints || 0) / maxV) * 100, 100);
        const donePct = Math.min(((sprint.completedPoints || 0) / maxV) * 100, 100);
        return (
          <View key={sprint.id} style={styles.velocityRow}>
            <Text style={[styles.velocityName, { color: theme.colors.onSurface }]} numberOfLines={1}>{sprint.name}</Text>
            <View style={styles.velocityBars}>
              <View style={[styles.vBarTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View style={[styles.vBarFill, { width: `${commitPct}%`, backgroundColor: '#CBD5E1' }]} />
                <View style={[styles.vBarFill, { width: `${donePct}%`, backgroundColor: '#0F2557', position: 'absolute', top: 0, left: 0 }]} />
              </View>
            </View>
            <Text style={[styles.velocityPts, { color: theme.colors.onSurfaceVariant }]}>{sprint.completedPoints || 0}pt</Text>
          </View>
        );
      })}
    </View>
  );
};

/* ─── CFD Stacked Bar Chart ─── */
const CfdChart = ({ projectId, days, theme }) => {
  const { data, isLoading } = useGetCumulativeFlowReportQuery(
    { projectId, days },
    { skip: !projectId }
  );

  const points = data?.data || [];

  if (isLoading) return <ActivityIndicator style={{ margin: 40 }} color={theme.colors.primary} />;
  if (!points.length) return (
    <View style={styles.emptyChart}>
      <MaterialCommunityIcons name="chart-areaspline" size={36} color={theme.colors.outlineVariant} />
      <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No issue data for this range</Text>
    </View>
  );

  const maxTotal = Math.max(...points.map(d => d.total), 1);
  const last = points[points.length - 1];
  const labelEvery = Math.ceil(points.length / 6);

  return (
    <View>
      {/* Legend */}
      <View style={styles.cfdLegendRow}>
        {[
          { color: CFD_COLORS.done, label: 'Done' },
          { color: CFD_COLORS.inProgress, label: 'In Progress' },
          { color: CFD_COLORS.todo, label: 'To Do' },
        ].map(({ color, label }) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: color }]} />
            <Text style={[styles.legendLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Chart */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 4 }}>
        <View>
          {/* Chart area */}
          <View style={{ height: CHART_H, position: 'relative' }}>
            {/* Horizontal grid lines */}
            {[0.25, 0.5, 0.75].map(f => (
              <View key={f} style={[styles.gridLine, { bottom: f * CHART_H, borderColor: theme.colors.outlineVariant }]} />
            ))}
            {/* Bars */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H, gap: BAR_GAP }}>
              {points.map((d, i) => {
                const doneH = (d.done / maxTotal) * CHART_H;
                const inProgH = (d.inProgress / maxTotal) * CHART_H;
                const todoH = (d.todo / maxTotal) * CHART_H;
                const totalH = doneH + inProgH + todoH;
                return (
                  <View key={i} style={{ width: BAR_W, height: Math.max(1, totalH), flexDirection: 'column' }}>
                    <View style={{ height: Math.max(0, todoH), backgroundColor: CFD_COLORS.todo }} />
                    <View style={{ height: Math.max(0, inProgH), backgroundColor: CFD_COLORS.inProgress }} />
                    <View style={{ height: Math.max(0, doneH), backgroundColor: CFD_COLORS.done }} />
                  </View>
                );
              })}
            </View>
          </View>

          {/* X-axis date labels */}
          <View style={{ flexDirection: 'row', marginTop: 5, gap: BAR_GAP }}>
            {points.map((d, i) => (
              <View key={i} style={{ width: BAR_W }}>
                {i % labelEvery === 0 && (
                  <Text style={[styles.xLabel, { color: theme.colors.onSurfaceVariant }]}>{d.date.slice(5)}</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Current snapshot */}
      <View style={[styles.cfdSnapshot, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
        {[
          { label: 'Done', value: last.done, color: CFD_COLORS.done },
          { label: 'In Progress', value: last.inProgress, color: CFD_COLORS.inProgress },
          { label: 'To Do', value: last.todo, color: CFD_COLORS.todo },
          { label: 'Total', value: last.total, color: theme.colors.onSurface },
        ].map(({ label, value, color }) => (
          <View key={label} style={styles.snapshotStat}>
            <Text style={[styles.snapshotVal, { color }]}>{value}</Text>
            <Text style={[styles.snapshotLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Insight callout */}
      {last.inProgress > last.done && (
        <View style={[styles.insightBox, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
          <MaterialCommunityIcons name="alert-outline" size={14} color="#D97706" />
          <Text style={styles.insightText}>In Progress count ({last.inProgress}) exceeds Done — possible bottleneck</Text>
        </View>
      )}
      {last.done > 0 && last.total > 0 && (
        <View style={[styles.insightBox, { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0', marginTop: 6 }]}>
          <MaterialCommunityIcons name="check-circle-outline" size={14} color="#059669" />
          <Text style={[styles.insightText, { color: '#065F46' }]}>
            {Math.round((last.done / last.total) * 100)}% of issues completed — flow is healthy
          </Text>
        </View>
      )}
    </View>
  );
};

/* ─── Main Screen ─── */
const ReportsScreen = () => {
  const theme = useTheme();
  const [tab, setTab] = useState('overview');
  const [cfdDays, setCfdDays] = useState(30);
  const [selectedProjectIdx, setSelectedProjectIdx] = useState(0);

  const { data: projectsData } = useGetProjectsQuery({ limit: 10 });
  const projects = projectsData?.data?.data || [];
  const selectedProject = projects[selectedProjectIdx];
  const projectId = selectedProject?.id;

  const { data: statsData, isLoading } = useGetProjectStatsQuery(projectId, { skip: !projectId });
  const { data: sprintsData } = useGetSprintsQuery({ projectId }, { skip: !projectId });

  const stats = statsData?.data;
  const sprints = sprintsData?.data?.data || [];
  const completedSprints = sprints.filter(s => s.status === 'completed');
  const avgVelocity = completedSprints.length
    ? Math.round(completedSprints.reduce((s, sp) => s + (sp.velocity || 0), 0) / completedSprints.length)
    : 0;

  const isDark = theme.dark;
  const bg = theme.colors.background;
  const surf = theme.colors.surface;
  const border = theme.colors.outlineVariant;

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* ── Top tab bar ── */}
      <View style={[styles.tabBar, { backgroundColor: surf, borderBottomColor: border }]}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && { borderBottomColor: '#0F2557', borderBottomWidth: 2 }]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons
              name={t.icon}
              size={15}
              color={tab === t.key ? '#0F2557' : theme.colors.onSurfaceVariant}
            />
            <Text style={[styles.tabLabel, { color: tab === t.key ? '#0F2557' : theme.colors.onSurfaceVariant, fontWeight: tab === t.key ? '700' : '500' }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Project Selector ── */}
        {projects.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectPillsScroll} contentContainerStyle={styles.projectPillsContent}>
            {projects.map((p, i) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setSelectedProjectIdx(i)}
                style={[styles.projectPill, {
                  backgroundColor: i === selectedProjectIdx ? '#0F2557' : surf,
                  borderColor: i === selectedProjectIdx ? '#0F2557' : border,
                }]}
                activeOpacity={0.8}
              >
                <View style={[styles.projectPillAvatar, { backgroundColor: p.color || '#0F2557', opacity: i === selectedProjectIdx ? 0.9 : 0.7 }]}>
                  <Text style={styles.projectPillKey}>{p.key?.substring(0, 2)}</Text>
                </View>
                <Text style={[styles.projectPillName, { color: i === selectedProjectIdx ? '#fff' : theme.colors.onSurface }]} numberOfLines={1}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {isLoading && tab !== 'flow' ? (
          <ActivityIndicator style={{ marginTop: 48 }} color={theme.colors.primary} />
        ) : (
          <>
            {/* ══ OVERVIEW TAB ══ */}
            {tab === 'overview' && (
              <View style={styles.section}>
                <View style={styles.statsGrid}>
                  <StatBlock label="Total Issues"  value={stats?.totalIssues || 0}  icon="ticket-outline"        color="#1D4ED8" theme={theme} />
                  <StatBlock label="Completed"     value={stats?.doneIssues || 0}   icon="check-circle-outline"  color="#059669" theme={theme} />
                  <StatBlock label="Sprints"       value={stats?.sprints || 0}       icon="lightning-bolt"        color="#7C3AED" theme={theme} />
                  <StatBlock label="Avg Velocity"  value={`${avgVelocity}pt`}        icon="speedometer"           color="#D97706" theme={theme} />
                </View>

                {completedSprints.length > 0 && (
                  <View style={[styles.card, { backgroundColor: surf, borderColor: border }]}>
                    <View style={styles.cardHeader}>
                      <MaterialCommunityIcons name="history" size={15} color={theme.colors.primary} />
                      <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Sprint History</Text>
                    </View>
                    {completedSprints.slice(-6).map((sprint, i) => (
                      <React.Fragment key={sprint.id}>
                        <View style={styles.sprintRow}>
                          <View style={styles.sprintRowLeft}>
                            <Text style={[styles.sprintRowName, { color: theme.colors.onSurface }]} numberOfLines={1}>{sprint.name}</Text>
                            <Text style={[styles.sprintRowDates, { color: theme.colors.onSurfaceVariant }]}>
                              {sprint.velocity || 0}pt completed · {sprint.totalPoints || 0}pt committed
                            </Text>
                          </View>
                          <View style={styles.sprintRowRight}>
                            <Text style={[styles.sprintRowPts, { color: '#0F2557' }]}>{sprint.completedPoints || 0}</Text>
                            <Text style={[styles.sprintRowPtsLabel, { color: theme.colors.onSurfaceVariant }]}>pts</Text>
                          </View>
                        </View>
                        {i < completedSprints.slice(-6).length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ══ VELOCITY TAB ══ */}
            {tab === 'velocity' && (
              <View style={styles.section}>
                {avgVelocity > 0 && (
                  <View style={[styles.velocityBanner, { backgroundColor: '#0F2557' }]}>
                    <View>
                      <Text style={styles.velocityBannerLabel}>Average Velocity</Text>
                      <Text style={styles.velocityBannerVal}>{avgVelocity} pts / sprint</Text>
                    </View>
                    <MaterialCommunityIcons name="trending-up" size={32} color="rgba(255,255,255,0.4)" />
                  </View>
                )}
                <View style={[styles.card, { backgroundColor: surf, borderColor: border }]}>
                  <View style={styles.cardHeader}>
                    <MaterialCommunityIcons name="lightning-bolt" size={15} color={theme.colors.primary} />
                    <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Sprint Velocity</Text>
                    <Text style={[styles.cardSub, { color: theme.colors.onSurfaceVariant }]}>last {completedSprints.length} sprints</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <VelocityChart sprints={completedSprints.slice(-8)} avgVelocity={avgVelocity} theme={theme} />
                  </View>
                </View>
              </View>
            )}

            {/* ══ FLOW (CFD) TAB ══ */}
            {tab === 'flow' && (
              <View style={styles.section}>
                <View style={[styles.flowExplainer, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF', borderColor: isDark ? '#2563EB40' : '#BFDBFE' }]}>
                  <MaterialCommunityIcons name="information-outline" size={14} color="#2563EB" />
                  <Text style={[styles.flowExplainerText, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
                    The Cumulative Flow Diagram shows how issues accumulate and complete over time. A widening "In Progress" band signals a bottleneck.
                  </Text>
                </View>

                {/* Range selector */}
                <View style={styles.rangeRow}>
                  <Text style={[styles.rangeLabel, { color: theme.colors.onSurfaceVariant }]}>Range:</Text>
                  {RANGE_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setCfdDays(opt.value)}
                      style={[styles.rangeChip, {
                        backgroundColor: cfdDays === opt.value ? '#0F2557' : surf,
                        borderColor: cfdDays === opt.value ? '#0F2557' : border,
                      }]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.rangeChipLabel, { color: cfdDays === opt.value ? '#fff' : theme.colors.onSurfaceVariant }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={[styles.card, { backgroundColor: surf, borderColor: border }]}>
                  <View style={styles.cardHeader}>
                    <MaterialCommunityIcons name="chart-areaspline" size={15} color={theme.colors.primary} />
                    <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Cumulative Flow</Text>
                    <Text style={[styles.cardSub, { color: theme.colors.onSurfaceVariant }]}>last {cfdDays} days</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <CfdChart projectId={projectId} days={cfdDays} theme={theme} />
                  </View>
                </View>
              </View>
            )}

            {/* ══ TIME TAB ══ */}
            {tab === 'time' && (
              <View style={styles.section}>
                <View style={[styles.card, { backgroundColor: surf, borderColor: border }]}>
                  <View style={styles.cardHeader}>
                    <MaterialCommunityIcons name="clock-outline" size={15} color={theme.colors.primary} />
                    <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Time Tracking</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <View style={styles.emptyChart}>
                      <MaterialCommunityIcons name="clock-plus-outline" size={36} color={theme.colors.outlineVariant} />
                      <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                        Log time on issues to see it here
                      </Text>
                      <Text style={[styles.emptySubText, { color: theme.colors.onSurfaceVariant }]}>
                        Open any issue → tap the clock icon to start tracking
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  /* Tab bar */
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 12 },

  /* Project pills */
  projectPillsScroll: { marginVertical: 12 },
  projectPillsContent: { paddingHorizontal: 16, gap: 8 },
  projectPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  projectPillAvatar: { width: 22, height: 22, borderRadius: 5, justifyContent: 'center', alignItems: 'center' },
  projectPillKey: { color: '#fff', fontSize: 9, fontWeight: '800' },
  projectPillName: { fontSize: 12, fontWeight: '600', maxWidth: 120 },

  /* Section & cards */
  section: { paddingHorizontal: 16, gap: 14, paddingTop: 4 },
  card: { borderRadius: 10, borderWidth: 1, overflow: 'hidden', marginBottom: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  cardSub: { fontSize: 11 },
  cardContent: { padding: 16 },

  /* Stat grid */
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBlock: {
    width: '47%', borderRadius: 10, padding: 14, borderWidth: 1, borderLeftWidth: 3,
    alignItems: 'flex-start', gap: 6,
  },
  statIcon: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: '500' },

  /* Sprint history rows */
  sprintRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  sprintRowLeft: { flex: 1 },
  sprintRowName: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  sprintRowDates: { fontSize: 11 },
  sprintRowRight: { alignItems: 'flex-end' },
  sprintRowPts: { fontSize: 18, fontWeight: '800' },
  sprintRowPtsLabel: { fontSize: 10, fontWeight: '600' },

  /* Velocity tab */
  velocityBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 10, padding: 18, marginBottom: 2,
  },
  velocityBannerLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  velocityBannerVal: { color: '#fff', fontSize: 20, fontWeight: '800' },

  velocityLegend: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendSwatch: { width: 12, height: 12, borderRadius: 2 },
  legendLabel: { fontSize: 11 },

  velocityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  velocityName: { fontSize: 11, width: 100 },
  velocityBars: { flex: 1 },
  vBarTrack: { height: 18, borderRadius: 4, overflow: 'hidden', position: 'relative' },
  vBarFill: { height: '100%', borderRadius: 4 },
  velocityPts: { fontSize: 11, fontWeight: '700', width: 36, textAlign: 'right' },

  /* CFD / Flow tab */
  flowExplainer: {
    flexDirection: 'row', gap: 8, padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 4, alignItems: 'flex-start',
  },
  flowExplainerText: { fontSize: 11, flex: 1, lineHeight: 17 },

  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  rangeLabel: { fontSize: 12, fontWeight: '500' },
  rangeChip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1,
  },
  rangeChipLabel: { fontSize: 12, fontWeight: '600' },

  cfdLegendRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, borderTopWidth: StyleSheet.hairlineWidth },
  xLabel: { fontSize: 8, marginTop: 2, width: 28 },
  cfdSnapshot: {
    flexDirection: 'row', borderRadius: 8, borderWidth: 1,
    paddingVertical: 12, marginTop: 14,
  },
  snapshotStat: { flex: 1, alignItems: 'center' },
  snapshotVal: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  snapshotLabel: { fontSize: 10, fontWeight: '500', marginTop: 2 },
  insightBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    padding: 10, borderRadius: 7, borderWidth: 1, marginTop: 10,
  },
  insightText: { fontSize: 11, flex: 1, lineHeight: 16, color: '#92400E' },

  /* Empty state */
  emptyChart: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 13, fontWeight: '500' },
  emptySubText: { fontSize: 11, textAlign: 'center', maxWidth: 240 },
});

export default ReportsScreen;
