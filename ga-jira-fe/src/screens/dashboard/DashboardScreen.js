import React, { useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  ProgressBar,
  useTheme,
  Surface,
  Chip,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/authSlice';
import { useGetDashboardMetricsQuery } from '../../api/reportApi';
import { useGetActiveSprintQuery } from '../../api/sprintApi';
import { useGetIssuesQuery } from '../../api/issueApi';
import { useGetProjectsQuery } from '../../api/projectApi';
import MetricCard from '../../components/dashboard/MetricCard';
import ActivityFeed from '../../components/dashboard/ActivityFeed';
import IssueCard from '../../components/issues/IssueCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import EmptyState from '../../components/common/EmptyState';
import { formatDate, getSprintProgress, getDaysRemaining } from '../../utils/dateUtils';
import colors from '../../theme/colors';
import BrandLogo from '../../components/common/BrandLogo';

const DashboardScreen = ({ navigation }) => {
  const theme = useTheme();
  const user = useSelector(selectUser);

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useGetDashboardMetricsQuery();
  const { data: projectsData, isLoading: projectsLoading } = useGetProjectsQuery({ limit: 3 });
  const { data: myIssues, isLoading: issuesLoading, refetch: refetchIssues } = useGetIssuesQuery({
    assigneeId: user?.id,
    limit: 5,
  });

  const isLoading = metricsLoading || projectsLoading || issuesLoading;
  const isRefreshing = false;

  const handleRefresh = useCallback(() => {
    refetchMetrics();
    refetchIssues();
  }, [refetchMetrics, refetchIssues]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (isLoading && !metrics) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  const recentProjects = projectsData?.data?.data || [];
  const myTasksList = myIssues?.data?.data || [];
  const dashMetrics = metrics?.data;
  const recentActivity = dashMetrics?.recentActivity || [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[theme.colors.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {greeting()},
          </Text>
          <Text variant="headlineSmall" style={[styles.userName, { color: theme.colors.onSurface }]}>
            {user?.firstName || 'User'}
          </Text>
        </View>
        <View style={[styles.orgMark, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
          <BrandLogo variant="mark" width={40} height={40} />
        </View>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <MetricCard
          title="My Tasks"
          value={dashMetrics?.myTasks || 0}
          icon="clipboard-check"
          color={colors.primary}
          subtitle="active"
          onPress={() => navigation.navigate('ProjectStack', { screen: 'IssueList' })}
          style={styles.metricCard}
        />
        <MetricCard
          title="In Progress"
          value={dashMetrics?.inProgress || 0}
          icon="progress-clock"
          color={colors.warning}
          subtitle="this sprint"
          style={styles.metricCard}
        />
      </View>
      <View style={styles.metricsRow}>
        <MetricCard
          title="Completed"
          value={dashMetrics?.completedToday || 0}
          icon="check-circle"
          color={colors.success}
          subtitle="today"
          style={styles.metricCard}
        />
        <MetricCard
          title="Overdue"
          value={dashMetrics?.overdue || 0}
          icon="alert-circle"
          color={colors.danger}
          subtitle="items"
          style={styles.metricCard}
        />
      </View>

      {/* Active Sprint */}
      {recentProjects.length > 0 && recentProjects[0] && (
        <SprintProgressCard
          projectId={recentProjects[0].id}
          theme={theme}
          navigation={navigation}
        />
      )}

      {/* My Tasks */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            My Tasks
          </Text>
          <Button
            compact
            mode="text"
            onPress={() => navigation.navigate('ProjectStack', { screen: 'IssueList' })}
          >
            View All
          </Button>
        </View>

        {myTasksList.length === 0 ? (
          <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={1}>
            <EmptyState
              icon="clipboard-check-outline"
              title="No active tasks"
              description="You're all caught up!"
              style={styles.emptyState}
            />
          </Surface>
        ) : (
          <View style={styles.issueList}>
            {myTasksList.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onPress={() =>
                  navigation.navigate('ProjectStack', {
                    screen: 'IssueDetail',
                    params: { issueId: issue.id },
                  })
                }
              />
            ))}
          </View>
        )}
      </View>

      {/* Recent Projects */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Recent Projects
          </Text>
          <Button
            compact
            mode="text"
            onPress={() => navigation.navigate('Projects')}
          >
            View All
          </Button>
        </View>
        <View style={styles.projectList}>
          {recentProjects.map((project) => (
            <Card
              key={project.id}
              style={[styles.projectCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
              onPress={() =>
                navigation.navigate('ProjectStack', {
                  screen: 'ProjectDetail',
                  params: { projectId: project.id },
                })
              }
            >
              <Card.Content style={styles.projectCardContent}>
                <View style={[styles.projectAvatar, { backgroundColor: project.color || colors.primary }]}>
                  <Text style={styles.projectAvatarText}>{project.key?.substring(0, 2)}</Text>
                </View>
                <View style={styles.projectInfo}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                    {project.name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {project.issueCount || 0} issues
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
              </Card.Content>
            </Card>
          ))}
          {recentProjects.length === 0 && (
            <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={1}>
              <EmptyState
                icon="folder-outline"
                title="No projects yet"
                description="Projects will appear here once created"
                style={styles.emptyState}
              />
            </Surface>
          )}
        </View>
      </View>

      {/* Recent Activity */}
      <View style={[styles.section, styles.lastSection]}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Recent Activity
        </Text>
        <Surface style={[styles.activityCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={1}>
          <ActivityFeed activities={recentActivity} />
        </Surface>
      </View>
    </ScrollView>
  );
};

const SprintProgressCard = ({ projectId, theme, navigation }) => {
  const { data: sprint } = useGetActiveSprintQuery(projectId, { skip: !projectId });

  const sprintData = sprint?.data;
  if (!sprintData) return null;

  const daysLeft = getDaysRemaining(sprintData.endDate);
  const completedIssues = sprintData.issues?.filter(i => i.status?.category === 'done' || i.status?.name?.toLowerCase() === 'done').length || 0;
  const totalIssues = sprintData.issues?.length || 0;
  const progress = totalIssues > 0 ? completedIssues / totalIssues : 0;

  return (
    <View style={styles.section}>
      <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        Active Sprint
      </Text>
      <Card
        style={[styles.sprintCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
        onPress={() =>
          navigation.navigate('ProjectStack', {
            screen: 'Sprint',
            params: { projectId },
          })
        }
      >
        <Card.Content>
          <View style={styles.sprintHeader}>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
              {sprintData.name}
            </Text>
            <Chip compact style={{ backgroundColor: colors.primary + '20' }}>
              <Text style={{ color: colors.primary, fontSize: 11 }}>
                {daysLeft !== null ? (daysLeft >= 0 ? `${daysLeft}d left` : 'Overdue') : ''}
              </Text>
            </Chip>
          </View>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
            {formatDate(sprintData.startDate)} - {formatDate(sprintData.endDate)}
          </Text>
          <ProgressBar
            progress={progress}
            color={colors.primary}
            style={styles.progressBar}
          />
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            {completedIssues} of {totalIssues} issues completed
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userName: { fontWeight: '700' },
  orgMark: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metricCard: { flex: 1 },
  section: { marginBottom: 24 },
  lastSection: { marginBottom: 8 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontWeight: '700' },
  issueList: { gap: 8 },
  projectList: { gap: 8 },
  projectCard: { borderRadius: 8, borderWidth: 1 },
  projectCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  projectAvatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectAvatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  projectInfo: { flex: 1 },
  sprintCard: { borderRadius: 8, borderWidth: 1 },
  sprintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressBar: { height: 8, borderRadius: 4 },
  activityCard: { borderRadius: 8, padding: 16, borderWidth: 1 },
  emptyCard: { borderRadius: 8, borderWidth: 1 },
  emptyState: { paddingVertical: 24 },
});

export default DashboardScreen;
