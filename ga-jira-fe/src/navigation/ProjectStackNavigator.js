import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';
import BrandLogo from '../components/common/BrandLogo';
import ProjectDetailScreen from '../screens/projects/ProjectDetailScreen';
import BoardScreen from '../screens/projects/BoardScreen';
import BacklogScreen from '../screens/projects/BacklogScreen';
import ProjectSettingsScreen from '../screens/projects/ProjectSettingsScreen';
import IssueDetailScreen from '../screens/issues/IssueDetailScreen';
import CreateIssueScreen from '../screens/issues/CreateIssueScreen';
import IssueListScreen from '../screens/issues/IssueListScreen';
import SprintScreen from '../screens/sprints/SprintScreen';
import EpicsScreen from '../screens/epics/EpicsScreen';

const Stack = createStackNavigator();

const ProjectStackNavigator = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomColor: theme.colors.outlineVariant,
          borderBottomWidth: 1,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 16,
        },
        headerRight: () => <BrandLogo variant="mark" width={32} height={32} style={{ marginRight: 12 }} />,
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="ProjectDetail"
        component={ProjectDetailScreen}
        options={{ title: 'Project' }}
      />
      <Stack.Screen
        name="Board"
        component={BoardScreen}
        options={{ title: 'Board' }}
      />
      <Stack.Screen
        name="Backlog"
        component={BacklogScreen}
        options={{ title: 'Backlog' }}
      />
      <Stack.Screen
        name="Sprint"
        component={SprintScreen}
        options={{ title: 'Sprint' }}
      />
      <Stack.Screen
        name="Epics"
        component={EpicsScreen}
        options={{ title: 'Epics' }}
      />
      <Stack.Screen
        name="ProjectSettings"
        component={ProjectSettingsScreen}
        options={{ title: 'Project Settings' }}
      />
      <Stack.Screen
        name="IssueDetail"
        component={IssueDetailScreen}
        options={{ title: 'Issue' }}
      />
      <Stack.Screen
        name="CreateIssue"
        component={CreateIssueScreen}
        options={{ title: 'Create Issue' }}
      />
      <Stack.Screen
        name="IssueList"
        component={IssueListScreen}
        options={{ title: 'Issues' }}
      />
    </Stack.Navigator>
  );
};

export default ProjectStackNavigator;
