import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
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

// Every screen in this stack has its own internal header/toolbar,
// so the Stack header is hidden globally to avoid a double bar.
const ProjectStackNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProjectDetail"    component={ProjectDetailScreen} />
    <Stack.Screen name="Board"            component={BoardScreen} />
    <Stack.Screen name="Backlog"          component={BacklogScreen} />
    <Stack.Screen name="Sprint"           component={SprintScreen} />
    <Stack.Screen name="Epics"            component={EpicsScreen} />
    <Stack.Screen name="ProjectSettings"  component={ProjectSettingsScreen} />
    <Stack.Screen name="IssueDetail"      component={IssueDetailScreen} />
    <Stack.Screen name="CreateIssue"      component={CreateIssueScreen} />
    <Stack.Screen name="IssueList"        component={IssueListScreen} />
  </Stack.Navigator>
);

export default ProjectStackNavigator;
