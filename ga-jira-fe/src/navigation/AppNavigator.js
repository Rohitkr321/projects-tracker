import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import { selectIsAuthenticated } from '../store/authSlice';
import { setCredentials, setLoading, setDarkMode } from '../store/authSlice';
import { storage } from '../utils/storage';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import ProjectStackNavigator from './ProjectStackNavigator';
import LoadingScreen from '../components/common/LoadingScreen';

const linking = {
  prefixes: ['http://localhost:8081', 'http://localhost:19006', 'https://ga-jira.generalaeronautics.com'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
        },
      },
      Main: {
        screens: {
          Dashboard: 'dashboard',
          Projects: 'projects',
          Notifications: 'notifications',
          Profile: 'profile',
        },
      },
      ProjectStack: {
        screens: {
          ProjectDetail: 'project/:projectId',
          Board: 'project/:projectId/board',
          Backlog: 'project/:projectId/backlog',
          Sprint: 'project/:projectId/sprint',
          Epics: 'project/:projectId/epics',
          ProjectSettings: 'project/:projectId/settings',
          IssueDetail: 'issue/:issueId',
          CreateIssue: 'project/:projectId/create-issue',
          IssueList: 'issues',
        },
      },
    },
  },
};

const Stack = createStackNavigator();

const AppNavigator = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(state => state.auth.isLoading);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const [accessToken, refreshToken, user, savedTheme] = await Promise.all([
          storage.getAccessToken(),
          storage.getRefreshToken(),
          storage.getUser(),
          storage.getTheme(),
        ]);
        if (savedTheme) dispatch(setDarkMode(savedTheme === 'dark'));
        if (accessToken && user) {
          dispatch(setCredentials({ user, accessToken, refreshToken }));
        }
      } catch (error) {
        console.error('Bootstrap error:', error);
      } finally {
        dispatch(setLoading(false));
      }
    };
    bootstrapAsync();
  }, [dispatch]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="ProjectStack" component={ProjectStackNavigator} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
