import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Animated } from 'react-native';
import { Text, useTheme, Button, Menu, Divider, Portal, Dialog } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetOrgUsersQuery, useUpdateUserMutation } from '../../api/userApi';
import { useGetProjectsQuery, useAddProjectMemberMutation, useGetProjectMembersQuery } from '../../api/projectApi';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../constants';
import { formatDate } from '../../utils/dateUtils';
import AppToast from '../../components/common/AppToast';

const NAVY = '#0F2557';
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
      backgroundColor: inactive ? '#CBD5E1' : `hsl(${hue},52%,42%)`,
      justifyContent: 'center', alignItems: 'center',
      opacity: inactive ? 0.7 : 1,
    }}>
      <Text style={{ color: '#fff', fontSize: size * 0.34, fontWeight: '800' }}>{initials}</Text>
    </View>
  );
};

/* ─── Project assign row (inside drawer) ─── */
const ProjectRow = ({ project, userId, selectedRole, theme, onSuccess }) => {
  const { data: membersData } = useGetProjectMembersQuery(project.id);
  const [addMember, { isLoading }] = useAddProjectMemberMutation();
  const [added, setAdded] = useState(false);
  const isMember = added || (membersData?.data || []).some(m => (m.userId ?? m.id) === userId);

  return (
    <View style={[styles.projRow, { borderBottomColor: theme.colors.outlineVariant }]}>
      <View style={[styles.projKey, { backgroundColor: NAVY }]}>
        <Text style={styles.projKeyTxt}>{project.key?.substring(0, 2)}</Text>
      </View>
      <Text style={[styles.projName, { color: theme.colors.onSurface, flex: 1 }]} numberOfLines={1}>{project.name}</Text>
      {isMember ? (
        <View style={styles.memberBadge}>
          <MaterialCommunityIcons name="check-circle" size={12} color="#10B981" />
          <Text style={styles.memberBadgeTxt}>Member</Text>
        </View>
      ) : (
        <Button compact mode="contained" onPress={async () => {
          try { await addMember({ projectId: project.id, userId, role: selectedRole }).unwrap(); setAdded(true); onSuccess?.(); }
          catch (e) { onSuccess?.(e?.data?.message || 'Failed', true); }
        }} loading={isLoading} style={{ borderRadius: 6 }}>Add</Button>
      )}
    </View>
  );
};

