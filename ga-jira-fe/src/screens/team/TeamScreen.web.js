import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Text, useTheme, Button, Menu, Divider, Portal, Dialog } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetOrgUsersQuery, useUpdateUserMutation } from '../../api/userApi';
import { useGetProjectsQuery, useAddProjectMemberMutation, useGetProjectMembersQuery } from '../../api/projectApi';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../constants';
import { formatDate } from '../../utils/dateUtils';
import colors from '../../theme/colors';
import AppToast from '../../components/common/AppToast';

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

/* ─── Avatar ─── */
const avatarHue = (str) => {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = str.charCodeAt(i) * 37 + ((h << 5) - h);
  return Math.abs(h) % 360;
};
const UserAvatar = ({ user, size = 38 }) => {
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  const hue = avatarHue(user?.email);
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: `hsl(${hue},52%,42%)`,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 2, borderColor: `hsla(${hue},52%,42%,0.3)`,
    }}>
      <Text style={{ color: '#fff', fontSize: size * 0.34, fontWeight: '800' }}>{initials}</Text>
    </View>
  );
};

/* ─── Stat tile (sidebar) ─── */
const StatTile = ({ label, value, icon, color, theme }) => (
  <View style={[styles.statTile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, borderBottomColor: color }]}>
    <View style={{ flex: 1 }}>
      <Text style={[styles.statTileValue, { color: colors.brand.navy }]}>{value}</Text>
      <Text style={[styles.statTileLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
    </View>
    <View style={[styles.statTileIcon, { backgroundColor: color + '18' }]}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
    </View>
  </View>
);

/* ─── Assign project dialog ─── */
const ProjectMemberRow = ({ project, userId, selectedRole, theme, onSuccess }) => {
  const { data: membersData } = useGetProjectMembersQuery(project.id);
  const [addMember, { isLoading: adding }] = useAddProjectMemberMutation();
  const [justAdded, setJustAdded] = useState(false);
  const rawMembers = membersData?.data || [];
  const isMember = justAdded || rawMembers.some(m => (m.userId ?? m.id) === userId);

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
    <View style={[styles.projRow, { borderBottomColor: theme.colors.outlineVariant }]}>
      <View style={[styles.projKey, { backgroundColor: colors.brand.navy }]}>
        <Text style={styles.projKeyText}>{project.key?.substring(0, 2)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.projName, { color: theme.colors.onSurface }]}>{project.name}</Text>
        <Text style={[styles.projSub, { color: theme.colors.onSurfaceVariant }]}>{project.key}</Text>
      </View>
      {isMember ? (
        <View style={styles.memberBadge}>
          <MaterialCommunityIcons name="check-circle" size={13} color="#10B981" />
          <Text style={styles.memberBadgeText}>Member</Text>
        </View>
      ) : (
        <Button compact mode="contained" onPress={handleAdd} loading={adding} style={{ borderRadius: 6 }}>Add</Button>
      )}
    </View>
  );
};

