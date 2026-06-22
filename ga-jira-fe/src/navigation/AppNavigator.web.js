import React, { useEffect, useState, useContext, createContext, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Text, useTheme, Divider, Badge, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { selectIsAuthenticated, setCredentials, setLoading, setDarkMode } from '../store/authSlice';
import { selectUnreadCount, markAllAsRead } from '../store/notificationSlice';
import { storage } from '../utils/storage';
import { useAuth } from '../hooks/useAuth';
import { useGetNotificationsQuery, useMarkAllNotificationsReadMutation } from '../api/notificationApi';

const GA_LOGO_FULL = require('../../assets/ga-logo-full.jpg');

const SHELL_BG = '#0B1425';
const SHELL_PANEL = '#101B2F';
const SHELL_PANEL_2 = '#13233C';
const SHELL_BORDER = '#263852';
const SHELL_TEXT = '#F5F7FB';
const SHELL_MUTED = '#A8B4C7';
const SHELL_ACTIVE = '#082A63';
const SHELL_ACCENT = '#2F6EB7';
const SHELL_GOLD = '#B7AA70';

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

/* ─── Command Palette context ─── */
const CmdPaletteCtx = createContext({ open: () => {} });

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
  const { open: openPalette } = useContext(CmdPaletteCtx);

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
    <View style={[topBarStyles.bar, { backgroundColor: SHELL_BG, borderBottomColor: SHELL_BORDER }]}>
      {/* Left: current page title + search shortcut */}
      <View style={topBarStyles.left}>
        {!!screenName && (
          <View style={topBarStyles.titleWrap}>
            <View style={topBarStyles.titleMark}>
              <MaterialCommunityIcons name="radar" size={15} color={SHELL_GOLD} />
            </View>
            <View>
              <Text variant="labelSmall" style={topBarStyles.titleKicker}>CONTROL CENTER</Text>
              <Text variant="titleMedium" style={topBarStyles.titleText}>
                {SCREEN_LABELS[screenName] || screenName}
              </Text>
            </View>
          </View>
        )}
        <TouchableOpacity
          onPress={openPalette}
          style={topBarStyles.searchHint}
        >
          <MaterialCommunityIcons name="magnify" size={15} color={SHELL_MUTED} />
          <Text style={topBarStyles.searchText}>Search issues, projects, people...</Text>
          <View style={topBarStyles.kbdHint}>
            <Text style={topBarStyles.kbdText}>Ctrl K</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Right: notifications + profile */}
      <View style={topBarStyles.right}>
        {/* Notification bell */}
        <TouchableOpacity
          style={[topBarStyles.iconBtn, notifOpen && topBarStyles.iconBtnActive]}
          onPress={() => { setNotifOpen(v => !v); setProfileOpen(false); }}
        >
          <MaterialCommunityIcons
            name={unreadCount > 0 ? 'bell' : 'bell-outline'}
            size={20}
            color={notifOpen ? '#D7E7FA' : SHELL_MUTED}
          />
          {unreadCount > 0 && (
            <Badge size={16} style={topBarStyles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</Badge>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={topBarStyles.divider} />

        {/* Profile button */}
        <TouchableOpacity
          style={[topBarStyles.profileBtn, profileOpen && topBarStyles.profileBtnActive]}
          onPress={() => { setProfileOpen(v => !v); setNotifOpen(false); }}
        >
          <View style={[topBarStyles.avatar, { backgroundColor: `hsl(${hue},52%,44%)` }]}>
            <Text style={topBarStyles.avatarText}>{initials || '?'}</Text>
          </View>
          <View style={topBarStyles.profileInfo}>
            <Text variant="labelMedium" style={topBarStyles.profileName} numberOfLines={1}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text variant="labelSmall" style={topBarStyles.profileRole} numberOfLines={1}>
              {user?.role?.replace(/_/g, ' ')}
            </Text>
          </View>
          <MaterialCommunityIcons name={profileOpen ? 'chevron-up' : 'chevron-down'} size={16} color={SHELL_MUTED} />
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
    height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, borderBottomWidth: 1, zIndex: 10,
    boxShadow: '0 10px 24px rgba(0,0,0,0.16)',
  },
  left:        { flexDirection: 'row', alignItems: 'center', gap: 20, flex: 1, minWidth: 0 },
  titleWrap:   { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  titleMark:   { width: 32, height: 32, borderRadius: 8, backgroundColor: SHELL_PANEL_2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: SHELL_BORDER },
  titleKicker: { color: SHELL_MUTED, fontSize: 9, fontWeight: '800', letterSpacing: 0, textTransform: 'uppercase' },
  titleText:   { color: SHELL_TEXT, fontWeight: '800', lineHeight: 20 },
  searchHint: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
    borderColor: SHELL_BORDER, backgroundColor: SHELL_PANEL,
    minWidth: 240, maxWidth: 420, flexShrink: 1, cursor: 'pointer', outlineStyle: 'none',
  },
  searchText: {
    flex: 1,
    color: SHELL_MUTED,
    fontSize: 12,
    marginLeft: 7,
    marginRight: 10,
  },
  kbdHint: { borderWidth: 1, borderColor: SHELL_BORDER, backgroundColor: '#0A1220', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  kbdText: { color: SHELL_MUTED, fontSize: 10, fontWeight: '700' },
  right:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn:     { width: 38, height: 38, justifyContent: 'center', alignItems: 'center', borderRadius: 8, position: 'relative', outlineStyle: 'none', borderWidth: 1, borderColor: 'transparent' },
  iconBtnActive: { backgroundColor: SHELL_PANEL_2, borderColor: SHELL_BORDER },
  badge:       { position: 'absolute', top: 0, right: 0 },
  divider:     { width: 1, height: 32, backgroundColor: SHELL_BORDER, marginHorizontal: 2 },
  profileBtn:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, outlineStyle: 'none', borderWidth: 1, borderColor: 'transparent' },
  profileBtnActive: { backgroundColor: SHELL_PANEL_2, borderColor: SHELL_BORDER },
  avatar:      { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  avatarText:  { color: '#fff', fontSize: 11, fontWeight: '800' },
  profileInfo: { alignItems: 'flex-start', minWidth: 122 },
  profileName: { color: SHELL_TEXT, fontWeight: '800' },
  profileRole: { color: SHELL_MUTED, textTransform: 'capitalize' },
  // Backdrop covers full screen to close dropdowns on outside tap
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 },
  // Profile dropdown
  profileDropdown: {
    position: 'absolute', top: 62, right: 14, width: 268,
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
    position: 'absolute', top: 62, right: 14, width: 388,
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
import CommandPalette from '../components/common/CommandPalette.web';
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
              Roadmap: 'project/:projectId/roadmap',
              Calendar: 'project/:projectId/calendar',
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

  const initials = user ? `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase() : '?';
  const fullName  = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
  const roleLabel = user?.role ? user.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';
  const hue       = avatarHue(fullName);

  return (
    <View style={[styles.sidebar, { backgroundColor: SHELL_BG, borderRightColor: SHELL_BORDER }]}>

      {/* ── Brand / Logo ── */}
      <View style={styles.sidebarBrand}>
        <View style={styles.logoCard}>
          <Image source={GA_LOGO_FULL} style={styles.logoImg} resizeMode="contain" />
        </View>
        <View style={styles.goldDivider} />
      </View>

      {/* ── Nav items ── */}
      <View style={styles.navSection}>
        <Text style={styles.navGroupLabel}>Workspace</Text>
        {visibleNavItems.map((item) => {
          const isActive = sidebarActive === item.name;
          return (
            <TouchableOpacity
              key={item.name}
              onPress={() => navigation.navigate(item.name)}
              activeOpacity={0.82}
              style={[
                styles.navItem,
                {
                  backgroundColor: isActive ? SHELL_ACTIVE : 'transparent',
                  borderColor: isActive ? SHELL_ACCENT : 'transparent',
                },
              ]}
            >
              <View style={[
                styles.navIconBox,
                { backgroundColor: isActive ? '#0D3B84' : SHELL_PANEL },
              ]}>
                <MaterialCommunityIcons
                  name={isActive ? item.activeIcon : item.icon}
                  size={18}
                  color={isActive ? '#D7E7FA' : SHELL_MUTED}
                />
              </View>
              <Text
                variant="bodyMedium"
                style={[
                  styles.navLabel,
                  { color: isActive ? '#D7E7FA' : SHELL_MUTED },
                  isActive && { fontWeight: '800' },
                ]}
              >
                {item.label}
              </Text>
              {isActive && <View style={styles.activeRail} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── User card + Sign Out ── */}
      <View style={styles.sidebarFooter}>
        <View style={styles.footerDivider} />

        {/* User info card */}
        <TouchableOpacity
          style={styles.userCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={[styles.userAvatar, { backgroundColor: `hsl(${hue},52%,38%)` }]}>
            <Text style={styles.userAvatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.userName} numberOfLines={1}>{fullName}</Text>
            <Text style={styles.userRole} numberOfLines={1}>{roleLabel}</Text>
          </View>
          <MaterialCommunityIcons name="cog-outline" size={15} color={SHELL_MUTED} />
        </TouchableOpacity>

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.signOutItem}
          onPress={logout}
          activeOpacity={0.82}
        >
          <View style={[styles.navIconBox, { backgroundColor: '#3B1720' }]}>
            <MaterialCommunityIcons name="logout-variant" size={18} color="#FCA5A5" />
          </View>
          <Text variant="bodyMedium" style={[styles.navLabel, { color: '#FCA5A5' }]}>Sign Out</Text>
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
        drawerStyle: { width: 292 },
        headerShown: true,
        header: (props) => <TopBar screenName={props.route.name} />,
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

const MainWebNavigator = () => {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette  = useCallback(() => setPaletteOpen(true),  []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <CmdPaletteCtx.Provider value={{ open: openPalette }}>
      <NotificationListener />
      <MainWebDrawer />
      <CommandPalette visible={paletteOpen} onClose={closePalette} />
    </CmdPaletteCtx.Provider>
  );
};

const AppNavigator = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector((state) => state.auth.isLoading);

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
          <Stack.Screen name="Main" component={MainWebNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    borderRightWidth: 1,
    paddingBottom: 12,
  },
  sidebarBrand: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 4,
    alignItems: 'center',
    gap: 14,
  },
  logoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: SHELL_GOLD,
    boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
  },
  logoImg: {
    width: 172,
    height: 58,
  },
  goldDivider: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: SHELL_BORDER,
  },
  navSection: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: 12,
    gap: 6,
  },
  navGroupLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
    color: SHELL_MUTED,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    minHeight: 50,
    outlineStyle: 'none',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
  },
  navIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  navLabel: {
    flex: 1,
  },
  activeRail: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    backgroundColor: SHELL_GOLD,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  sidebarFooter: {
    paddingHorizontal: 12,
    gap: 8,
  },
  footerDivider: {
    height: 1,
    backgroundColor: SHELL_BORDER,
    marginBottom: 2,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: SHELL_PANEL,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SHELL_BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
    cursor: 'pointer',
    outlineStyle: 'none',
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  userName: {
    color: SHELL_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  userRole: {
    color: SHELL_MUTED,
    fontSize: 11,
    marginTop: 1,
  },
  signOutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B1720',
    backgroundColor: '#1A0C10',
    gap: 10,
    minHeight: 46,
    outlineStyle: 'none',
    cursor: 'pointer',
    marginBottom: 4,
  },
});

export default AppNavigator;
