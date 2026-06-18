import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import {
  Text, Surface, useTheme, ProgressBar, Chip, Button, Divider, Card,
  Dialog, Portal, TextInput,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetProjectQuery, useGetProjectMembersQuery } from '../../api/projectApi';
import { useGetSprintsQuery, useGetActiveSprintQuery, useCreateSprintMutation } from '../../api/sprintApi';
import { useGetProjectIssuesQuery, useGetIssuesQuery, useMoveIssuesToSprintMutation } from '../../api/issueApi';
import LoadingScreen from '../../components/common/LoadingScreen';
import Avatar from '../../components/common/Avatar';
import { formatDate, getSprintProgress, getDaysRemaining } from '../../utils/dateUtils';
import { ROLE_LABELS } from '../../constants';
import colors from '../../theme/colors';

const Toast = ({ message, isError, onDone }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2800),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDone?.());
  }, []);
  return (
    <Animated.View style={[toastS.wrap, { opacity, backgroundColor: isError ? '#DC2626' : '#16A34A' }]}>
      <MaterialCommunityIcons name={isError ? 'alert-circle' : 'check-circle'} size={16} color="#fff" />
      <Text style={toastS.text}>{message}</Text>
    </Animated.View>
  );
};
const toastS = StyleSheet.create({
  wrap: { position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, zIndex: 999, maxWidth: 400 },
  text: { color: '#fff', fontWeight: '600', fontSize: 14 },
});

const TAB_OVERVIEW = 'overview';
const TAB_BOARD = 'board';
const TAB_BACKLOG = 'backlog';
const TAB_SPRINTS = 'sprints';
const TAB_MEMBERS = 'members';

const SPRINT_STATUS_COLOR = {
  active: { bg: '#DBEAFE', text: '#1D4ED8' },
  future: { bg: '#F3F4F6', text: '#6B7280' },
  completed: { bg: '#D1FAE5', text: '#065F46' },
};

