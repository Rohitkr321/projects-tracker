import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  ProgressBar,
  Chip,
  Button,
  Divider,
  Card,
  FAB,
  Dialog,
  Portal,
  TextInput,
  IconButton,
} from 'react-native-paper';
import { useGetProjectQuery, useGetProjectMembersQuery } from '../../api/projectApi';
import { useGetSprintsQuery, useGetActiveSprintQuery, useCreateSprintMutation } from '../../api/sprintApi';
import { useGetProjectIssuesQuery } from '../../api/issueApi';
import LoadingScreen from '../../components/common/LoadingScreen';
import Avatar from '../../components/common/Avatar';
import { formatDate, getSprintProgress, getDaysRemaining } from '../../utils/dateUtils';
import colors from '../../theme/colors';

const TAB_OVERVIEW = 'overview';
const TAB_BOARD = 'board';
const TAB_BACKLOG = 'backlog';
const TAB_SPRINTS = 'sprints';
const TAB_ROADMAP = 'roadmap';
const TAB_CALENDAR = 'calendar';
const TAB_MEMBERS = 'members';

const ProjectDetailScreen = ({ route, navigation }) => {
  const { projectId } = route.params;
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(TAB_OVERVIEW);
  const [sprintDialog, setSprintDialog] = useState(false);
  const [sprintName, setSprintName] = useState('');
  const [sprintGoal, setSprintGoal] = useState('');

  const { data: projectResp, isLoading } = useGetProjectQuery(projectId);
  const { data: membersResp } = useGetProjectMembersQuery(projectId);
  const { data: activeSprintResp } = useGetActiveSprintQuery(projectId);
  const { data: sprintsResp, refetch: refetchSprints } = useGetSprintsQuery({ projectId });
  const { data: issuesResp } = useGetProjectIssuesQuery({ projectId, limit: 5 });
  const [createSprint, { isLoading: creatingSprint }] = useCreateSprintMutation();

  const handleCreateSprint = async () => {
    if (!sprintName.trim()) return;
    try {
      await createSprint({ projectId, name: sprintName.trim(), goal: sprintGoal.trim() || undefined }).unwrap();
      setSprintDialog(false);
      setSprintName('');
      setSprintGoal('');
      refetchSprints();
    } catch (err) {
      Alert.alert('Error', err?.data?.message || 'Failed to create sprint');
    }
  };

  if (isLoading) return <LoadingScreen />;

  const project = projectResp?.data;
  if (!project) return null;

  const members = membersResp?.data || [];
  const activeSprint = activeSprintResp?.data;
  const sprintsList = sprintsResp?.data?.data || [];
  const issuesList = issuesResp?.data?.data || [];

  const tabs = [TAB_OVERVIEW, TAB_BOARD, TAB_BACKLOG, TAB_SPRINTS, TAB_ROADMAP, TAB_CALENDAR, TAB_MEMBERS];
  const tabLabels = { overview: 'Overview', board: 'Board', backlog: 'Backlog', sprints: 'Sprints', roadmap: 'Roadmap', calendar: 'Calendar', members: 'Members' };

  const sprintProgress = activeSprint
    ? getSprintProgress(activeSprint.startDate, activeSprint.endDate)
    : 0;
  const daysLeft = activeSprint ? getDaysRemaining(activeSprint.endDate) : null;

  const issuesByStatus = issuesList.reduce((acc, issue) => {
    const statusName = issue.status?.name || 'Unknown';
    if (!acc[statusName]) acc[statusName] = { count: 0, color: issue.status?.color };
    acc[statusName].count++;
    return acc;
  }, {});

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Project Header */}
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <View style={styles.projectTitle}>
          <View style={[styles.projectAvatar, { backgroundColor: project.color || colors.primary }]}>
            <Text style={styles.projectAvatarText}>{project.key?.substring(0, 2)}</Text>
          </View>
          <View>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              {project.name}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {project.key} • {project.type || 'Software'}
            </Text>
          </View>
        </View>
        <IconButton
          icon="cog-outline"
          size={22}
          iconColor={theme.colors.onSurfaceVariant}
          onPress={() => navigation.navigate('ProjectSettings', { projectId })}
        />
      </Surface>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { backgroundColor: theme.colors.surface }]}
        contentContainerStyle={styles.tabContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => {
              if (tab === TAB_BOARD) {
                navigation.navigate('Board', { projectId });
              } else if (tab === TAB_BACKLOG) {
                navigation.navigate('Backlog', { projectId });
              } else if (tab === TAB_ROADMAP) {
                navigation.navigate('Roadmap', { projectId });
              } else if (tab === TAB_CALENDAR) {
                navigation.navigate('Calendar', { projectId });
              } else {
                setActiveTab(tab);
              }
            }}
            style={[
              styles.tab,
              activeTab === tab && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? theme.colors.primary : theme.colors.onSurfaceVariant },
              ]}
            >
              {tabLabels[tab]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {activeTab === TAB_OVERVIEW && (
          <View style={styles.section}>
            {!!project.description && (
              <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                  Description
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {project.description}
                </Text>
              </Surface>
            )}

            {activeSprint && (
              <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                  Active Sprint
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600', marginBottom: 4 }}>
                  {activeSprint.name}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                  {formatDate(activeSprint.startDate)} - {formatDate(activeSprint.endDate)}
                  {daysLeft !== null && (daysLeft >= 0 ? ` • ${daysLeft} days left` : ' • Overdue')}
                </Text>
                <ProgressBar
                  progress={sprintProgress / 100}
                  color={colors.primary}
                  style={styles.progressBar}
                />
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
                  {sprintProgress}% complete
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('Sprint', { projectId })}
                  style={styles.viewSprintBtn}
                  compact
                >
                  View Sprint Board
                </Button>
              </Surface>
            )}

            <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                Issue Distribution
              </Text>
              {Object.entries(issuesByStatus).map(([statusName, { count, color }]) => (
                <View key={statusName} style={styles.statusRow}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurface, width: 100 }}>
                    {statusName}
                  </Text>
                  <View style={styles.statusBar}>
                    <View
                      style={[
                        styles.statusFill,
                        {
                          width: `${Math.min(100, (count / Math.max(issuesList.length, 1)) * 100)}%`,
                          backgroundColor: color || colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, width: 30, textAlign: 'right' }}>
                    {count}
                  </Text>
                </View>
              ))}
            </Surface>

            <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <View style={styles.memberHeader}>
                <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                  Team ({members.length})
                </Text>
                <Button compact mode="text" onPress={() => setActiveTab(TAB_MEMBERS)}>
                  View All
                </Button>
              </View>
              <View style={styles.memberAvatars}>
                {members.slice(0, 8).map((member) => (
                  <Avatar key={member.id} user={member.user} size={36} />
                ))}
                {members.length > 8 && (
                  <View style={[styles.moreMembers, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      +{members.length - 8}
                    </Text>
                  </View>
                )}
              </View>
            </Surface>
          </View>
        )}

        {activeTab === TAB_SPRINTS && (
          <View style={styles.section}>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => setSprintDialog(true)}
              style={styles.createBtn}
            >
              Create Sprint
            </Button>
            {sprintsList.map((sprint) => (
              <Card
                key={sprint.id}
                style={[styles.sprintCard, { backgroundColor: theme.colors.surface }]}
                onPress={() => navigation.navigate('Sprint', { sprintId: sprint.id })}
              >
                <Card.Content>
                  <View style={styles.sprintCardHeader}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600', flex: 1 }}>
                      {sprint.name}
                    </Text>
                    <Chip
                      compact
                      style={{
                        backgroundColor: sprint.status === 'active' ? colors.primary + '20' :
                          sprint.status === 'completed' ? colors.success + '20' : theme.colors.surfaceVariant,
                      }}
                      textStyle={{
                        color: sprint.status === 'active' ? colors.primary :
                          sprint.status === 'completed' ? colors.success : theme.colors.onSurfaceVariant,
                        fontSize: 11,
                      }}
                    >
                      {sprint.status}
                    </Chip>
                  </View>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                  </Text>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                    {sprint.issues?.length || 0} issues
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}

        {activeTab === TAB_MEMBERS && (
          <View style={styles.section}>
            {members.map((member) => (
              <Surface
                key={member.id}
                style={[styles.memberRow, { backgroundColor: theme.colors.surface }]}
                elevation={1}
              >
                <Avatar user={member.user} size={40} />
                <View style={styles.memberInfo}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                    {member.user ? `${member.user.firstName} ${member.user.lastName || ''}`.trim() : ''}
                  </Text>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {member.user?.email}
                  </Text>
                </View>
                <Chip
                  compact
                  style={{ backgroundColor: theme.colors.surfaceVariant }}
                  textStyle={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}
                >
                  {member.role}
                </Chip>
              </Surface>
            ))}
          </View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('CreateIssue', { projectId })}
        color="#FFFFFF"
      />

      <Portal>
        <Dialog visible={sprintDialog} onDismiss={() => setSprintDialog(false)}>
          <Dialog.Title>Create Sprint</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <TextInput
              label="Sprint name *"
              value={sprintName}
              onChangeText={setSprintName}
              mode="outlined"
              autoFocus
            />
            <TextInput
              label="Sprint goal (optional)"
              value={sprintGoal}
              onChangeText={setSprintGoal}
              mode="outlined"
              multiline
              numberOfLines={2}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSprintDialog(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleCreateSprint} loading={creatingSprint} disabled={!sprintName.trim()}>
              Create
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  projectTitle: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  projectAvatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectAvatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  tabBar: { maxHeight: 48 },
  tabContent: { paddingHorizontal: 16 },
  tab: { paddingVertical: 12, paddingHorizontal: 16, marginRight: 4 },
  tabText: { fontSize: 14, fontWeight: '500' },
  body: { flex: 1 },
  section: { padding: 16, gap: 12 },
  card: { borderRadius: 12, padding: 16 },
  cardTitle: { fontWeight: '700', marginBottom: 12 },
  progressBar: { height: 8, borderRadius: 4 },
  viewSprintBtn: { marginTop: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  statusBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#EBECF0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  statusFill: { height: '100%', borderRadius: 3 },
  memberHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  memberAvatars: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moreMembers: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10 },
  memberInfo: { flex: 1 },
  createBtn: { marginBottom: 12 },
  sprintCard: { borderRadius: 10, marginBottom: 8 },
  sprintCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  fab: { position: 'absolute', bottom: 24, right: 24 },
});

export default ProjectDetailScreen;
