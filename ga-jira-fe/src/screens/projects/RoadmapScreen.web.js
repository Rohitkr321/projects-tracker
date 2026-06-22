import React, { useState, useRef, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetEpicsQuery, useGetProjectQuery } from '../../api/projectApi';
import { useGetSprintsQuery } from '../../api/sprintApi';

const LEFT_W = 220;
const ROW_H  = 48;
const HDR_H  = 56;

const DAY_PX = { week: 56, month: 18, quarter: 7 };

const PRIORITY_COLORS = { highest: '#E05C5C', high: '#E07A5C', medium: '#B8AA6E', low: '#5C9CE0', lowest: '#7BA7CC' };

const MS_DAY = 86400000;

const parseDate = (d) => d ? new Date(d) : null;

const addDays = (d, n) => new Date(d.getTime() + n * MS_DAY);

const startOfDay = (d) => { const r = new Date(d); r.setHours(0,0,0,0); return r; };

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const fmtMonth = (d) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

const fmtWeek = (d) => `Wk ${Math.ceil(d.getDate() / 7)}`;

function buildDateRange(epics, sprints) {
  const dates = [];
  [...epics, ...sprints].forEach((item) => {
    if (item.startDate) dates.push(parseDate(item.startDate));
    if (item.endDate) dates.push(parseDate(item.endDate));
  });
  if (!dates.length) {
    const now = new Date();
    return { start: addDays(now, -30), end: addDays(now, 60) };
  }
  const min = startOfDay(new Date(Math.min(...dates)));
  const max = startOfDay(new Date(Math.max(...dates)));
  return { start: addDays(min, -7), end: addDays(max, 14) };
}

function buildMonthHeaders(start, totalDays, dayPx) {
  const headers = [];
  let cursor = startOfDay(start);
  let currentMonth = cursor.getMonth();
  let currentYear = cursor.getFullYear();
  let left = 0;
  let width = 0;
  let label = fmtMonth(cursor);

  for (let i = 0; i <= totalDays; i++) {
    const m = cursor.getMonth();
    const y = cursor.getFullYear();
    if (m !== currentMonth || y !== currentYear) {
      headers.push({ label, left, width });
      left = i * dayPx;
      width = dayPx;
      currentMonth = m;
      currentYear = y;
      label = fmtMonth(cursor);
    } else {
      width += dayPx;
    }
    cursor = addDays(cursor, 1);
  }
  headers.push({ label, left, width });
  return headers;
}

function buildWeekHeaders(start, totalDays, dayPx) {
  const headers = [];
  for (let i = 0; i < totalDays; i += 7) {
    const d = addDays(start, i);
    headers.push({
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      left: i * dayPx,
      width: Math.min(7, totalDays - i) * dayPx,
    });
  }
  return headers;
}