const ProjectDetailScreen = ({ route, navigation }) => {
  const { projectId } = route.params;
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(TAB_OVERVIEW);
  const [sprintDialog, setSprintDialog] = useState(false);
  const [sprintName, setSprintName] = useState('');
  const [sprintGoal, setSprintGoal] = useState('');
  const [addIssuesDialog, setAddIssuesDialog] = useState(null); // sprintId
  const [selectedIssueIds, setSelectedIssueIds] = useState([]);
  const [toast, setToast] = useState(null);
  const showToast = (msg, isError = false) => setToast({ msg, isError });

  const { data: projectResp, isLoading } = useGetProjectQuery(projectId);
  const { data: membersResp } = useGetProjectMembersQuery(projectId);
  const { data: activeSprintResp } = useGetActiveSprintQuery(projectId);
  const { data: sprintsResp, refetch: refetchSprints } = useGetSprintsQuery({ projectId });
  const { data: issuesResp } = useGetProjectIssuesQuery({ projectId, limit: 20 });
  const [createSprint, { isLoading: creatingSprint }] = useCreateSprintMutation();
  const [moveIssuesToSprint, { isLoading: movingIssues }] = useMoveIssuesToSprintMutation();
  const { data: backlogResp } = useGetIssuesQuery({ projectId, noSprint: 'true', limit: 200 });
  const backlogIssues = backlogResp?.data?.data || [];

  const handleAddIssuesToSprint = async () => {
    if (!selectedIssueIds.length || !addIssuesDialog) return;
    try {
      await moveIssuesToSprint({ issueIds: selectedIssueIds, sprintId: addIssuesDialog }).unwrap();
      setAddIssuesDialog(null);
      setSelectedIssueIds([]);
      refetchSprints();
      showToast(`${selectedIssueIds.length} issue(s) added to sprint`);
    } catch (err) {
      showToast(err?.data?.message || 'Failed to move issues', true);
    }
  };

  const toggleIssue = (id) =>
    setSelectedIssueIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleCreateSprint = async () => {
    if (!sprintName.trim()) return;
    try {
      await createSprint({ projectId, name: sprintName.trim(), goal: sprintGoal.trim() || undefined }).unwrap();
      setSprintDialog(false);
      setSprintName('');
      setSprintGoal('');
      refetchSprints();
      showToast('Sprint created successfully');
    } catch (err) {
      showToast(err?.data?.message || 'Failed to create sprint', true);
    }
  };

  if (isLoading) return <LoadingScreen />;
  const project = projectResp?.data;
  if (!project) return null;

  const members = membersResp?.data || [];
  const activeSprint = activeSprintResp?.data;
  const sprintsList = sprintsResp?.data?.data || [];
  const issuesList = issuesResp?.data?.data || [];

  const sprintProgress = activeSprint ? getSprintProgress(activeSprint.startDate, activeSprint.endDate) : 0;
  const daysLeft = activeSprint ? getDaysRemaining(activeSprint.endDate) : null;
  const completedIssues = activeSprint?.issues?.filter(i => i.status?.category === 'done').length || 0;

  const issuesByStatus = issuesList.reduce((acc, issue) => {
    const name = issue.status?.name || 'Unknown';
    if (!acc[name]) acc[name] = { count: 0, color: issue.status?.color || '#6B7280' };
    acc[name].count++;
    return acc;
  }, {});

  const tabs = [TAB_OVERVIEW, TAB_BOARD, TAB_BACKLOG, TAB_SPRINTS, TAB_MEMBERS];
  const tabLabels = { overview: 'Overview', board: 'Board', backlog: 'Backlog', sprints: 'Sprints', members: 'Members' };
  const tabIcons = { overview: 'view-dashboard-outline', board: 'view-column-outline', backlog: 'format-list-bulleted', sprints: 'lightning-bolt-outline', members: 'account-group-outline' };

  const handleTabPress = (tab) => {
    if (tab === TAB_BOARD) { navigation.navigate('Board', { projectId }); return; }
    if (tab === TAB_BACKLOG) { navigation.navigate('Backlog', { projectId }); return; }
    setActiveTab(tab);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>

      {/* Project top bar */}
      <Surface style={[styles.topBar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]} elevation={0}>
        <View style={[styles.projectAvatarBig, { backgroundColor: project.color || colors.primary }]}>
          <Text style={styles.projectAvatarText}>{project.key?.substring(0, 2)}</Text>
        </View>
        <View style={styles.projectMeta}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>{project.name}</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{project.key} · {project.type || 'Software'}</Text>
        </View>
        <View style={styles.topBarRight}>
          <Button
            icon="plus"
            mode="contained"
            compact
            onPress={() => navigation.navigate('CreateIssue', { projectId })}
            style={styles.createBtn}
          >
            Create Issue
          </Button>
          <TouchableOpacity
            onPress={() => navigation.navigate('ProjectSettings', { projectId })}
            style={[styles.settingsBtn, { backgroundColor: theme.colors.surfaceVariant }]}
          >
            <MaterialCommunityIcons name="cog-outline" size={18} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </Surface>

      {/* Tab nav */}
      <View style={[styles.tabNav, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => handleTabPress(tab)}
            style={[styles.tabItem, activeTab === tab && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
          >
            <MaterialCommunityIcons
              name={tabIcons[tab]}
              size={15}
              color={activeTab === tab ? theme.colors.primary : theme.colors.onSurfaceVariant}
              style={{ marginRight: 6 }}
            />
            <Text
              variant="labelLarge"
              style={{ color: activeTab === tab ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: activeTab === tab ? '700' : '500' }}
            >
              {tabLabels[tab]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>

        {/* ── OVERVIEW ── */}
        {activeTab === TAB_OVERVIEW && (
          <View style={styles.overviewGrid}>

            {/* Left column */}
            <View style={styles.leftCol}>

              {/* Active sprint */}
              {activeSprint ? (
                <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                  <View style={styles.cardHeader}>
                    <Text variant="titleSmall" style={styles.cardTitle}>Active Sprint</Text>
                    <Chip compact style={{ backgroundColor: '#DBEAFE' }} textStyle={{ color: '#1D4ED8', fontSize: 11 }}>
                      {daysLeft !== null ? (daysLeft >= 0 ? `${daysLeft}d left` : 'Overdue') : 'Active'}
                    </Chip>
                  </View>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600', marginBottom: 2 }}>
                    {activeSprint.name}
                  </Text>
                  {!!activeSprint.goal && (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12, fontStyle: 'italic' }}>
                      {activeSprint.goal}
                    </Text>
                  )}
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 10 }}>
                    {formatDate(activeSprint.startDate)} → {formatDate(activeSprint.endDate)}
                  </Text>
                  <ProgressBar progress={sprintProgress / 100} color={colors.primary} style={styles.progressBar} />
                  <View style={styles.sprintStats}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {completedIssues} / {activeSprint.issues?.length || 0} issues done
                    </Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                      {sprintProgress}%
                    </Text>
                  </View>
                  <Button mode="outlined" compact onPress={() => navigation.navigate('Sprint', { projectId })} style={{ marginTop: 12, alignSelf: 'flex-start' }}>
                    View Sprint Board
                  </Button>
                </Surface>
              ) : (
                <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                  <Text variant="titleSmall" style={styles.cardTitle}>Sprint</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                    No active sprint. Start a sprint to begin tracking progress.
                  </Text>
                  <Button mode="outlined" compact icon="plus" onPress={() => { setActiveTab(TAB_SPRINTS); setSprintDialog(true); }}>
                    Create Sprint
                  </Button>
                </Surface>
              )}

              {/* Issue Distribution */}
              <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                <View style={styles.cardHeader}>
                  <Text variant="titleSmall" style={styles.cardTitle}>Issue Distribution</Text>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{issuesList.length} total</Text>
                </View>
                {Object.entries(issuesByStatus).length === 0 ? (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>No issues yet</Text>
                ) : (
                  Object.entries(issuesByStatus).map(([name, { count, color: statusColor }]) => (
                    <View key={name} style={styles.distRow}>
                      <View style={[styles.distDot, { backgroundColor: statusColor }]} />
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurface, flex: 1 }}>{name}</Text>
                      <View style={styles.distBarWrap}>
                        <View style={[styles.distBarFill, {
                          width: `${Math.max(4, (count / Math.max(issuesList.length, 1)) * 100)}%`,
                          backgroundColor: statusColor,
                        }]} />
                      </View>
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, width: 28, textAlign: 'right' }}>{count}</Text>
                    </View>
                  ))
                )}
              </Surface>
            </View>

            {/* Right column */}
            <View style={styles.rightCol}>
              {/* Description */}
              {!!project.description && (
                <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                  <Text variant="titleSmall" style={styles.cardTitle}>About</Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 22 }}>
                    {project.description}
                  </Text>
                </Surface>
              )}

              {/* Team */}
              <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                <View style={styles.cardHeader}>
                  <Text variant="titleSmall" style={styles.cardTitle}>Team ({members.length})</Text>
                  <Button compact mode="text" onPress={() => setActiveTab(TAB_MEMBERS)}>View All</Button>
                </View>
                <View style={styles.memberGrid}>
                  {members.slice(0, 6).map((member) => (
                    <View key={member.id} style={styles.memberItem}>
                      <Avatar user={member.user} size={36} />
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurface, marginTop: 4, textAlign: 'center' }} numberOfLines={1}>
                        {member.user?.firstName}
                      </Text>
                    </View>
                  ))}
                  {members.length > 6 && (
                    <View style={styles.memberItem}>
                      <View style={[styles.moreMembersCircle, { backgroundColor: theme.colors.surfaceVariant }]}>
                        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>+{members.length - 6}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </Surface>

              {/* Project info */}
              <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                <Text variant="titleSmall" style={styles.cardTitle}>Project Info</Text>
                <InfoRow label="Key" value={project.key} theme={theme} />
                <InfoRow label="Type" value={project.type || 'Software'} theme={theme} />
                <InfoRow label="Status" value={project.status || 'Active'} theme={theme} />
                {!!project.startDate && <InfoRow label="Start" value={formatDate(project.startDate)} theme={theme} />}
                {!!project.endDate && <InfoRow label="End" value={formatDate(project.endDate)} theme={theme} />}
              </Surface>
            </View>
          </View>
        )}

        {/* ── SPRINTS ── */}
        {activeTab === TAB_SPRINTS && (
          <View style={styles.tabContent}>
            <View style={styles.tabContentHeader}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>Sprints</Text>
              <Button mode="contained" icon="plus" compact onPress={() => setSprintDialog(true)}>
                Create Sprint
              </Button>
            </View>
            {sprintsList.length === 0 ? (
              <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                <MaterialCommunityIcons name="lightning-bolt-outline" size={40} color={theme.colors.onSurfaceVariant} style={{ marginBottom: 8 }} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>No sprints yet</Text>
              </Surface>
            ) : (
              <View style={styles.sprintList}>
                {sprintsList.map((sprint) => {
                  const sc = SPRINT_STATUS_COLOR[sprint.status] || SPRINT_STATUS_COLOR.future;
                  return (
                    <Card
                      key={sprint.id}
                      style={[styles.sprintCard, { backgroundColor: theme.colors.surface }]}
                      onPress={() => navigation.navigate('Sprint', { sprintId: sprint.id, projectId })}
                    >
                      <Card.Content style={styles.sprintCardContent}>
                        <View style={styles.sprintCardLeft}>
                          <View style={styles.sprintCardTitle}>
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>{sprint.name}</Text>
                            <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                              <Text variant="labelSmall" style={{ color: sc.text, textTransform: 'capitalize' }}>{sprint.status}</Text>
                            </View>
                          </View>
                          {!!sprint.goal && (
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>{sprint.goal}</Text>
                          )}
                          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                            {formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}
                          </Text>
                        </View>
                        <View style={styles.sprintCardRight}>
                          <Text variant="labelLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                            {sprint.issues?.length || 0}
                          </Text>
                          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>issues</Text>
                          <Button
                            compact
                            mode="text"
                            icon="plus"
                            textColor={theme.colors.primary}
                            onPress={() => { setAddIssuesDialog(sprint.id); setSelectedIssueIds([]); }}
                            style={{ marginTop: 4 }}
                          >
                            Add Issues
                          </Button>
                        </View>
                      </Card.Content>
                    </Card>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ── MEMBERS ── */}
        {activeTab === TAB_MEMBERS && (
          <View style={styles.tabContent}>
            <Text variant="titleMedium" style={[styles.tabContentHeading, { color: theme.colors.onSurface }]}>
              Team Members ({members.length})
            </Text>
            <View style={styles.membersTable}>
              <View style={[styles.tableHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text variant="labelSmall" style={[styles.tableHeaderCell, { flex: 2, color: theme.colors.onSurfaceVariant }]}>Member</Text>
                <Text variant="labelSmall" style={[styles.tableHeaderCell, { flex: 2, color: theme.colors.onSurfaceVariant }]}>Email</Text>
                <Text variant="labelSmall" style={[styles.tableHeaderCell, { flex: 1, color: theme.colors.onSurfaceVariant }]}>Role</Text>
              </View>
              {members.map((member, idx) => (
                <View
                  key={member.id}
                  style={[styles.tableRow, { backgroundColor: idx % 2 === 0 ? theme.colors.surface : theme.colors.background, borderBottomColor: theme.colors.outlineVariant }]}
                >
                  <View style={[styles.tableCell, { flex: 2 }]}>
                    <Avatar user={member.user} size={32} />
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurface, marginLeft: 10, fontWeight: '500' }}>
                      {member.user ? `${member.user.firstName} ${member.user.lastName || ''}`.trim() : '—'}
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={[styles.tableCellText, { flex: 2, color: theme.colors.onSurfaceVariant }]}>
                    {member.user?.email || '—'}
                  </Text>
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <View style={[styles.roleBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                      <Text variant="labelSmall" style={{ color: theme.colors.primary, textTransform: 'capitalize' }}>
                        {ROLE_LABELS[member.role] || member.role}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Create Sprint Dialog */}
      <Portal>
        <Dialog visible={sprintDialog} onDismiss={() => setSprintDialog(false)} style={{ maxWidth: 480, alignSelf: 'center', width: '100%' }}>
          <Dialog.Title>Create Sprint</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <TextInput label="Sprint name *" value={sprintName} onChangeText={setSprintName} mode="outlined" autoFocus />
            <TextInput label="Sprint goal (optional)" value={sprintGoal} onChangeText={setSprintGoal} mode="outlined" multiline numberOfLines={2} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSprintDialog(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleCreateSprint} loading={creatingSprint} disabled={!sprintName.trim()}>Create</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Add backlog issues to sprint */}
        <Dialog
          visible={!!addIssuesDialog}
          onDismiss={() => setAddIssuesDialog(null)}
          style={{ maxWidth: 560, alignSelf: 'center', width: '100%' }}
        >
          <Dialog.Title>Add Issues to Sprint</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            <ScrollView>
              {backlogIssues.length === 0 ? (
                <Text variant="bodySmall" style={{ padding: 16, color: theme.colors.onSurfaceVariant }}>
                  No backlog issues available. Create issues without a sprint to add them here.
                </Text>
              ) : (
                backlogIssues.map(issue => {
                  const selected = selectedIssueIds.includes(issue.id);
                  return (
                    <TouchableOpacity
                      key={issue.id}
                      onPress={() => toggleIssue(issue.id)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
                        backgroundColor: selected ? theme.colors.primaryContainer : 'transparent',
                        borderRadius: 8, marginHorizontal: 4, marginBottom: 2,
                      }}
                    >
                      <View style={{
                        width: 20, height: 20, borderRadius: 4, borderWidth: 2,
                        borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
                        backgroundColor: selected ? theme.colors.primary : 'transparent',
                        justifyContent: 'center', alignItems: 'center',
                      }}>
                        {selected && <MaterialCommunityIcons name="check" size={12} color="#fff" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: selected ? '600' : '400' }} numberOfLines={1}>
                          {issue.title}
                        </Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {issue.key} · {issue.type} · {issue.priority || 'medium'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setAddIssuesDialog(null)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleAddIssuesToSprint}
              loading={movingIssues}
              disabled={selectedIssueIds.length === 0 || movingIssues}
            >
              Add {selectedIssueIds.length > 0 ? `(${selectedIssueIds.length})` : ''} Issues
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {!!toast && <Toast message={toast.msg} isError={toast.isError} onDone={() => setToast(null)} />}
    </View>
  );
};

const InfoRow = ({ label, value, theme }) => (
  <View style={styles.infoRow}>
    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, width: 60 }}>{label}</Text>
    <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '500', flex: 1 }}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 16,
    borderBottomWidth: 1, gap: 14,
  },
  projectAvatarBig: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  projectAvatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  projectMeta: { flex: 1 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  createBtn: { borderRadius: 6 },
  settingsBtn: { padding: 8, borderRadius: 8 },

  tabNav: {
    flexDirection: 'row', paddingHorizontal: 32,
    borderBottomWidth: 1, gap: 4,
  },
  tabItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    marginBottom: -1,
  },

  content: { flex: 1 },
  contentInner: { padding: 32, paddingBottom: 60 },

  overviewGrid: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  leftCol: { flex: 3, gap: 20 },
  rightCol: { flex: 2, gap: 20 },

  card: { borderRadius: 12, padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontWeight: '700', fontSize: 14 },

  progressBar: { height: 8, borderRadius: 4 },
  sprintStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },

  distRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  distDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  distBarWrap: { flex: 1, height: 6, backgroundColor: '#EBECF0', borderRadius: 3, overflow: 'hidden' },
  distBarFill: { height: '100%', borderRadius: 3 },

  memberGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  memberItem: { alignItems: 'center', width: 52 },
  moreMembersCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EBECF0' },

  tabContent: { flex: 1 },
  tabContentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  tabContentHeading: { fontWeight: '700', marginBottom: 20 },

  sprintList: { gap: 12 },
  sprintCard: { borderRadius: 12 },
  sprintCardContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  sprintCardLeft: { flex: 1 },
  sprintCardTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sprintCardRight: { alignItems: 'center', minWidth: 48 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },

  emptyCard: { borderRadius: 12, padding: 48, alignItems: 'center' },

  membersTable: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10 },
  tableHeaderCell: { textTransform: 'uppercase', letterSpacing: 0, fontSize: 11 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  tableCell: { flexDirection: 'row', alignItems: 'center' },
  tableCellText: { paddingVertical: 0 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
});

export default ProjectDetailScreen;
