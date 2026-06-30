import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { Text, useTheme, Button, Menu, Portal, Dialog, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetOrgUsersQuery, useUpdateUserMutation } from '../../api/userApi';
import { useGetProjectsQuery, useAddProjectMemberMutation } from '../../api/projectApi';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../constants';
import BrandLogo from '../../components/common/BrandLogo';

const NAVY = '#0F2557';
const GOLD = '#B8AA6E';
const ALL_ROLES = ['org_admin', 'project_manager', 'team_lead', 'developer', 'reporter', 'viewer'];
const ROLE_COLOR = {
  super_admin: '#7C3AED', org_admin: '#DB2777', project_manager: '#0369A1',
  team_lead: '#0891B2', developer: '#0D9488', reporter: '#15803D', viewer: '#92400E',
};

const avatarHue = (str) => {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = str.charCodeAt(i) * 37 + ((h << 5) - h);
  return Math.abs(h) % 360;
};

const UserAvatar = ({ user, size = 40, inactive }) => {
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  const hue = avatarHue(user?.email);
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: inactive ? '#94A3B8' : `hsl(${hue},52%,42%)`,
      justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ color: '#fff', fontSize: size * 0.36, fontWeight: '800' }}>{initials}</Text>
    </View>
  );
};

const TeamScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user: me } = useAuth();
  const canManage = ['super_admin', 'org_admin', 'project_manager'].includes(me?.role);
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [roleFilterMenu, setRoleFilterMenu] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [assignRoleMenu, setAssignRoleMenu] = useState(false);
  const [assignRole, setAssignRole] = useState('developer');
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);

  const { data: usersData, isLoading, refetch } = useGetOrgUsersQuery({});
  const { data: projectsData } = useGetProjectsQuery({}, { skip: !canManage });
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const [addMember] = useAddProjectMemberMutation();

  const users = usersData?.data?.data || [];
  const projects = projectsData?.data?.data || [];

  const filtered = users.filter(u => {
    const name = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchRole = !filterRole || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const openDetail = (u) => {
    setSelectedUser(u);
    setAssignRole('developer');
    setDetailVisible(true);
  };

  const handleToggleActive = (u) => {
    const action = u.isActive === false ? 'activate' : 'deactivate';
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      `${action.charAt(0).toUpperCase() + action.slice(1)} ${u.firstName} ${u.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: action === 'deactivate' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await updateUser({ id: u.id, isActive: u.isActive === false }).unwrap();
              refetch();
              if (selectedUser?.id === u.id) setSelectedUser({ ...u, isActive: u.isActive === false });
            } catch {
              Alert.alert('Error', 'Failed to update user');
            }
          },
        },
      ],
    );
  };

  const handleRoleChange = async (u, newRole) => {
    setRoleMenuOpen(false);
    try {
      await updateUser({ id: u.id, role: newRole }).unwrap();
      refetch();
      setSelectedUser({ ...u, role: newRole });
    } catch {
      Alert.alert('Error', 'Failed to update role');
    }
  };

  const handleAddToProject = async (project) => {
    setProjectMenuOpen(false);
    if (!selectedUser) return;
    try {
      await addMember({ projectId: project.id, userId: selectedUser.id, role: assignRole }).unwrap();
      Alert.alert('Done', `${selectedUser.firstName} added to ${project.name}`);
    } catch (e) {
      Alert.alert('Error', e?.data?.message || 'Failed to add member');
    }
  };

  const rc = selectedUser ? (ROLE_COLOR[selectedUser.role] || '#6B7280') : NAVY;
  const isSelectedMe = selectedUser?.id === me?.id;
  const isInactive = selectedUser?.isActive === false;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <BrandLogo variant="mark" width={34} height={34} />
            <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: '800' }}>Cadence</Text>
          </View>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {users.length} members
          </Text>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
          <MaterialCommunityIcons name="magnify" size={18} color={theme.colors.onSurfaceVariant} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.onSurface }]}
            placeholder="Search members..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={16} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>

        {/* Role filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          <TouchableOpacity
            onPress={() => setFilterRole('')}
            style={[styles.filterChip, { backgroundColor: !filterRole ? NAVY : theme.colors.surfaceVariant, borderColor: !filterRole ? NAVY : theme.colors.outlineVariant }]}
          >
            <Text style={{ fontSize: 12, color: !filterRole ? '#fff' : theme.colors.onSurfaceVariant, fontWeight: '600' }}>All</Text>
          </TouchableOpacity>
          {ALL_ROLES.map(r => (
            <TouchableOpacity
              key={r}
              onPress={() => setFilterRole(filterRole === r ? '' : r)}
              style={[styles.filterChip, { backgroundColor: filterRole === r ? (ROLE_COLOR[r] + '20') : theme.colors.surfaceVariant, borderColor: filterRole === r ? ROLE_COLOR[r] : theme.colors.outlineVariant }]}
            >
              <Text style={{ fontSize: 12, color: filterRole === r ? ROLE_COLOR[r] : theme.colors.onSurfaceVariant, fontWeight: '600' }}>{ROLE_LABELS[r] || r}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 && (
            <Text style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: 40 }}>No members found</Text>
          )}
          {filtered.map(u => {
            const rc2 = ROLE_COLOR[u.role] || '#6B7280';
            const inactive = u.isActive === false;
            return (
              <TouchableOpacity
                key={u.id}
                onPress={() => openDetail(u)}
                style={[styles.memberRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, opacity: inactive ? 0.7 : 1 }]}
              >
                <View style={{ position: 'relative' }}>
                  <UserAvatar user={u} size={44} inactive={inactive} />
                  <View style={[styles.statusDot, { backgroundColor: inactive ? '#EF4444' : '#22C55E', borderColor: theme.colors.surface }]} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: theme.colors.onSurface, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
                      {u.firstName} {u.lastName}
                    </Text>
                    {u.id === me?.id && (
                      <View style={[styles.youBadge, { backgroundColor: GOLD + '30', borderColor: GOLD }]}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: NAVY }}>YOU</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }} numberOfLines={1}>{u.email}</Text>
                  <View style={[styles.rolePill, { backgroundColor: rc2 + '18', borderColor: rc2 + '40' }]}>
                    <View style={[styles.roleDot, { backgroundColor: inactive ? '#94A3B8' : rc2 }]} />
                    <Text style={{ fontSize: 11, color: inactive ? '#94A3B8' : rc2, fontWeight: '600' }}>
                      {ROLE_LABELS[u.role] || u.role}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ fontSize: 11, color: '#D97706', fontWeight: '700' }}>{u.openIssues || 0} open</Text>
                  <Text style={{ fontSize: 11, color: '#16A34A', fontWeight: '700' }}>{u.doneIssues || 0} done</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {/* Member Detail Dialog */}
      <Portal>
        <Dialog visible={detailVisible} onDismiss={() => setDetailVisible(false)} style={{ borderRadius: 16, maxHeight: Dimensions.get('window').height * 0.85, overflow: 'hidden' }}>
          {selectedUser && (
            <View style={{ borderRadius: 16, overflow: 'hidden' }}>
              <View style={[styles.dialogHeader, { backgroundColor: NAVY }]}>
                <UserAvatar user={selectedUser} size={48} inactive={isInactive} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }} numberOfLines={1}>
                      {selectedUser.firstName} {selectedUser.lastName}
                    </Text>
                    {isSelectedMe && (
                      <View style={[styles.youBadge, { backgroundColor: GOLD + '40', borderColor: GOLD }]}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>YOU</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }} numberOfLines={1}>{selectedUser.email}</Text>
                </View>
                <TouchableOpacity onPress={() => setDetailVisible(false)}>
                  <MaterialCommunityIcons name="close" size={20} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 420 }}>
                <View style={{ padding: 16, gap: 12 }}>
                  {/* Stats */}
                  <View style={[styles.statsRow, { borderColor: theme.colors.outlineVariant }]}>
                    <View style={styles.statItem}>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: '#D97706' }}>{selectedUser.openIssues || 0}</Text>
                      <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>Open</Text>
                    </View>
                    <View style={[styles.statSep, { backgroundColor: theme.colors.outlineVariant }]} />
                    <View style={styles.statItem}>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: '#16A34A' }}>{selectedUser.doneIssues || 0}</Text>
                      <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>Done</Text>
                    </View>
                    <View style={[styles.statSep, { backgroundColor: theme.colors.outlineVariant }]} />
                    <View style={styles.statItem}>
                      <View style={[styles.statusBadge, { backgroundColor: isInactive ? '#FEF2F2' : '#F0FDF4', borderColor: isInactive ? '#FECACA' : '#BBF7D0' }]}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isInactive ? '#EF4444' : '#22C55E' }} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isInactive ? '#DC2626' : '#16A34A' }}>
                          {isInactive ? 'Inactive' : 'Active'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Role row */}
                  <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                    <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>Role</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.rolePill, { backgroundColor: rc + '18', borderColor: rc + '40' }]}>
                        <View style={[styles.roleDot, { backgroundColor: rc }]} />
                        <Text style={{ fontSize: 12, color: rc, fontWeight: '600' }}>{ROLE_LABELS[selectedUser.role] || selectedUser.role}</Text>
                      </View>
                      {canManage && !isSelectedMe && !isInactive && (
                        <Menu
                          visible={roleMenuOpen}
                          onDismiss={() => setRoleMenuOpen(false)}
                          anchor={
                            <TouchableOpacity onPress={() => setRoleMenuOpen(true)} style={[styles.editBtn, { borderColor: theme.colors.outlineVariant }]}>
                              <MaterialCommunityIcons name="pencil-outline" size={14} color={theme.colors.onSurfaceVariant} />
                            </TouchableOpacity>
                          }
                        >
                          {ALL_ROLES.map(r => (
                            <Menu.Item
                              key={r}
                              title={ROLE_LABELS[r] || r}
                              onPress={() => handleRoleChange(selectedUser, r)}
                              leadingIcon={selectedUser.role === r ? 'check' : undefined}
                            />
                          ))}
                        </Menu>
                      )}
                    </View>
                  </View>

                  {/* Add to project */}
                  {canManage && !isSelectedMe && !isInactive && (
                    <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                      <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>Add to Project</Text>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 }}>
                        <Menu
                          visible={assignRoleMenu}
                          onDismiss={() => setAssignRoleMenu(false)}
                          anchor={
                            <TouchableOpacity
                              onPress={() => setAssignRoleMenu(true)}
                              style={[styles.roleDropdown, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surfaceVariant }]}
                            >
                              <Text style={{ color: theme.colors.onSurface, fontSize: 12 }}>{ROLE_LABELS[assignRole] || assignRole}</Text>
                              <MaterialCommunityIcons name="chevron-down" size={14} color={theme.colors.onSurfaceVariant} />
                            </TouchableOpacity>
                          }
                        >
                          {ALL_ROLES.map(r => (
                            <Menu.Item key={r} title={ROLE_LABELS[r] || r} onPress={() => { setAssignRole(r); setAssignRoleMenu(false); }} leadingIcon={assignRole === r ? 'check' : undefined} />
                          ))}
                        </Menu>
                        <Menu
                          visible={projectMenuOpen}
                          onDismiss={() => setProjectMenuOpen(false)}
                          anchor={
                            <Button
                              mode="contained"
                              compact
                              icon="plus"
                              onPress={() => setProjectMenuOpen(true)}
                              style={{ flex: 1 }}
                            >
                              Select Project
                            </Button>
                          }
                        >
                          {projects.map(p => (
                            <Menu.Item key={p.id} title={p.name} leadingIcon="briefcase-outline" onPress={() => handleAddToProject(p)} />
                          ))}
                          {projects.length === 0 && <Menu.Item title="No projects" disabled />}
                        </Menu>
                      </View>
                    </View>
                  )}

                  {/* Deactivate toggle */}
                  {canManage && !isSelectedMe && (
                    <Button
                      mode="outlined"
                      icon={isInactive ? 'account-check-outline' : 'account-cancel-outline'}
                      textColor={isInactive ? '#16A34A' : '#DC2626'}
                      style={{ borderColor: isInactive ? '#86EFAC' : '#FCA5A5' }}
                      onPress={() => { setDetailVisible(false); handleToggleActive(selectedUser); }}
                      loading={updating}
                    >
                      {isInactive ? 'Activate Account' : 'Deactivate Account'}
                    </Button>
                  )}
                </View>
              </ScrollView>
            </View>
          )}
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  backBtn: { marginRight: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  filterRow: { marginTop: 2 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  memberRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginTop: 8, borderRadius: 12, padding: 12, borderWidth: 1 },
  statusDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  youBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start', marginTop: 4 },
  roleDot: { width: 6, height: 6, borderRadius: 3 },
  dialogHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  statsRow: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', padding: 10 },
  statSep: { width: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  infoCard: { borderWidth: 1, borderRadius: 10, padding: 12 },
  infoLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  editBtn: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  roleDropdown: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 },
});

export default TeamScreen;
