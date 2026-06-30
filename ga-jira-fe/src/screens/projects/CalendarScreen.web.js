import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetProjectIssuesQuery } from '../../api/issueApi';
import { useGetSprintsQuery } from '../../api/sprintApi';
import { useGetProjectQuery } from '../../api/projectApi';
import { useProjectScrollbar } from '../../hooks/useProjectScrollbar';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const PRIORITY_COLOR = {
  highest: '#E05C5C',
  high:    '#E07A5C',
  medium:  '#B8AA6E',
  low:     '#5C9CE0',
  lowest:  '#7BA7CC',
};

const TYPE_ICON = {
  bug:      'bug-outline',
  story:    'book-open-outline',
  task:     'check-circle-outline',
  epic:     'lightning-bolt-outline',
  subtask:  'subdirectory-arrow-right',
};

const toKey = (year, month, day) => `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  // Monday-first grid
  let startDow = firstDay.getDay(); // 0=Sun..6=Sat
  startDow = startDow === 0 ? 6 : startDow - 1; // shift so Mon=0

  const cells = [];
  // leading empty cells
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);
  // trailing cells to complete last row
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isInSprintRange(year, month, day, sprints) {
  const d = new Date(year, month, day);
  return sprints.some((s) => {
    if (!s.startDate || !s.endDate) return false;
    const start = parseLocalDate(s.startDate);
    const end   = parseLocalDate(s.endDate);
    if (!start || !end) return false;
    return d >= start && d <= end;
  });
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
  const theme = useTheme();

  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  const { data: projectResp } = useGetProjectQuery(projectId);
  const { data: issuesResp, isLoading } = useGetProjectIssuesQuery({ projectId, limit: 500 });
  const { data: sprintsResp } = useGetSprintsQuery({ projectId });

  const project = projectResp?.data;
  const accent  = project?.color || '#0F2557';
  useProjectScrollbar(project?.color);
  const issues  = issuesResp?.data?.data || [];
  const sprints = sprintsResp?.data?.data || [];

  const surf   = theme.colors.surface;
  const border = theme.colors.outlineVariant;
  const isDark = theme.dark;

  // Build issue map: dateKey → [issues]
  const issueMap = useMemo(() => {
    const map = {};
    issues.forEach((issue) => {
      if (!issue.dueDate) return;
      const key = issue.dueDate.substring(0, 10); // "YYYY-MM-DD"
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

  const todayKey = toKey(now.getFullYear(), now.getMonth(), now.getDate());

  const selectedKey = selectedDay ? toKey(year, month, selectedDay) : null;
  const selectedIssues = selectedKey ? (issueMap[selectedKey] || []) : [];

  const totalDue = cells.filter(d => d !== null).reduce((acc, d) => {
    const key = toKey(year, month, d);
    return acc + (issueMap[key]?.length || 0);
  }, 0);

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
          <MaterialCommunityIcons name="calendar-month-outline" size={18} color={accent} />
          <Text style={[styles.topBarLabel, { color: theme.colors.onSurface }]}>
            {project?.name || 'Calendar'}
          </Text>
          <Text style={[styles.topBarSub, { color: theme.colors.onSurfaceVariant }]}>· Calendar</Text>
        </View>

        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={[styles.navBtn, { borderColor: border }]}>
            <MaterialCommunityIcons name="chevron-left" size={18} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: theme.colors.onSurface }]}>
            {MONTHS[month]} {year}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={[styles.navBtn, { borderColor: border }]}>
            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelectedDay(null); }}
            style={[styles.todayBtn, { borderColor: border, backgroundColor: theme.colors.surfaceVariant }]}
          >
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, fontWeight: '600' }}>Today</Text>
          </TouchableOpacity>
        </View>

        {totalDue > 0 && (
          <View style={[styles.duePill, { backgroundColor: accent + '18', borderColor: accent + '40' }]}>
            <Text style={{ color: accent, fontSize: 12, fontWeight: '700' }}>{totalDue} due this month</Text>
          </View>
        )}
      </View>

      {isLoading && <ActivityIndicator style={{ marginTop: 40 }} color={accent} />}

      {!isLoading && (
        <View style={{ flex: 1, flexDirection: 'row' }}>

          {/* ── Calendar grid ── */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>

            {/* Day-of-week header */}
            <View style={[styles.dowRow, { backgroundColor: isDark ? '#0A1628' : '#F4F6FB', borderBottomColor: border }]}>
              {DAYS.map((d) => (
                <View key={d} style={styles.dowCell}>
                  <Text style={[styles.dowLabel, { color: theme.colors.onSurfaceVariant }]}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Calendar cells */}
            <View style={styles.grid}>
              {cells.map((day, idx) => {
                const isToday = day !== null && toKey(year, month, day) === todayKey;
                const key     = day !== null ? toKey(year, month, day) : null;
                const dayIssues = key ? (issueMap[key] || []) : [];
                const isSelected = day !== null && selectedDay === day;
                const sprint = day !== null ? getSprintForDay(year, month, day, sprints) : null;
                const isWeekend = idx % 7 >= 5;

                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => day !== null && setSelectedDay(day === selectedDay ? null : day)}
                    activeOpacity={day !== null ? 0.7 : 1}
                    style={[
                      styles.cell,
                      {
                        borderRightColor: border,
                        borderBottomColor: border,
                        backgroundColor: isSelected
                          ? accent + '10'
                          : sprint
                            ? (isDark ? '#1A2A44' : '#EFF6FF')
                            : isWeekend
                              ? (isDark ? '#0C1830' : '#F9FAFB')
                              : surf,
                      },
                    ]}
                  >
                    {day !== null && (
                      <>
                        {/* Day number */}
                        <View style={styles.cellTop}>
                          <View style={[
                            styles.dayNum,
                            isToday && { backgroundColor: accent },
                          ]}>
                            <Text style={[
                              styles.dayNumText,
                              { color: isToday ? '#fff' : isSelected ? accent : theme.colors.onSurface },
                              isToday && { fontWeight: '800' },
                            ]}>
                              {day}
                            </Text>
                          </View>
                          {sprint && (
                            <View style={[styles.sprintChip, { backgroundColor: accent + '20', borderColor: accent + '40' }]}>
                              <Text style={{ color: accent, fontSize: 9, fontWeight: '700' }} numberOfLines={1}>
                                {sprint.name}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Issue dots / mini list */}
                        {dayIssues.length > 0 && (
                          <View style={styles.issueList}>
                            {dayIssues.slice(0, 3).map((issue) => (
                              <View key={issue.id} style={[styles.issuePill, {
                                backgroundColor: (PRIORITY_COLOR[issue.priority] || accent) + '20',
                                borderLeftColor: PRIORITY_COLOR[issue.priority] || accent,
                              }]}>
                                <Text style={[styles.issuePillText, { color: theme.colors.onSurface }]} numberOfLines={1}>
                                  {issue.title}
                                </Text>
                              </View>
                            ))}
                            {dayIssues.length > 3 && (
                              <Text style={[styles.moreLabel, { color: theme.colors.onSurfaceVariant }]}>
                                +{dayIssues.length - 3} more
                              </Text>
                            )}
                          </View>
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Legend */}
            <View style={[styles.legend, { borderTopColor: border }]}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: isDark ? '#1A2A44' : '#EFF6FF', borderColor: border }]} />
                <Text style={[styles.legendLabel, { color: theme.colors.onSurfaceVariant }]}>Sprint period</Text>
              </View>
              {Object.entries(PRIORITY_COLOR).slice(0, 3).map(([p, c]) => (
                <View key={p} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: c }]} />
                  <Text style={[styles.legendLabel, { color: theme.colors.onSurfaceVariant, textTransform: 'capitalize' }]}>{p}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* ── Selected day panel ── */}
          {selectedDay !== null && (
            <View style={[styles.sidePanel, { backgroundColor: surf, borderLeftColor: border }]}>
              <View style={[styles.sidePanelHeader, { borderBottomColor: border }]}>
                <Text style={[styles.sidePanelDate, { color: theme.colors.onSurface }]}>
                  {MONTHS[month]} {selectedDay}, {year}
                </Text>
                <TouchableOpacity onPress={() => setSelectedDay(null)}>
                  <MaterialCommunityIcons name="close" size={18} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              {selectedIssues.length === 0 ? (
                <View style={styles.sidePanelEmpty}>
                  <MaterialCommunityIcons name="calendar-check-outline" size={32} color={theme.colors.outlineVariant} />
                  <Text style={[styles.sidePanelEmptyText, { color: theme.colors.onSurfaceVariant }]}>
                    No issues due on this day
                  </Text>
                </View>
              ) : (
                <ScrollView contentContainerStyle={{ padding: 14, gap: 8 }}>
                  <Text style={[styles.sidePanelCount, { color: theme.colors.onSurfaceVariant }]}>
                    {selectedIssues.length} issue{selectedIssues.length > 1 ? 's' : ''} due
                  </Text>
                  {selectedIssues.map((issue) => (
                    <TouchableOpacity
                      key={issue.id}
                      style={[styles.sideIssueCard, {
                        backgroundColor: theme.colors.background,
                        borderColor: border,
                        borderLeftColor: PRIORITY_COLOR[issue.priority] || accent,
                      }]}
                      onPress={() => navigation.navigate('IssueDetail', { issueId: issue.id })}
                    >
                      <View style={styles.sideIssueTop}>
                        <MaterialCommunityIcons
                          name={TYPE_ICON[issue.type] || 'circle-outline'}
                          size={13}
                          color={theme.colors.onSurfaceVariant}
                        />
                        <Text style={[styles.sideIssueKey, { color: theme.colors.onSurfaceVariant }]}>
                          {issue.key}
                        </Text>
                        {issue.priority && (
                          <View style={[styles.priorityPip, { backgroundColor: PRIORITY_COLOR[issue.priority] }]} />
                        )}
                      </View>
                      <Text style={[styles.sideIssueTitle, { color: theme.colors.onSurface }]} numberOfLines={2}>
                        {issue.title}
                      </Text>
                      {issue.assignee && (
                        <Text style={[styles.sideIssueAssignee, { color: theme.colors.onSurfaceVariant }]}>
                          {issue.assignee.firstName} {issue.assignee.lastName}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, gap: 12, flexWrap: 'wrap',
  },
  backBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  topBarTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBarLabel: { fontSize: 15, fontWeight: '700' },
  topBarSub: { fontSize: 14 },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: { width: 30, height: 30, borderRadius: 6, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  monthLabel: { fontSize: 14, fontWeight: '700', minWidth: 130, textAlign: 'center' },
  todayBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  duePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },

  dowRow: { flexDirection: 'row', borderBottomWidth: 1 },
  dowCell: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  dowLabel: { fontSize: 12, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    minHeight: 110,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    padding: 6,
  },
  cellTop: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  dayNum: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  dayNumText: { fontSize: 12, fontWeight: '600' },
  sprintChip: {
    flex: 1, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2,
    borderWidth: 1, maxWidth: 80,
  },

  issueList: { gap: 3 },
  issuePill: {
    borderLeftWidth: 2, borderRadius: 3,
    paddingLeft: 5, paddingVertical: 2, paddingRight: 4,
  },
  issuePillText: { fontSize: 10, lineHeight: 14 },
  moreLabel: { fontSize: 10, marginTop: 2, paddingLeft: 6 },

  legend: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 16,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 14, height: 14, borderRadius: 3, borderWidth: 1 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12 },

  sidePanel: {
    width: 280,
    borderLeftWidth: 1,
  },
  sidePanelHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sidePanelDate: { fontSize: 14, fontWeight: '700' },
  sidePanelEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 24 },
  sidePanelEmptyText: { fontSize: 13, textAlign: 'center' },
  sidePanelCount: { fontSize: 12, marginBottom: 4 },

  sideIssueCard: {
    borderRadius: 8, borderWidth: 1, borderLeftWidth: 3,
    padding: 10, gap: 4,
  },
  sideIssueTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sideIssueKey: { fontSize: 11, fontWeight: '600' },
  priorityPip: { width: 7, height: 7, borderRadius: 4, marginLeft: 'auto' },
  sideIssueTitle: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  sideIssueAssignee: { fontSize: 11, marginTop: 2 },
});
