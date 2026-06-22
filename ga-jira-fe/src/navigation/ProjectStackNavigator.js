import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';
import ProjectDetailScreen from '../screens/projects/ProjectDetailScreen';
import BoardScreen from '../screens/projects/BoardScreen';
import BacklogScreen from '../screens/projects/BacklogScreen';
import ProjectSettingsScreen from '../screens/projects/ProjectSettingsScreen';
import IssueDetailScreen from '../screens/issues/IssueDetailScreen';
import CreateIssueScreen from '../screens/issues/CreateIssueScreen';
import IssueListScreen from '../screens/issues/IssueListScreen';
import SprintScreen from '../screens/sprints/SprintScreen';
import EpicsScreen from '../screens/epics/EpicsScreen';
import TimelineScreen from '../screens/projects/TimelineScreen.web';
import RoadmapScreen from '../screens/projects/RoadmapScreen';
import CalendarScreen from '../screens/projects/CalendarScreen';
import BrandLogo from '../components/common/BrandLogo';

const Stack = createStackNavigator();

const GAHeader = ({ tintColor, theme }) => (
  <View style={styles.headerBrand}>
    <BrandLogo variant="mark" width={34} height={34} />
    <Text style={[styles.headerTitle, { color: theme.colors.primary }]}>GA Tracker</Text>
  </View>
);

const ProjectStackNavigator = () => {
  const theme = useTheme();

  const screenOptions = {
    headerShown: true,
    headerStyle: {
      backgroundColor: theme.colors.surface,
      elevation: 2,
      shadowOpacity: 0.08,
      borderBottomColor: theme.colors.outlineVariant,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTintColor: theme.colors.onSurface,
    headerTitle: () => <GAHeader theme={theme} />,
    headerBackTitleVisible: false,
    headerTitleAlign: 'left',
  };

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ProjectDetail"    component={ProjectDetailScreen} />
      <Stack.Screen name="Board"            component={BoardScreen} />
      <Stack.Screen name="Backlog"          component={BacklogScreen} />
      <Stack.Screen name="Sprint"           component={SprintScreen} />
      <Stack.Screen name="Epics"            component={EpicsScreen} />
      <Stack.Screen name="ProjectSettings"  component={ProjectSettingsScreen} />
      <Stack.Screen name="IssueDetail"      component={IssueDetailScreen} />
      <Stack.Screen name="CreateIssue"      component={CreateIssueScreen} />
      <Stack.Screen name="IssueList"        component={IssueListScreen} />
      <Stack.Screen name="Timeline"         component={TimelineScreen} />
      <Stack.Screen name="Roadmap"          component={RoadmapScreen} />
      <Stack.Screen name="Calendar"         component={CalendarScreen} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
  },
});

export default ProjectStackNavigator;
