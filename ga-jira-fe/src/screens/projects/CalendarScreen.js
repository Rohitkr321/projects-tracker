import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetProjectIssuesQuery } from '../../api/issueApi';
import { useGetSprintsQuery } from '../../api/sprintApi';
import { useGetProjectQuery } from '../../api/projectApi';

const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const PRIORITY_COLOR = {
  highest: '#E05C5C',
  high:    '#E07A5C',
  medium:  '#B8AA6E',
  low:     '#5C9CE0',
  lowest:  '#7BA7CC',
};

const TYPE_ICON = {
  bug:     'bug-outline',
  story:   'book-open-outline',
  task:    'check-circle-outline',
  epic:    'lightning-bolt-outline',
  subtask: 'subdirectory-arrow-right',
};

const toKey = (year, month, day) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function getSprintForDay(year, month, day, sprints) {
  const d = new Date(year, month, day);
  return sprints.find((s) => {
    if (!s.startDate || !s.endDate) return false;
    const start = parseLocalDate(s.startDate);
    const end   = parseLocalDate(s.endDate);
    return start && end && d >= start && d <= end;
  });
}

export default function CalendarScreen({ route, navigation }) {
  const { projectId } = route.params;
  const theme  = useTheme();

  const now = new Date();
  const [year,        setYear]        = useState(now.getFullYear());
  const [month,       setMonth]       = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  const { data: projectResp }              = useGetProjectQuery(projectId);
  const { data: issuesResp, isLoading }    = useGetProjectIssuesQuery({ projectId, limit: 500 });
  const { data: sprintsResp }              = useGetSprintsQuery({ projectId });

  const project = projectResp?.data;
  const accent  = project?.color || '#0F2557';
  const issues  = issuesResp?.data?.data || [];
  const sprints = sprintsResp?.data?.data || [];

  const isDark = theme.dark;
  const surf   = theme.colors.surface;
  const border = theme.colors.outlineVariant;

  const issueMap = useMemo(() => {
    const map = {};
    issues.forEach((issue) => {
      if (!issue.dueDate) return;
      const key = issue.dueDate.substring(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(issue);
    });
    return map;
  }, [issues]);

  const cells = useMemo(() => buildCalendarGrid(year, month), [year, month]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const todayKey     = toKey(now.getFullYear(), now.getMonth(), now.getDate());
  const selectedKey  = selectedDay ? toKey(year, month, selectedDay) : null;
  const selectedIssues = selectedKey ? (issueMap[selectedKey] || []) : [];

  const totalDue = cells.filter(d => d !== null).reduce((acc, d) => {
    return acc + (issueMap[toKey(year, month, d)]?.length || 0);
  }, 0);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>

      {/* ── Month nav bar ── */}
      <View style={[styles.topBar, { backgroundColor: surf, borderBottomColor: border }]}>
        <TouchableOpacity
          onPress={prevMonth}
          style={[styles.navBtn, { borderColor: border }]}
        >
          <MaterialCommunityIcons name="chevron-left" size={20} color={theme.colors.onSurface} />
        </TouchableOpacity>

        <View style={styles.monthCenter}>
          <Text style={[styles.monthLabel, { color: theme.colors.onSurface }]}>
            {MONTHS[month]} {year}
          </Text>
          {totalDue > 0 && (
            <View style={[styles.duePill, { backgroundColor: accent + '18', borderColor: accent + '40' }]}>
              <Text style={{ color: accent, fontSize: 10, fontWeight: '700' }}>{totalDue} due</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={nextMonth}
          style={[styles.navBtn, { borderColor: border }]}
        >
          <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurface} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelectedDay(null); }}
          style={[styles.todayBtn, { borderColor: border, backgroundColor: theme.colors.surfaceVariant }]}
        >
          <Text style={{ color: theme.colors.onSurface, fontSize: 12, fontWeight: '700' }}>Today</Text>
        </TouchableOpacity>
      </View>

      {isLoading && <ActivityIndicator style={{ marginTop: 32 }} color={accent} />}

      {!isLoading && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

          {/* ── Day-of-week header ── */}
          <View style={[styles.dowRow, { backgroundColor: isDark ? '#0A1628' : '#F0F4FA', borderBottomColor: border }]}>
            {DAYS.map((d, i) => (
              <View key={d} style={styles.dowCell}>
                <Text style={[styles.dowLabel, { color: i >= 5 ? accent : theme.colors.onSurfaceVariant }]}>{d}</Text>
              </View>
            ))}
          </View>

          {/* ── Calendar grid ── */}
          <View style={styles.grid}>
            {cells.map((day, idx) => {
              const isToday    = day !== null && toKey(year, month, day) === todayKey;
              const key        = day !== null ? toKey(year, month, day) : null;
              const dayIssues  = key ? (issueMap[key] || []) : [];
              const isSelected = day !== null && selectedDay === day;
              const sprint     = day !== null ? getSprintForDay(year, month, day, sprints) : null;
              const isWeekend  = idx % 7 >= 5;

              const cellBg = isSelected
                ? accent + '18'
                : sprint
                  ? (isDark ? '#1A2A44' : '#EEF5FF')
                  : isWeekend
                    ? (isDark ? '#0C1830' : '#F9FAFB')
                    : surf;

              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => day !== null && setSelectedDay(day === selectedDay ? null : day)}
                  activeOpacity={day !== null ? 0.7 : 1}
                  style={[styles.cell, {
                    borderRightColor: border,
                    borderBottomColor: border,
                    backgroundColor: cellBg,
                    borderWidth: isSelected ? 0 : 0,
                    borderColor: isSelected ? accent : 'transparent',
                  }]}
                >
                  {day !== null && (
                    <>
                      <View style={[
                        styles.dayBubble,
                        isToday && { backgroundColor: accent },
                        isSelected && !isToday && { backgroundColor: accent + '28', borderColor: accent, borderWidth: 1 },
                      ]}>
                        <Text style={[
                          styles.dayNum,
                          { color: isToday ? '#fff' : isSelected ? accent : isWeekend ? accent + 'CC' : theme.colors.onSurface },
                          (isToday || isSelected) && { fontWeight: '800' },
                        ]}>
                          {day}
                        </Text>
                      </View>

                      {/* Issue dots */}
                      {dayIssues.length > 0 && (
                        <View style={styles.dotRow}>
                          {dayIssues.slice(0, 3).map((issue, i) => (
                            <View
                              key={i}
                              style={[styles.dot, { backgroundColor: PRIORITY_COLOR[issue.priority] || accent }]}
                            />
                          ))}
                          {dayIssues.length > 3 && (
                            <Text style={[styles.dotMore, { color: theme.colors.onSurfaceVariant }]}>
                              +{dayIssues.length - 3}
                            </Text>
                          )}
                        </View>
                      )}

                      {/* Sprint indicator stripe at bottom */}
                      {sprint && (
                        <View style={[styles.sprintStripe, { backgroundColor: accent + '50' }]} />
                      )}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Selected day panel ── */}
          {selectedDay !== null && (
            <View style={[styles.dayPanel, { backgroundColor: surf, borderColor: border }]}>
              <View style={[styles.dayPanelHdr, { borderBottomColor: border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.dayPanelBubble, { backgroundColor: accent }]}>
                    <Text style={styles.dayPanelBubbleNum}>{selectedDay}</Text>
                  </View>
                  <View>
                    <Text style={[styles.dayPanelDate, { color: theme.colors.onSurface }]}>
                      {MONTHS_SHORT[month]} {selectedDay}, {year}
                    </Text>
                    <Text style={[styles.dayPanelSub, { color: theme.colors.onSurfaceVariant }]}>
                      {selectedIssues.length === 0 ? 'No issues due' : `${selectedIssues.length} issue${selectedIssues.length > 1 ? 's' : ''} due`}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedDay(null)}
                  style={[styles.closeBtn, { borderColor: border }]}
                >
                  <MaterialCommunityIcons name="close" size={16} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              {selectedIssues.length === 0 ? (
                <View style={styles.emptyPanel}>
                  <MaterialCommunityIcons name="calendar-check-outline" size={36} color={theme.colors.outlineVariant} />
                  <Text style={[styles.emptyPanelText, { color: theme.colors.onSurfaceVariant }]}>
                    No issues due on this day
                  </Text>
                </View>
              ) : (
                <View style={styles.issueList}>
                  {selectedIssues.map((issue) => (
                    <TouchableOpacity
                      key={issue.id}
                      style={[styles.issueCard, {
                        backgroundColor: theme.colors.background,
                        borderColor: border,
                        borderLeftColor: PRIORITY_COLOR[issue.priority] || accent,
                      }]}
                      onPress={() => navigation.navigate('IssueDetail', { issueId: issue.id })}
                      activeOpacity={0.75}
                    >
                      <View style={styles.issueCardTop}>
                        <MaterialCommunityIcons
                          name={TYPE_ICON[issue.type] || 'circle-outline'}
                          size={14}
                          color={theme.colors.onSurfaceVariant}
                        />
                        <Text style={[styles.issueKey, { color: theme.colors.onSurfaceVariant }]}>{issue.key}</Text>
                        {issue.priority && (
                          <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[issue.priority] }]} />
                        )}
                      </View>
                      <Text style={[styles.issueTitle, { color: theme.colors.onSurface }]} numberOfLines={2}>
                        {issue.title}
                      </Text>
                      {issue.assignee && (
                        <Text style={[styles.issueAssignee, { color: theme.colors.onSurfaceVariant }]}>
                          {issue.assignee.firstName} {issue.assignee.lastName}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── Legend (shown when no day selected) ── */}
          {selectedDay === null && (
            <View style={[styles.legend, { borderTopColor: border }]}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: isDark ? '#1A2A44' : '#EEF5FF', borderColor: border }]} />
                <Text style={[styles.legendLabel, { color: theme.colors.onSurfaceVariant }]}>Sprint period</Text>
              </View>
              {Object.entries(PRIORITY_COLOR).slice(0, 3).map(([p, c]) => (
                <View key={p} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: c }]} />
                  <Text style={[styles.legendLabel, { color: theme.colors.onSurfaceVariant, textTransform: 'capitalize' }]}>{p}</Text>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, gap: 8,
  },
  navBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  monthCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  monthLabel: { fontSize: 16, fontWeight: '800' },
  duePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  todayBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },

  dowRow: { flexDirection: 'row', borderBottomWidth: 1 },
  dowCell: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  dowLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    minHeight: 60,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 4,
    gap: 4,
    position: 'relative',
  },
  dayBubble: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  dayNum: { fontSize: 12, fontWeight: '600' },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotMore: { fontSize: 8, fontWeight: '700' },
  sprintStripe: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, borderRadius: 1 },

  // Day panel
  dayPanel: {
    marginHorizontal: 12, marginTop: 14,
    borderRadius: 14, borderWidth: 1, overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  dayPanelHdr: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayPanelBubble: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  dayPanelBubbleNum: { color: '#fff', fontSize: 15, fontWeight: '800' },
  dayPanelDate: { fontSize: 14, fontWeight: '700' },
  dayPanelSub: { fontSize: 12, marginTop: 1 },
  closeBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  emptyPanel: { alignItems: 'center', gap: 8, paddingVertical: 28, paddingHorizontal: 16 },
  emptyPanelText: { fontSize: 13, textAlign: 'center' },

  issueList: { padding: 12, gap: 8 },
  issueCard: {
    borderRadius: 10, borderWidth: 1, borderLeftWidth: 3,
    padding: 12, gap: 4,
  },
  issueCardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  issueKey: { fontSize: 11, fontWeight: '600', flex: 1 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  issueTitle: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  issueAssignee: { fontSize: 11, marginTop: 2 },

  legend: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 14, height: 14, borderRadius: 3, borderWidth: 1 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12 },
});
