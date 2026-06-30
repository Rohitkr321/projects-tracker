import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Animated, Image } from 'react-native';
import { Text, useTheme, Button, TextInput, Menu, Divider, Switch, Portal, Dialog } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import {
  useLogoutMutation, useChangePasswordMutation, useUpdateProfileMutation,
  useGet2faStatusQuery, useSetup2faMutation, useEnable2faMutation, useDisable2faMutation,
} from '../../api/authApi';
import { useCreateInviteMutation, useListInvitesQuery, useRevokeInviteMutation } from '../../api/inviteApi';
import { ROLE_LABELS } from '../../constants';
import { formatDate } from '../../utils/dateUtils';
import { setDarkMode, selectIsDarkMode, setUser } from '../../store/authSlice';
import { storage } from '../../utils/storage';
import UserManualSection from './UserManualSection.web';

/* ─── Shell palette (matches main sidebar) ─── */
const SHELL_BG      = '#0B1425';
const SHELL_PANEL   = '#101B2F';
const SHELL_PANEL_2 = '#13233C';
const SHELL_BORDER  = '#263852';
const SHELL_TEXT    = '#F5F7FB';
const SHELL_MUTED   = '#A8B4C7';
const SHELL_ACTIVE  = '#082A63';
const SHELL_ACCENT  = '#2F6EB7';
const SHELL_GOLD    = '#B7AA70';

