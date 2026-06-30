import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Text, useTheme, Surface, ActivityIndicator, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetProjectQuery, useGetEpicsQuery } from '../../api/projectApi';
import { useGetSprintsQuery } from '../../api/sprintApi';
import colors from '../../theme/colors';
import { useProjectScrollbar } from '../../hooks/useProjectScrollbar';

const NAVY = colors.brand.navy;
const ROW_H = 48;
const LABEL_W = 220;
const DAY_PX = 28;
const HEADER_H = 56;

const SPRINT_COLORS = ['#0369A1', '#0891B2', '#0D9488', '#7C3AED', '#DB2777', '#EA580C'];
const sprintColor = (i) => SPRINT_COLORS[i % SPRINT_COLORS.length];

const parseDate = (str) => (str ? new Date(`${str}T00:00:00`) : null);
const diffDays = (a, b) => Math.round((b - a) / 86400000);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const fmt = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const fmtMonth = (d) => d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });

const buildMonths = (startDate, totalDays) => {
  const months = [];
  let cursor = new Date(startDate);
  cursor.setDate(1);

  while (diffDays(startDate, cursor) < totalDays) {
    const monthStart = new Date(cursor);
    cursor.setMonth(cursor.getMonth() + 1);
    const monthEnd = new Date(cursor);
    const dayOffset = Math.max(0, diffDays(startDate, monthStart));
    const dayEnd = Math.min(totalDays, diffDays(startDate, monthEnd));
    months.push({ label: fmtMonth(monthStart), offsetDays: dayOffset, widthDays: dayEnd - dayOffset });
  }

  return months;
};

const todayOffset = (rangeStart) => diffDays(rangeStart, new Date());

