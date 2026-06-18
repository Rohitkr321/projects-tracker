import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Animated } from 'react-native';
import { Text, useTheme, Button, Menu, Divider, Portal, Dialog } from 'react-native-paper';

const Toast = ({ message, onDone }) => {
  const [opacity] = useState(new Animated.Value(0));
  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2600),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onDone?.());
  }, []);
  return (
    <Animated.View style={{ position: 'absolute', top: 20, right: 24, backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, zIndex: 9999, opacity }}>
      <Text style={{ color: '#fff', fontSize: 14 }}>{message}</Text>
    </Animated.View>
  );
};
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetOrgUsersQuery, useUpdateUserMutation } from '../../api/userApi';
import { useGetProjectsQuery, useAddProjectMemberMutation, useGetProjectMembersQuery } from '../../api/projectApi';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../constants';
import { formatDate } from '../../utils/dateUtils';

const ALL_ROLES = ['super_admin', 'org_admin', 'project_manager', 'team_lead', 'developer', 'reporter', 'viewer'];

const ROLE_COLOR = {
  super_admin:     '#7C3AED',
  org_admin:       '#DB2777',
  project_manager: '#0369A1',
  team_lead:       '#0891B2',
  developer:       '#0D9488',
  reporter:        '#15803D',
  viewer:          '#92400E',
};

const avatarHue = (str) => {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = str.charCodeAt(i) * 37 + ((h << 5) - h);
  return Math.abs(h) % 360;
};

