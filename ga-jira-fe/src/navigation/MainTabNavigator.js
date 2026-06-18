import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
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
        headerTitleAlign: 'left',
        headerTitle: () => (
          <View style={styles.headerBrand}>
            <BrandLogo variant="mark" width={34} height={34} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: theme.colors.primary, letterSpacing: -0.3 }}>
              GA Tracker
            </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
  },
});

export default MainTabNavigator;
