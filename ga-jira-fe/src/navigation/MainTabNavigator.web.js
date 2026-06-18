import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme, Divider, Badge } from 'react-native-paper';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ProjectsScreen from '../screens/projects/ProjectsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import TeamScreen from '../screens/team/TeamScreen.web';
import { selectUnreadCount } from '../store/notificationSlice';
import { useAuth } from '../hooks/useAuth';
import BrandLogo from '../components/common/BrandLogo';

const Drawer = createDrawerNavigator();

const NAV_ITEMS = [
  { name: 'Dashboard',     icon: 'view-dashboard-outline', activeIcon: 'view-dashboard',  label: 'Dashboard',     adminOnly: false },
  { name: 'Projects',      icon: 'folder-outline',         activeIcon: 'folder',           label: 'Projects',      adminOnly: false },
  { name: 'Team',          icon: 'account-group-outline',  activeIcon: 'account-group',    label: 'Team',          adminOnly: false },
  { name: 'Notifications', icon: 'bell-outline',           activeIcon: 'bell',             label: 'Notifications', adminOnly: false },
  { name: 'Profile',       icon: 'account-circle-outline', activeIcon: 'account-circle',   label: 'Profile',       adminOnly: false },
];

const WebSidebarContent = ({ state, navigation }) => {
  const theme = useTheme();
  const { logout } = useAuth();
  const unreadCount = useSelector(selectUnreadCount);
  const currentRouteName = state.routes[state.index].name;

  return (
    <View style={[styles.sidebar, { backgroundColor: theme.colors.surface, borderRightColor: theme.colors.outline }]}>
      <View style={styles.sidebarHeader}>
        <BrandLogo width={176} height={64} />
      </View>

      <Divider />

      <View style={styles.navSection}>
        {NAV_ITEMS.map((item) => {
          const isActive = currentRouteName === item.name;
          return (
            <TouchableOpacity
              key={item.name}
              onPress={() => navigation.navigate(item.name)}
              style={[
                styles.navItem,
                isActive && { backgroundColor: theme.colors.primaryContainer },
              ]}
            >
              <View>
                <MaterialCommunityIcons
                  name={isActive ? item.activeIcon : item.icon}
                  size={20}
                  color={isActive ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
                {item.name === 'Notifications' && unreadCount > 0 && (
                  <Badge size={14} style={styles.navBadge}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </View>
              <Text
                variant="bodyMedium"
                style={[
                  styles.navLabel,
                  { color: isActive ? theme.colors.primary : theme.colors.onSurfaceVariant },
                  isActive && { fontWeight: '600' },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.sidebarFooter}>
        <Divider style={{ marginBottom: 8 }} />
        <TouchableOpacity style={styles.navItem} onPress={logout}>
          <MaterialCommunityIcons name="logout-variant" size={20} color={theme.colors.error} />
          <Text variant="bodyMedium" style={[styles.navLabel, { color: theme.colors.error }]}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const MainTabNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <WebSidebarContent {...props} />}
      screenOptions={{
        drawerType: 'permanent',
        drawerStyle: { width: 248 },
        headerShown: false,
        overlayColor: 'transparent',
      }}
    >
      <Drawer.Screen name="Dashboard"     component={DashboardScreen} />
      <Drawer.Screen name="Projects"      component={ProjectsScreen} />
      <Drawer.Screen name="Team"          component={TeamScreen} />
      <Drawer.Screen name="Notifications" component={NotificationsScreen} />
      <Drawer.Screen name="Profile"       component={ProfileScreen} />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
  },
  sidebarHeader: {
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  navSection: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 12,
  },
  navLabel: {
    flex: 1,
  },
  navBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
  },
  sidebarFooter: {
    paddingHorizontal: 8,
  },
});

export default MainTabNavigator;