const AssignProjectDialog = ({ user, onDismiss, theme }) => {
  const { data: projectsData } = useGetProjectsQuery({});
  const [selectedRole, setSelectedRole] = useState('developer');
  const [snack, setSnack] = useState('');
  const allProjects = projectsData?.data?.data || [];

  return (
    <>
      <Dialog visible onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.dialogTitle}>Assign {user.firstName} to Project</Dialog.Title>
        <Dialog.ScrollArea style={{ maxHeight: 420 }}>
          <ScrollView style={{ paddingHorizontal: 4 }}>
            <Text style={[styles.dialogSectionLabel, { color: theme.colors.onSurfaceVariant }]}>Role to assign</Text>
            <View style={styles.roleChips}>
              {['developer', 'reporter', 'team_lead', 'project_manager', 'viewer'].map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setSelectedRole(r)}
                  style={[styles.roleChip, {
                    borderColor: selectedRole === r ? theme.colors.primary : theme.colors.outlineVariant,
                    backgroundColor: selectedRole === r ? theme.colors.primaryContainer : 'transparent',
                  }]}
                >
                  <Text style={[styles.roleChipText, {
                    color: selectedRole === r ? theme.colors.primary : theme.colors.onSurfaceVariant,
                    fontWeight: selectedRole === r ? '700' : '400',
                  }]}>{ROLE_LABELS[r] || r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Divider style={{ marginVertical: 12 }} />
            <Text style={[styles.dialogSectionLabel, { color: theme.colors.onSurfaceVariant }]}>Projects</Text>
            {allProjects.length === 0 && (
              <Text style={{ color: theme.colors.onSurfaceVariant, padding: 16, textAlign: 'center', fontSize: 13 }}>No projects found</Text>
            )}
            {allProjects.map(p => (
              <ProjectMemberRow
                key={p.id}
                project={p}
                userId={user.id}
                selectedRole={selectedRole}
                theme={theme}
                onSuccess={(msg) => setSnack(msg)}
              />
            ))}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Close</Button>
        </Dialog.Actions>
      </Dialog>
      {!!snack && <AppToast message={snack} type="success" onDone={() => setSnack('')} />}
    </>
  );
};

