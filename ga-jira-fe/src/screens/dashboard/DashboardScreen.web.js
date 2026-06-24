import React, { useCallback, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text, ProgressBar, useTheme, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/authSlice';
import { useGetDashboardMetricsQuery, useGetCumulativeFlowReportQuery } from '../../api/reportApi';
import { useGetActiveSprintQuery } from '../../api/sprintApi';
import { useGetIssuesQuery } from '../../api/issueApi';
import { useGetProjectsQuery } from '../../api/projectApi';
import { formatDate, getSprintProgress, getDaysRemaining } from '../../utils/dateUtils';
import colors from '../../theme/colors';

/* ─── Constants ─── */
const BG       = '#F0F4FF';   // light indigo wash — distinctive, not gray
const NAVY     = '#0F2557';

const ROLE_LABELS = {
  super_admin: 'Super Admin', org_admin: 'Supervisor', project_manager: 'Project Manager',
  team_lead: 'Team Lead', developer: 'Developer', reporter: 'Reporter', viewer: 'Viewer',
};
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
const initials = (u) => `${u?.firstName?.[0] || ''}${u?.lastName?.[0] || ''}`.toUpperCase();

/* ══════════════════════════════════════════════
   SHIMMER SKELETON
══════════════════════════════════════════════ */

/* Shared shimmer hook — one animation drives all bones on the page */
const useShimmer = (dark) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    ).start();
    return () => anim.stopAnimation();
  }, []);
  return anim;
};

/* Single bone */
const Bone = ({ style, anim, dark }) => {
  const bg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: dark
      ? ['#1E2B43', '#253450']   // dark mode: deep navy pulse
      : ['#E2E8F0', '#F8FAFC'],  // light mode: slate pulse
  });
  return <Animated.View style={[sk.bone, style, { backgroundColor: bg }]} />;
};

