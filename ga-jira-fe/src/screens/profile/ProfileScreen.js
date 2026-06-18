import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Clipboard, TouchableOpacity } from 'react-native';
import { Text, useTheme, Avatar, Card, List, Divider, Button, Switch, TextInput, Menu, Portal, Dialog, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useLogoutMutation } from '../../api/authApi';
import { useCreateInviteMutation, useListInvitesQuery, useRevokeInviteMutation } from '../../api/inviteApi';
import { ROLE_LABELS } from '../../constants';
import { formatDate } from '../../utils/dateUtils';

const INVITABLE_ROLES = [
  { value: 'developer', label: 'Developer' },
  { value: 'reporter', label: 'Reporter' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'project_manager', label: 'Project Manager' },
];

const ProfileScreen = () => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const [logoutMutation, { isLoading: loggingOut }] = useLogoutMutation();
  const [notifications, setNotifications] = useState(user?.notificationPreferences?.inApp ?? true);

  const canInvite = ['super_admin', 'org_admin', 'project_manager'].includes(user?.role);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('developer');
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [generatedToken, setGeneratedToken] = useState(null);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);

  const { data: invitesResp } = useListInvitesQuery(undefined, { skip: !canInvite });
  const [createInvite, { isLoading: creatingInvite }] = useCreateInviteMutation();
  const [revokeInvite] = useRevokeInviteMutation();

  const pendingInvites = (invitesResp?.data || []).filter(i => !i.acceptedAt && new Date(i.expiresAt) > new Date());

  const initials = user ? `${user.firstName?.[0]}${user.lastName?.[0]}` : 'GA';

  const handleGenerateInvite = async () => {
    try {
      const result = await createInvite({ email: inviteEmail.trim() || undefined, role: inviteRole }).unwrap();
      setGeneratedToken(result.data?.token);
      setTokenDialogOpen(true);
      setInviteEmail('');
    } catch (err) {
      Alert.alert('Error', err?.data?.message || 'Failed to generate invite');
    }
  };

  const handleCopyToken = () => {
    if (generatedToken) {
      Clipboard.setString(generatedToken);
      Alert.alert('Copied!', 'Invite token copied to clipboard');
    }
  };

  const handleRevokeInvite = (id) => {
    Alert.alert('Revoke Invite', 'This invite token will no longer work.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: () => revokeInvite(id) },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logoutMutation().unwrap();
          } finally {
            logout();
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Avatar.Text size={80} label={initials} style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} labelStyle={{ color: '#fff', fontSize: 28 }} />
        <Text variant="headlineSmall" style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text variant="bodyMedium" style={styles.email}>{user?.email}</Text>
        <Text variant="bodySmall" style={styles.role}>{ROLE_LABELS[user?.role] || user?.role}</Text>
      </View>

      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface, marginBottom: 8 }}>Account</Text>
          <List.Item
            title="Full Name"
            description={`${user?.firstName} ${user?.lastName}`}
            left={(p) => <List.Icon {...p} icon="account" />}
          />
          <Divider />
          <List.Item
            title="Email"
            description={user?.email}
            left={(p) => <List.Icon {...p} icon="email" />}
          />
          <Divider />
          <List.Item
            title="Role"
            description={ROLE_LABELS[user?.role] || user?.role}
            left={(p) => <List.Icon {...p} icon="shield-account" />}
          />
          <Divider />
          <List.Item
            title="Timezone"
            description={user?.timezone || 'UTC'}
            left={(p) => <List.Icon {...p} icon="clock-outline" />}
          />
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface, marginBottom: 8 }}>Preferences</Text>
          <View style={styles.prefRow}>
            <View>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>In-App Notifications</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Receive notifications in the app</Text>
            </View>
            <Switch value={notifications} onValueChange={setNotifications} />
          </View>
        </Card.Content>
      </Card>

      {canInvite && (
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface, marginBottom: 12 }}>
              Invite Members
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
              Generate an invite token and share it with someone so they can register and join your organization.
            </Text>

            <TextInput
              label="Email (optional)"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ marginBottom: 10 }}
              left={<TextInput.Icon icon="email-outline" />}
              placeholder="Leave blank for open invite"
            />

            <Menu
              visible={roleMenuOpen}
              onDismiss={() => setRoleMenuOpen(false)}
              anchor={
                <TouchableOpacity
                  onPress={() => setRoleMenuOpen(true)}
                  style={[styles.rolePicker, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }]}
                >
                  <MaterialCommunityIcons name="shield-account-outline" size={18} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, flex: 1, marginLeft: 10 }}>
                    {INVITABLE_ROLES.find(r => r.value === inviteRole)?.label || 'Developer'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={18} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              }
            >
              {INVITABLE_ROLES.map(r => (
                <Menu.Item
                  key={r.value}
                  title={r.label}
                  onPress={() => { setInviteRole(r.value); setRoleMenuOpen(false); }}
                  leadingIcon={inviteRole === r.value ? 'check' : undefined}
                />
              ))}
            </Menu>

            <Button
              mode="contained"
              icon="ticket-outline"
              onPress={handleGenerateInvite}
              loading={creatingInvite}
              disabled={creatingInvite}
              style={{ marginTop: 14 }}
            >
              Generate Invite Token
            </Button>

            {pendingInvites.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                  Active Invites ({pendingInvites.length})
                </Text>
                {pendingInvites.map(invite => (
                  <View key={invite.id} style={[styles.inviteRow, { borderColor: theme.colors.outlineVariant }]}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
                        {invite.email || 'Open invite'}
                      </Text>
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {ROLE_LABELS[invite.role] || invite.role} · Expires {formatDate(invite.expiresAt)}
                      </Text>
                    </View>
                    <Button compact mode="text" textColor={theme.colors.error} onPress={() => handleRevokeInvite(invite.id)}>
                      Revoke
                    </Button>
                  </View>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Button
            mode="outlined"
            onPress={handleLogout}
            loading={loggingOut}
            icon="logout"
            style={{ borderColor: theme.colors.error }}
            textColor={theme.colors.error}
          >
            Logout
          </Button>
        </Card.Content>
      </Card>

      <Text variant="bodySmall" style={styles.version}>GA Tracker v1.0.0 - General Aeronautics</Text>

      {/* Token result dialog */}
      <Portal>
        <Dialog visible={tokenDialogOpen} onDismiss={() => setTokenDialogOpen(false)}>
          <Dialog.Title>Invite Token Generated</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
              Share this token with the person you want to invite. It expires in 72 hours and can only be used once.
            </Text>
            <TouchableOpacity
              onPress={handleCopyToken}
              style={[styles.tokenBox, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}
            >
              <Text variant="bodySmall" style={{ color: theme.colors.onSurface, flex: 1, fontFamily: 'monospace', fontSize: 12 }}>
                {generatedToken}
              </Text>
              <MaterialCommunityIcons name="content-copy" size={16} color={theme.colors.primary} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Tap the token above to copy it.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCopyToken}>Copy Token</Button>
            <Button mode="contained" onPress={() => setTokenDialogOpen(false)}>Done</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 32, alignItems: 'center', gap: 8 },
  name: { color: '#fff', fontWeight: '700' },
  email: { color: 'rgba(255,255,255,0.85)' },
  role: { color: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  card: { margin: 12, borderRadius: 12 },
  prefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  version: { textAlign: 'center', color: '#9CA3AF', marginVertical: 24 },
  rolePicker: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4,
    paddingHorizontal: 12, paddingVertical: 14, marginBottom: 4,
  },
  inviteRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tokenBox: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8,
    padding: 14,
  },
});

export default ProfileScreen;
