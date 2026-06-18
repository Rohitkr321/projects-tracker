import React, { useState } from 'react';
import { View, FlatList, StyleSheet, ScrollView, Alert, Modal, TouchableOpacity } from 'react-native';
import { Text, useTheme, Card, Button, Chip, ProgressBar, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetSprintsQuery, useStartSprintMutation, useCompleteSprintMutation } from '../../api/sprintApi';
import { useGetIssuesQuery } from '../../api/issueApi';
import { formatDate } from '../../utils/dateUtils';
import IssueRow from '../../components/issues/IssueRow';
import EmptyState from '../../components/common/EmptyState';

const SprintScreen = ({ route, navigation }) => {
  const { projectId } = route.params;
  const theme = useTheme();

  const { data: sprintsData, isLoading, refetch } = useGetSprintsQuery({ projectId });
  const [startSprint]    = useStartSprintMutation();
  const [completeSprint] = useCompleteSprintMutation();

  const sprints         = sprintsData?.data?.data || [];
  const activeSprint    = sprints.find((s) => s.status === 'active');
  const futureSprints   = sprints.filter((s) => s.status === 'future');
  const completedSprints = sprints.filter((s) => s.status === 'completed');

  const { data: issuesData } = useGetIssuesQuery(
    { projectId, sprintId: activeSprint?.id },
    { skip: !activeSprint },
  );
  const sprintIssues = issuesData?.data?.data || [];
  const incompleteIssues = sprintIssues.filter((i) => i.status?.type !== 'done');

  // ── Complete sprint dialog state ───────────────────────────────────────────
  const [completeTarget, setCompleteTarget] = useState(null);
  const [completing, setCompleting] = useState(false);

  const handleStart = async (sprintId) => {
    try { await startSprint({ id: sprintId }).unwrap(); refetch(); }
    catch (e) { Alert.alert('Error', e?.data?.message || 'Failed to start sprint'); }
  };

  const doComplete = async () => {
    if (!completeTarget) return;
    try {
      setCompleting(true);
      await completeSprint({ id: completeTarget.id }).unwrap();
      setCompleteTarget(null);
      refetch();
    } catch (e) {
      Alert.alert('Error', e?.data?.message || 'Failed to complete sprint');
    } finally {
      setCompleting(false);
    }
  };

  if (isLoading) return <View style={styles.loading}><ActivityIndicator size="large" /></View>;

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>

        {/* ── Active Sprint ──────────────────────────────────────────────── */}
        {activeSprint && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <View style={styles.sprintHeader}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Chip compact style={{ backgroundColor: '#10B98120', alignSelf: 'flex-start' }}>
                    <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>ACTIVE</Text>
                  </Chip>
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginTop: 8 }}>
                    {activeSprint.name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {formatDate(activeSprint.startDate)} → {formatDate(activeSprint.endDate)}
                  </Text>
                  {activeSprint.goal && (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                      Goal: {activeSprint.goal}
                    </Text>
                  )}
                </View>
                <Button
                  mode="outlined"
                  compact
                  onPress={() => setCompleteTarget(activeSprint)}
                  style={{ borderColor: '#10B981' }}
                  textColor="#10B981"
                >
                  Complete
                </Button>
              </View>

              <ProgressBar
                progress={(activeSprint.completedPoints || 0) / Math.max(activeSprint.totalPoints || 1, 1)}
                style={{ marginTop: 12, borderRadius: 4 }}
              />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                {activeSprint.completedPoints || 0} / {activeSprint.totalPoints || 0} points
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* ── Sprint Issues ──────────────────────────────────────────────── */}
        {activeSprint && sprintIssues.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700', paddingHorizontal: 16, marginBottom: 8 }}>
              Sprint Issues ({sprintIssues.length})
            </Text>
            {sprintIssues.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                onPress={() => navigation.navigate('IssueDetail', { issueId: issue.id })}
              />
            ))}
          </View>
        )}

        {/* ── Upcoming Sprints ───────────────────────────────────────────── */}
        {futureSprints.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700', paddingHorizontal: 16, marginBottom: 8 }}>
              Upcoming Sprints
            </Text>
            {futureSprints.map((sprint) => (
              <Card key={sprint.id} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                  <View style={styles.sprintHeader}>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>{sprint.name}</Text>
                      {sprint.startDate && (
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}
                        </Text>
                      )}
                    </View>
                    {!activeSprint && (
                      <Button mode="contained" compact onPress={() => handleStart(sprint.id)}>Start</Button>
                    )}
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}

        {/* ── Completed Sprints ──────────────────────────────────────────── */}
        {completedSprints.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700', paddingHorizontal: 16, marginBottom: 8 }}>
              Completed
            </Text>
            {completedSprints.slice(0, 3).map((sprint) => (
              <Card key={sprint.id} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>{sprint.name}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Velocity: {sprint.velocity || 0} pts · Completed {formatDate(sprint.completedAt)}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}

        {sprints.length === 0 && (
          <EmptyState icon="run-fast" title="No sprints yet" description="Create a sprint to start planning" />
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Complete Sprint confirmation modal ────────────────────────────── */}
      <Modal
        visible={!!completeTarget}
        transparent
        animationType="fade"
        onRequestClose={() => !completing && setCompleteTarget(null)}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => !completing && setCompleteTarget(null)}
        />

        {/* Dialog card */}
        <View style={styles.dialogSheet}>
          <View style={[styles.dialogCard, { backgroundColor: theme.colors.surface }]}>

            {/* Header */}
            <View style={styles.dialogHeader}>
              <View style={[styles.dialogIcon, { backgroundColor: '#10B98118' }]}>
                <MaterialCommunityIcons name="flag-checkered" size={22} color="#10B981" />
              </View>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', flex: 1 }}>
                Complete Sprint
              </Text>
            </View>

            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
              Complete <Text style={{ color: theme.colors.onSurface, fontWeight: '600' }}>"{completeTarget?.name}"</Text>?
            </Text>

            {/* Incomplete issues warning */}
            {incompleteIssues.length > 0 && (
              <View style={styles.warningBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#D97706" style={{ marginTop: 1 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.warningTitle, { color: '#92400E' }]}>Incomplete issues</Text>
                  <Text style={[styles.warningBody, { color: '#92400E' }]}>
                    {incompleteIssues.length} issue{incompleteIssues.length !== 1 ? 's' : ''} {incompleteIssues.length !== 1 ? 'are' : 'is'} not done and will move to the backlog.
                  </Text>
                  {/* Show the first 3 incomplete issue titles */}
                  {incompleteIssues.slice(0, 3).map((issue) => (
                    <View key={issue.id} style={styles.warningIssueRow}>
                      <View style={[styles.warningIssueDot, { backgroundColor: issue.status?.color || '#D97706' }]} />
                      <Text style={[styles.warningIssueText, { color: '#92400E' }]} numberOfLines={1}>
                        {issue.key} · {issue.title}
                      </Text>
                    </View>
                  ))}
                  {incompleteIssues.length > 3 && (
                    <Text style={[styles.warningBody, { color: '#B45309', marginTop: 2 }]}>
                      +{incompleteIssues.length - 3} more…
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={styles.dialogActions}>
              <Button
                mode="outlined"
                style={{ flex: 1 }}
                onPress={() => setCompleteTarget(null)}
                disabled={completing}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                style={{ flex: 1, backgroundColor: '#10B981' }}
                onPress={doComplete}
                loading={completing}
                disabled={completing}
              >
                Complete
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { margin: 12, borderRadius: 12 },
  section: { marginBottom: 8 },
  sprintHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },

  // Modal
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  dialogSheet: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  dialogCard: {
    width: '100%', maxWidth: 400, borderRadius: 16, padding: 20,
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
  },
  dialogHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  dialogIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

  // Warning box
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  warningTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  warningBody:  { fontSize: 13, lineHeight: 18 },
  warningIssueRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 6 },
  warningIssueDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  warningIssueText: { fontSize: 12, flex: 1 },

  dialogActions: { flexDirection: 'row', gap: 12 },
});

export default SprintScreen;