const EpicRow = ({ epic, rangeStart, totalDays, dayPx, rowH, theme }) => {
  const start = parseDate(epic.startDate);
  const end   = parseDate(epic.endDate);
  if (!start || !end) return (
    <View style={[styles.row, { height: rowH, borderBottomColor: theme.colors.outlineVariant }]}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 12 }}>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}>No dates set</Text>
      </View>
    </View>
  );

  const dayStart = Math.floor((startOfDay(start) - rangeStart) / MS_DAY);
  const daySpan  = Math.max(1, Math.ceil((startOfDay(end) - startOfDay(start)) / MS_DAY) + 1);
  const left  = dayStart * dayPx;
  const width = daySpan * dayPx;
  const color = epic.color || '#6366F1';
  const progress = epic.progress || 0;

  return (
    <View style={[styles.row, { height: rowH, borderBottomColor: theme.colors.outlineVariant }]}>
      <View style={{ position: 'relative', flex: 1 }}>
        <View style={[styles.epicBar, {
          left, width: Math.max(width, 40),
          backgroundColor: color + '28',
          borderColor: color + '80',
        }]}>
          {/* Progress fill */}
          <View style={[styles.epicProgress, {
            width: `${progress}%`,
            backgroundColor: color + '60',
          }]} />
          <Text style={[styles.epicBarLabel, { color }]} numberOfLines={1}>
            {epic.name}  {progress > 0 ? `${progress}%` : ''}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function RoadmapScreen({ route, navigation }) {
  const { projectId } = route.params;
  const theme = useTheme();
  const [zoom, setZoom] = useState('month');
  const timelineRef = useRef(null);

  const { data: projectResp } = useGetProjectQuery(projectId);
  const { data: epicsResp, isLoading: loadingEpics } = useGetEpicsQuery(projectId);
  const { data: sprintsResp, isLoading: loadingSprints } = useGetSprintsQuery({ projectId });

  const project = projectResp?.data;
  const accent  = project?.color || '#0F2557';
  const epics   = epicsResp?.data || [];
  const sprints = sprintsResp?.data?.data || [];

  const dayPx = DAY_PX[zoom];

  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => buildDateRange(epics, sprints),
    [epics, sprints]
  );

  const totalDays = Math.ceil((rangeEnd - rangeStart) / MS_DAY);
  const totalWidth = totalDays * dayPx;

  const monthHeaders = useMemo(
    () => buildMonthHeaders(rangeStart, totalDays, dayPx),
    [rangeStart, totalDays, dayPx]
  );

  const weekHeaders = useMemo(
    () => buildWeekHeaders(rangeStart, totalDays, dayPx),
    [rangeStart, totalDays, dayPx]
  );

  const todayLeft = Math.floor((startOfDay(new Date()) - rangeStart) / MS_DAY) * dayPx;

  const scrollToToday = () => {
    if (timelineRef.current) {
      timelineRef.current.scrollTo({ x: Math.max(0, todayLeft - 200), animated: true });
    }
  };

  const surf   = theme.colors.surface;
  const border = theme.colors.outlineVariant;
  const isDark = theme.dark;

  const isLoading = loadingEpics || loadingSprints;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { backgroundColor: surf, borderBottomColor: border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: theme.colors.surfaceVariant, borderColor: border }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>

        <View style={styles.topBarTitle}>
          <MaterialCommunityIcons name="chart-gantt" size={18} color={accent} />
          <Text style={[styles.topBarLabel, { color: theme.colors.onSurface }]}>
            {project?.name || 'Roadmap'}
          </Text>
          <Text style={[styles.topBarSub, { color: theme.colors.onSurfaceVariant }]}>· Roadmap</Text>
        </View>

        <View style={styles.zoomRow}>
          {['week', 'month', 'quarter'].map((z) => (
            <TouchableOpacity
              key={z}
              onPress={() => setZoom(z)}
              style={[styles.zoomBtn, {
                backgroundColor: zoom === z ? accent + '18' : 'transparent',
                borderColor: zoom === z ? accent + '50' : border,
              }]}
            >
              <Text style={{ color: zoom === z ? accent : theme.colors.onSurfaceVariant, fontSize: 12, fontWeight: zoom === z ? '700' : '500', textTransform: 'capitalize' }}>
                {z}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={scrollToToday}
            style={[styles.todayBtn, { borderColor: border, backgroundColor: theme.colors.surfaceVariant }]}
          >
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, fontWeight: '600' }}>Today</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading && <ActivityIndicator style={{ marginTop: 40 }} color={accent} />}

      {!isLoading && (
        <View style={{ flex: 1, flexDirection: 'row' }}>

          {/* ── Left name column ── */}
          <View style={[styles.leftCol, { backgroundColor: surf, borderRightColor: border }]}>
            {/* Header spacer */}
            <View style={[styles.leftHdr, { height: HDR_H, borderBottomColor: border }]}>
              <Text style={[styles.leftHdrLabel, { color: theme.colors.onSurfaceVariant }]}>TIMELINE</Text>
            </View>

            {/* Sprint label row */}
            <View style={[styles.leftRow, { height: ROW_H, borderBottomColor: border, backgroundColor: isDark ? '#0A1628' : '#F4F6FB' }]}>
              <MaterialCommunityIcons name="lightning-bolt-outline" size={13} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.leftRowLabel, { color: theme.colors.onSurfaceVariant, fontWeight: '700', fontSize: 11 }]}>SPRINTS</Text>
            </View>

            {/* Epic label rows */}
            {epics.length === 0 && (
              <View style={[styles.leftRow, { height: ROW_H * 3, borderBottomColor: border }]}>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>No epics yet</Text>
              </View>
            )}
            {epics.map((epic) => (
              <View key={epic.id} style={[styles.leftRow, { height: ROW_H, borderBottomColor: border }]}>
                <View style={[styles.epicDot, { backgroundColor: epic.color || '#6366F1' }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.leftRowLabel, { color: theme.colors.onSurface }]} numberOfLines={1}>{epic.name}</Text>
                  {epic.startDate && epic.endDate && (
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 10, marginTop: 1 }}>
                      {fmtDate(epic.startDate)} — {fmtDate(epic.endDate)}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* ── Right timeline (horizontal scroll) ── */}
          <ScrollView
            ref={timelineRef}
            horizontal
            showsHorizontalScrollIndicator
            style={{ flex: 1 }}
            contentContainerStyle={{ minWidth: totalWidth + 40 }}
          >
            <View style={{ width: totalWidth }}>

              {/* Month header */}
              <View style={[styles.hdrRow, { height: HDR_H / 2, borderBottomColor: border, backgroundColor: isDark ? '#0A1628' : '#F4F6FB' }]}>
                {monthHeaders.map((h, i) => (
                  <View key={i} style={[styles.hdrCell, { left: h.left, width: h.width, borderRightColor: border }]}>
                    <Text style={[styles.hdrMonthLabel, { color: theme.colors.onSurface }]} numberOfLines={1}>{h.label}</Text>
                  </View>
                ))}
              </View>

              {/* Week/day sub-header */}
              <View style={[styles.hdrRow, { height: HDR_H / 2, borderBottomColor: border }]}>
                {zoom === 'week'
                  ? weekHeaders.map((h, i) => (
                    <View key={i} style={[styles.hdrCell, { left: h.left, width: h.width, borderRightColor: border }]}>
                      <Text style={[styles.hdrWeekLabel, { color: theme.colors.onSurfaceVariant }]}>{h.label}</Text>
                    </View>
                  ))
                  : weekHeaders.map((h, i) => (
                    <View key={i} style={[styles.hdrCell, { left: h.left, width: h.width, borderRightColor: border + '80' }]}>
                    </View>
                  ))
                }
              </View>

              {/* Sprint band row */}
              <View style={[styles.row, { height: ROW_H, borderBottomColor: border, backgroundColor: isDark ? '#0A1628' : '#F4F6FB' }]}>
                {sprints.filter(s => s.startDate && s.endDate).map((sprint) => {
                  const ds = Math.floor((startOfDay(parseDate(sprint.startDate)) - rangeStart) / MS_DAY);
                  const de = Math.ceil((startOfDay(parseDate(sprint.endDate)) - rangeStart) / MS_DAY) + 1;
                  const left = Math.max(0, ds) * dayPx;
                  const width = (de - Math.max(0, ds)) * dayPx;
                  const cfg = sprint.status === 'active' ? { bg: '#3A7BD520', border: '#3A7BD560', text: '#3A7BD5' }
                    : sprint.status === 'completed' ? { bg: '#4CAF5020', border: '#4CAF5060', text: '#4CAF50' }
                    : { bg: '#B8AA6E18', border: '#B8AA6E50', text: '#B8AA6E' };
                  return (
                    <View key={sprint.id} style={[styles.sprintBand, {
                      left, width: Math.max(width, 40),
                      backgroundColor: cfg.bg,
                      borderColor: cfg.border,
                    }]}>
                      <Text style={{ color: cfg.text, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
                        {sprint.name}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Epic rows */}
              {epics.length === 0 && (
                <View style={[styles.emptyRows, { height: ROW_H * 3, borderBottomColor: border }]}>
                  <MaterialCommunityIcons name="chart-gantt" size={32} color={theme.colors.outlineVariant} />
                  <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, fontSize: 14 }}>
                    No epics found. Create epics with start and end dates to see the roadmap.
                  </Text>
                </View>
              )}
              {epics.map((epic) => (
                <EpicRow
                  key={epic.id}
                  epic={epic}
                  rangeStart={rangeStart}
                  totalDays={totalDays}
                  dayPx={dayPx}
                  rowH={ROW_H}
                  theme={theme}
                />
              ))}

              {/* Today marker */}
              {todayLeft >= 0 && todayLeft <= totalWidth && (
                <View style={[styles.todayLine, { left: todayLeft }]} pointerEvents="none" />
              )}

            </View>
          </ScrollView>

        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 8, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  topBarTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBarLabel: { fontSize: 15, fontWeight: '700' },
  topBarSub: { fontSize: 14 },
  zoomRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  zoomBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  todayBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, marginLeft: 4,
  },

  leftCol: { width: LEFT_W, borderRightWidth: 1, zIndex: 2 },
  leftHdr: {
    borderBottomWidth: 1, justifyContent: 'flex-end',
    paddingHorizontal: 14, paddingBottom: 8,
  },
  leftHdrLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  leftRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, gap: 8, borderBottomWidth: 1,
  },
  leftRowLabel: { fontSize: 13, fontWeight: '600' },
  epicDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },

  hdrRow: { position: 'relative', borderBottomWidth: 1 },
  hdrCell: {
    position: 'absolute', top: 0, bottom: 0,
    borderRightWidth: 1, justifyContent: 'center',
    paddingHorizontal: 6, overflow: 'hidden',
  },
  hdrMonthLabel: { fontSize: 12, fontWeight: '700' },
  hdrWeekLabel: { fontSize: 10, fontWeight: '500' },

  row: { position: 'relative', borderBottomWidth: 1 },

  epicBar: {
    position: 'absolute', top: 9, height: 30,
    borderRadius: 6, borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center', paddingHorizontal: 8,
  },
  epicProgress: {
    position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 6,
  },
  epicBarLabel: { fontSize: 12, fontWeight: '700', zIndex: 1 },

  sprintBand: {
    position: 'absolute', top: 6, height: 36,
    borderRadius: 6, borderWidth: 1,
    justifyContent: 'center', paddingHorizontal: 8,
    overflow: 'hidden',
  },

  todayLine: {
    position: 'absolute', top: 0, bottom: 0, width: 2,
    backgroundColor: '#E05C5C',
    zIndex: 10,
  },

  emptyRows: {
    borderBottomWidth: 1, justifyContent: 'center', alignItems: 'center',
    flexDirection: 'column',
  },
});