export default function TimelineScreen({ route, navigation }) {
  const { projectId } = route.params;
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 1180;
  const [hoveredId, setHoveredId] = useState(null);

  const { data: projectResp } = useGetProjectQuery(projectId);
  const { data: sprintsData, isLoading: loadingSprints } = useGetSprintsQuery({ projectId });
  const { data: epicsData, isLoading: loadingEpics } = useGetEpicsQuery(projectId);

  const project = projectResp?.data || projectResp || {};
  const accent = project.color || NAVY;
  useProjectScrollbar(project.color);
  const sprints = (sprintsData?.data?.data || []).filter((s) => s.startDate && s.endDate);
  const epics = (epicsData?.data || []).filter((e) => e.startDate && e.endDate);
  const isLoading = loadingSprints || loadingEpics;

  const { rangeStart, totalDays } = useMemo(() => {
    const allDates = [
      ...sprints.flatMap((s) => [parseDate(s.startDate), parseDate(s.endDate)]),
      ...epics.flatMap((e) => [parseDate(e.startDate), parseDate(e.endDate)]),
      new Date(),
    ].filter(Boolean);

    if (allDates.length === 0) {
      const now = new Date();
      return { rangeStart: addDays(now, -7), totalDays: 60 };
    }

    const min = new Date(Math.min(...allDates));
    const max = new Date(Math.max(...allDates));
    const start = addDays(min, -3);
    const end = addDays(max, 5);
    return { rangeStart: start, totalDays: Math.max(diffDays(start, end), 30) };
  }, [sprints, epics]);

  const months = useMemo(() => buildMonths(rangeStart, totalDays), [rangeStart, totalDays]);
  const todayPx = todayOffset(rangeStart) * DAY_PX;
  const totalPx = totalDays * DAY_PX;
  const rangeEnd = addDays(rangeStart, totalDays);
  const dateRangeLabel = `${fmt(rangeStart)} - ${fmt(rangeEnd)}`;

  const surf = theme.colors.surface;
  const border = theme.colors.outlineVariant;
  const bg = theme.colors.background;

  const renderBar = ({ start, end, label, color, id, onPress }) => {
    const startDay = Math.max(0, diffDays(rangeStart, parseDate(start)));
    const endDay = Math.min(totalDays, diffDays(rangeStart, parseDate(end)) + 1);
    const barWidth = Math.max(2, (endDay - startDay) * DAY_PX);
    const left = startDay * DAY_PX;
    const isHover = hoveredId === id;

    return (
      <TouchableOpacity
        key={id}
        onPress={onPress}
        style={[
          styles.bar,
          {
            left,
            width: barWidth,
            backgroundColor: color,
            opacity: isHover ? 1 : 0.88,
            transform: isHover ? [{ scaleY: 1.06 }] : [],
          },
        ]}
        onMouseEnter={() => setHoveredId(id)}
        onMouseLeave={() => setHoveredId(null)}
        activeOpacity={0.85}
      >
        {barWidth > 60 && <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>}
      </TouchableOpacity>
    );
  };

  const renderRow = ({ label, subLabel, icon, color, bar, idx }) => (
    <View key={`${label}-${idx}`} style={[styles.row, { borderBottomColor: border, backgroundColor: idx % 2 === 0 ? surf : bg }]}>
      <View style={[styles.rowLabel, { borderRightColor: border, backgroundColor: idx % 2 === 0 ? surf : bg }]}>
        <View style={[styles.rowIcon, { backgroundColor: `${color}18` }]}>
          <MaterialCommunityIcons name={icon} size={14} color={color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.rowName, { color: theme.colors.onSurface }]} numberOfLines={1}>{label}</Text>
          {!!subLabel && <Text style={[styles.rowSub, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{subLabel}</Text>}
        </View>
      </View>

      <View style={[styles.rowTimeline, { width: totalPx }]}>
        {bar}
        {Array.from({ length: Math.floor(totalDays / 7) }).map((_, wi) => (
          <View key={wi} style={[styles.weekLine, { left: wi * 7 * DAY_PX, backgroundColor: border }]} />
        ))}
      </View>
    </View>
  );

  const sprintRows = sprints.map((s, i) => ({
    label: s.name,
    subLabel: `${fmt(parseDate(s.startDate))} -> ${fmt(parseDate(s.endDate))}`,
    icon: s.status === 'active' ? 'lightning-bolt' : 'lightning-bolt-outline',
    color: sprintColor(i),
    bar: renderBar({
      start: s.startDate,
      end: s.endDate,
      label: s.name,
      color: sprintColor(i),
      id: `s-${s.id}`,
      onPress: () => navigation.navigate('Sprint', { projectId, sprintId: s.id }),
    }),
    idx: i,
  }));

  const epicRows = epics.map((e, i) => ({
    label: e.name,
    subLabel: `${fmt(parseDate(e.startDate))} -> ${fmt(parseDate(e.endDate))}`,
    icon: 'flag-outline',
    color: e.color || '#7C3AED',
    bar: renderBar({
      start: e.startDate,
      end: e.endDate,
      label: e.name,
      color: e.color || '#7C3AED',
      id: `e-${e.id}`,
      onPress: () => {},
    }),
    idx: sprintRows.length + i,
  }));

  const allRows = [...sprintRows, ...epicRows];

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <Surface style={[styles.screenHeader, { backgroundColor: surf, borderBottomColor: border }]} elevation={0}>
        <View style={[styles.headerTop, isCompact && styles.headerTopCompact]}>
          <View style={styles.headerIdentity}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Backlog', { projectId })}
              style={[styles.backBtn, { backgroundColor: theme.colors.surfaceVariant, borderColor: border }]}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
            <View style={[styles.screenAvatar, { backgroundColor: accent }]}>
              <Text style={styles.screenAvatarTxt}>{(project.key || 'P').slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.titleBlock}>
              <Text style={[styles.screenEyebrow, { color: theme.colors.onSurfaceVariant }]}>Timeline - Gantt view</Text>
              <Text style={[styles.screenTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                {project.name || 'Project'}
              </Text>
              <View style={styles.headerMetaRow}>
                <MetaPill icon="pound" label={project.key || 'KEY'} tone={accent} theme={theme} />
                <MetaPill icon="calendar-range" label={dateRangeLabel} theme={theme} />
                <MetaPill icon="chart-gantt" label={`${allRows.length} rows`} theme={theme} />
              </View>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Button
              icon="view-column-outline"
              mode="outlined"
              compact
              onPress={() => navigation.navigate('Board', { projectId })}
              style={[styles.headerButton, { borderColor: border }]}
              labelStyle={[styles.outlinedLabel, { color: accent }]}
            >
              Board
            </Button>
            <Button
              icon="format-list-bulleted"
              mode="outlined"
              compact
              onPress={() => navigation.navigate('Backlog', { projectId })}
              style={[styles.headerButton, { borderColor: border }]}
              labelStyle={[styles.outlinedLabel, { color: accent }]}
            >
              Backlog
            </Button>
          </View>
        </View>

        <View style={[styles.headerStats, isCompact && styles.headerStatsWrap]}>
          <MetricTile icon="lightning-bolt-outline" value={sprints.length} label="Sprints" tone={accent} theme={theme} />
          <MetricTile icon="flag-outline" value={epics.length} label="Epics" tone="#7C3AED" theme={theme} />
          <MetricTile icon="calendar-range" value={totalDays} label="Timeline days" tone={colors.info} theme={theme} />
          <MetricTile icon="crosshairs-gps" value={todayPx >= 0 && todayPx <= totalPx ? 'In range' : 'Outside'} label="Today" tone={colors.danger} theme={theme} />
        </View>

        <View style={styles.legend}>
          <LegendItem color={accent} label={`Sprints (${sprints.length})`} theme={theme} />
          <LegendItem color="#7C3AED" label={`Epics (${epics.length})`} theme={theme} />
          <LegendItem color={colors.danger} label="Today" theme={theme} isLine />
        </View>
      </Surface>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={accent} />
        </View>
      ) : allRows.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: `${accent}12` }]}>
            <MaterialCommunityIcons name="chart-gantt" size={34} color={accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No timeline data yet</Text>
          <Text style={[styles.emptySub, { color: theme.colors.onSurfaceVariant }]}>
            Add start and end dates to sprints or epics to see them here.
          </Text>
          <Button
            mode="outlined"
            icon="format-list-bulleted"
            compact
            onPress={() => navigation.navigate('Backlog', { projectId })}
            style={[styles.headerButton, { borderColor: border }]}
            labelStyle={[styles.outlinedLabel, { color: accent }]}
          >
            Open Backlog
          </Button>
        </View>
      ) : (
        <View style={styles.timelineFrame}>
          <ScrollView
            style={[styles.timelineScroll, { backgroundColor: surf, borderColor: border }]}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <View style={styles.timelineCanvas}>
              <View style={[styles.monthHeaderRow, { backgroundColor: surf, borderBottomColor: border }]}>
                <View style={[styles.monthLabelSpacer, { borderRightColor: border }]}>
                  <Text style={[styles.monthLabelSpacerTxt, { color: theme.colors.onSurfaceVariant }]}>Sprint / Epic</Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  {months.map((m, mi) => (
                    <View
                      key={mi}
                      style={[
                        styles.monthCell,
                        {
                          width: m.widthDays * DAY_PX,
                          borderRightColor: border,
                          backgroundColor: mi % 2 === 0 ? surf : bg,
                        },
                      ]}
                    >
                      <Text style={[styles.monthTxt, { color: theme.colors.onSurface }]}>{m.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {allRows.map((row) => renderRow(row))}
              </ScrollView>

              {todayPx >= 0 && todayPx <= totalPx && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.todayLine,
                    {
                      left: LABEL_W + todayPx,
                      height: HEADER_H + allRows.length * ROW_H,
                    },
                  ]}
                />
              )}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const MetricTile = ({ icon, value, label, tone, theme }) => (
  <View style={[styles.metricTile, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
    <View style={[styles.metricIcon, { backgroundColor: `${tone}14` }]}>
      <MaterialCommunityIcons name={icon} size={16} color={tone} />
    </View>
    <View style={{ minWidth: 0 }}>
      <Text style={[styles.metricValue, { color: theme.colors.onSurface }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{label}</Text>
    </View>
  </View>
);

const MetaPill = ({ icon, label, tone, theme }) => (
  <View
    style={[
      styles.metaPill,
      {
        backgroundColor: tone ? `${tone}12` : theme.colors.surfaceVariant,
        borderColor: tone ? `${tone}28` : theme.colors.outlineVariant,
      },
    ]}
  >
    <MaterialCommunityIcons name={icon} size={12} color={tone || theme.colors.onSurfaceVariant} />
    <Text style={[styles.metaPillText, { color: tone || theme.colors.onSurfaceVariant }]} numberOfLines={1}>{label}</Text>
  </View>
);

const LegendItem = ({ color, label, theme, isLine }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: color }, isLine && styles.legendLine]} />
    <Text style={[styles.legendTxt, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1 },

  screenHeader: {
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
  },
  headerTopCompact: { flexDirection: 'column' },
  headerIdentity: {
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
  screenAvatar: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenAvatarTxt: { color: '#fff', fontSize: 17, fontWeight: '900' },
  titleBlock: { flex: 1, minWidth: 0, gap: 5 },
  screenEyebrow: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0 },
  screenTitle: { fontSize: 23, fontWeight: '900', letterSpacing: 0 },
  headerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaPillText: { fontSize: 11, fontWeight: '800' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  headerButton: { borderRadius: 8 },
  outlinedLabel: { fontSize: 12, fontWeight: '800' },
  headerStats: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  headerStatsWrap: { width: '100%' },
  metricTile: {
    flex: 1,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metricIcon: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  metricValue: { fontSize: 18, fontWeight: '900' },
  metricLabel: { fontSize: 12, fontWeight: '700', marginTop: 1 },
  legend: { flexDirection: 'row', gap: 16, alignItems: 'center', flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLine: { width: 2, height: 16, borderRadius: 1 },
  legendTxt: { fontSize: 11, fontWeight: '700' },

  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  timelineFrame: { flex: 1, padding: 24 },
  timelineScroll: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    boxShadow: '0 8px 20px rgba(20,33,61,0.06)',
  },
  timelineCanvas: { position: 'relative' },

  monthHeaderRow: {
    flexDirection: 'row',
    height: HEADER_H,
    borderBottomWidth: 1,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  monthLabelSpacer: {
    width: LABEL_W,
    borderRightWidth: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  monthLabelSpacerTxt: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0 },
  monthCell: {
    borderRightWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  monthTxt: { fontSize: 11, fontWeight: '800' },

  row: {
    flexDirection: 'row',
    height: ROW_H,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    width: LABEL_W,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRightWidth: 1,
    position: 'sticky',
    left: 0,
    zIndex: 5,
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  rowName: { fontSize: 12, fontWeight: '700' },
  rowSub: { fontSize: 10, marginTop: 1 },
  rowTimeline: { position: 'relative', height: ROW_H },

  bar: {
    position: 'absolute',
    height: 28,
    top: (ROW_H - 28) / 2,
    borderRadius: 6,
    justifyContent: 'center',
    paddingHorizontal: 8,
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
  },
  barLabel: { color: '#fff', fontSize: 11, fontWeight: '800' },

  weekLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    opacity: 0.2,
  },
  todayLine: {
    position: 'absolute',
    top: 0,
    width: 2,
    backgroundColor: colors.danger,
    zIndex: 20,
    opacity: 0.85,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 28,
  },
  emptyIcon: { width: 68, height: 68, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  emptySub: { fontSize: 13, textAlign: 'center', maxWidth: 340, lineHeight: 20 },
});
