import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, useTheme, Card, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
import { useGetProjectStatsQuery, useGetProjectsQuery } from '../../api/projectApi';
import { useGetSprintsQuery } from '../../api/sprintApi';

const StatBlock = ({ label, value, theme }) => (
  <View style={[styles.statBlock, { backgroundColor: theme.colors.surface }]}>
    <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: '800' }}>{value}</Text>
    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
  </View>
);

const ReportsScreen = () => {
  const theme = useTheme();
  const [tab, setTab] = useState('overview');
  const { data: projectsData } = useGetProjectsQuery({ limit: 1 });
  const firstProjectId = projectsData?.data?.data?.[0]?.id;
  const { data: statsData, isLoading } = useGetProjectStatsQuery(firstProjectId, { skip: !firstProjectId });
  const { data: sprintsData } = useGetSprintsQuery({ projectId: firstProjectId }, { skip: !firstProjectId });

  const stats = statsData?.data;
  const sprints = sprintsData?.data?.data || [];
  const completedSprints = sprints.filter((s) => s.status === 'completed');
  const avgVelocity = completedSprints.length
    ? Math.round(completedSprints.reduce((sum, s) => sum + (s.velocity || 0), 0) / completedSprints.length)
    : 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SegmentedButtons
        value={tab}
        onValueChange={setTab}
        buttons={[
          { value: 'overview', label: 'Overview' },
          { value: 'velocity', label: 'Velocity' },
          { value: 'time', label: 'Time' },
        ]}
        style={styles.tabs}
      />

      {isLoading ? (
        <ActivityIndicator size="large" style={styles.loading} />
      ) : (
        <>
          {tab === 'overview' && (
            <View>
              <View style={styles.statsGrid}>
                <StatBlock label="Total Issues" value={stats?.totalIssues || 0} theme={theme} />
                <StatBlock label="Completed" value={stats?.doneIssues || 0} theme={theme} />
                <StatBlock label="Sprints" value={stats?.sprints || 0} theme={theme} />
                <StatBlock label="Avg Velocity" value={`${avgVelocity}pt`} theme={theme} />
              </View>

              {completedSprints.length > 0 && (
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                  <Card.Content>
                    <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 12 }}>
                      Sprint History
                    </Text>
                    {completedSprints.slice(-5).map((sprint) => (
                      <View key={sprint.id} style={styles.sprintRow}>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurface, flex: 1 }}>{sprint.name}</Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                          {sprint.completedPoints || 0}pt
                        </Text>
                      </View>
                    ))}
                  </Card.Content>
                </Card>
              )}
            </View>
          )}

          {tab === 'velocity' && (
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 12 }}>
                  Velocity Chart
                </Text>
                {completedSprints.length === 0 ? (
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>No completed sprints yet</Text>
                ) : (
                  completedSprints.map((sprint) => (
                    <View key={sprint.id} style={styles.velocityRow}>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurface, width: 120 }} numberOfLines={1}>{sprint.name}</Text>
                      <View style={styles.velocityBar}>
                        <View
                          style={[styles.velocityFill, {
                            backgroundColor: theme.colors.primary,
                            width: `${Math.min(100, ((sprint.velocity || 0) / (avgVelocity * 2 || 1)) * 100)}%`
                          }]}
                        />
                      </View>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, width: 40, textAlign: 'right' }}>
                        {sprint.velocity || 0}pt
                      </Text>
                    </View>
                  ))
                )}
              </Card.Content>
            </Card>
          )}

          {tab === 'time' && (
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 12 }}>
                  Time Tracking
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Select a project and date range to view time tracking data.
                </Text>
              </Card.Content>
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { margin: 16 },
  loading: { marginTop: 48 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 },
  statBlock: { flex: 1, minWidth: '45%', padding: 16, borderRadius: 12, alignItems: 'center' },
  card: { margin: 16, marginTop: 0, borderRadius: 12 },
  sprintRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
  velocityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  velocityBar: { flex: 1, height: 16, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 8, overflow: 'hidden' },
  velocityFill: { height: '100%', borderRadius: 8 },
});

export default ReportsScreen;
