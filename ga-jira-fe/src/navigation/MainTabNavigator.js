import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ProjectsScreen from '../screens/projects/ProjectsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import { selectUnreadCount } from '../store/notificationSlice';
import BrandLogo from '../components/common/BrandLogo';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const theme = useTheme();
  const unreadCount = useSelector(selectUnreadCount);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Dashboard: focused ? 'view-dashboard' : 'view-dashboard-outline',
            Projects: focused ? 'folder' : 'folder-outline',
            Notifications: focused ? 'bell' : 'bell-outline',
            Profile: focused ? 'account' : 'account-outline',
          };
          const iconName = icons[route.name] || 'circle';
          return (
            <View>
              <MaterialCommunityIcons name={iconName} size={size} color={color} />
              {route.name === 'Notifications' && unreadCount > 0 && (
                <Badge
                  size={16}
                  style={styles.badge}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </View>
          );
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 64,
          paddingBottom: 9,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomColor: theme.colors.outlineVariant,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        headerLeft: () => (
          <View style={styles.headerBrand}>
            <BrandLogo variant="mark" width={38} height={38} />
          </View>
        ),
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="Projects"
        component={ProjectsScreen}
        options={{ title: 'Projects' }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  headerBrand: {
    marginLeft: 12,
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
  },
});

export default MainTabNavigator;