const UserAvatar = ({ user, size = 40 }) => {
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;
  const hue = avatarHue(user?.email);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue},52%,44%)`, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.36, fontWeight: '800' }}>{initials.toUpperCase()}</Text>
    </View>
  );
};

// Per-project row with its own membership check — hooks cannot be called inside loops
// so each project gets its own component instance.
const ProjectMemberRow = ({ project, userId, selectedRole, theme, onSuccess }) => {
  const { data: membersData }               = useGetProjectMembersQuery(project.id);
  const [addMember, { isLoading: adding }]  = useAddProjectMemberMutation();
  const [justAdded, setJustAdded]           = useState(false);

  const rawMembers = membersData?.data || [];
  const isMember   = justAdded || rawMembers.some(m => (m.userId ?? m.id) === userId);

  const handleAdd = async () => {
    try {
      await addMember({ projectId: project.id, userId, role: selectedRole }).unwrap();
      setJustAdded(true);
      onSuccess?.(`Added to "${project.name}"`);
    } catch (err) {
      onSuccess?.(err?.data?.message || 'Failed to add member', true);
    }
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.outlineVariant }}>
      <View style={{ flex: 1 }}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>{project.name}</Text>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{project.key}</Text>
      </View>
      {isMember ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#ECFDF5' }}>
          <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" />
          <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700' }}>Member</Text>
        </View>
      ) : (
        <Button compact mode="contained" onPress={handleAdd} loading={adding} style={{ borderRadius: 6 }}>
          Add
        </Button>
      )}
    </View>
  );
};

// Sub-component: shows which projects a user is in and lets admin add them to more
const AssignProjectDialog = ({ user, onDismiss, theme }) => {
  const { data: projectsData }      = useGetProjectsQuery({});
  const [selectedRole, setSelectedRole] = useState('developer');
  const [snack, setSnack]               = useState('');

  const allProjects = projectsData?.data?.data || [];

  return (
  <>
    <Dialog visible onDismiss={onDismiss} style={{ maxWidth: 520, alignSelf: 'center', width: '100%' }}>
      <Dialog.Title>Assign {user.firstName} to Project</Dialog.Title>
      <Dialog.ScrollArea style={{ maxHeight: 400 }}>
        <ScrollView>
          {/* Role picker */}
          <View style={{ paddingVertical: 10, paddingHorizontal: 4 }}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0 }}>
              Role to assign
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {['developer', 'reporter', 'team_lead', 'project_manager', 'viewer'].map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setSelectedRole(r)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1,
                    borderColor:     selectedRole === r ? theme.colors.primary : theme.colors.outlineVariant,
                    backgroundColor: selectedRole === r ? theme.colors.primaryContainer : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 12, color: selectedRole === r ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: selectedRole === r ? '700' : '400' }}>
                    {ROLE_LABELS[r] || r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Divider style={{ marginVertical: 8 }} />

          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0, paddingHorizontal: 4 }}>
            Projects
          </Text>

          {allProjects.length === 0 && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, padding: 16, textAlign: 'center' }}>
              No projects found
            </Text>
          )}

          {allProjects.map(p => (
            <ProjectMemberRow
              key={p.id}
              project={p}
              userId={user.id}
              selectedRole={selectedRole}
              theme={theme}
              onSuccess={(msg, isErr) => setSnack(msg)}
            />
          ))}
        </ScrollView>
      </Dialog.ScrollArea>
      <Dialog.Actions>
        <Button onPress={onDismiss}>Close</Button>
      </Dialog.Actions>
    </Dialog>
    {!!snack && <Toast message={snack} onDone={() => setSnack('')} />}
  </>
  );
};

export default function TeamScreen() {
  const theme = useTheme();
  const { user: me } = useAuth();
  const canManage = ['super_admin', 'org_admin'].includes(me?.role);

  const [search, setSearch]                 = useState('');
  const [roleFilter, setRoleFilter]         = useState('all');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [roleMenuForUser, setRoleMenuForUser] = useState(null);
  const [assignTarget, setAssignTarget]     = useState(null); // user to assign

  const { data, isLoading, refetch } = useGetOrgUsersQuery({ search, limit: 100 });
  const [updateUser] = useUpdateUserMutation();

  const users = data?.data?.data || [];
  const filtered = roleFilter === 'all' ? users : users.filter(u => u.role === roleFilter);

  const totalOpen = users.reduce((s, u) => s + (u.openIssues || 0), 0);
  const totalDone = users.reduce((s, u) => s + (u.doneIssues || 0), 0);

  const handleRoleChange = async (userId, newRole) => {
    setRoleMenuForUser(null);
    await updateUser({ id: userId, role: newRole });
    refetch();
  };

  const surf = theme.colors.surface;
  const bg   = theme.colors.background;

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>

      {/* ── Page header ── */}
      <View style={[styles.pageHeader, { backgroundColor: surf, borderBottomColor: theme.colors.outlineVariant }]}>
        <View>
          <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, fontWeight: '800' }}>Team</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {users.length} member{users.length !== 1 ? 's' : ''} · {totalOpen} open issues · {totalDone} resolved
          </Text>
        </View>

        <View style={styles.headerRight}>
          {/* Search */}
          <View style={[styles.searchBox, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}>
            <MaterialCommunityIcons name="magnify" size={16} color={theme.colors.onSurfaceVariant} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search members..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              style={[styles.searchInput, { color: theme.colors.onSurface, outlineStyle: 'none' }]}
            />
          </View>

          {/* Role filter */}
          <Menu
            visible={filterMenuOpen}
            onDismiss={() => setFilterMenuOpen(false)}
            anchor={
              <Button
                mode="outlined"
                icon="filter-variant"
                onPress={() => setFilterMenuOpen(true)}
                compact
                style={{ borderColor: theme.colors.outline, borderRadius: 8 }}
              >
                {roleFilter === 'all' ? 'All roles' : ROLE_LABELS[roleFilter] || roleFilter}
              </Button>
            }
          >
            <Menu.Item title="All roles" leadingIcon={roleFilter === 'all' ? 'check' : 'account-multiple-outline'} onPress={() => { setRoleFilter('all'); setFilterMenuOpen(false); }} />
            <Divider />
            {ALL_ROLES.map(r => (
              <Menu.Item
                key={r}
                title={ROLE_LABELS[r] || r}
                leadingIcon={roleFilter === r ? 'check' : 'shield-account-outline'}
                onPress={() => { setRoleFilter(r); setFilterMenuOpen(false); }}
              />
            ))}
          </Menu>
        </View>
      </View>

      <View style={styles.body}>

        {/* ── Member table ── */}
        <View style={styles.tableWrap}>
          {/* Table header */}
          <View style={[styles.tableHead, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.col, styles.colHead, { flex: 2.5 }]}>Member</Text>
            <Text style={[styles.col, styles.colHead, { flex: 2 }]}>Email</Text>
            <Text style={[styles.col, styles.colHead, { flex: 1 }]}>Role</Text>
            <Text style={[styles.col, styles.colHead, { flex: 0.8, textAlign: 'center' }]}>Open</Text>
            <Text style={[styles.col, styles.colHead, { flex: 0.8, textAlign: 'center' }]}>Done</Text>
            <Text style={[styles.col, styles.colHead, { flex: 1, textAlign: 'center' }]}>Workload</Text>
            <Text style={[styles.col, styles.colHead, { flex: 1 }]}>Joined</Text>
            {canManage && <Text style={[styles.col, styles.colHead, { width: 180 }]}>Manage</Text>}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {isLoading && (
              <View style={styles.loadingRow}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Loading members…</Text>
              </View>
            )}
            {!isLoading && filtered.length === 0 && (
              <View style={styles.emptyRow}>
                <MaterialCommunityIcons name="account-group-outline" size={40} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>No members match your filters</Text>
              </View>
            )}
            {filtered.map((u, i) => {
              const total = (u.openIssues || 0) + (u.doneIssues || 0);
              const workloadPct = total > 0 ? Math.round((u.openIssues / total) * 100) : 0;
              const workloadColor = workloadPct > 70 ? '#EF4444' : workloadPct > 40 ? '#F59E0B' : '#10B981';
              const rc = ROLE_COLOR[u.role] || '#6B7280';
              return (
                <View
                  key={u.id}
                  style={[styles.tableRow, {
                    backgroundColor: i % 2 === 0 ? surf : bg,
                    borderBottomColor: theme.colors.outlineVariant,
                  }]}
                >
                  {/* Member */}
                  <View style={[styles.col, { flex: 2.5, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                    <UserAvatar user={u} size={36} />
                    <View>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                        {u.firstName} {u.lastName}
                      </Text>
                      {u.id === me?.id && (
                        <Text variant="labelSmall" style={{ color: theme.colors.primary }}>You</Text>
                      )}
                    </View>
                  </View>

                  {/* Email */}
                  <Text variant="labelSmall" style={[styles.col, { flex: 2, color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                    {u.email}
                  </Text>

                  {/* Role */}
                  <View style={[styles.col, { flex: 1 }]}>
                    <View style={[styles.rolePill, { backgroundColor: rc + '18', borderColor: rc + '40' }]}>
                      <Text variant="labelSmall" style={{ color: rc, fontWeight: '700', fontSize: 10 }}>
                        {ROLE_LABELS[u.role] || u.role}
                      </Text>
                    </View>
                  </View>

                  {/* Open issues */}
                  <View style={[styles.col, { flex: 0.8, alignItems: 'center' }]}>
                    <View style={[styles.countBubble, { backgroundColor: u.openIssues > 0 ? '#3B82F618' : theme.colors.surfaceVariant }]}>
                      <Text variant="labelSmall" style={{ color: u.openIssues > 0 ? '#3B82F6' : theme.colors.onSurfaceVariant, fontWeight: '700' }}>
                        {u.openIssues || 0}
                      </Text>
                    </View>
                  </View>

                  {/* Done issues */}
                  <View style={[styles.col, { flex: 0.8, alignItems: 'center' }]}>
                    <View style={[styles.countBubble, { backgroundColor: u.doneIssues > 0 ? '#10B98118' : theme.colors.surfaceVariant }]}>
                      <Text variant="labelSmall" style={{ color: u.doneIssues > 0 ? '#10B981' : theme.colors.onSurfaceVariant, fontWeight: '700' }}>
                        {u.doneIssues || 0}
                      </Text>
                    </View>
                  </View>

                  {/* Workload bar */}
                  <View style={[styles.col, { flex: 1, paddingRight: 12 }]}>
                    {total > 0 ? (
                      <View style={{ gap: 4 }}>
                        <View style={[styles.workloadTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
                          <View style={[styles.workloadFill, { width: `${workloadPct}%`, backgroundColor: workloadColor }]} />
                        </View>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}>
                          {workloadPct}% open
                        </Text>
                      </View>
                    ) : (
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>—</Text>
                    )}
                  </View>

                  {/* Joined */}
                  <Text variant="labelSmall" style={[styles.col, { flex: 1, color: theme.colors.onSurfaceVariant }]}>
                    {formatDate(u.createdAt)}
                  </Text>

                  {/* Manage (admin only) */}
                  {canManage && (
                    <View style={{ width: 180, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      {/* Assign to project */}
                      <Button
                        compact
                        mode="outlined"
                        icon="folder-plus-outline"
                        onPress={() => setAssignTarget(u)}
                        style={{ borderRadius: 6 }}
                        contentStyle={{ paddingHorizontal: 2 }}
                      >
                        Assign
                      </Button>
                      {/* Change role */}
                      <Menu
                        visible={roleMenuForUser === u.id}
                        onDismiss={() => setRoleMenuForUser(null)}
                        anchor={
                          <Button
                            compact
                            mode="text"
                            onPress={() => setRoleMenuForUser(u.id)}
                            disabled={u.id === me?.id}
                          >
                            Role
                          </Button>
                        }
                      >
                        <Text variant="labelSmall" style={{ paddingHorizontal: 16, paddingVertical: 8, color: theme.colors.onSurfaceVariant }}>
                          Change role for {u.firstName}
                        </Text>
                        <Divider />
                        {ALL_ROLES.filter(r => r !== 'super_admin').map(r => (
                          <Menu.Item
                            key={r}
                            title={ROLE_LABELS[r] || r}
                            leadingIcon={u.role === r ? 'check' : 'shield-account-outline'}
                            onPress={() => handleRoleChange(u.id, r)}
                          />
                        ))}
                      </Menu>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Right: stats sidebar ── */}
        <View style={[styles.statsSidebar, { backgroundColor: surf, borderLeftColor: theme.colors.outlineVariant }]}>
          <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 20 }}>Team Stats</Text>

          <StatCard label="Total Members" value={users.length} icon="account-group-outline" color="#3B82F6" theme={theme} />
          <StatCard label="Open Issues" value={totalOpen} icon="alert-circle-outline" color="#F59E0B" theme={theme} />
          <StatCard label="Resolved" value={totalDone} icon="check-circle-outline" color="#10B981" theme={theme} />

          <Divider style={{ marginVertical: 20 }} />

          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '700', letterSpacing: 0, marginBottom: 12 }}>
            BY ROLE
          </Text>
          {ALL_ROLES.map(r => {
            const cnt = users.filter(u => u.role === r).length;
            if (cnt === 0) return null;
            const rc = ROLE_COLOR[r] || '#6B7280';
            return (
              <View key={r} style={styles.roleStatRow}>
                <View style={[styles.roleStatDot, { backgroundColor: rc }]} />
                <Text variant="labelSmall" style={{ flex: 1, color: theme.colors.onSurface }}>
                  {ROLE_LABELS[r] || r}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '700' }}>{cnt}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── Assign to Project Dialog ── */}
      <Portal>
        {assignTarget && (
          <AssignProjectDialog
            user={assignTarget}
            theme={theme}
            onDismiss={() => setAssignTarget(null)}
          />
        )}
      </Portal>
    </View>
  );
}

const StatCard = ({ label, value, icon, color, theme }) => (
  <View style={[styles.statCard, { backgroundColor: color + '10' }]}>
    <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
      <MaterialCommunityIcons name={icon} size={18} color={color} />
    </View>
    <View>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'column' },

  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 40, paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, minWidth: 200, height: 38,
  },
  searchInput: {
    flex: 1, fontSize: 14, marginLeft: 8, height: '100%', borderWidth: 0, backgroundColor: 'transparent',
  },

  body: { flex: 1, flexDirection: 'row' },

  tableWrap: { flex: 1, overflow: 'hidden' },
  tableHead: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
  },
  col: { paddingHorizontal: 6 },
  colHead: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  loadingRow: { alignItems: 'center', padding: 40 },
  emptyRow: { alignItems: 'center', paddingVertical: 60 },

  rolePill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start',
    borderWidth: 1,
  },
  countBubble: { width: 32, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  workloadTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  workloadFill: { height: '100%', borderRadius: 3 },

  statsSidebar: {
    width: 220, borderLeftWidth: StyleSheet.hairlineWidth, padding: 20,
  },
  statCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    borderRadius: 10, marginBottom: 10,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  roleStatRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  roleStatDot: { width: 8, height: 8, borderRadius: 4 },
});
