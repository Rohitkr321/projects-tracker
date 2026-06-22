import React, { useState, useRef, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetEpicsQuery, useGetProjectQuery } from '../../api/projectApi';
import { useGetSprintsQuery } from '../../api/sprintApi';

const LEFT_W = 170;
const ROW_H  = 52;
const HDR_H  = 56;

const DAY_PX = { week: 48, month: 16, quarter: 6 };

const MS_DAY = 86400000;

const parseDate  = (d) => d ? new Date(d) : null;
const addDays    = (d, n) => new Date(d.getTime() + n * MS_DAY);
const startOfDay = (d) => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; };

const fmtDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const fmtMonth = (d) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

function buildDateRange(epics, sprints) {
  const dates = [];
  [...epics, ...sprints].forEach((item) => {
    if (item.startDate) dates.push(parseDate(item.startDate));
    if (item.endDate)   dates.push(parseDate(item.endDate));
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
  let curMonth = cursor.getMonth();
  let curYear  = cursor.getFullYear();
  let left = 0, width = 0, label = fmtMonth(cursor);

  for (let i = 0; i <= totalDays; i++) {
    const m = cursor.getMonth();
    const y = cursor.getFullYear();
    if (m !== curMonth || y !== curYear) {
      headers.push({ label, left, width });
      left = i * dayPx; width = dayPx;
      curMonth = m; curYear = y; label = fmtMonth(cursor);
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
          left,
          width: Math.max(width, 44),
          backgroundColor: color + '28',
          borderColor: color + '80',
        }]}>
          {progress > 0 && (
            <View style={[styles.epicProgress, { width: `${progress}%`, backgroundColor: color + '60' }]} />
          )}
          <Text style={[styles.epicBarLabel, { color }]} numberOfLines={1}>
            {epic.name}{progress > 0 ? `  ${progress}%` : ''}
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

  const { data: projectResp }               = useGetProjectQuery(projectId);
  const { data: epicsResp,   isLoading: le } = useGetEpicsQuery(projectId);
  const { data: sprintsResp, isLoading: ls } = useGetSprintsQuery({ projectId });

  const project = projectResp?.data;
  const accent  = project?.color || '#0F2557';
  const epics   = epicsResp?.data || [];
  const sprints = sprintsResp?.data?.data || [];

  const dayPx = DAY_PX[zoom];

  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => buildDateRange(epics, sprints),
    [epics, sprints],
  );

  const totalDays  = Math.ceil((rangeEnd - rangeStart) / MS_DAY);
  const totalWidth = totalDays * dayPx;

  const monthHeaders = useMemo(
    () => buildMonthHeaders(rangeStart, totalDays, dayPx),
    [rangeStart, totalDays, dayPx],
  );

  const weekHeaders = useMemo(
    () => buildWeekHeaders(rangeStart, totalDays, dayPx),
    [rangeStart, totalDays, dayPx],
  );

  const todayLeft = Math.floor((startOfDay(new Date()) - rangeStart) / MS_DAY) * dayPx;

  const scrollToToday = () => {
    if (timelineRef.current) {
      timelineRef.current.scrollTo({ x: Math.max(0, todayLeft - 120), animated: true });
    }
  };

  const surf   = theme.colors.surface;
  const border = theme.colors.outlineVariant;
  const isDark = theme.dark;
  const isLoading = le || ls;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>

      {/* ── Controls bar ── */}
      <View style={[styles.controlBar, { backgroundColor: surf, borderBottomColor: border }]}>
        {/* Zoom tabs */}
        <View style={[styles.zoomGroup, { backgroundColor: theme.colors.background, borderColor: border }]}>
          {['week', 'month', 'quarter'].map((z) => (
            <TouchableOpacity
              key={z}
              onPress={() => setZoom(z)}
              style={[styles.zoomTab, zoom === z && { backgroundColor: accent }]}
            >
              <Text style={[
                styles.zoomTabLabel,
                { color: zoom === z ? '#fff' : theme.colors.onSurfaceVariant },
              ]}>
                {z.charAt(0).toUpperCase() + z.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={scrollToToday}
          style={[styles.todayBtn, { borderColor: accent, backgroundColor: accent + '14' }]}
        >
          <MaterialCommunityIcons name="calendar-today" size={14} color={accent} />
          <Text style={[styles.todayLabel, { color: accent }]}>Today</Text>
        </TouchableOpacity>
      </View>

      {isLoading && <ActivityIndicator style={{ marginTop: 40 }} color={accent} />}

      {!isLoading && (
        <View style={{ flex: 1, flexDirection: 'row' }}>

          {/* ── Left label column ── */}
          <View style={[styles.leftCol, { backgroundColor: surf, borderRightColor: border }]}>
            {/* Header spacer */}
            <View style={[styles.leftHdr, { height: HDR_H, borderBottomColor: border }]}>
              <Text style={[styles.leftHdrLabel, { color: theme.colors.onSurfaceVariant }]}>TIMELINE</Text>
            </View>

            {/* Sprints label */}
            <View style={[styles.leftRow, {
              height: ROW_H,
              borderBottomColor: border,
              backgroundColor: isDark ? '#0A1628' : '#F0F4FB',
            }]}>
              <MaterialCommunityIcons name="lightning-bolt-outline" size={13} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.leftRowLabel, { color: theme.colors.onSurfaceVariant, fontWeight: '800', fontSize: 10 }]}>SPRINTS</Text>
            </View>

            {/* Epic label rows */}
            {epics.length === 0 && (
              <View style={[styles.leftRow, { height: ROW_H * 3, borderBottomColor: border }]}>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}>No epics yet</Text>
              </View>
            )}
            {epics.map((epic) => (
              <View key={epic.id} style={[styles.leftRow, { height: ROW_H, borderBottomColor: border }]}>
                <View style={[styles.epicDot, { backgroundColor: epic.color || '#6366F1' }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.leftRowLabel, { color: theme.colors.onSurface }]} numberOfLines={1}>
                    {epic.name}
                  </Text>
                  {epic.startDate && epic.endDate && (
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 9, marginTop: 1 }}>
                      {fmtDate(epic.startDate)} — {fmtDate(epic.endDate)}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* ── Timeline (horizontal scroll) ── */}
          <ScrollView
            ref={timelineRef}
            horizontal
            showsHorizontalScrollIndicator
            style={{ flex: 1 }}
            contentContainerStyle={{ minWidth: totalWidth + 40 }}
          >
            <View style={{ width: totalWidth }}>

              {/* Month header row */}
              <View style={[styles.hdrRow, {
                height: HDR_H / 2,
                borderBottomColor: border,
                backgroundColor: isDark ? '#0A1628' : '#F0F4FB',
              }]}>
                {monthHeaders.map((h, i) => (
                  <View key={i} style={[styles.hdrCell, { left: h.left, width: h.width, borderRightColor: border }]}>
                    <Text style={[styles.hdrMonthLabel, { color: theme.colors.onSurface }]} numberOfLines={1}>
                      {h.label}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Week/sub header row */}
              <View style={[styles.hdrRow, { height: HDR_H / 2, borderBottomColor: border }]}>
                {zoom === 'week'
                  ? weekHeaders.map((h, i) => (
                    <View key={i} style={[styles.hdrCell, { left: h.left, width: h.width, borderRightColor: border }]}>
                      <Text style={[styles.hdrWeekLabel, { color: theme.colors.onSurfaceVariant }]}>{h.label}</Text>
                    </View>
                  ))
                  : weekHeaders.map((h, i) => (
                    <View key={i} style={[styles.hdrCell, { left: h.left, width: h.width, borderRightColor: border + '60' }]} />
                  ))
                }
              </View>

              {/* Sprint band row */}
              <View style={[styles.row, {
                height: ROW_H,
                borderBottomColor: border,
                backgroundColor: isDark ? '#0A1628' : '#F0F4FB',
              }]}>
                {sprints.filter(s => s.startDate && s.endDate).map((sprint) => {
                  const ds = Math.floor((startOfDay(parseDate(sprint.startDate)) - rangeStart) / MS_DAY);
                  const de = Math.ceil((startOfDay(parseDate(sprint.endDate)) - rangeStart) / MS_DAY) + 1;
                  const left  = Math.max(0, ds) * dayPx;
                  const width = (de - Math.max(0, ds)) * dayPx;
                  const cfg = sprint.status === 'active'
                    ? { bg: '#3A7BD520', border: '#3A7BD560', text: '#3A7BD5' }
                    : sprint.status === 'completed'
                      ? { bg: '#4CAF5020', border: '#4CAF5060', text: '#4CAF50' }
                      : { bg: '#B8AA6E18', border: '#B8AA6E50', text: '#B8AA6E' };
                  return (
                    <View key={sprint.id} style={[styles.sprintBand, {
                      left, width: Math.max(width, 44),
                      backgroundColor: cfg.bg,
                      borderColor: cfg.border,
                    }]}>
                      <Text style={{ color: cfg.text, fontSize: 10, fontWeight: '700' }} numberOfLines={1}>
                        {sprint.name}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Epic rows */}
              {epics.length === 0 && (
                <View style={[styles.emptyRows, { height: ROW_H * 3, borderBottomColor: border }]}>
                  <MaterialCommunityIcons name="chart-gantt" size={28} color={theme.colors.outlineVariant} />
                  <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, fontSize: 13, textAlign: 'center' }}>
                    Create epics with start and end dates to see the roadmap.
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
                <View style={[styles.todayLine, { left: todayLeft }]} pointerEvents="none">
                  <View style={[styles.todayDot, { backgroundColor: '#E05C5C' }]} />
                </View>
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

  controlBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, gap: 10,
  },
  zoomGroup: {
    flexDirection: 'row', borderRadius: 8, borderWidth: 1, overflow: 'hidden', flex: 1,
  },
  zoomTab: { flex: 1, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  zoomTabLabel: { fontSize: 12, fontWeight: '700' },
  todayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
  },
  todayLabel: { fontSize: 12, fontWeight: '700' },

  leftCol: { width: LEFT_W, borderRightWidth: 1, zIndex: 2 },
  leftHdr: {
    borderBottomWidth: 1, justifyContent: 'flex-end',
    paddingHorizontal: 12, paddingBottom: 8,
  },
  leftHdrLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  leftRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, gap: 8, borderBottomWidth: 1,
  },
  leftRowLabel: { fontSize: 12, fontWeight: '600' },
  epicDot: { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },

  hdrRow: { position: 'relative', borderBottomWidth: 1 },
  hdrCell: {
    position: 'absolute', top: 0, bottom: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center', paddingHorizontal: 5, overflow: 'hidden',
  },
  hdrMonthLabel: { fontSize: 11, fontWeight: '700' },
  hdrWeekLabel:  { fontSize: 9,  fontWeight: '500' },

  row: { position: 'relative', borderBottomWidth: 1 },

  epicBar: {
    position: 'absolute', top: 8, height: 36,
    borderRadius: 7, borderWidth: 1,
    overflow: 'hidden', justifyContent: 'center', paddingHorizontal: 8,
  },
  epicProgress: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 7 },
  epicBarLabel: { fontSize: 11, fontWeight: '700', zIndex: 1 },

  sprintBand: {
    position: 'absolute', top: 6, height: 40,
    borderRadius: 7, borderWidth: 1,
    justifyContent: 'center', paddingHorizontal: 8, overflow: 'hidden',
  },

  todayLine: {
    position: 'absolute', top: 0, bottom: 0, width: 2,
    backgroundColor: '#E05C5C', zIndex: 10,
  },
  todayDot: { width: 8, height: 8, borderRadius: 4, marginLeft: -3 },

  emptyRows: {
    borderBottomWidth: 1, justifyContent: 'center', alignItems: 'center',
    flexDirection: 'column', paddingHorizontal: 20,
  },
});
