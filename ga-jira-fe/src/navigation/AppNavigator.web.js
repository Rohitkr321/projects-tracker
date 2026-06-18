import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Text, useTheme, Divider, Badge, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { selectIsAuthenticated, setCredentials, setLoading } from '../store/authSlice';
import { selectUnreadCount, markAllAsRead } from '../store/notificationSlice';
import { storage } from '../utils/storage';
import { useAuth } from '../hooks/useAuth';
import { useGetNotificationsQuery, useMarkAllNotificationsReadMutation } from '../api/notificationApi';
import BrandLogo from '../components/common/BrandLogo';

const avatarHue = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) * 37 + ((h << 5) - h);
  return Math.abs(h) % 360;
};

const SCREEN_LABELS = {
  Dashboard:     'Dashboard',
  Projects:      'Projects',
  Team:          'Team Members',
  Notifications: 'Notifications',
  Profile:       'My Profile',
  ProjectStack:  'Projects',
};

const NOTIF_ICONS = {
  sprint_started:   'play-circle-outline',
  sprint_completed: 'check-circle-outline',
  issue_assigned:   'account-check-outline',
  issue_updated:    'pencil-outline',
  comment_added:    'comment-outline',
  mentioned:        'at',
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (diff < 60)   return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
};

// Global top bar — rendered above the drawer (sidebar + content).
// useNavigation() here gives the Stack navigator context, so nested Drawer screens
// must be addressed via navigate('Main', { screen: 'ScreenName' }).
const TopBar = ({ screenName = '' }) => {
  const theme       = useTheme();
  const { user, logout } = useAuth();
  const unreadCount = useSelector(selectUnreadCount);
  const navigation  = useNavigation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);

  const dispatch     = useDispatch();
  const { data: notifData, refetch: refetchNotifs } = useGetNotificationsQuery({ limit: 5 });
  const [markAllReadMutation] = useMarkAllNotificationsReadMutation();
  const markAllRead = () => { dispatch(markAllAsRead()); markAllReadMutation(); };
  const _rawNotifs    = notifData?.data?.data ?? notifData?.data;
  const notifications = Array.isArray(_rawNotifs) ? _rawNotifs : [];

  useEffect(() => { if (notifOpen) refetchNotifs(); }, [notifOpen]);

  const closeAll = () => { setProfileOpen(false); setNotifOpen(false); };
  const goTo     = (screen) => { closeAll(); navigation.navigate(screen); };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  const hue      = avatarHue(user?.email);

  return (
    <View style={[topBarStyles.bar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
      {/* Left: current page title */}
      <View style={topBarStyles.left}>
        {!!screenName && (
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
            {SCREEN_LABELS[screenName] || screenName}
          </Text>
        )}
      </View>

      {/* Right: notifications + profile */}
      <View style={topBarStyles.right}>
        {/* Notification bell */}
        <TouchableOpacity
          style={[topBarStyles.iconBtn, notifOpen && { backgroundColor: theme.colors.primaryContainer }]}
          onPress={() => { setNotifOpen(v => !v); setProfileOpen(false); }}
        >
          <MaterialCommunityIcons
            name={unreadCount > 0 ? 'bell' : 'bell-outline'}
            size={20}
            color={notifOpen ? theme.colors.primary : theme.colors.onSurfaceVariant}
          />
          {unreadCount > 0 && (
            <Badge size={16} style={topBarStyles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</Badge>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={{ width: 1, height: 24, backgroundColor: '#E2E8F0', marginHorizontal: 4 }} />

        {/* Profile button */}
        <TouchableOpacity
          style={[topBarStyles.profileBtn, profileOpen && { backgroundColor: theme.colors.surfaceVariant }]}
          onPress={() => { setProfileOpen(v => !v); setNotifOpen(false); }}
        >
          <View style={[topBarStyles.avatar, { backgroundColor: `hsl(${hue},52%,44%)` }]}>
            <Text style={topBarStyles.avatarText}>{initials || '?'}</Text>
          </View>
          <View style={topBarStyles.profileInfo}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }} numberOfLines={1}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textTransform: 'capitalize' }} numberOfLines={1}>
              {user?.role?.replace(/_/g, ' ')}
            </Text>
          </View>
          <MaterialCommunityIcons name={profileOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      {/* Dropdowns rendered via Portal so they float above all content */}
      {(profileOpen || notifOpen) && (
        <Portal>
          {/* Transparent backdrop — closes any open dropdown on outside tap */}
          <TouchableOpacity style={topBarStyles.backdrop} onPress={closeAll} activeOpacity={1} />

          {/* ── Profile dropdown ── */}
          {profileOpen && (
            <View style={[topBarStyles.profileDropdown, {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
              shadowColor: theme.dark ? '#000' : '#64748B',
            }]}>
              {/* User header */}
              <View style={topBarStyles.dropdownHeader}>
                <View style={[topBarStyles.dropdownAvatar, { backgroundColor: `hsl(${hue},52%,44%)` }]}>
                  <Text style={topBarStyles.dropdownAvatarText}>{initials || '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                    {user?.firstName} {user?.lastName}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                    {user?.email}
                  </Text>
                  <View style={[topBarStyles.roleBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '700', textTransform: 'capitalize' }}>
                      {user?.role?.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>
              </View>

              <Divider />

              <TouchableOpacity style={topBarStyles.dropdownItem} onPress={() => goTo('Profile')}>
                <MaterialCommunityIcons name="account-circle-outline" size={18} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginLeft: 10 }}>View Profile</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.onSurfaceVariant} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>

              <Divider />

              <TouchableOpacity style={topBarStyles.dropdownItem} onPress={() => { closeAll(); logout(); }}>
                <MaterialCommunityIcons name="logout-variant" size={18} color={theme.colors.error} />
                <Text variant="bodyMedium" style={{ color: theme.colors.error, marginLeft: 10 }}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Notification dropdown ── */}
          {notifOpen && (
            <View style={[topBarStyles.notifDropdown, {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
              shadowColor: theme.dark ? '#000' : '#64748B',
            }]}>
              {/* Header */}
              <View style={topBarStyles.notifHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>Notifications</Text>
                  {unreadCount > 0 && (
                    <Badge size={18} style={{ backgroundColor: theme.colors.primary }}>{unreadCount > 9 ? '9+' : unreadCount}</Badge>
                  )}
                </View>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={async () => { await markAllRead(); refetchNotifs(); }}>
                    <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>Mark all read</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Divider />

              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {notifications.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
                    <MaterialCommunityIcons name="bell-off-outline" size={36} color={theme.colors.onSurfaceVariant} />
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>No notifications yet</Text>
                  </View>
                ) : (
                  notifications.map((n) => (
                    <TouchableOpacity
                      key={n.id}
                      style={[topBarStyles.notifItem, !n.isRead && { backgroundColor: theme.colors.primaryContainer + '28' }]}
                      onPress={closeAll}
                    >
                      <View style={[topBarStyles.notifIconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
                        <MaterialCommunityIcons
                          name={NOTIF_ICONS[n.type] || 'bell-outline'}
                          size={15}
                          color={theme.colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text
                            variant="labelMedium"
                            style={{ fontWeight: '600', color: theme.colors.onSurface, flex: 1 }}
                            numberOfLines={1}
                          >
                            {n.title}
                          </Text>
                          {!n.isRead && (
                            <View style={[topBarStyles.unreadDot, { backgroundColor: theme.colors.primary }]} />
                          )}
                        </View>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
                          {n.body}
                        </Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
                          {formatTimeAgo(n.createdAt)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

              <Divider />

              {/* View All footer */}
              <TouchableOpacity style={topBarStyles.notifFooter} onPress={() => goTo('Notifications')}>
                <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                  View All Notifications
                </Text>
                <MaterialCommunityIcons name="arrow-right" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </Portal>
      )}
    </View>
  );
};

const topBarStyles = StyleSheet.create({
  bar: {
    height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, zIndex: 10,
  },
  left:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  right:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn:     { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 16, position: 'relative' },
  badge:       { position: 'absolute', top: 0, right: 0 },
  profileBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  avatar:      { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  avatarText:  { color: '#fff', fontSize: 11, fontWeight: '800' },
  profileInfo: { alignItems: 'flex-start' },
  // Backdrop covers full screen to close dropdowns on outside tap
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 },
  // Profile dropdown
  profileDropdown: {
    position: 'absolute', top: 44, right: 8, width: 248,
    borderRadius: 8, borderWidth: 1,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24,
    elevation: 16, zIndex: 200, overflow: 'hidden',
  },
  dropdownHeader:     { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  dropdownAvatar:     { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  dropdownAvatarText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  roleBadge:          { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  dropdownItem:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16 },
  // Notification dropdown
  notifDropdown: {
    position: 'absolute', top: 44, right: 8, width: 368,
    borderRadius: 8, borderWidth: 1,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24,
    elevation: 16, zIndex: 200, overflow: 'hidden',
  },
  notifHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  notifItem:     { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, gap: 10 },
  notifIconWrap: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 2, flexShrink: 0 },
  unreadDot:     { width: 7, height: 7, borderRadius: 3.5, marginLeft: 6, flexShrink: 0 },
  notifFooter:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13 },
});

import AuthNavigator from './AuthNavigator';
import ProjectStackNavigator from './ProjectStackNavigator';
import NotificationListener from '../components/common/NotificationListener';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ProjectsScreen from '../screens/projects/ProjectsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import TeamScreen from '../screens/team/TeamScreen.web';
import LoadingScreen from '../components/common/LoadingScreen';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// On web the linking config nests ProjectStack inside Main (the Drawer)
const linking = {
  prefixes: [
    'http://localhost:8081',
    'http://localhost:19006',
    'https://ga-jira.generalaeronautics.com',
  ],
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
          Team: 'team',
          Notifications: 'notifications',
          Profile: 'profile',
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
    },
  },
};

// Notifications and Profile are accessed via the top bar — not in the sidebar
const NAV_ITEMS = [
  { name: 'Dashboard', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard', label: 'Dashboard' },
  { name: 'Projects',  icon: 'folder-outline',         activeIcon: 'folder',          label: 'Projects'  },
  { name: 'Team',      icon: 'account-group-outline',  activeIcon: 'account-group',   label: 'Team'      },
];

const TEAM_VISIBLE_ROLES = ['super_admin', 'org_admin', 'project_manager'];

// When inside project/issue screens, keep 'Projects' highlighted in the sidebar
const ROUTE_TO_SIDEBAR_ACTIVE = { ProjectStack: 'Projects' };

const WebSidebarContent = ({ state, navigation }) => {
  const theme = useTheme();
  const { logout, user } = useAuth();
  const rawRoute = state.routes[state.index].name;
  const sidebarActive = ROUTE_TO_SIDEBAR_ACTIVE[rawRoute] || rawRoute;
  const visibleNavItems = NAV_ITEMS.filter(
    item => item.name !== 'Team' || TEAM_VISIBLE_ROLES.includes(user?.role)
  );

  return (
    <View style={[styles.sidebar, { backgroundColor: theme.colors.surface, borderRightColor: theme.colors.outline }]}>
      {/* Brand */}
      <View style={[styles.sidebarBrand, { borderBottomColor: theme.colors.outlineVariant }]}>
        <BrandLogo width={176} height={70} />
      </View>

      {/* Nav items */}
      <View style={styles.navSection}>
        {visibleNavItems.map((item) => {
          const isActive = sidebarActive === item.name;
          return (
            <TouchableOpacity
              key={item.name}
              onPress={() => navigation.navigate(item.name)}
              style={[styles.navItem, isActive && { backgroundColor: theme.colors.primaryContainer }]}
            >
              <MaterialCommunityIcons
                name={isActive ? item.activeIcon : item.icon}
                size={20}
                color={isActive ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
              <Text
                variant="bodyMedium"
                style={[styles.navLabel, { color: isActive ? theme.colors.primary : theme.colors.onSurfaceVariant }, isActive && { fontWeight: '600' }]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sign Out */}
      <View style={styles.sidebarFooter}>
        <Divider style={{ marginBottom: 8 }} />
        <TouchableOpacity style={styles.navItem} onPress={logout}>
          <MaterialCommunityIcons name="logout-variant" size={20} color={theme.colors.error} />
          <Text variant="bodyMedium" style={[styles.navLabel, { color: theme.colors.error }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Permanent sidebar drawer that wraps all authenticated screens including ProjectStack.
// This means the sidebar stays visible even when navigating to project/issue detail screens.
const MainWebDrawer = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <WebSidebarContent {...props} />}
      screenOptions={{
        drawerType: 'permanent',
        drawerStyle: { width: 248 },
        headerShown: true,
        header: () => <TopBar />,
        overlayColor: 'transparent',
      }}
    >
      <Drawer.Screen name="Dashboard"     component={DashboardScreen} />
      <Drawer.Screen name="Projects"      component={ProjectsScreen} />
      <Drawer.Screen name="Team"          component={TeamScreen} />
      <Drawer.Screen name="Notifications" component={NotificationsScreen} />
      <Drawer.Screen name="Profile"       component={ProfileScreen} />
      {/* ProjectStack is not in the sidebar but is navigatable from any screen */}
      <Drawer.Screen name="ProjectStack"  component={ProjectStackNavigator} />
    </Drawer.Navigator>
  );
};

const MainWebNavigator = () => (
  <>
    <NotificationListener />
    <MainWebDrawer />
  </>
);

const AppNavigator = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector((state) => state.auth.isLoading);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const [accessToken, refreshToken, user] = await Promise.all([
          storage.getAccessToken(),
          storage.getRefreshToken(),
          storage.getUser(),
        ]);
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
          <Stack.Screen name="Main" component={MainWebNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
  },
  sidebarBrand: {
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navSection: {
    flex: 1,
    paddingTop: 12,
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
  sidebarFooter: {
    paddingHorizontal: 8,
  },
});

export default AppNavigator;
