import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Text, useTheme, Button, TextInput, Menu, Divider, Switch, Portal, Dialog } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useLogoutMutation, useChangePasswordMutation } from '../../api/authApi';
import { useCreateInviteMutation, useListInvitesQuery, useRevokeInviteMutation } from '../../api/inviteApi';
import { ROLE_LABELS } from '../../constants';
import { formatDate } from '../../utils/dateUtils';

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
    <Animated.View style={{ position: 'absolute', top: 20, right: 24, flexDirection: 'row', alignItems: 'center', backgroundColor: isError ? '#DC2626' : '#1E293B', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, zIndex: 9999, opacity, gap: 8 }}>
      <MaterialCommunityIcons name={isError ? 'alert-circle' : 'check-circle'} size={16} color="#fff" />
      <Text style={{ color: '#fff', fontSize: 14 }}>{message}</Text>
    </Animated.View>
  );
};

const SECTIONS = [
  { key: 'account',  label: 'Account',        icon: 'account-edit-outline' },
  { key: 'invite',   label: 'Invite Members',  icon: 'account-plus-outline', adminOnly: true },
  { key: 'security', label: 'Security',        icon: 'shield-lock-outline' },
];

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

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const canInvite = ['super_admin', 'org_admin', 'project_manager'].includes(user?.role);

  const [section, setSection] = useState('account');
  const [logoutMutation, { isLoading: loggingOut }]           = useLogoutMutation();
  const [changePassword, { isLoading: changingPw }]           = useChangePasswordMutation();

  // Toast
  const [toast, setToast]             = useState(null); // { msg, isError }

  // Dialogs
  const [signOutDialog, setSignOutDialog] = useState(false);

  // Account form
  const [firstName, setFirstName]     = useState(user?.firstName || '');
  const [lastName, setLastName]       = useState(user?.lastName || '');
  const [timezone, setTimezone]       = useState(user?.timezone || 'UTC');
  const [notifications, setNotifications] = useState(user?.notificationPreferences?.inApp ?? true);
  const [dirty, setDirty]             = useState(false);
  const [saving, setSaving]           = useState(false);

  // Password form
  const [currentPw, setCurrentPw]     = useState('');
  const [newPw, setNewPw]             = useState('');
  const [confirmPw, setConfirmPw]     = useState('');

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
    setSaving(true);
    try {
      showToast('Profile updated successfully.');
      setDirty(false);
    } catch {
      showToast('Failed to save profile', true);
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      showToast('Please fill in all password fields', true); return;
    }
    if (newPw !== confirmPw) {
      showToast('New passwords do not match', true); return;
    }
    if (newPw.length < 8) {
      showToast('Password must be at least 8 characters', true); return;
    }
    try {
      await changePassword({ currentPassword: currentPw, newPassword: newPw }).unwrap();
      showToast('Password updated successfully!');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      showToast(err?.data?.message || 'Failed to update password', true);
    }
  };

  const handleLogout = () => setSignOutDialog(true);

  const doLogout = async () => {
    setSignOutDialog(false);
    try { await logoutMutation().unwrap(); } finally { logout(); }
  };

  // Invite
  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviteRole, setInviteRole]     = useState('developer');
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [generatedToken, setGeneratedToken] = useState(null);
  const [revokeTarget, setRevokeTarget]     = useState(null); // invite object to revoke

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
    } catch {
      showToast('Failed to revoke invite', true);
    } finally {
      setRevokeTarget(null);
    }
  };

  const rc = ROLE_COLOR[user?.role] || '#6B7280';
  const surf = theme.colors.surface;
  const bg   = theme.colors.background;

  const visibleSections = SECTIONS.filter(s => !s.adminOnly || canInvite);

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>

      {/* ── Left panel ── */}
      <View style={[styles.leftPanel, { backgroundColor: surf, borderRightColor: theme.colors.outlineVariant }]}>
        <ScrollView contentContainerStyle={styles.leftInner} showsVerticalScrollIndicator={false}>

          {/* Avatar + name */}
          <View style={styles.avatarBlock}>
            <BigAvatar user={user} size={88} />
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '800', marginTop: 16, textAlign: 'center' }}>
              {user?.firstName} {user?.lastName}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: rc + '18', borderColor: rc + '40' }]}>
              <View style={[styles.roleDot, { backgroundColor: rc }]} />
              <Text variant="labelMedium" style={{ color: rc, fontWeight: '700' }}>
                {ROLE_LABELS[user?.role] || user?.role}
              </Text>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>{user?.email}</Text>
          </View>

          <Divider style={{ marginVertical: 24 }} />

          {/* Nav */}
          {visibleSections.map(s => {
            const active = section === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                onPress={() => setSection(s.key)}
                style={[styles.navItem, active && { backgroundColor: theme.colors.primaryContainer }]}
              >
                <MaterialCommunityIcons name={s.icon} size={18} color={active ? theme.colors.primary : theme.colors.onSurfaceVariant} />
                <Text variant="bodyMedium" style={{ marginLeft: 10, color: active ? theme.colors.primary : theme.colors.onSurface, fontWeight: active ? '700' : '400' }}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <Divider style={{ marginVertical: 20 }} />

          {/* Quick info */}
          <QuickInfo icon="office-building-outline" label="Organization" value="General Aeronautics" theme={theme} />
          <QuickInfo icon="calendar-outline" label="Member since" value={formatDate(user?.createdAt)} theme={theme} />
          <QuickInfo icon="clock-outline" label="Timezone" value={timezone} theme={theme} />

          <Divider style={{ marginVertical: 20 }} />

          <Button
            mode="outlined"
            icon="logout"
            onPress={handleLogout}
            loading={loggingOut}
            style={{ borderColor: theme.colors.error, borderRadius: 8 }}
            textColor={theme.colors.error}
          >
            Sign Out
          </Button>

          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 20 }}>GA Tracker v1.0.0</Text>
        </ScrollView>
      </View>

      {/* ── Right content ── */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>

        {/* ── ACCOUNT ── */}
        {section === 'account' && (
          <>
            <SectionHeader title="Account Settings" desc="Update your display name, timezone, and notification preferences." theme={theme} />

            <View style={[styles.card, { backgroundColor: surf }]}>
              <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Personal Information</Text>

              <View style={styles.nameRow}>
                <View style={{ flex: 1 }}>
                  <TextInput label="First Name" value={firstName} onChangeText={markDirty(setFirstName)} mode="outlined" dense />
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput label="Last Name" value={lastName} onChangeText={markDirty(setLastName)} mode="outlined" dense />
                </View>
              </View>

              <TextInput
                label="Email"
                value={user?.email}
                mode="outlined"
                disabled
                right={<TextInput.Icon icon="lock-outline" />}
                style={{ marginTop: 16 }}
                dense
              />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Email cannot be changed.</Text>

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
                  loading={saving}
                  disabled={!dirty || saving}
                  style={{ borderRadius: 8 }}
                >
                  Save Changes
                </Button>
                {dirty && <Text variant="labelSmall" style={{ color: theme.colors.primary, marginLeft: 12 }}>Unsaved changes</Text>}
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: surf }]}>
              <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Preferences</Text>
              <View style={styles.prefRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>In-App Notifications</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Receive activity notifications inside GA Tracker</Text>
                </View>
                <Switch value={notifications} onValueChange={setNotifications} />
              </View>
            </View>
          </>
        )}

        {/* ── INVITE ── */}
        {section === 'invite' && canInvite && (
          <>
            <SectionHeader title="Invite Members" desc="Generate a single-use token to invite someone to your organization. Tokens expire in 72 hours." theme={theme} />

            <View style={[styles.card, { backgroundColor: surf }]}>
              <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Generate Token</Text>

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
                <Button mode="contained" icon="ticket-outline" onPress={handleGenerateInvite} loading={creating} disabled={creating} style={{ borderRadius: 8 }}>
                  Generate
                </Button>
              </View>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
                If email is set, only that address can use the token.
              </Text>
            </View>

            {!!generatedToken && (
              <View style={[styles.tokenCard, { borderColor: '#34D399', backgroundColor: '#ECFDF5' }]}>
                <View style={styles.tokenHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialCommunityIcons name="check-circle" size={18} color="#065F46" />
                    <Text variant="titleSmall" style={{ color: '#065F46', fontWeight: '700' }}>Token generated!</Text>
                  </View>
                  <Button compact mode="text" textColor="#065F46" icon="content-copy" onPress={handleCopy}>Copy</Button>
                </View>
                <Text variant="bodySmall" style={{ color: '#047857', marginBottom: 10 }}>
                  Share this token with the invitee. It expires in 72 hours and can only be used once.
                </Text>
                <TouchableOpacity onPress={handleCopy} style={[styles.tokenBox, { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' }]}>
                  <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#065F46', flex: 1, letterSpacing: 0 }}>{generatedToken}</Text>
                  <MaterialCommunityIcons name="content-copy" size={14} color="#065F46" />
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.card, { backgroundColor: surf }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface, marginBottom: 0 }]}>Active Invites</Text>
                <View style={[styles.countBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>{pendingInvites.length}</Text>
                </View>
              </View>

              {pendingInvites.length === 0 ? (
                <View style={styles.emptyInvites}>
                  <MaterialCommunityIcons name="ticket-outline" size={32} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>No active invites</Text>
                </View>
              ) : (
                <>
                  <View style={[styles.tableHead, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text style={[styles.colH, { flex: 2 }]}>Email / Type</Text>
                    <Text style={[styles.colH, { flex: 1 }]}>Role</Text>
                    <Text style={[styles.colH, { flex: 1 }]}>Expires</Text>
                    <Text style={[styles.colH, { width: 80 }]}></Text>
                  </View>
                  {pendingInvites.map((inv, i) => (
                    <View key={inv.id} style={[styles.tableRow, {
                      backgroundColor: i % 2 === 0 ? surf : bg,
                      borderBottomColor: theme.colors.outlineVariant,
                    }]}>
                      <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.invIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                          <MaterialCommunityIcons name={inv.email ? 'email-outline' : 'link-variant'} size={13} color={theme.colors.primary} />
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
            </View>
          </>
        )}

        {/* ── SECURITY ── */}
        {section === 'security' && (
          <>
            <SectionHeader title="Security" desc="Manage your password and active sessions." theme={theme} />

            <View style={[styles.card, { backgroundColor: surf }]}>
              <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Change Password</Text>
              <TextInput
                label="Current Password"
                value={currentPw}
                onChangeText={setCurrentPw}
                mode="outlined" secureTextEntry dense style={{ marginBottom: 12 }}
                left={<TextInput.Icon icon="lock-outline" />}
              />
              <TextInput
                label="New Password"
                value={newPw}
                onChangeText={setNewPw}
                mode="outlined" secureTextEntry dense style={{ marginBottom: 12 }}
                left={<TextInput.Icon icon="lock-plus-outline" />}
              />
              <TextInput
                label="Confirm New Password"
                value={confirmPw}
                onChangeText={setConfirmPw}
                mode="outlined" secureTextEntry dense style={{ marginBottom: 20 }}
                left={<TextInput.Icon icon="lock-check-outline" />}
              />
              <Button
                mode="contained" icon="lock-reset"
                style={{ borderRadius: 8, alignSelf: 'flex-start' }}
                loading={changingPw}
                disabled={changingPw || !currentPw || !newPw || !confirmPw}
                onPress={handleChangePassword}
              >
                Update Password
              </Button>
            </View>

            <View style={[styles.card, { backgroundColor: surf }]}>
              <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Sessions</Text>
              <View style={styles.sessionRow}>
                <View style={[styles.sessionIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                  <MaterialCommunityIcons name="web" size={18} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>This session — Web Browser</Text>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Current · Active now</Text>
                </View>
                <View style={[styles.activeDot, { backgroundColor: '#10B981' }]} />
              </View>
              <Button
                mode="outlined" icon="logout"
                textColor={theme.colors.error}
                style={{ borderColor: theme.colors.error, borderRadius: 8, marginTop: 20, alignSelf: 'flex-start' }}
                onPress={handleLogout}
              >
                Sign Out All Sessions
              </Button>
            </View>
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

      {/* Sign Out confirmation dialog */}
      <Portal>
        <Dialog visible={signOutDialog} onDismiss={() => setSignOutDialog(false)} style={{ maxWidth: 400, alignSelf: 'center', width: '100%' }}>
          <Dialog.Icon icon="logout-variant" />
          <Dialog.Title style={{ textAlign: 'center' }}>Sign Out?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.onSurface }}>
              You will be signed out of this session.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSignOutDialog(false)}>Cancel</Button>
            <Button mode="contained" buttonColor={theme.colors.error} onPress={doLogout} loading={loggingOut}>
              Sign Out
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Top-right toast */}
      {!!toast && <Toast message={toast.msg} isError={toast.isError} onDone={() => setToast(null)} />}
    </View>
  );
}

const SectionHeader = ({ title, desc, theme }) => (
  <View style={{ marginBottom: 28 }}>
    <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, fontWeight: '800' }}>{title}</Text>
    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>{desc}</Text>
  </View>
);

const QuickInfo = ({ icon, label, value, theme }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
    <MaterialCommunityIcons name={icon} size={15} color={theme.colors.onSurfaceVariant} style={{ marginTop: 2 }} />
    <View style={{ marginLeft: 10 }}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '500' }}>{value || '—'}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },

  leftPanel: { width: 280, borderRightWidth: StyleSheet.hairlineWidth },
  leftInner: { padding: 28, paddingBottom: 40 },
  avatarBlock: { alignItems: 'center', paddingTop: 8 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  roleDot: { width: 6, height: 6, borderRadius: 3 },
  navItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 2 },

  content: { flex: 1 },
  contentInner: { padding: 28, paddingBottom: 56 },

  card: {
    borderRadius: 14, padding: 24, marginBottom: 20,
    boxShadow: '0px 1px 4px rgba(0,0,0,0.06)',
  },
  cardTitle: { fontWeight: '700', fontSize: 14, marginBottom: 20 },

  nameRow: { flexDirection: 'row', gap: 12 },
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  saveRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth },

  inviteForm: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  rolePickerBtn: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 10, minWidth: 150,
  },

  tokenCard: { borderRadius: 14, borderWidth: 1.5, padding: 20, marginBottom: 20 },
  tokenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tokenBox: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderRadius: 8, padding: 12, cursor: 'pointer',
  },

  tableHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 4 },
  colH: { fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  invIcon: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  rolePill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  countBadge: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  emptyInvites: { alignItems: 'center', paddingVertical: 32 },

  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sessionIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
});