/* ─── Main screen ─── */
export default function TeamScreen() {
  const theme = useTheme();
  const { user: me } = useAuth();
  const canManage = ['super_admin', 'org_admin'].includes(me?.role);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [roleMenuForUser, setRoleMenuForUser] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);

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

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>

      {/* ── Page header ── */}
      <View style={[styles.pageHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
        <View style={styles.pageHeaderLeft}>
          <View style={styles.titleAccent} />
          <View>
            <Text style={[styles.pageTitle, { color: theme.colors.onSurface }]}>Team</Text>
            <Text style={[styles.pageSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              {users.length} member{users.length !== 1 ? 's' : ''} · {totalOpen} open · {totalDone} resolved
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.searchBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
            <MaterialCommunityIcons name="magnify" size={16} color={theme.colors.onSurfaceVariant} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search members…"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              style={[styles.searchInput, { color: theme.colors.onSurface, outlineStyle: 'none' }]}
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialCommunityIcons name="close-circle" size={14} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>

          <Menu
            visible={filterMenuOpen}
            onDismiss={() => setFilterMenuOpen(false)}
            anchor={
              <Button
                mode="outlined"
                icon="filter-variant"
                onPress={() => setFilterMenuOpen(true)}
                compact
                style={[styles.filterBtn, { borderColor: theme.colors.outlineVariant }]}
                labelStyle={styles.filterBtnLabel}
              >
                {roleFilter === 'all' ? 'All roles' : ROLE_LABELS[roleFilter] || roleFilter}
              </Button>
            }
          >
            <Menu.Item title="All roles" leadingIcon={roleFilter === 'all' ? 'check' : 'account-multiple-outline'} onPress={() => { setRoleFilter('all'); setFilterMenuOpen(false); }} />
            <Divider />
            {ALL_ROLES.map(r => (
              <Menu.Item key={r} title={ROLE_LABELS[r] || r}
                leadingIcon={roleFilter === r ? 'check' : 'shield-account-outline'}
                onPress={() => { setRoleFilter(r); setFilterMenuOpen(false); }} />
            ))}
          </Menu>
        </View>
      </View>

      <View style={styles.body}>

        {/* ── Table ── */}
        <View style={styles.tableWrap}>

          {/* Table header */}
          <View style={[styles.tableHead, { backgroundColor: colors.brand.navy }]}>
            <Text style={[styles.colHead, { flex: 2.4 }]}>Member</Text>
            <Text style={[styles.colHead, { flex: 1.8 }]}>Email</Text>
            <Text style={[styles.colHead, { flex: 1.1 }]}>Role</Text>
            <Text style={[styles.colHead, { flex: 0.7, textAlign: 'center' }]}>Open</Text>
            <Text style={[styles.colHead, { flex: 0.7, textAlign: 'center' }]}>Done</Text>
            <Text style={[styles.colHead, { flex: 1, textAlign: 'center' }]}>Workload</Text>
            <Text style={[styles.colHead, { flex: 0.9 }]}>Joined</Text>
            {canManage && <Text style={[styles.colHead, { width: 170 }]}>Actions</Text>}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {isLoading && (
              <View style={styles.centeredRow}>
                <Text style={[styles.mutedText, { color: theme.colors.onSurfaceVariant }]}>Loading members…</Text>
              </View>
            )}
            {!isLoading && filtered.length === 0 && (
              <View style={styles.centeredRow}>
                <View style={[styles.emptyIconWrap, { backgroundColor: colors.brand.skyLight }]}>
                  <MaterialCommunityIcons name="account-group-outline" size={28} color={colors.brand.navy} />
                </View>
                <Text style={[styles.mutedText, { color: theme.colors.onSurfaceVariant, marginTop: 10 }]}>
                  No members match your filters
                </Text>
              </View>
            )}

            {filtered.map((u, i) => {
              const total = (u.openIssues || 0) + (u.doneIssues || 0);
              const workloadPct = total > 0 ? Math.round((u.openIssues / total) * 100) : 0;
              const workloadColor = workloadPct > 70 ? '#EF4444' : workloadPct > 40 ? '#F59E0B' : '#10B981';
              const rc = ROLE_COLOR[u.role] || '#6B7280';
              const isMe = u.id === me?.id;

              return (
                <View
                  key={u.id}
                  style={[
                    styles.tableRow,
                    { backgroundColor: i % 2 === 0 ? theme.colors.surface : theme.colors.background,
                      borderBottomColor: theme.colors.outlineVariant },
                    isMe && { borderLeftWidth: 3, borderLeftColor: colors.brand.navy },
                  ]}
                >
                  {/* Member */}
                  <View style={[styles.cell, { flex: 2.4, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                    <UserAvatar user={u} size={36} />
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.memberName, { color: theme.colors.onSurface }]}>
                          {u.firstName} {u.lastName}
                        </Text>
                        {isMe && (
                          <View style={styles.youBadge}>
                            <Text style={styles.youBadgeText}>You</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Email */}
                  <Text style={[styles.cell, styles.emailText, { flex: 1.8, color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                    {u.email}
                  </Text>

                  {/* Role */}
                  <View style={[styles.cell, { flex: 1.1 }]}>
                    <View style={[styles.rolePill, { backgroundColor: rc + '15', borderColor: rc + '40' }]}>
                      <View style={[styles.roleDot, { backgroundColor: rc }]} />
                      <Text style={[styles.rolePillText, { color: rc }]}>
                        {ROLE_LABELS[u.role] || u.role}
                      </Text>
                    </View>
                  </View>

                  {/* Open */}
                  <View style={[styles.cell, { flex: 0.7, alignItems: 'center' }]}>
                    <View style={[styles.countBubble, {
                      backgroundColor: u.openIssues > 0 ? '#3B82F615' : theme.colors.surfaceVariant,
                    }]}>
                      <Text style={[styles.countText, { color: u.openIssues > 0 ? '#3B82F6' : theme.colors.onSurfaceVariant }]}>
                        {u.openIssues || 0}
                      </Text>
                    </View>
                  </View>

                  {/* Done */}
                  <View style={[styles.cell, { flex: 0.7, alignItems: 'center' }]}>
                    <View style={[styles.countBubble, {
                      backgroundColor: u.doneIssues > 0 ? '#10B98115' : theme.colors.surfaceVariant,
                    }]}>
                      <Text style={[styles.countText, { color: u.doneIssues > 0 ? '#10B981' : theme.colors.onSurfaceVariant }]}>
                        {u.doneIssues || 0}
                      </Text>
                    </View>
                  </View>

                  {/* Workload */}
                  <View style={[styles.cell, { flex: 1, paddingRight: 12 }]}>
                    {total > 0 ? (
                      <View style={{ gap: 5 }}>
                        <View style={[styles.workloadTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
                          <View style={[styles.workloadFill, { width: `${workloadPct}%`, backgroundColor: workloadColor }]} />
                        </View>
                        <Text style={[styles.workloadPct, { color: workloadColor }]}>{workloadPct}% open</Text>
                      </View>
                    ) : (
                      <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>—</Text>
                    )}
                  </View>

                  {/* Joined */}
                  <Text style={[styles.cell, styles.joinedText, { flex: 0.9, color: theme.colors.onSurfaceVariant }]}>
                    {formatDate(u.createdAt)}
                  </Text>

                  {/* Actions */}
                  {canManage && (
                    <View style={{ width: 170, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      <Button
                        compact mode="outlined"
                        icon="folder-plus-outline"
                        onPress={() => setAssignTarget(u)}
                        style={styles.actionBtn}
                        contentStyle={{ paddingHorizontal: 4 }}
                        labelStyle={{ fontSize: 12 }}
                      >
                        Assign
                      </Button>
                      <Menu
                        visible={roleMenuForUser === u.id}
                        onDismiss={() => setRoleMenuForUser(null)}
                        anchor={
                          <Button
                            compact mode="text"
                            icon="shield-edit-outline"
                            onPress={() => setRoleMenuForUser(u.id)}
                            disabled={isMe}
                            labelStyle={{ fontSize: 12 }}
                          >
                            Role
                          </Button>
                        }
                      >
                        <Text style={styles.menuHeader}>Change role for {u.firstName}</Text>
                        <Divider />
                        {ALL_ROLES.filter(r => r !== 'super_admin').map(r => (
                          <Menu.Item key={r} title={ROLE_LABELS[r] || r}
                            leadingIcon={u.role === r ? 'check' : 'shield-account-outline'}
                            onPress={() => handleRoleChange(u.id, r)} />
                        ))}
                      </Menu>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Stats sidebar ── */}
        <View style={[styles.sidebar, { backgroundColor: theme.colors.surface, borderLeftColor: theme.colors.outlineVariant }]}>
          <View style={styles.sidebarTitleRow}>
            <View style={styles.sidebarAccent} />
            <Text style={[styles.sidebarTitle, { color: theme.colors.onSurface }]}>Team Stats</Text>
          </View>

          <View style={styles.statTiles}>
            <StatTile label="Total Members" value={users.length}   icon="account-group-outline"  color="#3B82F6" theme={theme} />
            <StatTile label="Open Issues"   value={totalOpen}      icon="alert-circle-outline"   color="#F59E0B" theme={theme} />
            <StatTile label="Resolved"      value={totalDone}      icon="check-circle-outline"   color="#10B981" theme={theme} />
          </View>

          <Divider style={{ marginVertical: 18 }} />

          <Text style={[styles.roleBreakdownTitle, { color: theme.colors.onSurfaceVariant }]}>BY ROLE</Text>
          {ALL_ROLES.map(r => {
            const cnt = users.filter(u => u.role === r).length;
            if (cnt === 0) return null;
            const rc = ROLE_COLOR[r] || '#6B7280';
            const pct = users.length > 0 ? Math.round((cnt / users.length) * 100) : 0;
            return (
              <View key={r} style={styles.roleRow}>
                <View style={[styles.roleDotSm, { backgroundColor: rc }]} />
                <Text style={[styles.roleRowLabel, { color: theme.colors.onSurface }]}>
                  {ROLE_LABELS[r] || r}
                </Text>
                <View style={[styles.roleBarWrap, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <View style={[styles.roleBarFill, { width: `${Math.max(4, pct)}%`, backgroundColor: rc + '80' }]} />
                </View>
                <Text style={[styles.roleCount, { color: theme.colors.onSurfaceVariant }]}>{cnt}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <Portal>
        {assignTarget && (
          <AssignProjectDialog user={assignTarget} theme={theme} onDismiss={() => setAssignTarget(null)} />
        )}
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'column' },

  /* Header */
  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 28, paddingVertical: 16, borderBottomWidth: 1,
    boxShadow: '0px 1px 4px rgba(6,43,111,0.05)',
  },
  pageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleAccent: { width: 4, height: 28, borderRadius: 2, backgroundColor: colors.brand.navy },
  pageTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  pageSubtitle: { fontSize: 12, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, height: 38, minWidth: 220,
  },
  searchInput: { flex: 1, fontSize: 13, height: '100%', borderWidth: 0, backgroundColor: 'transparent' },
  filterBtn: { borderRadius: 8 },
  filterBtnLabel: { fontSize: 13 },

  /* Body */
  body: { flex: 1, flexDirection: 'row', overflow: 'hidden' },

  /* Table */
  tableWrap: { flex: 1, overflow: 'hidden' },
  tableHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 11,
  },
  colHead: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.4, paddingHorizontal: 6 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: { paddingHorizontal: 6 },

  memberName: { fontSize: 13, fontWeight: '600' },
  emailText: { fontSize: 12 },
  joinedText: { fontSize: 12 },

  youBadge: {
    backgroundColor: colors.brand.skyLight, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  youBadgeText: { color: colors.brand.navy, fontSize: 10, fontWeight: '800' },

  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 10, alignSelf: 'flex-start', borderWidth: 1,
  },
  roleDot: { width: 6, height: 6, borderRadius: 3 },
  rolePillText: { fontSize: 10, fontWeight: '700' },

  countBubble: { width: 34, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  countText: { fontSize: 12, fontWeight: '700' },

  workloadTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  workloadFill: { height: '100%', borderRadius: 3 },
  workloadPct: { fontSize: 10, fontWeight: '700' },

  actionBtn: { borderRadius: 6 },
  menuHeader: { paddingHorizontal: 16, paddingVertical: 8, color: '#6B7280', fontSize: 12 },

  centeredRow: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIconWrap: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  mutedText: { fontSize: 13 },

  /* Sidebar */
  sidebar: { width: 230, borderLeftWidth: StyleSheet.hairlineWidth, padding: 18 },
  sidebarTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sidebarAccent: { width: 3, height: 16, borderRadius: 2, backgroundColor: colors.brand.navy },
  sidebarTitle: { fontSize: 14, fontWeight: '700' },
  statTiles: { gap: 10 },
  statTile: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, borderWidth: 1, borderBottomWidth: 3,
    padding: 12, gap: 8,
    boxShadow: '0px 1px 4px rgba(6,43,111,0.06)',
  },
  statTileValue: { fontSize: 22, fontWeight: '800', lineHeight: 26, letterSpacing: -0.5 },
  statTileLabel: { fontSize: 11, marginTop: 2 },
  statTileIcon: { width: 36, height: 36, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },

  roleBreakdownTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 12 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  roleDotSm: { width: 8, height: 8, borderRadius: 4 },
  roleRowLabel: { fontSize: 12, width: 90 },
  roleBarWrap: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  roleBarFill: { height: '100%', borderRadius: 3 },
  roleCount: { fontSize: 12, fontWeight: '700', width: 16, textAlign: 'right' },

  /* Dialog */
  dialog: { maxWidth: 520, alignSelf: 'center', width: '100%', borderRadius: 12 },
  dialogTitle: { fontWeight: '800', fontSize: 16 },
  dialogSectionLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 4 },
  roleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 4 },
  roleChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  roleChipText: { fontSize: 12 },

  projRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  projKey: {
    width: 34, height: 34, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  projKeyText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  projName: { fontSize: 13, fontWeight: '600' },
  projSub: { fontSize: 11 },
  memberBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 16, backgroundColor: '#ECFDF5',
  },
  memberBadgeText: { color: '#10B981', fontSize: 11, fontWeight: '700' },
});