/* ─── User Detail Drawer (right panel) ─── */
const UserDrawer = ({ user, canManage, isMe, theme, onClose, onDeactivate, onRoleChanged, onToast }) => {
  const { data: projectsData } = useGetProjectsQuery({});
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [assignRole, setAssignRole] = useState('developer');
  const [assignRoleMenu, setAssignRoleMenu] = useState(false);
  const allProjects = projectsData?.data?.data || [];
  const isInactive = user.isActive === false;
  const rc = ROLE_COLOR[user.role] || '#6B7280';
  const total = (user.openIssues || 0) + (user.doneIssues || 0);
  const workPct = total > 0 ? Math.round((user.openIssues / total) * 100) : 0;
  const workColor = workPct > 70 ? '#EF4444' : workPct > 40 ? '#F59E0B' : '#10B981';

  return (
    <View style={[styles.drawer, { backgroundColor: theme.colors.surface, borderLeftColor: theme.colors.outlineVariant }]}>
      {/* Header */}
      <View style={[styles.drawerHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
        <Text style={[styles.drawerTitle, { color: theme.colors.onSurface }]}>Member Details</Text>
        <TouchableOpacity onPress={onClose} style={styles.drawerClose}>
          <MaterialCommunityIcons name="close" size={18} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

        {/* Profile card */}
        <View style={[styles.drawerProfile, { borderBottomColor: theme.colors.outlineVariant }]}>
          <UserAvatar user={user} size={56} inactive={isInactive} />
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.drawerName, { color: isInactive ? theme.colors.onSurfaceVariant : theme.colors.onSurface, textDecorationLine: isInactive ? 'line-through' : 'none' }]}>
                {user.firstName} {user.lastName}
              </Text>
              {isMe && <View style={[styles.youBadge, { backgroundColor: '#EFF6FF' }]}><Text style={{ fontSize: 9, fontWeight: '800', color: NAVY }}>YOU</Text></View>}
            </View>
            <Text style={[styles.drawerEmail, { color: theme.colors.onSurfaceVariant }]}>{user.email}</Text>
          </View>

          {/* Status badge */}
          <View style={[styles.statusBig, {
            backgroundColor: isInactive ? '#FEF2F2' : '#F0FDF4',
            borderColor: isInactive ? '#FECACA' : '#BBF7D0',
          }]}>
            <View style={[styles.statusDot, { backgroundColor: isInactive ? '#EF4444' : '#22C55E' }]} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: isInactive ? '#DC2626' : '#16A34A' }}>
              {isInactive ? 'Inactive — cannot login' : 'Active'}
            </Text>
          </View>
        </View>

        {/* Info rows */}
        <View style={[styles.drawerSection, { borderBottomColor: theme.colors.outlineVariant }]}>
          <InfoRow icon="shield-account-outline" label="Role" theme={theme}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.rolePill, { backgroundColor: rc + '15', borderColor: rc + '40' }]}>
                <View style={[styles.roleDot, { backgroundColor: isInactive ? '#94A3B8' : rc }]} />
                <Text style={[styles.rolePillTxt, { color: isInactive ? '#94A3B8' : rc }]}>{ROLE_LABELS[user.role] || user.role}</Text>
              </View>
              {canManage && !isMe && !isInactive && (
                <Menu
                  visible={roleMenuOpen}
                  onDismiss={() => setRoleMenuOpen(false)}
                  anchor={
                    <TouchableOpacity onPress={() => setRoleMenuOpen(true)} style={[styles.editBtn, { borderColor: theme.colors.outlineVariant }]}>
                      <MaterialCommunityIcons name="pencil-outline" size={13} color={theme.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  }
                >
                  {ALL_ROLES.map(r => (
                    <Menu.Item key={r} title={ROLE_LABELS[r] || r}
                      leadingIcon={user.role === r ? 'check' : 'shield-account-outline'}
                      onPress={() => { setRoleMenuOpen(false); onRoleChanged(user.id, r); }} />
                  ))}
                </Menu>
              )}
            </View>
          </InfoRow>

          <InfoRow icon="calendar-outline" label="Joined" theme={theme}>
            <Text style={{ fontSize: 13, color: theme.colors.onSurface }}>{formatDate(user.createdAt)}</Text>
          </InfoRow>
        </View>

        {/* Stats */}
        <View style={[styles.drawerSection, { borderBottomColor: theme.colors.outlineVariant }]}>
          <Text style={[styles.drawerSectionTitle, { color: theme.colors.onSurfaceVariant }]}>WORKLOAD</Text>
          <View style={styles.statRow}>
            <StatBox value={user.openIssues || 0} label="Open" color="#F59E0B" theme={theme} />
            <StatBox value={user.doneIssues || 0} label="Resolved" color="#10B981" theme={theme} />
          </View>
          {total > 0 && !isInactive && (
            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>Open ratio</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: workColor }}>{workPct}%</Text>
              </View>
              <View style={[styles.workTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View style={[styles.workFill, { width: `${workPct}%`, backgroundColor: workColor }]} />
              </View>
            </View>
          )}
        </View>

        {/* Assign to projects */}
        {canManage && !isInactive && (
          <View style={[styles.drawerSection, { borderBottomColor: theme.colors.outlineVariant }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={[styles.drawerSectionTitle, { color: theme.colors.onSurfaceVariant }]}>PROJECTS</Text>
              <Menu
                visible={assignRoleMenu}
                onDismiss={() => setAssignRoleMenu(false)}
                anchor={
                  <TouchableOpacity onPress={() => setAssignRoleMenu(true)} style={[styles.editBtn, { borderColor: theme.colors.outlineVariant, paddingHorizontal: 8, gap: 4, width: 'auto', flexDirection: 'row' }]}>
                    <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>as {ROLE_LABELS[assignRole] || assignRole}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={12} color={theme.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                }
              >
                {ALL_ROLES.map(r => (
                  <Menu.Item key={r} title={ROLE_LABELS[r] || r}
                    leadingIcon={assignRole === r ? 'check' : 'shield-account-outline'}
                    onPress={() => { setAssignRole(r); setAssignRoleMenu(false); }} />
                ))}
              </Menu>
            </View>
            {allProjects.map(p => (
              <ProjectRow key={p.id} project={p} userId={user.id} selectedRole={assignRole} theme={theme} onSuccess={(msg, isErr) => onToast(msg || 'Done', isErr ? 'error' : 'success')} />
            ))}
            {allProjects.length === 0 && (
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, textAlign: 'center', paddingVertical: 12 }}>No projects</Text>
            )}
          </View>
        )}

        {/* Deactivate / Activate */}
        {canManage && !isMe && (
          <View style={styles.drawerSection}>
            <Button
              mode="outlined"
              icon={isInactive ? 'account-check-outline' : 'account-cancel-outline'}
              onPress={() => onDeactivate(user)}
              style={[styles.deactivateBtn, { borderColor: isInactive ? '#22C55E' : '#EF4444' }]}
              labelStyle={{ color: isInactive ? '#22C55E' : '#EF4444', fontSize: 13 }}
            >
              {isInactive ? 'Reactivate Account' : 'Deactivate Account'}
            </Button>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const InfoRow = ({ icon, label, children, theme }) => (
  <View style={styles.infoRow}>
    <MaterialCommunityIcons name={icon} size={15} color={theme.colors.onSurfaceVariant} style={{ marginTop: 1 }} />
    <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
    <View style={{ flex: 1, alignItems: 'flex-end' }}>{children}</View>
  </View>
);

const StatBox = ({ value, label, color, theme }) => (
  <View style={[styles.statBox, { backgroundColor: color + '10', borderColor: color + '30' }]}>
    <Text style={[styles.statBoxVal, { color }]}>{value}</Text>
    <Text style={[styles.statBoxLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
  </View>
);

/* ─── Deactivate Confirm Dialog ─── */
const DeactivateDialog = ({ user, onConfirm, onDismiss, loading }) => {
  const isCurrentlyInactive = user?.isActive === false;
  return (
    <Dialog visible onDismiss={onDismiss} style={styles.confirmDialog}>
      <Dialog.Title style={{ fontWeight: '800', fontSize: 16 }}>
        {isCurrentlyInactive ? 'Reactivate Account' : 'Deactivate Account'}
      </Dialog.Title>
      <Dialog.Content>
        <View style={[styles.warnBox, {
          backgroundColor: isCurrentlyInactive ? '#F0FDF4' : '#FEF2F2',
          borderColor: isCurrentlyInactive ? '#BBF7D0' : '#FECACA',
        }]}>
          <MaterialCommunityIcons name={isCurrentlyInactive ? 'account-check-outline' : 'account-cancel-outline'} size={22} color={isCurrentlyInactive ? '#22C55E' : '#EF4444'} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: isCurrentlyInactive ? '#16A34A' : '#DC2626', fontSize: 13 }}>
              {isCurrentlyInactive ? 'This will restore login access' : 'This will immediately block login'}
            </Text>
            <Text style={{ color: isCurrentlyInactive ? '#14532D' : '#7F1D1D', fontSize: 12, marginTop: 4 }}>
              {isCurrentlyInactive
                ? `${user.firstName} ${user.lastName} will be able to log in again.`
                : `${user.firstName} ${user.lastName} will be signed out and blocked from login.`}
            </Text>
          </View>
        </View>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss}>Cancel</Button>
        <Button mode="contained" onPress={onConfirm} loading={loading}
          buttonColor={isCurrentlyInactive ? '#22C55E' : '#EF4444'} textColor="#fff">
          {isCurrentlyInactive ? 'Reactivate' : 'Deactivate'}
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
};

/* ═══════════════════════════════════════════
   Main Screen
═══════════════════════════════════════════ */
export default function TeamScreen() {
  const theme = useTheme();
  const { user: me } = useAuth();
  const canManage = ['super_admin', 'org_admin'].includes(me?.role);

  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [roleFilter,   setRoleFilter]   = useState('all');
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [toast,    setToast]    = useState('');
  const [toastType,setToastType]= useState('success');

  const showToast = (msg, type = 'success') => { setToast(msg); setToastType(type); };

  const { data, isLoading, refetch } = useGetOrgUsersQuery({ search, limit: 100 });
  const [updateUser, { isLoading: toggling }] = useUpdateUserMutation();

  const allUsers    = data?.data?.data || [];
  const activeCount = allUsers.filter(u => u.isActive !== false).length;
  const inactiveCount = allUsers.filter(u => u.isActive === false).length;

  const filtered = allUsers.filter(u => {
    if (statusFilter === 'active'   && u.isActive === false) return false;
    if (statusFilter === 'inactive' && u.isActive !== false) return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    return true;
  });

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUser({ id: userId, role: newRole }).unwrap();
      showToast('Role updated');
      // update selectedUser locally for instant feedback
      if (selectedUser?.id === userId) setSelectedUser(prev => ({ ...prev, role: newRole }));
      refetch();
    } catch { showToast('Failed to update role', 'error'); }
  };

  const handleToggleActive = async () => {
    if (!deactivateTarget) return;
    const nowActive = deactivateTarget.isActive === false;
    try {
      await updateUser({ id: deactivateTarget.id, isActive: nowActive }).unwrap();
      showToast(nowActive ? `${deactivateTarget.firstName} reactivated` : `${deactivateTarget.firstName} deactivated`);
      setDeactivateTarget(null);
      if (selectedUser?.id === deactivateTarget.id) setSelectedUser(prev => ({ ...prev, isActive: nowActive }));
      refetch();
    } catch (err) { showToast(err?.data?.message || 'Failed to update status', 'error'); }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.titleAccent} />
          <View>
            <Text style={[styles.pageTitle, { color: theme.colors.onSurface }]}>Team</Text>
            <Text style={[styles.pageSub, { color: theme.colors.onSurfaceVariant }]}>
              {activeCount} active{inactiveCount > 0 ? ` · ${inactiveCount} inactive` : ''}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Search */}
          <View style={[styles.searchBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
            <MaterialCommunityIcons name="magnify" size={15} color={theme.colors.onSurfaceVariant} />
            <TextInput
              value={search} onChangeText={setSearch}
              placeholder="Search members…"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              style={[styles.searchInput, { color: theme.colors.onSurface, outlineStyle: 'none' }]}
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialCommunityIcons name="close-circle" size={13} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>

          {/* Status chips */}
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {[['all','All'],['active','Active'],['inactive','Inactive']].map(([v, l]) => (
              <TouchableOpacity key={v} onPress={() => setStatusFilter(v)}
                style={[styles.chip, { backgroundColor: statusFilter === v ? NAVY : 'transparent', borderColor: statusFilter === v ? NAVY : theme.colors.outlineVariant }]}>
                {v !== 'all' && <View style={[styles.chipDot, { backgroundColor: statusFilter === v ? (v === 'active' ? '#86EFAC' : '#FCA5A5') : (v === 'active' ? '#22C55E' : '#EF4444') }]} />}
                <Text style={{ fontSize: 12, fontWeight: '600', color: statusFilter === v ? '#fff' : theme.colors.onSurfaceVariant }}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Role filter */}
          <Menu
            visible={roleMenuOpen}
            onDismiss={() => setRoleMenuOpen(false)}
            anchor={
              <TouchableOpacity
                onPress={() => setRoleMenuOpen(true)}
                style={[styles.roleFilterBtn, {
                  backgroundColor: roleFilter !== 'all' ? NAVY + '0F' : 'transparent',
                  borderColor: roleFilter !== 'all' ? NAVY + '50' : theme.colors.outlineVariant,
                }]}
              >
                <MaterialCommunityIcons name="filter-variant" size={14} color={roleFilter !== 'all' ? NAVY : theme.colors.onSurfaceVariant} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: roleFilter !== 'all' ? NAVY : theme.colors.onSurfaceVariant }}>
                  {roleFilter === 'all' ? 'All roles' : ROLE_LABELS[roleFilter] || roleFilter}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={13} color={roleFilter !== 'all' ? NAVY : theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            }
          >
            <Menu.Item title="All roles" leadingIcon={roleFilter === 'all' ? 'check' : 'account-multiple-outline'} onPress={() => { setRoleFilter('all'); setRoleMenuOpen(false); }} />
            <Divider />
            {ALL_ROLES.map(r => (
              <Menu.Item key={r} title={ROLE_LABELS[r] || r}
                leadingIcon={roleFilter === r ? 'check' : 'shield-account-outline'}
                onPress={() => { setRoleFilter(r); setRoleMenuOpen(false); }} />
            ))}
          </Menu>
        </View>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>

        {/* Member list */}
        <View style={{ flex: 1, overflow: 'hidden' }}>
          {/* Table head */}
          <View style={[styles.tableHead, { backgroundColor: NAVY }]}>
            <Text style={[styles.colH, { flex: 2 }]}>Member</Text>
            <Text style={[styles.colH, { flex: 1 }]}>Role</Text>
            <Text style={[styles.colH, { width: 110, textAlign: 'center' }]}>Status</Text>
            {canManage && <Text style={[styles.colH, { width: 52 }]}></Text>}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {isLoading && (
              <View style={styles.emptyState}>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>Loading…</Text>
              </View>
            )}
            {!isLoading && filtered.length === 0 && (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: '#EFF6FF' }]}>
                  <MaterialCommunityIcons name="account-group-outline" size={26} color={NAVY} />
                </View>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, marginTop: 10 }}>No members match your filter</Text>
              </View>
            )}

            {filtered.map((u, i) => {
              const isInactive = u.isActive === false;
              const isSelected = selectedUser?.id === u.id;
              const rc = ROLE_COLOR[u.role] || '#6B7280';
              const isMe = u.id === me?.id;

              return (
                <TouchableOpacity
                  key={u.id}
                  onPress={() => setSelectedUser(isSelected ? null : u)}
                  style={[
                    styles.row,
                    { backgroundColor: isSelected ? NAVY + '08' : i % 2 === 0 ? theme.colors.surface : theme.colors.background, borderBottomColor: theme.colors.outlineVariant },
                    isSelected && { borderLeftWidth: 3, borderLeftColor: NAVY },
                    isInactive && { opacity: 0.6 },
                  ]}
                >
                  {/* Avatar + name */}
                  <View style={[styles.rowCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                    <UserAvatar user={u} size={38} inactive={isInactive} />
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.memberName, { color: isInactive ? theme.colors.onSurfaceVariant : theme.colors.onSurface, textDecorationLine: isInactive ? 'line-through' : 'none' }]}>
                          {u.firstName} {u.lastName}
                        </Text>
                        {isMe && <View style={[styles.youBadge, { backgroundColor: '#EFF6FF' }]}><Text style={{ fontSize: 9, fontWeight: '800', color: NAVY }}>YOU</Text></View>}
                      </View>
                      <Text style={[styles.memberEmail, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{u.email}</Text>
                    </View>
                  </View>

                  {/* Role */}
                  <View style={[styles.rowCell, { flex: 1 }]}>
                    <View style={[styles.rolePill, { backgroundColor: (isInactive ? '#94A3B8' : rc) + '15', borderColor: (isInactive ? '#94A3B8' : rc) + '40' }]}>
                      <View style={[styles.roleDot, { backgroundColor: isInactive ? '#94A3B8' : rc }]} />
                      <Text style={[styles.rolePillTxt, { color: isInactive ? '#94A3B8' : rc }]} numberOfLines={1}>{ROLE_LABELS[u.role] || u.role}</Text>
                    </View>
                  </View>

                  {/* Status */}
                  <View style={[styles.rowCell, { width: 110, alignItems: 'center' }]}>
                    <View style={[styles.statusPill, {
                      backgroundColor: isInactive ? '#FEF2F2' : '#F0FDF4',
                      borderColor: isInactive ? '#FECACA' : '#BBF7D0',
                    }]}>
                      <View style={[styles.statusDot, { backgroundColor: isInactive ? '#EF4444' : '#22C55E' }]} />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: isInactive ? '#DC2626' : '#16A34A' }}>
                        {isInactive ? 'Inactive' : 'Active'}
                      </Text>
                    </View>
                  </View>

                  {/* Quick deactivate/activate icon */}
                  {canManage && (
                    <View style={[styles.rowCell, { width: 52, alignItems: 'center' }]}>
                      {!isMe && (
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation?.(); setDeactivateTarget(u); }}
                          style={[styles.quickBtn, {
                            backgroundColor: isInactive ? '#F0FDF4' : '#FEF2F2',
                            borderColor: isInactive ? '#BBF7D0' : '#FECACA',
                          }]}
                        >
                          <MaterialCommunityIcons
                            name={isInactive ? 'account-check-outline' : 'account-cancel-outline'}
                            size={14}
                            color={isInactive ? '#22C55E' : '#EF4444'}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Detail Drawer */}
        {selectedUser && (
          <UserDrawer
            user={selectedUser}
            canManage={canManage}
            isMe={selectedUser.id === me?.id}
            theme={theme}
            onClose={() => setSelectedUser(null)}
            onDeactivate={(u) => setDeactivateTarget(u)}
            onRoleChanged={handleRoleChange}
            onToast={showToast}
          />
        )}
      </View>

      {/* ── Deactivate dialog ── */}
      <Portal>
        {deactivateTarget && (
          <DeactivateDialog
            user={deactivateTarget}
            onConfirm={handleToggleActive}
            onDismiss={() => setDeactivateTarget(null)}
            loading={toggling}
          />
        )}
      </Portal>

      {!!toast && <AppToast message={toast} type={toastType} onDone={() => setToast('')} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1,
    boxShadow: '0 1px 4px rgba(6,43,111,0.05)',
  },
  titleAccent: { width: 4, height: 26, borderRadius: 2, backgroundColor: NAVY },
  pageTitle:   { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  pageSub:     { fontSize: 12, marginTop: 2 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, height: 36, minWidth: 190,
  },
  searchInput: { flex: 1, fontSize: 13, height: '100%', borderWidth: 0, backgroundColor: 'transparent' },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, cursor: 'pointer',
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  roleFilterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, cursor: 'pointer',
  },

  body: { flex: 1, flexDirection: 'row', overflow: 'hidden' },

  /* Table */
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11 },
  colH: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: 0.4, paddingHorizontal: 4 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    cursor: 'pointer',
  },
  rowCell: { paddingHorizontal: 4 },

  memberName:  { fontSize: 13, fontWeight: '600' },
  memberEmail: { fontSize: 11, marginTop: 1 },
  youBadge:    { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },

  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 10, alignSelf: 'flex-start', borderWidth: 1, maxWidth: 112,
  },
  roleDot:    { width: 6, height: 6, borderRadius: 3 },
  rolePillTxt:{ fontSize: 10, fontWeight: '700' },

  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },

  quickBtn: {
    width: 28, height: 28, borderRadius: 7,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, cursor: 'pointer',
  },

  emptyState:  { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:   { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },

  /* Drawer */
  drawer: {
    width: 300, borderLeftWidth: 1, flexDirection: 'column',
    boxShadow: '-4px 0 16px rgba(6,43,111,0.07)',
  },
  drawerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1,
  },
  drawerTitle: { fontSize: 14, fontWeight: '700' },
  drawerClose: { width: 28, height: 28, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },

  drawerProfile: {
    alignItems: 'center', paddingVertical: 22, paddingHorizontal: 18,
    borderBottomWidth: 1, gap: 4,
  },
  drawerName:  { fontSize: 15, fontWeight: '700' },
  drawerEmail: { fontSize: 12, marginTop: 2 },
  statusBig: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1,
  },

  drawerSection: {
    paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  drawerSectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  infoLabel: { fontSize: 12, width: 50 },

  editBtn: {
    width: 26, height: 26, borderRadius: 6,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, cursor: 'pointer',
  },

  statRow:    { flexDirection: 'row', gap: 10 },
  statBox:    { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 10, alignItems: 'center' },
  statBoxVal: { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  statBoxLabel: { fontSize: 11, marginTop: 2 },

  workTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  workFill:  { height: '100%', borderRadius: 3 },

  projRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  projKey:    { width: 30, height: 30, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  projKeyTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  projName:   { fontSize: 12, fontWeight: '600' },

  memberBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#ECFDF5' },
  memberBadgeTxt:{ color: '#10B981', fontSize: 10, fontWeight: '700' },

  deactivateBtn: { borderRadius: 8, marginTop: 4 },

  /* Confirm dialog */
  confirmDialog: { maxWidth: 440, alignSelf: 'center', width: '100%', borderRadius: 12 },
  warnBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 14, borderRadius: 10, borderWidth: 1, marginTop: 8,
  },
});