/* Full-page dashboard skeleton matching the real layout */
const DashboardSkeleton = () => {
  const theme = useTheme();
  const dark  = theme.dark;
  const anim  = useShimmer(dark);
  const B     = (style) => <Bone style={style} anim={anim} dark={dark} />;
  const surfBg = dark ? '#101827' : '#FFFFFF';
  const pageBg = theme.colors.background;

  return (
    <View style={[sk.root, { backgroundColor: pageBg }]}>

      {/* ── Header ── */}
      <View style={[sk.header, { backgroundColor: surfBg, borderBottomColor: theme.colors.outlineVariant }]}>
        <View style={sk.hLeft}>
          {B({ width: 52, height: 52, borderRadius: 26 })}
          <View style={{ gap: 8 }}>
            {B({ width: 200, height: 18, borderRadius: 6 })}
            {B({ width: 140, height: 13, borderRadius: 5 })}
          </View>
        </View>
        <View style={sk.hRight}>
          {B({ width: 160, height: 36, borderRadius: 10 })}
          {B({ width: 110, height: 13, borderRadius: 5 })}
          {B({ width: 36, height: 36, borderRadius: 8 })}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={sk.scroll} showsVerticalScrollIndicator={false}>

        {/* ── KPI strip ── */}
        <View style={[sk.kpiStrip, { backgroundColor: surfBg, borderColor: theme.colors.outlineVariant }]}>
          {[...Array(8)].map((_, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={[sk.kpiSep, { backgroundColor: theme.colors.outlineVariant }]} />}
              <View style={sk.kpiTile}>
                <View style={sk.kpiIconWrap}>
                  {B({ width: 32, height: 32, borderRadius: 8 })}
                </View>
                {B({ width: 40, height: 30, borderRadius: 6, marginBottom: 6 })}
                {B({ width: 64, height: 12, borderRadius: 4 })}
                {B({ width: 44, height: 10, borderRadius: 4, marginTop: 4 })}
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* ── Main grid ── */}
        <View style={sk.mainGrid}>

          {/* Left col */}
          <View style={sk.colMain}>
            {/* Sprint card */}
            <View style={[sk.card, { backgroundColor: surfBg, borderColor: theme.colors.outlineVariant, flexDirection: 'row' }]}>
              <View style={{ width: 4, backgroundColor: theme.colors.outlineVariant }} />
              <View style={{ flex: 1, padding: 16, gap: 10 }}>
                {B({ width: 90, height: 11, borderRadius: 4 })}
                {B({ width: 180, height: 18, borderRadius: 6 })}
                {B({ width: 120, height: 11, borderRadius: 4 })}
                {B({ width: '100%', height: 7, borderRadius: 4 })}
                <View style={sk.sprintFooter}>
                  {B({ width: 80, height: 11, borderRadius: 4 })}
                  {B({ width: 90, height: 32, borderRadius: 7 })}
                </View>
              </View>
            </View>

            {/* Pipeline */}
            <View style={[sk.card, { backgroundColor: surfBg, borderColor: theme.colors.outlineVariant, padding: 16, gap: 14 }]}>
              {B({ width: 120, height: 14, borderRadius: 5 })}
              <View style={sk.pipelineRow}>
                {[...Array(4)].map((_, i) => (
                  <React.Fragment key={i}>
                    <View style={sk.pipelineStage}>
                      {B({ width: 44, height: 44, borderRadius: 22 })}
                      {B({ width: 28, height: 18, borderRadius: 5 })}
                      {B({ width: 44, height: 11, borderRadius: 4 })}
                    </View>
                    {i < 3 && B({ width: 24, height: 2, borderRadius: 1, marginTop: -18 })}
                  </React.Fragment>
                ))}
              </View>
              <View style={{ gap: 6 }}>
                {[...Array(4)].map((_, i) => (
                  <View key={i} style={sk.barRow}>
                    {B({ flex: 1, height: 5, borderRadius: 3 })}
                    {B({ width: 28, height: 10, borderRadius: 3 })}
                  </View>
                ))}
              </View>
            </View>

            {/* Task list */}
            <View style={[sk.card, { backgroundColor: surfBg, borderColor: theme.colors.outlineVariant }]}>
              <View style={sk.sectionHdr}>
                {B({ width: 90, height: 14, borderRadius: 5 })}
                {B({ width: 55, height: 12, borderRadius: 4 })}
              </View>
              {[...Array(5)].map((_, i) => (
                <View key={i} style={[sk.taskRow, { borderBottomColor: theme.colors.outlineVariant }]}>
                  {B({ width: 3, height: 48, borderRadius: 2 })}
                  <View style={{ flex: 1, gap: 8, paddingVertical: 10, paddingLeft: 10 }}>
                    {B({ width: '70%', height: 13, borderRadius: 4 })}
                    {B({ width: '40%', height: 11, borderRadius: 4 })}
                  </View>
                  {B({ width: 16, height: 16, borderRadius: 8 })}
                </View>
              ))}
            </View>
          </View>

          {/* Right col */}
          <View style={sk.colSide}>
            {/* Quick actions */}
            <View style={[sk.card, { backgroundColor: surfBg, borderColor: theme.colors.outlineVariant, padding: 0, overflow: 'hidden' }]}>
              <View style={{ padding: 14, gap: 10 }}>
                {B({ width: 110, height: 14, borderRadius: 5 })}
                {/* Pills row */}
                <View style={sk.pillsRow}>
                  {[...Array(3)].map((_, i) => B({ key: i, width: 80, height: 30, borderRadius: 16 }))}
                </View>
                {/* 2x2 grid */}
                <View style={sk.qaGrid}>
                  {[...Array(4)].map((_, i) => (
                    <View key={i} style={sk.qaTile}>
                      {B({ width: 40, height: 40, borderRadius: 20 })}
                      {B({ width: 60, height: 12, borderRadius: 4 })}
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* CFD chart */}
            <View style={[sk.card, { backgroundColor: surfBg, borderColor: theme.colors.outlineVariant, padding: 14, gap: 10 }]}>
              {B({ width: 110, height: 14, borderRadius: 5 })}
              <View style={sk.cfdBars}>
                {[...Array(21)].map((_, i) => {
                  const h = 20 + Math.round(((i * 13 + 7) % 36));
                  return B({ key: i, flex: 1, height: h, borderRadius: 2 });
                })}
              </View>
              <View style={sk.cfdStats}>
                {[...Array(3)].map((_, i) => (
                  <View key={i} style={sk.cfdStat}>
                    {B({ width: 6, height: 6, borderRadius: 3 })}
                    {B({ width: 24, height: 16, borderRadius: 4 })}
                    {B({ width: 30, height: 10, borderRadius: 3 })}
                  </View>
                ))}
              </View>
            </View>

            {/* Info card */}
            <View style={[sk.card, { backgroundColor: surfBg, borderColor: theme.colors.outlineVariant }]}>
              {[...Array(3)].map((_, i) => (
                <React.Fragment key={i}>
                  <View style={sk.infoRow}>
                    {B({ width: 14, height: 14, borderRadius: 7 })}
                    {B({ flex: 1, height: 12, borderRadius: 4 })}
                    {B({ width: 28, height: 18, borderRadius: 4 })}
                  </View>
                  {i < 2 && <View style={[sk.divider, { backgroundColor: theme.colors.outlineVariant }]} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const sk = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 28, paddingVertical: 16, borderBottomWidth: 1,
  },
  hLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  hRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scroll: { paddingBottom: 48 },
  bone: { borderRadius: 6 },

  /* KPI */
  kpiStrip: {
    flexDirection: 'row', marginHorizontal: 24, marginTop: 20,
    borderRadius: 12, borderWidth: 1, overflow: 'hidden',
  },
  kpiSep: { width: 1 },
  kpiTile: { flex: 1, padding: 16, paddingTop: 20, gap: 2 },
  kpiIconWrap: { alignItems: 'flex-end', marginBottom: 6 },

  /* Grid */
  mainGrid: { flexDirection: 'row', paddingHorizontal: 24, paddingTop: 14, gap: 18 },
  colMain: { flex: 3, gap: 18 },
  colSide: { flex: 2, gap: 18 },

  /* Cards */
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  sprintFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },

  /* Pipeline */
  pipelineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pipelineStage: { alignItems: 'center', gap: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  /* Section header */
  sectionHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, paddingBottom: 6 },

  /* Task rows */
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 0, paddingRight: 12, borderBottomWidth: StyleSheet.hairlineWidth },

  /* Quick actions */
  pillsRow: { flexDirection: 'row', gap: 6 },
  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  qaTile: { width: '47%', aspectRatio: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 8 },

  /* CFD */
  cfdBars: { flexDirection: 'row', alignItems: 'flex-end', height: 52, gap: 2 },
  cfdStats: { flexDirection: 'row' },
  cfdStat: { flex: 1, alignItems: 'center', gap: 4 },

  /* Info card */
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
});

/* ══════════════════════════════════════════════
   PAGE HEADER — slim, no giant hero card
══════════════════════════════════════════════ */
const PageHeader = ({ user, m, onRefresh, navigation }) => {
  const theme = useTheme();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={[hdrStyles.wrap, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
      {/* Left: avatar + greeting */}
      <View style={hdrStyles.left}>
        <View style={[hdrStyles.avatarRing, { borderColor: theme.colors.primary + '40' }]}>
          <View style={[hdrStyles.avatar, { backgroundColor: NAVY }]}>
            <Text style={hdrStyles.avatarText}>{initials(user)}</Text>
          </View>
        </View>
        <View>
          <Text style={[hdrStyles.greet, { color: theme.colors.onSurfaceVariant }]}>
            {greeting()}, {user?.firstName} {user?.lastName}
          </Text>
          <View style={hdrStyles.metaRow}>
            <View style={[hdrStyles.rolePill, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text style={[hdrStyles.rolePillText, { color: theme.colors.primary }]}>
                {ROLE_LABELS[user?.role] || user?.role}
              </Text>
            </View>
            <Text style={[hdrStyles.orgText, { color: theme.colors.onSurfaceVariant }]}>· General Aeronautics</Text>
          </View>
        </View>
      </View>

      {/* Right: date + quick counts + refresh */}
      <View style={hdrStyles.right}>
        <View style={[hdrStyles.quickStats, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
          <View style={hdrStyles.qsItem}>
            <MaterialCommunityIcons name="check-circle" size={13} color="#22C55E" />
            <Text style={[hdrStyles.qsNum, { color: '#22C55E' }]}>{m.doneCount || 0}</Text>
            <Text style={[hdrStyles.qsLabel, { color: theme.colors.onSurfaceVariant }]}>done</Text>
          </View>
          <View style={[hdrStyles.qsDivider, { backgroundColor: theme.colors.outlineVariant }]} />
          <View style={hdrStyles.qsItem}>
            <MaterialCommunityIcons name="progress-clock" size={13} color="#60A5FA" />
            <Text style={[hdrStyles.qsNum, { color: '#60A5FA' }]}>{m.inProgressCount || m.inProgress || 0}</Text>
            <Text style={[hdrStyles.qsLabel, { color: theme.colors.onSurfaceVariant }]}>active</Text>
          </View>
          <View style={[hdrStyles.qsDivider, { backgroundColor: theme.colors.outlineVariant }]} />
          <View style={hdrStyles.qsItem}>
            <MaterialCommunityIcons name="clock-alert" size={13} color="#F87171" />
            <Text style={[hdrStyles.qsNum, { color: '#F87171' }]}>{m.overdueCount || m.overdue || 0}</Text>
            <Text style={[hdrStyles.qsLabel, { color: theme.colors.onSurfaceVariant }]}>overdue</Text>
          </View>
        </View>
        <Text style={[hdrStyles.dateText, { color: theme.colors.onSurfaceVariant }]}>{dateStr}</Text>
        <TouchableOpacity
          onPress={onRefresh}
          style={[hdrStyles.refreshBtn, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}
        >
          <MaterialCommunityIcons name="refresh" size={16} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const hdrStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 28, paddingVertical: 16,
    borderBottomWidth: 1,
    boxShadow: '0 2px 12px rgba(15,37,87,0.06)',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarRing: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  greet: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  rolePillText: { fontSize: 11, fontWeight: '700' },
  orgText: { fontSize: 12, fontWeight: '500' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quickStats: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, gap: 12 },
  qsItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qsNum: { fontSize: 14, fontWeight: '800' },
  qsLabel: { fontSize: 11, fontWeight: '500' },
  qsDivider: { width: 1, height: 18 },
  dateText: { fontSize: 12, fontWeight: '500' },
  refreshBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center', outlineStyle: 'none' },
});

/* ══════════════════════════════════════════════
   KPI STRIP — horizontal tiles with top-color accent
══════════════════════════════════════════════ */
const KpiStrip = ({ tiles }) => {
  const theme = useTheme();
  return (
    <View style={kpiStyles.row}>
      {tiles.map((t) => {
        /* Per-tile bg: very light tint in light, slightly elevated dark tint in dark */
        const tileBg = theme.dark
          ? t.color + '18'          // e.g. #1D4ED818 — subtle colored dark bg
          : t.color + '0A';         // very faint tint on white
        const valColor = (t.color === '#DC2626' || t.color === '#EF4444')
          ? (theme.dark ? '#F87171' : '#DC2626')
          : (theme.dark ? '#F1F5F9' : NAVY);

        return (
          <TouchableOpacity
            key={t.label}
            onPress={t.onPress}
            activeOpacity={t.onPress ? 0.78 : 1}
            style={[kpiStyles.tile, {
              backgroundColor: theme.dark
                ? (t.color + '16')
                : (t.color + '08'),
              borderColor: t.color + (theme.dark ? '40' : '22'),
              borderTopColor: t.color,
            }]}
          >
            <View style={[kpiStyles.iconBadge, { backgroundColor: t.color + (theme.dark ? '28' : '18') }]}>
              <MaterialCommunityIcons name={t.icon} size={18} color={t.color} />
            </View>
            <Text style={[kpiStyles.value, { color: valColor }]}>{t.value ?? 0}</Text>
            <Text style={[kpiStyles.label, { color: theme.dark ? '#94A3B8' : '#334155' }]}>{t.label}</Text>
            {!!t.sub && <Text style={[kpiStyles.sub, { color: theme.dark ? '#475569' : '#94A3B8' }]}>{t.sub}</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const kpiStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 24, paddingTop: 16, gap: 10,
  },
  tile: {
    flex: 1, minWidth: 120,
    borderRadius: 12, borderWidth: 1, borderTopWidth: 3,
    paddingVertical: 16, paddingHorizontal: 14,
    gap: 4,
    outlineStyle: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  iconBadge: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  value: { fontSize: 30, fontWeight: '900', lineHeight: 34, letterSpacing: -0.5 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  sub: { fontSize: 10, marginTop: 1 },
});

/* ══════════════════════════════════════════════
   SPRINT CARD — compact horizontal layout
══════════════════════════════════════════════ */
const SprintCard = ({ projectId, theme, navigation }) => {
  const { data } = useGetActiveSprintQuery(projectId, { skip: !projectId });
  const sprint = data?.data;
  if (!sprint) return null;

  const daysLeft = getDaysRemaining(sprint.endDate);
  const total    = sprint.issues?.length || 0;
  const done     = sprint.issues?.filter(i => i.status?.category === 'done').length || 0;
  const pct      = total > 0 ? Math.round((done / total) * 100) : 0;
  const overdue  = daysLeft !== null && daysLeft < 0;

  const chipBg   = overdue
    ? (theme.dark ? '#3F1010' : '#FEE2E2')
    : (theme.dark ? '#0C2340' : '#DBEAFE');
  const chipTxt  = overdue
    ? (theme.dark ? '#F87171' : '#991B1B')
    : (theme.dark ? '#60A5FA' : '#1D4ED8');

  const pctColor = pct >= 75 ? '#10B981' : pct >= 40 ? theme.colors.primary : '#F59E0B';

  return (
    <View style={[spStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <View style={[spStyles.colorBar, { backgroundColor: pctColor }]} />
      <View style={spStyles.inner}>
        {/* Top row */}
        <View style={spStyles.topRow}>
          <View style={spStyles.badge}>
            <MaterialCommunityIcons name="lightning-bolt" size={11} color={theme.colors.primary} />
            <Text style={[spStyles.badgeText, { color: theme.colors.primary }]}>ACTIVE SPRINT</Text>
          </View>
          <View style={[spStyles.chip, { backgroundColor: chipBg }]}>
            <MaterialCommunityIcons
              name={overdue ? 'clock-alert' : 'clock-outline'}
              size={10}
              color={chipTxt}
            />
            <Text style={[spStyles.chipText, { color: chipTxt }]}>
              {daysLeft !== null ? (daysLeft >= 0 ? `${daysLeft}d left` : 'Overdue') : 'Active'}
            </Text>
          </View>
        </View>

        {/* Name + dates */}
        <Text style={[spStyles.name, { color: theme.colors.onSurface }]}>{sprint.name}</Text>
        <Text style={[spStyles.dates, { color: theme.colors.onSurfaceVariant }]}>
          {formatDate(sprint.startDate)} — {formatDate(sprint.endDate)}
        </Text>

        {/* Progress + circular pct badge */}
        <View style={spStyles.progressSection}>
          <View style={{ flex: 1 }}>
            <ProgressBar progress={pct / 100} color={pctColor} style={spStyles.bar} />
            <View style={spStyles.progressMeta}>
              <Text style={[spStyles.progressLabel, { color: theme.colors.onSurfaceVariant }]}>
                {done}/{total} issues done
              </Text>
            </View>
          </View>
          <View style={[spStyles.pctRing, { borderColor: pctColor + '50', backgroundColor: pctColor + (theme.dark ? '20' : '10') }]}>
            <Text style={[spStyles.pctNum, { color: pctColor }]}>{pct}</Text>
            <Text style={[spStyles.pctSym, { color: pctColor + 'AA' }]}>%</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={spStyles.footer}>
          <View style={spStyles.dots}>
            <View style={[spStyles.dot, { backgroundColor: '#10B981' }]} />
            <Text style={[spStyles.dotText, { color: theme.colors.onSurfaceVariant }]}>{done} done</Text>
            <View style={[spStyles.dot, { backgroundColor: theme.colors.outlineVariant }]} />
            <Text style={[spStyles.dotText, { color: theme.colors.onSurfaceVariant }]}>{total - done} left</Text>
          </View>
          <TouchableOpacity
            style={[spStyles.viewBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('ProjectStack', { screen: 'Sprint', params: { projectId } })}
          >
            <Text style={spStyles.viewBtnText}>View Board</Text>
            <MaterialCommunityIcons name="arrow-right" size={13} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const spStyles = StyleSheet.create({
  card: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, overflow: 'hidden', boxShadow: '0 4px 16px rgba(15,37,87,0.08)' },
  colorBar: { width: 5 },
  inner: { flex: 1, padding: 16, gap: 0 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  chipText: { fontSize: 11, fontWeight: '700' },
  name: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  dates: { fontSize: 11, marginBottom: 10 },
  progressSection: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  bar: { height: 10, borderRadius: 5 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  progressLabel: { fontSize: 11 },
  pctRing: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  pctNum: { fontSize: 16, fontWeight: '900', lineHeight: 18 },
  pctSym: { fontSize: 9, fontWeight: '700', lineHeight: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  dotText: { fontSize: 11, marginRight: 4 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 7 },
  viewBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

/* ══════════════════════════════════════════════
   ISSUE PIPELINE — todo → in progress → done
══════════════════════════════════════════════ */
const IssuePipeline = ({ m }) => {
  const theme = useTheme();
  const stages = [
    { label: 'To Do',       value: m.todoCount || 0,       color: '#64748B', icon: 'circle-outline' },
    { label: 'In Progress', value: m.inProgressCount || 0, color: '#3B82F6', icon: 'progress-clock' },
    { label: 'In Review',   value: m.inReviewCount || 0,   color: '#EA580C', icon: 'eye-check-outline' },
    { label: 'Done',        value: m.doneCount || 0,        color: '#10B981', icon: 'check-circle-outline' },
  ];
  const total = stages.reduce((s, st) => s + st.value, 0) || 1;

  return (
    <View style={[plStyles.wrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <View style={plStyles.header}>
        <MaterialCommunityIcons name="call-split" size={14} color={theme.colors.primary} />
        <Text style={[plStyles.title, { color: theme.colors.onSurface }]}>Issue Pipeline</Text>
      </View>

      {/* Flow stages */}
      <View style={plStyles.stages}>
        {stages.map((s, i) => {
          const stagePct = Math.round((s.value / total) * 100);
          return (
          <React.Fragment key={s.label}>
            <View style={plStyles.stage}>
              <View style={[plStyles.stageCircle, { borderColor: s.color, backgroundColor: s.color + (theme.dark ? '28' : '14') }]}>
                <MaterialCommunityIcons name={s.icon} size={20} color={s.color} />
              </View>
              <Text style={[plStyles.stageNum, { color: s.color }]}>{s.value}</Text>
              <Text style={[plStyles.stageLabel, { color: theme.colors.onSurfaceVariant }]}>{s.label}</Text>
              <Text style={[plStyles.stagePct, { color: s.color + 'AA' }]}>{stagePct}%</Text>
            </View>
            {i < stages.length - 1 && (
              <View style={plStyles.arrow}>
                <View style={[plStyles.arrowLine, { backgroundColor: theme.colors.outlineVariant }]} />
                <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.outlineVariant} />
              </View>
            )}
          </React.Fragment>
          );
        })}
      </View>

      {/* Mini progress bars per stage */}
      <View style={plStyles.bars}>
        {stages.map(s => (
          <View key={s.label} style={plStyles.barItem}>
            <Text style={[plStyles.barLabel, { color: theme.colors.onSurfaceVariant }]}>{s.label}</Text>
            <View style={[plStyles.barTrack, { backgroundColor: theme.dark ? s.color + '18' : s.color + '10' }]}>
              <View style={[plStyles.barFill, {
                width: `${Math.max(4, (s.value / total) * 100)}%`,
                backgroundColor: s.color,
              }]} />
            </View>
            <Text style={[plStyles.barPct, { color: s.color }]}>
              {Math.round((s.value / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const plStyles = StyleSheet.create({
  wrap: { borderRadius: 12, borderWidth: 1, padding: 16, boxShadow: '0 4px 16px rgba(15,37,87,0.06)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  title: { fontSize: 13, fontWeight: '700' },
  stages: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  stage: { alignItems: 'center', gap: 4 },
  stageCircle: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  stageNum: { fontSize: 20, fontWeight: '900', lineHeight: 22 },
  stageLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  stagePct: { fontSize: 9, fontWeight: '700', textAlign: 'center' },
  arrow: { flexDirection: 'row', alignItems: 'center', marginTop: -14 },
  arrowLine: { height: 1, width: 12 },
  bars: { gap: 6 },
  barItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { fontSize: 10, fontWeight: '600', width: 68, flexShrink: 0 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  barPct: { fontSize: 10, width: 28, textAlign: 'right', fontWeight: '700' },
});

/* ══════════════════════════════════════════════
   QUICK ACTIONS — 2×2 large icon tiles
   Project pills use a horizontal ScrollView so
   any number of projects can be selected by
   swiping left/right — no "+N more" chip needed.
══════════════════════════════════════════════ */
const QuickActions = ({ navigation, projects }) => {
  const theme = useTheme();
  const [selectedIdx, setSelectedIdx] = React.useState(0);

  const activeProject = projects[selectedIdx];
  const projectId     = activeProject?.id;

  const actions = [
    { icon: 'plus-circle',        label: 'New Issue',  color: theme.dark ? '#93C5FD' : '#0F2557', onPress: () => projectId && navigation.navigate('ProjectStack', { screen: 'CreateIssue', params: { projectId } }) },
    { icon: 'view-column',        label: 'Board',      color: theme.dark ? '#C4B5FD' : '#7C3AED', onPress: () => projectId && navigation.navigate('ProjectStack', { screen: 'Board',        params: { projectId } }) },
    { icon: 'format-list-checks', label: 'Backlog',    color: theme.dark ? '#7DD3FC' : '#0369A1', onPress: () => projectId && navigation.navigate('ProjectStack', { screen: 'Backlog',      params: { projectId } }) },
    { icon: 'clipboard-account',  label: 'My Issues',  color: theme.dark ? '#6EE7B7' : '#059669', onPress: () => navigation.navigate('ProjectStack', { screen: 'IssueList' }) },
  ];

  return (
    <View style={[qaStyles.wrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      {/* Header */}
      <View style={qaStyles.header}>
        <MaterialCommunityIcons name="rocket-launch-outline" size={14} color={theme.colors.primary} />
        <Text style={[qaStyles.title, { color: theme.colors.onSurface }]}>Quick Actions</Text>
      </View>

      {/* ── Project pills — horizontal scroll, ALL projects visible ── */}
      {projects.length > 0 && (
        <View style={[qaStyles.projectRow, { borderTopColor: theme.colors.outlineVariant, borderBottomColor: theme.colors.outlineVariant }]}>
          {/* Fixed label outside scroll */}
          <Text style={[qaStyles.forLabel, { color: theme.colors.onSurfaceVariant }]}>Project</Text>

          {/* Scrollable pills — swipe left/right for more projects */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={qaStyles.pillsScroll}
            style={{ flex: 1 }}
          >
            {projects.map((p, i) => {
              const isActive = i === selectedIdx;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelectedIdx(i)}
                  activeOpacity={0.8}
                  style={[qaStyles.pill, {
                    backgroundColor: isActive ? (p.color || NAVY) : theme.colors.surfaceVariant,
                    borderColor:     isActive ? (p.color || NAVY) : theme.colors.outlineVariant,
                  }]}
                >
                  {/* Color dot matching project color */}
                  <View style={[qaStyles.pillDot, { backgroundColor: isActive ? 'rgba(255,255,255,0.5)' : (p.color || NAVY) }]} />
                  <Text style={[qaStyles.pillKey, { color: isActive ? '#fff' : theme.colors.onSurfaceVariant }]}>
                    {p.key?.substring(0, 3)}
                  </Text>
                  <Text style={[qaStyles.pillName, { color: isActive ? '#fff' : theme.colors.onSurface }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {isActive && <MaterialCommunityIcons name="check-circle" size={11} color="rgba(255,255,255,0.9)" />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Scroll hint arrow — shows only when 3+ projects */}
          {projects.length > 2 && (
            <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.outlineVariant} style={qaStyles.scrollHint} />
          )}
        </View>
      )}

      {/* ── 2×2 action tile grid ── */}
      <View style={qaStyles.grid}>
        {actions.map(a => (
          <TouchableOpacity
            key={a.label}
            onPress={a.onPress}
            activeOpacity={0.82}
            style={[qaStyles.actionTile, {
              backgroundColor: theme.dark ? theme.colors.surfaceVariant : a.color + '0F',
              borderColor: a.color + (theme.dark ? '40' : '22'),
            }]}
          >
            <View style={[qaStyles.actionIconCircle, { backgroundColor: a.color + (theme.dark ? '30' : '18') }]}>
              <MaterialCommunityIcons name={a.icon} size={22} color={a.color} />
            </View>
            <Text style={[qaStyles.actionLabel, { color: a.color }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Selected project indicator */}
      {activeProject && (
        <View style={[qaStyles.activeProjBar, { backgroundColor: theme.colors.surfaceVariant, borderTopColor: theme.colors.outlineVariant }]}>
          <View style={[qaStyles.activeProjDot, { backgroundColor: activeProject.color || NAVY }]} />
          <Text style={[qaStyles.activeProjText, { color: theme.colors.onSurfaceVariant }]}>
            Actions apply to <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>{activeProject.name}</Text>
          </Text>
        </View>
      )}
    </View>
  );
};

const qaStyles = StyleSheet.create({
  wrap: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', boxShadow: '0 4px 16px rgba(15,37,87,0.06)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  title: { fontSize: 13, fontWeight: '700' },
  projectRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8, gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  forLabel: { fontSize: 10, fontWeight: '700', flexShrink: 0, marginRight: 2 },
  pillsScroll: { flexDirection: 'row', gap: 6, paddingVertical: 2, paddingRight: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillKey: { fontSize: 10, fontWeight: '800' },
  pillName: { fontSize: 11, fontWeight: '600', maxWidth: 90 },
  scrollHint: { flexShrink: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 8 },
  actionTile: {
    width: '47%', aspectRatio: 1.5,
    borderRadius: 10, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center', gap: 6,
    outlineStyle: 'none',
  },
  actionIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 12, fontWeight: '700' },
  activeProjBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  activeProjDot: { width: 7, height: 7, borderRadius: 3.5 },
  activeProjText: { fontSize: 11 },
});

/* ══════════════════════════════════════════════
   CFD MINI CHART
══════════════════════════════════════════════ */
const CFD_COLORS = { done: '#10B981', inProgress: '#3B82F6', todo: '#94A3B8' };

const CfdMiniChart = ({ projectId, theme }) => {
  const { data } = useGetCumulativeFlowReportQuery({ projectId, days: 21 }, { skip: !projectId });
  const points = data?.data || [];
  if (!points.length) return null;

  const maxTotal = Math.max(...points.map(d => d.total), 1);
  const BAR_H = 52;
  const last = points[points.length - 1];
  const prev = points[0];
  const doneGrowth = last.done - prev.done;

  return (
    <View style={[cfdStyles.wrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <View style={cfdStyles.header}>
        <View style={cfdStyles.titleRow}>
          <MaterialCommunityIcons name="chart-areaspline" size={13} color={theme.colors.primary} />
          <Text style={[cfdStyles.title, { color: theme.colors.onSurface }]}>Flow · 21 days</Text>
        </View>
        {doneGrowth > 0 && (
          <View style={[cfdStyles.growthPill, { backgroundColor: theme.dark ? '#052E16' : '#D1FAE5' }]}>
            <MaterialCommunityIcons name="trending-up" size={10} color={theme.dark ? '#34D399' : '#059669'} />
            <Text style={[cfdStyles.growthText, { color: theme.dark ? '#34D399' : '#059669' }]}>+{doneGrowth} done</Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: BAR_H, gap: 2, marginBottom: 8 }}>
        {points.map((d, i) => {
          const doneH    = (d.done / maxTotal) * BAR_H;
          const inProgH  = (d.inProgress / maxTotal) * BAR_H;
          const todoH    = (d.todo / maxTotal) * BAR_H;
          const totalH   = doneH + inProgH + todoH;
          return (
            <View key={i} style={{ flex: 1, height: Math.max(1, totalH) }}>
              <View style={{ flex: todoH / Math.max(totalH, 1),    backgroundColor: CFD_COLORS.todo }} />
              <View style={{ flex: inProgH / Math.max(totalH, 1),  backgroundColor: CFD_COLORS.inProgress }} />
              <View style={{ flex: doneH / Math.max(totalH, 1),    backgroundColor: CFD_COLORS.done }} />
            </View>
          );
        })}
      </View>

      <View style={cfdStyles.statsRow}>
        {[
          { l: 'Done',   v: last.done,       c: CFD_COLORS.done },
          { l: 'Active', v: last.inProgress,  c: CFD_COLORS.inProgress },
          { l: 'Todo',   v: last.todo,         c: CFD_COLORS.todo },
        ].map(({ l, v, c }) => (
          <View key={l} style={cfdStyles.stat}>
            <View style={[cfdStyles.dot, { backgroundColor: c }]} />
            <Text style={[cfdStyles.statNum, { color: theme.colors.onSurface }]}>{v}</Text>
            <Text style={[cfdStyles.statLabel, { color: theme.colors.onSurfaceVariant }]}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const cfdStyles = StyleSheet.create({
  wrap: { borderRadius: 12, borderWidth: 1, padding: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  title: { fontSize: 12, fontWeight: '700' },
  growthPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  growthText: { fontSize: 10, fontWeight: '700', color: '#059669' },
  statsRow: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statNum: { fontSize: 14, fontWeight: '800' },
  statLabel: { fontSize: 9, fontWeight: '500' },
});

/* ══════════════════════════════════════════════
   COMPACT TASK ROW
══════════════════════════════════════════════ */
const PRIORITY_COLOR = { critical: '#EF4444', high: '#F97316', medium: '#EAB308', low: '#64748B' };

const STATUS_STYLE = (cat, dark) => {
  const map = {
    todo:        { bg: dark ? '#1E2B43' : '#F1F5F9', txt: dark ? '#94A3B8' : '#475569' },
    in_progress: { bg: dark ? '#0C2340' : '#DBEAFE', txt: dark ? '#60A5FA' : '#1D4ED8' },
    done:        { bg: dark ? '#052E16' : '#D1FAE5', txt: dark ? '#34D399' : '#065F46' },
    cancelled:   { bg: dark ? '#1F1F1F' : '#F3F4F6', txt: dark ? '#6B7280' : '#6B7280' },
  };
  return map[cat] || map.todo;
};

const TaskRow = ({ issue, onPress, theme }) => {
  const priority    = issue.priority || 'low';
  const statusCat   = issue.status?.category || 'todo';
  const statusLabel = issue.status?.name || statusCat;
  const ss          = STATUS_STYLE(statusCat, theme.dark);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[trStyles.row, { borderBottomColor: theme.colors.outlineVariant }]}>
      <View style={[trStyles.priorityBar, { backgroundColor: PRIORITY_COLOR[priority] || '#94A3B8' }]} />
      <View style={trStyles.main}>
        <View style={trStyles.topLine}>
          <Text style={[trStyles.key, { color: theme.colors.primary }]}>{issue.key}</Text>
          <Text style={[trStyles.title, { color: theme.colors.onSurface }]} numberOfLines={1}>{issue.title}</Text>
        </View>
        <View style={trStyles.botLine}>
          <View style={[trStyles.statusPill, { backgroundColor: ss.bg }]}>
            <Text style={[trStyles.statusText, { color: ss.txt }]}>{statusLabel}</Text>
          </View>
          {issue.dueDate && (
            <Text style={[trStyles.due, { color: theme.colors.onSurfaceVariant }]}>
              Due {formatDate(issue.dueDate)}
            </Text>
          )}
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.outlineVariant} />
    </TouchableOpacity>
  );
};

const trStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, paddingRight: 12 },
  priorityBar: { width: 3, alignSelf: 'stretch', borderRadius: 2, marginRight: 10, marginLeft: 4 },
  main: { flex: 1, paddingVertical: 10, gap: 4, minWidth: 0 },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  key: { fontSize: 11, fontWeight: '700', flexShrink: 0 },
  title: { fontSize: 13, fontWeight: '500', flex: 1 },
  botLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  statusText: { fontSize: 10, fontWeight: '600' },
  due: { fontSize: 10 },
});

/* ══════════════════════════════════════════════
   PROJECT GRID
══════════════════════════════════════════════ */
const ProjectGrid = ({ projects, navigation, theme }) => {
  if (!projects.length) return null;
  const fallback = theme.dark ? '#2F6EB7' : NAVY;
  return (
    <View style={pgStyles.grid}>
      {projects.map(p => (
        <TouchableOpacity
          key={p.id}
          onPress={() => navigation.navigate('ProjectStack', { screen: 'ProjectDetail', params: { projectId: p.id } })}
          activeOpacity={0.82}
          style={[pgStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
        >
          <View style={[pgStyles.avatar, { backgroundColor: p.color || fallback }]}>
            <Text style={pgStyles.avatarText}>{p.key?.substring(0, 2)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[pgStyles.name, { color: theme.colors.onSurface }]} numberOfLines={1}>{p.name}</Text>
            <Text style={[pgStyles.meta, { color: theme.colors.onSurfaceVariant }]}>{p.issueCount || 0} issues · {p.memberCount || 0} members</Text>
          </View>
          <View style={[pgStyles.statusDot, { backgroundColor: p.status === 'active' ? '#10B981' : '#94A3B8' }]} />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const pgStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    minWidth: 240, flex: 1,
    borderRadius: 10, borderWidth: 1,
    padding: 12,
    boxShadow: '0 2px 8px rgba(15,37,87,0.06)',
    outlineStyle: 'none',
  },
  avatar: { width: 38, height: 38, borderRadius: 9, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  name: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  meta: { fontSize: 11 },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
});

/* ══════════════════════════════════════════════
   SECTION TITLE
══════════════════════════════════════════════ */
const SectionTitle = ({ title, action, onAction, theme }) => (
  <View style={stStyles.row}>
    <View style={stStyles.left}>
      <View style={[stStyles.bar, { backgroundColor: theme.colors.primary }]} />
      <Text style={[stStyles.text, { color: theme.colors.onSurface }]}>{title}</Text>
    </View>
    {!!action && (
      <TouchableOpacity onPress={onAction} activeOpacity={0.8} style={stStyles.actionBtn}>
        <Text style={[stStyles.actionText, { color: theme.colors.primary }]}>{action}</Text>
        <MaterialCommunityIcons name="chevron-right" size={14} color={theme.colors.primary} />
      </TouchableOpacity>
    )}
  </View>
);

const stStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { width: 3, height: 15, borderRadius: 2 },
  text: { fontSize: 14, fontWeight: '700' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionText: { fontSize: 12, fontWeight: '600' },
});

/* ══════════════════════════════════════════════
   OVERDUE BANNER
══════════════════════════════════════════════ */
const OverdueBanner = ({ count, onPress }) => {
  const theme = useTheme();
  return (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[obStyles.wrap, { backgroundColor: theme.dark ? '#3F1010' : '#DC2626', borderColor: theme.dark ? '#EF4444' : 'transparent', borderWidth: theme.dark ? 1 : 0 }]}>
    <View style={obStyles.left}>
      <MaterialCommunityIcons name="clock-alert" size={16} color="#fff" />
      <Text style={obStyles.title}>{count} issue{count !== 1 ? 's' : ''} past due date</Text>
    </View>
    <View style={obStyles.action}>
      <Text style={obStyles.actionText}>Review</Text>
      <MaterialCommunityIcons name="arrow-right" size={13} color="#fff" />
    </View>
  </TouchableOpacity>
  );
};

const obStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11, gap: 12 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  title: { color: '#fff', fontSize: 13, fontWeight: '700' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

/* ══════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════ */
const DashboardScreen = ({ navigation }) => {
  const theme = useTheme();
  const user  = useSelector(selectUser);
  const isAdmin = ['super_admin', 'org_admin', 'project_manager'].includes(user?.role);

  const { data: metricsResp, isLoading: mLoading, refetch: refetchMetrics } = useGetDashboardMetricsQuery();
  const { data: projectsData } = useGetProjectsQuery({ limit: 10 });
  const { data: myIssues, isLoading: iLoading, refetch: refetchIssues } = useGetIssuesQuery({ assigneeId: user?.id, limit: 8 });

  const handleRefresh = useCallback(() => { refetchMetrics(); refetchIssues(); }, [refetchMetrics, refetchIssues]);

  if (mLoading || iLoading) return <DashboardSkeleton />;

  const m             = metricsResp?.data || {};
  const projects      = projectsData?.data?.data || [];
  const firstProjId   = projects[0]?.id;
  const myTasksList   = myIssues?.data?.data || [];

  /* KPI tiles for admin */
  const adminTiles = [
    { icon: 'folder-multiple',       color: '#1D4ED8', label: 'Projects',     value: m.totalProjects,      sub: 'active',      onPress: () => navigation.navigate('Projects') },
    { icon: 'alert-circle-outline',  color: '#7C3AED', label: 'Total Issues', value: m.totalIssues,        sub: 'all projects' },
    { icon: 'progress-clock',        color: '#0369A1', label: 'In Progress',  value: m.inProgressCount,    sub: 'org-wide' },
    { icon: 'eye-check-outline',     color: '#EA580C', label: 'In Review',    value: m.inReviewCount,      sub: 'org-wide' },
    { icon: 'check-circle-outline',  color: '#059669', label: 'Done',         value: m.doneCount,          sub: 'org-wide' },
    { icon: 'clock-alert-outline',   color: '#DC2626', label: 'Overdue',      value: m.overdueCount,       sub: 'need action' },
    { icon: 'account-group',         color: '#7C3AED', label: 'Members',      value: m.totalMembers,       sub: 'in org',      onPress: () => navigation.navigate('Team') },
    { icon: 'clipboard-check',       color: '#16A34A', label: 'My Tasks',     value: m.myTasks,            sub: 'assigned me' },
  ];

  /* KPI tiles for developer */
  const devTiles = [
    { icon: 'clipboard-check',       color: '#1D4ED8', label: 'My Tasks',     value: m.myTasks,            sub: 'open' },
    { icon: 'progress-clock',        color: '#7C3AED', label: 'In Progress',  value: m.inProgress,         sub: 'this sprint' },
    { icon: 'check-circle-outline',  color: '#059669', label: 'Done Today',   value: m.completedToday,     sub: 'today' },
    { icon: 'clock-alert-outline',   color: '#DC2626', label: 'Overdue',      value: m.overdue,            sub: 'past due' },
  ];

  return (
    <View style={[rootStyles.root, { backgroundColor: theme.colors.background }]}>
      {/* Page header replaces the old hero banner */}
      <PageHeader user={user} m={m} onRefresh={handleRefresh} navigation={navigation} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={rootStyles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Overdue banner ── */}
        {(m.overdueCount || m.overdue) > 0 && (
          <View style={rootStyles.section}>
            <OverdueBanner
              count={m.overdueCount || m.overdue}
              onPress={() => navigation.navigate('ProjectStack', { screen: 'IssueList', params: { filter: 'overdue' } })}
            />
          </View>
        )}

        {/* ── KPI strip ── */}
        <KpiStrip tiles={isAdmin ? adminTiles : devTiles} />

        {/* ── Main grid ── */}
        <View style={rootStyles.mainGrid}>

          {/* LEFT column (60%) */}
          <View style={rootStyles.colMain}>
            {/* Active sprint(s) */}
            {projects.slice(0, 2).map(p => (
              <View key={p.id} style={rootStyles.block}>
                <SprintCard projectId={p.id} theme={theme} navigation={navigation} />
              </View>
            ))}

            {/* Issue pipeline (admin) or My Tasks (dev) */}
            {isAdmin ? (
              <View style={rootStyles.block}>
                <IssuePipeline m={m} />
              </View>
            ) : null}

            {/* My Tasks */}
            <View style={rootStyles.block}>
              <SectionTitle
                title={myTasksList.length > 0 ? `My Tasks  (${myTasksList.length})` : 'My Tasks'}
                action="View All"
                onAction={() => navigation.navigate('ProjectStack', { screen: 'IssueList' })}
                theme={theme}
              />
              <View style={[rootStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                {myTasksList.length === 0 ? (
                  <View style={rootStyles.emptyWrap}>
                    <View style={[rootStyles.emptyIcon, { backgroundColor: '#10B981' + (theme.dark ? '20' : '12') }]}>
                      <MaterialCommunityIcons name="check-all" size={28} color="#10B981" />
                    </View>
                    <Text style={[rootStyles.emptyTitle, { color: theme.colors.onSurface }]}>All caught up!</Text>
                    <Text style={[rootStyles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No open tasks assigned to you</Text>
                  </View>
                ) : (
                  myTasksList.slice(0, 6).map(issue => (
                    <TaskRow
                      key={issue.id}
                      issue={issue}
                      theme={theme}
                      onPress={() => navigation.navigate('ProjectStack', { screen: 'IssueDetail', params: { issueId: issue.id } })}
                    />
                  ))
                )}
              </View>
            </View>

            {/* Projects */}
            <View style={rootStyles.block}>
              <SectionTitle
                title="Projects"
                action="View All"
                onAction={() => navigation.navigate('Projects')}
                theme={theme}
              />
              <ProjectGrid projects={projects} navigation={navigation} theme={theme} />
            </View>
          </View>

          {/* RIGHT column (40%) */}
          <View style={rootStyles.colSide}>
            {/* Quick actions */}
            <View style={rootStyles.block}>
              <QuickActions navigation={navigation} projects={projects} />
            </View>

            {/* Issue pipeline for dev view */}
            {!isAdmin && (
              <View style={rootStyles.block}>
                <IssuePipeline m={{ todoCount: m.myTasks - m.inProgress, inProgressCount: m.inProgress, inReviewCount: 0, doneCount: m.completedToday }} />
              </View>
            )}

            {/* CFD mini chart */}
            {firstProjId && (
              <View style={rootStyles.block}>
                <CfdMiniChart projectId={firstProjId} theme={theme} />
              </View>
            )}

            {/* Admin: team + sprint summary card */}
            {isAdmin && (
              <View style={[rootStyles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                <View style={rootStyles.infoRow}>
                  <MaterialCommunityIcons name="lightning-bolt" size={14} color="#F59E0B" />
                  <Text style={[rootStyles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>Active Sprints</Text>
                  <Text style={[rootStyles.infoValue, { color: theme.colors.onSurface }]}>{m.activeSprintsCount || 0}</Text>
                </View>
                <Divider />
                <View style={rootStyles.infoRow}>
                  <MaterialCommunityIcons name="account-group" size={14} color="#7C3AED" />
                  <Text style={[rootStyles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>Team Members</Text>
                  <Text style={[rootStyles.infoValue, { color: theme.colors.onSurface }]}>{m.totalMembers || 0}</Text>
                </View>
                <Divider />
                <View style={rootStyles.infoRow}>
                  <MaterialCommunityIcons name="folder-multiple" size={14} color="#1D4ED8" />
                  <Text style={[rootStyles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>Projects</Text>
                  <Text style={[rootStyles.infoValue, { color: theme.colors.onSurface }]}>{m.totalProjects || 0}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const rootStyles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 48 },
  section: { paddingHorizontal: 24, paddingTop: 16 },
  mainGrid: { flexDirection: 'row', paddingHorizontal: 24, paddingTop: 14, gap: 18 },
  colMain: { flex: 3, gap: 0 },
  colSide: { flex: 2, gap: 0 },
  block: { marginBottom: 18 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', boxShadow: '0 2px 10px rgba(15,37,87,0.05)' },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 6 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 14, fontWeight: '700' },
  emptyText: { fontSize: 12 },
  infoCard: {
    borderRadius: 12, borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(15,37,87,0.05)',
    marginBottom: 18,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  infoLabel: { flex: 1, fontSize: 12, fontWeight: '500' },
  infoValue: { fontSize: 16, fontWeight: '800' },
});

export default DashboardScreen;