/* ─── Toast ─── */
const Toast = ({ message, isError, onDone }) => {
  const [opacity] = useState(new Animated.Value(0));
  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2800),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onDone?.());
  }, []);
  return (
    <Animated.View style={[toastStyle.wrap, { backgroundColor: isError ? '#991B1B' : '#0F2557' }, { opacity }]}>
      <View style={[toastStyle.icon, { backgroundColor: isError ? '#DC2626' : '#1D4ED8' }]}>
        <MaterialCommunityIcons name={isError ? 'alert-circle' : 'check-circle'} size={14} color="#fff" />
      </View>
      <Text style={toastStyle.text}>{message}</Text>
    </Animated.View>
  );
};
const toastStyle = StyleSheet.create({
  wrap: { position: 'absolute', top: 20, right: 24, flexDirection: 'row', alignItems: 'center', paddingRight: 16, borderRadius: 10, zIndex: 9999, gap: 0, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' },
  icon: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  text: { color: '#fff', fontSize: 13, fontWeight: '600' },
});

const SECTIONS = [
  { key: 'account',     label: 'Account',        icon: 'account-edit-outline' },
  { key: 'preferences', label: 'Preferences',    icon: 'tune-variant' },
  { key: 'invite',      label: 'Invite Members', icon: 'account-plus-outline', adminOnly: true },
  { key: 'security',    label: 'Security',       icon: 'shield-lock-outline' },
  { key: 'manual',      label: 'User Manual',    icon: 'book-open-outline' },
];

const SECTION_COLORS = {
  account:     '#3B82F6',
  preferences: '#8B5CF6',
  invite:      '#10B981',
  security:    '#F59E0B',
  manual:      '#0EA5E9',
};

const INVITABLE_ROLES = [
  { value: 'developer',       label: 'Developer',       desc: 'Create & edit issues' },
  { value: 'reporter',        label: 'Reporter',        desc: 'Create & view issues' },
  { value: 'viewer',          label: 'Viewer',          desc: 'Read-only access' },
  { value: 'team_lead',       label: 'Team Lead',       desc: 'Manage team tasks' },
  { value: 'project_manager', label: 'Project Manager', desc: 'Full project access' },
];

const ROLE_COLOR = {
  super_admin:     '#7C3AED',
  org_admin:       '#DB2777',
  project_manager: '#0369A1',
  team_lead:       '#0891B2',
  developer:       '#0D9488',
  reporter:        '#15803D',
  viewer:          '#92400E',
};

const avatarHue = (email) => {
  let h = 0;
  for (let i = 0; i < (email || '').length; i++) h = email.charCodeAt(i) * 37 + ((h << 5) - h);
  return Math.abs(h) % 360;
};

const BigAvatar = ({ user, size = 96 }) => {
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;
  const hue = avatarHue(user?.email || '');
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue},52%,44%)`, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.35, fontWeight: '800', letterSpacing: 0 }}>{initials.toUpperCase()}</Text>
    </View>
  );
};

/* ─── Left panel QuickInfo row ─── */
const QuickInfo = ({ icon, label, value }) => (
  <View style={leftStyles.infoRow}>
    <View style={leftStyles.infoIconWrap}>
      <MaterialCommunityIcons name={icon} size={13} color={SHELL_MUTED} />
    </View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={leftStyles.infoLabel}>{label}</Text>
      <Text style={leftStyles.infoValue} numberOfLines={1}>{value || '—'}</Text>
    </View>
  </View>
);

/* ─── Section header (right panel) ─── */
const SectionHeader = ({ title, desc, icon, color, theme }) => {
  const c = color || theme.colors.primary;
  return (
    <View style={secHdrStyles.wrap}>
      <View style={[secHdrStyles.iconBadge, { backgroundColor: c + (theme.dark ? '28' : '14') }]}>
        <MaterialCommunityIcons name={icon || 'cog'} size={22} color={c} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[secHdrStyles.title, { color: theme.colors.onSurface }]}>{title}</Text>
        <Text style={[secHdrStyles.desc, { color: theme.colors.onSurfaceVariant }]}>{desc}</Text>
      </View>
    </View>
  );
};
const secHdrStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 24 },
  iconBadge: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  desc: { fontSize: 13, lineHeight: 19 },
});

/* ─── Card with colored top accent ─── */
const AccentCard = ({ children, color, style, bg }) => (
  <View style={[acStyles.card, { backgroundColor: bg, borderTopColor: color || '#3B82F6' }, style]}>
    {children}
  </View>
);
const acStyles = StyleSheet.create({
  card: {
    borderRadius: 12, borderWidth: 1, borderTopWidth: 3,
    padding: 24, marginBottom: 18,
    borderColor: 'rgba(255,255,255,0.07)',   // subtle outline visible in dark mode
    boxShadow: '0 4px 16px rgba(15,37,87,0.08)',
    overflow: 'hidden',
  },
});

export default function ProfileScreen() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { user, logout } = useAuth();
  const isDarkMode = useSelector(selectIsDarkMode);
  const canInvite = ['super_admin', 'org_admin', 'project_manager'].includes(user?.role);

  const [section, setSection] = useState('account');
  const [logoutMutation,  { isLoading: loggingOut }]    = useLogoutMutation();
  const [changePassword,  { isLoading: changingPw }]    = useChangePasswordMutation();
  const [updateProfile,   { isLoading: savingProfile }] = useUpdateProfileMutation();
  const [setup2fa,        { isLoading: settingUp2fa }]  = useSetup2faMutation();
  const [enable2fa,       { isLoading: enabling2fa }]   = useEnable2faMutation();
  const [disable2fa,      { isLoading: disabling2fa }]  = useDisable2faMutation();
  const { data: twoFaStatus, refetch: refetch2fa }      = useGet2faStatusQuery();
  const is2faEnabled = twoFaStatus?.data?.twoFactorEnabled ?? false;

  const [toast, setToast]           = useState(null);
  const [signOutDialog, setSignOutDialog] = useState(false);

  const [firstName, setFirstName]   = useState(user?.firstName || '');
  const [lastName, setLastName]     = useState(user?.lastName || '');
  const [timezone, setTimezone]     = useState(user?.timezone || 'UTC');
  const [dirty, setDirty]           = useState(false);

  const [notifEmail,       setNotifEmail]       = useState(user?.notificationPreferences?.email ?? true);
  const [notifInApp,       setNotifInApp]       = useState(user?.notificationPreferences?.inApp ?? true);
  const [notifMentions,    setNotifMentions]    = useState(user?.notificationPreferences?.mentions ?? true);
  const [notifAssignments, setNotifAssignments] = useState(user?.notificationPreferences?.assignments ?? true);
  const [notifComments,    setNotifComments]    = useState(user?.notificationPreferences?.comments ?? true);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const [twoFaQr,      setTwoFaQr]      = useState(null);
  const [twoFaSecret,  setTwoFaSecret]  = useState('');
  const [twoFaCode,    setTwoFaCode]    = useState('');
  const [twoFaBackups, setTwoFaBackups] = useState([]);
  const [showSetup,    setShowSetup]    = useState(false);
  const [disablePw,    setDisablePw]    = useState('');
  const [showDisable,  setShowDisable]  = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setTimezone(user.timezone || 'UTC');
    }
  }, [user?.id]);

  const markDirty = (setter) => (v) => { setter(v); setDirty(true); };
  const showToast = (msg, isError = false) => setToast({ msg, isError });

  const handleSave = async () => {
    try {
      const result = await updateProfile({ firstName, lastName, timezone }).unwrap();
      dispatch(setUser(result.data));
      showToast('Profile updated successfully.');
      setDirty(false);
    } catch { showToast('Failed to save profile', true); }
  };

  const handleSaveNotifPrefs = async () => {
    try {
      const result = await updateProfile({
        notificationPreferences: { email: notifEmail, inApp: notifInApp, mentions: notifMentions, assignments: notifAssignments, comments: notifComments },
      }).unwrap();
      dispatch(setUser(result.data));
      showToast('Notification preferences saved.');
    } catch { showToast('Failed to save preferences', true); }
  };

  const handleThemeToggle = async (value) => {
    dispatch(setDarkMode(value));
    await storage.setTheme(value ? 'dark' : 'light');
  };

  const handleSetup2fa = async () => {
    try {
      const result = await setup2fa().unwrap();
      setTwoFaQr(result.data?.qrCode);
      setTwoFaSecret(result.data?.secret);
      setShowSetup(true);
    } catch (err) { showToast(err?.data?.message || 'Failed to set up 2FA', true); }
  };

  const handleEnable2fa = async () => {
    try {
      const result = await enable2fa({ code: twoFaCode }).unwrap();
      setTwoFaBackups(result.data?.backupCodes || []);
      setTwoFaCode('');
      setShowSetup(false);
      refetch2fa();
      showToast('Two-factor authentication enabled!');
    } catch (err) { showToast(err?.data?.message || 'Invalid code — please try again', true); }
  };

  const handleDisable2fa = async () => {
    try {
      await disable2fa({ password: disablePw }).unwrap();
      setDisablePw('');
      setShowDisable(false);
      refetch2fa();
      showToast('Two-factor authentication disabled.');
    } catch (err) { showToast(err?.data?.message || 'Incorrect password', true); }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) { showToast('Please fill in all password fields', true); return; }
    if (newPw !== confirmPw) { showToast('New passwords do not match', true); return; }
    if (newPw.length < 8) { showToast('Password must be at least 8 characters', true); return; }
    try {
      await changePassword({ currentPassword: currentPw, newPassword: newPw }).unwrap();
      showToast('Password updated successfully!');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) { showToast(err?.data?.message || 'Failed to update password', true); }
  };

  const handleLogout = () => setSignOutDialog(true);
  const doLogout = async () => {
    setSignOutDialog(false);
    try { await logoutMutation().unwrap(); } finally { logout(); }
  };

  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviteRole, setInviteRole]     = useState('developer');
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [generatedToken, setGeneratedToken] = useState(null);
  const [revokeTarget, setRevokeTarget]     = useState(null);

  const { data: invitesResp, refetch: refetchInvites } = useListInvitesQuery(undefined, { skip: !canInvite });
  const [createInvite, { isLoading: creating }] = useCreateInviteMutation();
  const [revokeInvite] = useRevokeInviteMutation();
  const pendingInvites = (invitesResp?.data || []).filter(i => !i.acceptedAt && new Date(i.expiresAt) > new Date());

  const handleGenerateInvite = async () => {
    try {
      const res = await createInvite({ email: inviteEmail.trim() || undefined, role: inviteRole }).unwrap();
      setGeneratedToken(res.data?.token);
      setInviteEmail('');
      refetchInvites();
    } catch (err) { showToast(err?.data?.message || 'Failed to generate invite', true); }
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(generatedToken).catch(() => {});
    showToast('Token copied to clipboard');
  };

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revokeInvite(revokeTarget.id).unwrap();
      showToast('Invite revoked');
      refetchInvites();
    } catch { showToast('Failed to revoke invite', true); }
    finally { setRevokeTarget(null); }
  };

  const rc   = ROLE_COLOR[user?.role] || '#6B7280';
  const hue  = avatarHue(user?.email || '');
  const surf = theme.colors.surface;
  const bg   = theme.colors.background;
  const visibleSections = SECTIONS.filter(s => !s.adminOnly || canInvite);
  const activeColor = SECTION_COLORS[section] || theme.colors.primary;

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>

      {/* ══════════════════════════════════
          LEFT PANEL — dark navy sidebar
      ══════════════════════════════════ */}
      <View style={leftStyles.panel}>
        <ScrollView contentContainerStyle={leftStyles.inner} showsVerticalScrollIndicator={false}>

          {/* ── Hero area ── */}
          <View style={leftStyles.hero}>
            {/* Accent glow behind avatar */}
            <View style={[leftStyles.heroGlow, { backgroundColor: SHELL_ACCENT, opacity: 0.18 }]} />
            {/* Avatar with colored ring */}
            <View style={[leftStyles.avatarRing, { borderColor: `hsl(${hue},52%,44%)` }]}>
              <BigAvatar user={user} size={76} />
            </View>
            <Text style={leftStyles.heroName} numberOfLines={1}>{user?.firstName} {user?.lastName}</Text>
            <View style={[leftStyles.roleBadge, { backgroundColor: rc + '28', borderColor: rc + '50' }]}>
              <View style={[leftStyles.roleDot, { backgroundColor: rc }]} />
              <Text style={[leftStyles.roleBadgeText, { color: rc }]}>{ROLE_LABELS[user?.role] || user?.role}</Text>
            </View>
            <Text style={leftStyles.heroEmail} numberOfLines={1}>{user?.email}</Text>
          </View>

          {/* ── Nav items ── */}
          <View style={leftStyles.navSection}>
            <Text style={leftStyles.navGroupLabel}>WORKSPACE</Text>
            {visibleSections.map(s => {
              const active = section === s.key;
              const sc = SECTION_COLORS[s.key] || SHELL_ACCENT;
              return (
                <TouchableOpacity
                  key={s.key}
                  onPress={() => setSection(s.key)}
                  activeOpacity={0.82}
                  style={[leftStyles.navItem, active && { backgroundColor: sc + '18', borderColor: sc + '40' }]}
                >
                  <View style={[leftStyles.navIconBox, { backgroundColor: active ? sc + '28' : SHELL_PANEL }]}>
                    <MaterialCommunityIcons name={s.icon} size={16} color={active ? sc : SHELL_MUTED} />
                  </View>
                  <Text style={[leftStyles.navLabel, active && { color: sc, fontWeight: '800' }]}>
                    {s.label}
                  </Text>
                  {active && <View style={[leftStyles.activeRail, { backgroundColor: sc }]} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={leftStyles.divider} />

          {/* ── Quick info ── */}
          <View style={leftStyles.infoBlock}>
            <QuickInfo icon="office-building-outline" label="Organization" value={user?.organization?.name || 'Cadence'} />
            <QuickInfo icon="calendar-check-outline" label="Member since" value={formatDate(user?.createdAt)} />
            <QuickInfo icon="clock-time-four-outline" label="Timezone" value={timezone} />
          </View>

          <View style={leftStyles.divider} />

          {/* ── Sign out ── */}
          <TouchableOpacity style={leftStyles.signOut} onPress={handleLogout} activeOpacity={0.82}>
            <View style={leftStyles.signOutIcon}>
              <MaterialCommunityIcons name="logout-variant" size={16} color="#FCA5A5" />
            </View>
            <Text style={leftStyles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          <Text style={leftStyles.version}>Cadence v1.0.0</Text>
        </ScrollView>
      </View>

      {/* ══════════════════════════════════
          RIGHT CONTENT
      ══════════════════════════════════ */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>

        {/* ─── ACCOUNT ─── */}
        {section === 'account' && (
          <>
            <SectionHeader
              title="Account Settings"
              desc="Update your display name, timezone, and notification preferences."
              icon="account-edit-outline"
              color={SECTION_COLORS.account}
              theme={theme}
            />

            {/* Profile summary strip */}
            <View style={[styles.profileStrip, { backgroundColor: theme.dark ? '#0D1E38' : '#EEF4FF', borderColor: SECTION_COLORS.account + '30' }]}>
              <View style={[styles.profileStripRing, { borderColor: `hsl(${hue},52%,44%)` }]}>
                <BigAvatar user={user} size={50} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.profileStripName, { color: theme.colors.onSurface }]}>
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text style={[styles.profileStripEmail, { color: theme.dark ? '#8BAFD4' : '#64748B' }]} numberOfLines={1}>
                  {user?.email}
                </Text>
              </View>
              <View style={[styles.profileStripRole, { backgroundColor: rc + '18', borderColor: rc + '40' }]}>
                <View style={[styles.roleDotSm, { backgroundColor: rc }]} />
                <Text style={[styles.profileStripRoleText, { color: rc }]}>{ROLE_LABELS[user?.role]}</Text>
              </View>
            </View>

            <AccentCard color={SECTION_COLORS.account} bg={surf}>
              <View style={styles.cardTitleRow}>
                <MaterialCommunityIcons name="card-account-details-outline" size={16} color={SECTION_COLORS.account} />
                <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Personal Information</Text>
              </View>

              <View style={styles.nameRow}>
                <View style={{ flex: 1 }}>
                  <TextInput label="First Name" value={firstName} onChangeText={markDirty(setFirstName)} mode="outlined" dense />
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput label="Last Name" value={lastName} onChangeText={markDirty(setLastName)} mode="outlined" dense />
                </View>
              </View>

              {/* Email — custom read-only field (disabled TextInput is invisible in dark mode) */}
              <View style={[styles.readOnlyField, {
                borderColor: theme.colors.outlineVariant,
                backgroundColor: theme.dark ? '#0B1628' : '#F1F5F9',
                marginTop: 16,
              }]}>
                <MaterialCommunityIcons name="email-outline" size={16} color={theme.colors.onSurfaceVariant} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.readOnlyLabel, { color: theme.colors.onSurfaceVariant }]}>Email</Text>
                  <Text style={[styles.readOnlyValue, { color: theme.dark ? '#CBD5E1' : '#1E293B' }]}>{user?.email}</Text>
                </View>
                <MaterialCommunityIcons name="lock-outline" size={14} color={theme.colors.outlineVariant} />
              </View>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Email address cannot be changed.</Text>

              <TextInput
                label="Timezone"
                value={timezone}
                onChangeText={markDirty(setTimezone)}
                mode="outlined"
                dense
                style={{ marginTop: 16 }}
                left={<TextInput.Icon icon="clock-outline" />}
              />

              <View style={[styles.saveRow, { borderTopColor: theme.colors.outlineVariant }]}>
                <Button
                  mode="contained"
                  onPress={handleSave}
                  loading={savingProfile}
                  disabled={!dirty || savingProfile}
                  style={{ borderRadius: 8 }}
                  buttonColor={SECTION_COLORS.account}
                >
                  Save Changes
                </Button>
                {dirty && (
                  <View style={styles.unsavedBadge}>
                    <View style={[styles.unsavedDot, { backgroundColor: '#F59E0B' }]} />
                    <Text variant="labelSmall" style={{ color: '#F59E0B', fontWeight: '700' }}>Unsaved changes</Text>
                  </View>
                )}
              </View>
            </AccentCard>
          </>
        )}

        {/* ─── INVITE ─── */}
        {section === 'invite' && canInvite && (
          <>
            <SectionHeader
              title="Invite Members"
              desc="Generate a single-use token to invite someone to your organization. Tokens expire in 72 hours."
              icon="account-plus-outline"
              color={SECTION_COLORS.invite}
              theme={theme}
            />

            <AccentCard color={SECTION_COLORS.invite} bg={surf}>
              <View style={styles.cardTitleRow}>
                <MaterialCommunityIcons name="ticket-outline" size={16} color={SECTION_COLORS.invite} />
                <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Generate Token</Text>
              </View>

              <View style={styles.inviteForm}>
                <TextInput
                  label="Email (optional)"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  left={<TextInput.Icon icon="email-outline" />}
                  dense
                  style={{ flex: 2 }}
                />
                <Menu
                  visible={roleMenuOpen}
                  onDismiss={() => setRoleMenuOpen(false)}
                  anchor={
                    <TouchableOpacity
                      onPress={() => setRoleMenuOpen(true)}
                      style={[styles.rolePickerBtn, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }]}
                    >
                      <MaterialCommunityIcons name="shield-account-outline" size={15} color={theme.colors.onSurfaceVariant} />
                      <Text variant="bodySmall" style={{ flex: 1, marginLeft: 6, color: theme.colors.onSurface }}>
                        {INVITABLE_ROLES.find(r => r.value === inviteRole)?.label || 'Developer'}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={14} color={theme.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  }
                >
                  {INVITABLE_ROLES.map(r => (
                    <Menu.Item key={r.value} title={r.label} description={r.desc}
                      leadingIcon={inviteRole === r.value ? 'check' : 'shield-account-outline'}
                      onPress={() => { setInviteRole(r.value); setRoleMenuOpen(false); }}
                      titleStyle={inviteRole === r.value ? { color: theme.colors.primary, fontWeight: '700' } : {}}
                    />
                  ))}
                </Menu>
                <Button mode="contained" icon="ticket-outline" onPress={handleGenerateInvite} loading={creating} disabled={creating} style={{ borderRadius: 8 }} buttonColor={SECTION_COLORS.invite}>
                  Generate
                </Button>
              </View>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
                If email is set, only that address can use the token.
              </Text>
            </AccentCard>

            {!!generatedToken && (
              <View style={[styles.tokenCard, { borderColor: '#34D399', backgroundColor: theme.dark ? '#052E16' : '#ECFDF5' }]}>
                <View style={styles.tokenHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialCommunityIcons name="check-circle" size={18} color={theme.dark ? '#34D399' : '#065F46'} />
                    <Text variant="titleSmall" style={{ color: theme.dark ? '#34D399' : '#065F46', fontWeight: '700' }}>Token generated!</Text>
                  </View>
                  <Button compact mode="text" textColor={theme.dark ? '#34D399' : '#065F46'} icon="content-copy" onPress={handleCopy}>Copy</Button>
                </View>
                <Text variant="bodySmall" style={{ color: theme.dark ? '#6EE7B7' : '#047857', marginBottom: 10 }}>
                  Share this token with the invitee. It expires in 72 hours and can only be used once.
                </Text>
                <TouchableOpacity onPress={handleCopy} style={[styles.tokenBox, { backgroundColor: theme.dark ? '#064E3B' : '#D1FAE5', borderColor: theme.dark ? '#059669' : '#6EE7B7' }]}>
                  <Text style={{ fontFamily: 'monospace', fontSize: 12, color: theme.dark ? '#6EE7B7' : '#065F46', flex: 1 }}>{generatedToken}</Text>
                  <MaterialCommunityIcons name="content-copy" size={14} color={theme.dark ? '#34D399' : '#065F46'} />
                </TouchableOpacity>
              </View>
            )}

            <AccentCard color={SECTION_COLORS.invite} bg={surf}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <MaterialCommunityIcons name="account-multiple-outline" size={16} color={SECTION_COLORS.invite} />
                <Text style={[styles.cardTitle, { color: theme.colors.onSurface, marginBottom: 0 }]}>Active Invites</Text>
                <View style={[styles.countBadge, { backgroundColor: SECTION_COLORS.invite + '20', borderColor: SECTION_COLORS.invite + '40' }]}>
                  <Text variant="labelSmall" style={{ color: SECTION_COLORS.invite, fontWeight: '800' }}>{pendingInvites.length}</Text>
                </View>
              </View>

              {pendingInvites.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIcon, { backgroundColor: SECTION_COLORS.invite + '14' }]}>
                    <MaterialCommunityIcons name="ticket-outline" size={24} color={SECTION_COLORS.invite} />
                  </View>
                  <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No active invites</Text>
                </View>
              ) : (
                <>
                  <View style={[styles.tableHead, { backgroundColor: theme.colors.surfaceVariant, borderRadius: 8 }]}>
                    <Text style={[styles.colH, { flex: 2 }]}>Email / Type</Text>
                    <Text style={[styles.colH, { flex: 1 }]}>Role</Text>
                    <Text style={[styles.colH, { flex: 1 }]}>Expires</Text>
                    <Text style={[styles.colH, { width: 80 }]}></Text>
                  </View>
                  {pendingInvites.map((inv, i) => (
                    <View key={inv.id} style={[styles.tableRow, {
                      backgroundColor: i % 2 === 0 ? surf : theme.colors.surfaceVariant + '40',
                      borderBottomColor: theme.colors.outlineVariant,
                    }]}>
                      <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.invIcon, { backgroundColor: SECTION_COLORS.invite + '20' }]}>
                          <MaterialCommunityIcons name={inv.email ? 'email-outline' : 'link-variant'} size={13} color={SECTION_COLORS.invite} />
                        </View>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
                          {inv.email || 'Open invite'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={[styles.rolePill, { backgroundColor: theme.colors.surfaceVariant }]}>
                          <Text variant="labelSmall" style={{ color: theme.colors.onSurface, fontSize: 10 }}>
                            {ROLE_LABELS[inv.role] || inv.role}
                          </Text>
                        </View>
                      </View>
                      <Text variant="labelSmall" style={{ flex: 1, color: theme.colors.onSurfaceVariant }}>{formatDate(inv.expiresAt)}</Text>
                      <Button compact mode="outlined" textColor={theme.colors.error}
                        style={{ borderColor: theme.colors.error + '60', borderRadius: 6, width: 80 }}
                        onPress={() => setRevokeTarget(inv)}
                      >Revoke</Button>
                    </View>
                  ))}
                </>
              )}
            </AccentCard>
          </>
        )}

        {/* ─── PREFERENCES ─── */}
        {section === 'preferences' && (
          <>
            <SectionHeader
              title="Preferences"
              desc="Customize your appearance and notification settings."
              icon="tune-variant"
              color={SECTION_COLORS.preferences}
              theme={theme}
            />

            {/* Appearance */}
            <AccentCard color={SECTION_COLORS.preferences} bg={surf}>
              <View style={styles.cardTitleRow}>
                <MaterialCommunityIcons name="palette-outline" size={16} color={SECTION_COLORS.preferences} />
                <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Appearance</Text>
              </View>
              <View style={[styles.prefRow, { paddingVertical: 8 }]}>
                <View style={[styles.prefIconWrap, { backgroundColor: SECTION_COLORS.preferences + '18' }]}>
                  <MaterialCommunityIcons name={isDarkMode ? 'weather-night' : 'weather-sunny'} size={18} color={SECTION_COLORS.preferences} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.prefLabel, { color: theme.colors.onSurface }]}>Dark Mode</Text>
                  <Text style={[styles.prefDesc, { color: theme.colors.onSurfaceVariant }]}>Switch between light and dark theme</Text>
                </View>
                <Switch value={isDarkMode} onValueChange={handleThemeToggle} />
              </View>
            </AccentCard>

            {/* Notification prefs */}
            <AccentCard color={SECTION_COLORS.preferences} bg={surf}>
              <View style={styles.cardTitleRow}>
                <MaterialCommunityIcons name="bell-cog-outline" size={16} color={SECTION_COLORS.preferences} />
                <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Notification Preferences</Text>
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                Control which notifications you receive from the system.
              </Text>

              {[
                { label: 'Email Notifications', desc: 'Master toggle for all email alerts',       icon: 'email-outline',          value: notifEmail,       setter: setNotifEmail },
                { label: 'In-App Notifications', desc: 'Show alerts inside the app',             icon: 'bell-outline',           value: notifInApp,       setter: setNotifInApp },
                { label: 'Mentions',             desc: 'When someone @mentions you',             icon: 'at',                     value: notifMentions,    setter: setNotifMentions },
                { label: 'Assignments',          desc: 'When an issue is assigned to you',       icon: 'account-check-outline',  value: notifAssignments, setter: setNotifAssignments },
                { label: 'Comments',             desc: 'When someone comments on your issue',    icon: 'comment-outline',        value: notifComments,    setter: setNotifComments },
              ].map((pref, i, arr) => (
                <View key={pref.label}>
                  <View style={[styles.prefRow, { paddingVertical: 12 }]}>
                    <View style={[styles.prefIconWrap, {
                      backgroundColor: pref.value
                        ? SECTION_COLORS.preferences + '18'
                        : theme.colors.surfaceVariant,
                    }]}>
                      <MaterialCommunityIcons
                        name={pref.icon}
                        size={16}
                        color={pref.value ? SECTION_COLORS.preferences : theme.colors.onSurfaceVariant}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.prefLabel, { color: theme.colors.onSurface }]}>{pref.label}</Text>
                      <Text style={[styles.prefDesc, { color: theme.colors.onSurfaceVariant }]}>{pref.desc}</Text>
                    </View>
                    <Switch
                      value={pref.value}
                      onValueChange={(v) => pref.setter(v)}
                      disabled={pref.label !== 'Email Notifications' && !notifEmail}
                    />
                  </View>
                  {i < arr.length - 1 && <Divider />}
                </View>
              ))}

              <View style={[styles.saveRow, { borderTopColor: theme.colors.outlineVariant }]}>
                <Button mode="contained" icon="content-save-outline" onPress={handleSaveNotifPrefs} style={{ borderRadius: 8 }} buttonColor={SECTION_COLORS.preferences}>
                  Save Preferences
                </Button>
              </View>
            </AccentCard>
          </>
        )}

        {/* ─── USER MANUAL ─── */}
        {section === 'manual' && (
          <>
            <SectionHeader
              title="User Manual"
              desc="A complete guide to every feature in Cadence, tailored to your role."
              icon="book-open-outline"
              color={SECTION_COLORS.manual}
              theme={theme}
            />
            <UserManualSection user={user} />
          </>
        )}

        {/* ─── SECURITY ─── */}
        {section === 'security' && (
          <>
            <SectionHeader
              title="Security"
              desc="Manage your password, two-factor authentication, and active sessions."
              icon="shield-lock-outline"
              color={SECTION_COLORS.security}
              theme={theme}
            />

            {/* 2FA status hero */}
            <View style={[styles.secHero, {
              backgroundColor: is2faEnabled
                ? (theme.dark ? '#052E16' : '#ECFDF5')
                : (theme.dark ? '#1A1200' : '#FFFBEB'),
              borderColor: is2faEnabled
                ? (theme.dark ? '#065F46' : '#A7F3D0')
                : (theme.dark ? '#78350F' : '#FDE68A'),
            }]}>
              <View style={[styles.secHeroIcon, {
                backgroundColor: is2faEnabled
                  ? (theme.dark ? '#064E3B' : '#D1FAE5')
                  : (theme.dark ? '#451A03' : '#FEF3C7'),
              }]}>
                <MaterialCommunityIcons
                  name={is2faEnabled ? 'shield-check' : 'shield-alert-outline'}
                  size={26}
                  color={is2faEnabled ? (theme.dark ? '#34D399' : '#047857') : '#D97706'}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.secHeroTitle, {
                  color: is2faEnabled ? (theme.dark ? '#34D399' : '#065F46') : '#D97706',
                }]}>
                  {is2faEnabled ? 'Account protection is active' : 'Two-factor auth not enabled'}
                </Text>
                <Text style={[styles.secHeroDesc, {
                  color: is2faEnabled ? (theme.dark ? '#6EE7B7' : '#047857') : (theme.dark ? '#F59E0B' : '#92400E'),
                }]}>
                  {is2faEnabled
                    ? 'Two-factor authentication is protecting this account.'
                    : 'Enable 2FA for significantly stronger account protection.'}
                </Text>
              </View>
              <View style={[styles.secHeroBadge, {
                backgroundColor: is2faEnabled
                  ? (theme.dark ? '#052E16' : '#D1FAE5')
                  : (theme.dark ? '#451A03' : '#FEF3C7'),
                borderColor: is2faEnabled
                  ? (theme.dark ? '#065F46' : '#6EE7B7')
                  : (theme.dark ? '#78350F' : '#FDE68A'),
              }]}>
                <MaterialCommunityIcons
                  name={is2faEnabled ? 'check-circle' : 'alert-circle-outline'}
                  size={12}
                  color={is2faEnabled ? (theme.dark ? '#34D399' : '#047857') : '#D97706'}
                />
                <Text style={[styles.secHeroBadgeText, {
                  color: is2faEnabled ? (theme.dark ? '#34D399' : '#047857') : '#D97706',
                }]}>
                  {is2faEnabled ? 'Enabled' : 'Not set up'}
                </Text>
              </View>
            </View>

            {/* Change Password */}
            <AccentCard color={SECTION_COLORS.security} bg={surf}>
              <View style={styles.secCardHeader}>
                <View style={[styles.secIcon, { backgroundColor: SECTION_COLORS.security + '20' }]}>
                  <MaterialCommunityIcons name="lock-reset" size={18} color={SECTION_COLORS.security} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: theme.colors.onSurface, marginBottom: 2 }]}>Change Password</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Update the credential used for direct sign-in.</Text>
                </View>
              </View>
              <TextInput label="Current Password" value={currentPw} onChangeText={setCurrentPw} mode="outlined" secureTextEntry dense style={{ marginBottom: 12 }} left={<TextInput.Icon icon="lock-outline" />} />
              <TextInput label="New Password" value={newPw} onChangeText={setNewPw} mode="outlined" secureTextEntry dense style={{ marginBottom: 12 }} left={<TextInput.Icon icon="lock-plus-outline" />} />
              <TextInput label="Confirm New Password" value={confirmPw} onChangeText={setConfirmPw} mode="outlined" secureTextEntry dense style={{ marginBottom: 20 }} left={<TextInput.Icon icon="lock-check-outline" />} />
              <Button mode="contained" icon="lock-reset" style={{ borderRadius: 8, alignSelf: 'flex-start' }} loading={changingPw} disabled={changingPw} onPress={handleChangePassword} buttonColor={SECTION_COLORS.security}>
                Update Password
              </Button>
            </AccentCard>

            {/* Two-Factor Auth */}
            <AccentCard color={is2faEnabled ? '#10B981' : SECTION_COLORS.security} bg={surf}>
              <View style={styles.secCardHeader}>
                <View style={[styles.secIcon, { backgroundColor: is2faEnabled ? '#10B98120' : SECTION_COLORS.security + '20' }]}>
                  <MaterialCommunityIcons name={is2faEnabled ? 'shield-check' : 'shield-plus-outline'} size={18} color={is2faEnabled ? '#10B981' : SECTION_COLORS.security} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: theme.colors.onSurface, marginBottom: 2 }]}>Two-Factor Authentication</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Authenticator app verification for every login.</Text>
                </View>
                <View style={[styles.secHeroBadge, {
                  backgroundColor: is2faEnabled
                    ? (theme.dark ? '#052E16' : '#D1FAE5')
                    : theme.colors.surfaceVariant,
                  borderColor: is2faEnabled
                    ? (theme.dark ? '#065F46' : '#6EE7B7')
                    : theme.colors.outlineVariant,
                }]}>
                  <MaterialCommunityIcons name={is2faEnabled ? 'shield-check' : 'shield-off-outline'} size={12} color={is2faEnabled ? (theme.dark ? '#34D399' : '#047857') : theme.colors.onSurfaceVariant} />
                  <Text style={[styles.secHeroBadgeText, { color: is2faEnabled ? (theme.dark ? '#34D399' : '#047857') : theme.colors.onSurfaceVariant }]}>
                    {is2faEnabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20, lineHeight: 20 }}>
                Protect your account with an authenticator app like Google Authenticator or Authy.
              </Text>

              {!is2faEnabled && !showSetup && (
                <Button mode="contained" icon="shield-plus-outline" onPress={handleSetup2fa} loading={settingUp2fa} disabled={settingUp2fa} style={{ borderRadius: 8, alignSelf: 'flex-start' }} buttonColor={SECTION_COLORS.security}>
                  Set Up 2FA
                </Button>
              )}

              {!is2faEnabled && showSetup && (
                <View style={[styles.setupBox, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surfaceVariant + '60' }]}>
                  <Text style={[styles.setupBoxTitle, { color: theme.colors.onSurface }]}>Scan QR Code</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16, lineHeight: 18 }}>
                    Open your authenticator app and scan the code below, then enter the 6-digit code to verify.
                  </Text>
                  {twoFaQr && (
                    <View style={{ alignItems: 'center', marginBottom: 16 }}>
                      <View style={{ padding: 8, backgroundColor: '#fff', borderRadius: 12 }}>
                        <Image source={{ uri: twoFaQr }} style={{ width: 180, height: 180, borderRadius: 8 }} />
                      </View>
                    </View>
                  )}
                  {twoFaSecret && (
                    <View style={[styles.secretBox, { backgroundColor: surf, borderColor: theme.colors.outlineVariant }]}>
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>Manual entry key</Text>
                      <Text style={{ fontFamily: 'monospace', fontSize: 13, color: theme.colors.onSurface, letterSpacing: 1 }}>
                        {twoFaSecret.match(/.{1,4}/g)?.join(' ')}
                      </Text>
                    </View>
                  )}
                  <TextInput label="Verification Code" value={twoFaCode} onChangeText={setTwoFaCode} mode="outlined" keyboardType="numeric" maxLength={6} dense left={<TextInput.Icon icon="numeric" />} style={{ marginTop: 16, marginBottom: 16 }} placeholder="000000" />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Button mode="contained" icon="check-circle-outline" onPress={handleEnable2fa} loading={enabling2fa} disabled={enabling2fa || twoFaCode.length < 6} style={{ borderRadius: 8, flex: 1 }} buttonColor={SECTION_COLORS.security}>
                      Verify & Enable
                    </Button>
                    <Button mode="outlined" onPress={() => { setShowSetup(false); setTwoFaCode(''); setTwoFaQr(null); setTwoFaSecret(''); }} style={{ borderRadius: 8 }}>
                      Cancel
                    </Button>
                  </View>
                </View>
              )}

              {twoFaBackups.length > 0 && (
                <View style={[styles.setupBox, { borderColor: '#FCD34D', backgroundColor: theme.dark ? '#451A0380' : '#FFFBEB', marginTop: 16 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#D97706" />
                    <Text style={[styles.setupBoxTitle, { color: '#D97706', marginBottom: 0 }]}>Save Your Backup Codes</Text>
                  </View>
                  <Text variant="bodySmall" style={{ color: theme.dark ? '#F59E0B' : '#92400E', marginBottom: 16, lineHeight: 18 }}>
                    Store these codes somewhere safe. Each code can only be used once if you lose access to your authenticator.
                  </Text>
                  <View style={styles.backupGrid}>
                    {twoFaBackups.map((code) => (
                      <View key={code} style={[styles.backupCode, { backgroundColor: theme.dark ? '#451A03' : '#FEF9C3', borderColor: theme.dark ? '#D97706' : '#FDE047' }]}>
                        <Text style={{ fontFamily: 'monospace', fontSize: 12, color: theme.dark ? '#FCD34D' : '#78350F', fontWeight: '700' }}>{code}</Text>
                      </View>
                    ))}
                  </View>
                  <Button mode="outlined" compact icon="close" style={{ borderRadius: 8, alignSelf: 'flex-start', marginTop: 12, borderColor: '#D97706' }} textColor="#D97706" onPress={() => setTwoFaBackups([])}>
                    I've saved these codes
                  </Button>
                </View>
              )}

              {is2faEnabled && !showDisable && (
                <Button mode="outlined" icon="shield-remove-outline" textColor={theme.colors.error} style={{ borderColor: theme.colors.error, borderRadius: 8, alignSelf: 'flex-start' }} onPress={() => setShowDisable(true)}>
                  Disable 2FA
                </Button>
              )}

              {is2faEnabled && showDisable && (
                <View style={[styles.setupBox, { borderColor: theme.colors.error + '40', backgroundColor: theme.colors.errorContainer + '20' }]}>
                  <Text style={[styles.setupBoxTitle, { color: theme.colors.error }]}>Confirm Disable 2FA</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurface, marginBottom: 16, lineHeight: 18 }}>
                    Enter your current password to disable two-factor authentication.
                  </Text>
                  <TextInput label="Current Password" value={disablePw} onChangeText={setDisablePw} mode="outlined" secureTextEntry dense left={<TextInput.Icon icon="lock-outline" />} style={{ marginBottom: 16 }} />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Button mode="contained" buttonColor={theme.colors.error} onPress={handleDisable2fa} loading={disabling2fa} disabled={disabling2fa || !disablePw} style={{ borderRadius: 8 }}>Confirm Disable</Button>
                    <Button mode="outlined" onPress={() => { setShowDisable(false); setDisablePw(''); }} style={{ borderRadius: 8 }}>Cancel</Button>
                  </View>
                </View>
              )}
            </AccentCard>

            {/* Sessions */}
            <AccentCard color={SECTION_COLORS.security} bg={surf}>
              <View style={styles.secCardHeader}>
                <View style={[styles.secIcon, { backgroundColor: SECTION_COLORS.security + '20' }]}>
                  <MaterialCommunityIcons name="web" size={18} color={SECTION_COLORS.security} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: theme.colors.onSurface, marginBottom: 2 }]}>Active Sessions</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Review active access for this account.</Text>
                </View>
              </View>
              <View style={[styles.sessionRow, { backgroundColor: theme.colors.surfaceVariant + '60', borderColor: theme.colors.outlineVariant, borderWidth: 1, borderRadius: 10 }]}>
                <View style={[styles.secIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                  <MaterialCommunityIcons name="monitor" size={18} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.onSurface, fontWeight: '600', fontSize: 13 }}>This session — Web Browser</Text>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Current · Active now</Text>
                </View>
                <View style={styles.activePill}>
                  <View style={[styles.activeDot, { backgroundColor: '#10B981' }]} />
                  <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '700' }}>LIVE</Text>
                </View>
              </View>
              <Button mode="outlined" icon="logout" textColor={theme.colors.error} style={{ borderColor: theme.colors.error, borderRadius: 8, marginTop: 16, alignSelf: 'flex-start' }} onPress={handleLogout}>
                Sign Out All Sessions
              </Button>
            </AccentCard>
          </>
        )}

      </ScrollView>

      {/* Revoke confirm dialog */}
      <Portal>
        <Dialog visible={!!revokeTarget} onDismiss={() => setRevokeTarget(null)} style={{ maxWidth: 400, alignSelf: 'center' }}>
          <Dialog.Icon icon="ticket-remove-outline" />
          <Dialog.Title style={{ textAlign: 'center' }}>Revoke Invite?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.onSurface }}>
              The invite for <Text style={{ fontWeight: '700' }}>{revokeTarget?.email || 'open invite'}</Text> will immediately stop working.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRevokeTarget(null)}>Cancel</Button>
            <Button mode="contained" buttonColor={theme.colors.error} onPress={confirmRevoke}>Revoke</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog visible={signOutDialog} onDismiss={() => setSignOutDialog(false)} style={{ maxWidth: 400, alignSelf: 'center', width: '100%' }}>
          <Dialog.Icon icon="logout-variant" />
          <Dialog.Title style={{ textAlign: 'center' }}>Sign Out?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.onSurface }}>You will be signed out of this session.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSignOutDialog(false)}>Cancel</Button>
            <Button mode="contained" buttonColor={theme.colors.error} onPress={doLogout} loading={loggingOut}>Sign Out</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {!!toast && <Toast message={toast.msg} isError={toast.isError} onDone={() => setToast(null)} />}
    </View>
  );
}

/* ══════════════════════════════════
   LEFT PANEL STYLES
══════════════════════════════════ */
const leftStyles = StyleSheet.create({
  panel: {
    width: 272,
    backgroundColor: SHELL_BG,
    borderRightWidth: 1,
    borderRightColor: SHELL_BORDER,
  },
  inner: { paddingBottom: 32 },

  /* Hero */
  hero: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: SHELL_BORDER,
    backgroundColor: SHELL_PANEL,       // solid dark navy — no hue tint
  },
  heroGlow: {
    position: 'absolute', top: -80, width: 240, height: 240, borderRadius: 120,
  },
  avatarRing: {
    width: 90, height: 90, borderRadius: 45, borderWidth: 3,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    boxShadow: '0 0 28px rgba(47,110,183,0.4)',  // blue glow matching SHELL_ACCENT
  },
  heroName: { color: SHELL_TEXT, fontSize: 16, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, marginBottom: 8,
  },
  roleDot: { width: 6, height: 6, borderRadius: 3 },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },
  heroEmail: { color: SHELL_MUTED, fontSize: 11, textAlign: 'center' },

  /* Nav */
  navSection: { paddingHorizontal: 12, paddingTop: 18, paddingBottom: 8 },
  navGroupLabel: { color: SHELL_MUTED, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, paddingHorizontal: 6, marginBottom: 8, textTransform: 'uppercase' },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, paddingLeft: 8, paddingRight: 12,
    borderRadius: 8, marginBottom: 2, borderWidth: 1, borderColor: 'transparent',
    position: 'relative', outlineStyle: 'none',
  },
  navIconBox: {
    width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  navLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: SHELL_MUTED },
  activeRail: { position: 'absolute', right: 0, top: '20%', width: 3, height: '60%', borderRadius: 2 },

  /* Divider */
  divider: { height: 1, backgroundColor: SHELL_BORDER, marginHorizontal: 16, marginVertical: 10 },

  /* Info rows */
  infoBlock: { paddingHorizontal: 12, paddingVertical: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  infoIconWrap: {
    width: 28, height: 28, borderRadius: 7, backgroundColor: SHELL_PANEL,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  infoLabel: { color: SHELL_MUTED, fontSize: 10, fontWeight: '500', marginBottom: 1 },
  infoValue: { color: SHELL_TEXT, fontSize: 12, fontWeight: '600' },

  /* Sign out */
  signOut: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 12, marginTop: 4,
    paddingVertical: 9, paddingLeft: 8, paddingRight: 12,
    borderRadius: 8, borderWidth: 1, borderColor: '#3B1720',
    backgroundColor: '#1A0A0E',
  },
  signOutIcon: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#3B1720',
    justifyContent: 'center', alignItems: 'center',
  },
  signOutText: { color: '#FCA5A5', fontSize: 13, fontWeight: '600' },
  version: { color: SHELL_MUTED, fontSize: 10, textAlign: 'center', marginTop: 18, opacity: 0.6 },
});

/* ══════════════════════════════════
   RIGHT CONTENT STYLES
══════════════════════════════════ */
const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  content: { flex: 1 },
  contentInner: { padding: 28, paddingBottom: 56 },

  /* Profile strip */
  profileStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 18,
    boxShadow: '0 2px 8px rgba(15,37,87,0.06)',
  },
  profileStripRing: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  profileStripName: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  profileStripEmail: { fontSize: 12, fontWeight: '500' },
  profileStripRole: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1, flexShrink: 0 },
  roleDotSm: { width: 5, height: 5, borderRadius: 2.5 },
  profileStripRoleText: { fontSize: 11, fontWeight: '700' },

  /* Card internals */
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  cardTitle: { fontSize: 14, fontWeight: '800' },

  /* Read-only email field */
  readOnlyField: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  readOnlyLabel: { fontSize: 10, fontWeight: '600', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  readOnlyValue: { fontSize: 14, fontWeight: '500' },

  /* Forms */
  nameRow: { flexDirection: 'row', gap: 12 },
  saveRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth },
  unsavedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 12 },
  unsavedDot: { width: 6, height: 6, borderRadius: 3 },

  /* Preferences */
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
  prefIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  prefLabel: { fontSize: 13, fontWeight: '600' },
  prefDesc: { fontSize: 11, marginTop: 1 },

  /* Invite */
  inviteForm: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  rolePickerBtn: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 10, minWidth: 150,
  },
  tokenCard: { borderRadius: 14, borderWidth: 1.5, padding: 20, marginBottom: 18 },
  tokenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tokenBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 12, cursor: 'pointer' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyText: { fontSize: 13 },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, marginBottom: 4 },
  colH: { fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  invIcon: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  rolePill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },

  /* Security */
  secHero: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderRadius: 12, padding: 18, marginBottom: 18,
    boxShadow: '0 2px 8px rgba(15,37,87,0.06)',
  },
  secHeroIcon: { width: 56, height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  secHeroTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  secHeroDesc: { fontSize: 12, lineHeight: 17 },
  secHeroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: 1, flexShrink: 0 },
  secHeroBadgeText: { fontSize: 10, fontWeight: '800' },
  secCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  secIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#052E16', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  setupBox: { borderWidth: 1, borderRadius: 10, padding: 20, marginTop: 4 },
  setupBoxTitle: { fontSize: 14, fontWeight: '800', marginBottom: 10 },
  secretBox: { borderWidth: 1, borderRadius: 8, padding: 12 },
  backupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  backupCode: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
});
