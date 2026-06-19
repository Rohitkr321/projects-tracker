import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Text, useTheme, Button, Menu, Divider, Portal, Dialog } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetOrgUsersQuery, useUpdateUserMutation } from '../../api/userApi';
import { useGetProjectsQuery, useAddProjectMemberMutation, useGetProjectMembersQuery } from '../../api/projectApi';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../constants';
import { formatDate } from '../../utils/dateUtils';
import AppToast from '../../components/common/AppToast';

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

/* ─── Member Card ─── */
const MemberCard = ({ user, isSelected, isMe, canManage, theme, onSelect, onDeactivate }) => {
  const isInactive = user.isActive === false;
  const rc = ROLE_COLOR[user.role] || '#6B7280';
  const total = (user.openIssues || 0) + (user.doneIssues || 0);
  const openPct = total > 0 ? Math.round((user.openIssues / total) * 100) : 0;
  const workColor = openPct > 70 ? '#EF4444' : openPct > 40 ? '#F59E0B' : '#10B981';

  return (
    <TouchableOpacity
      onPress={() => onSelect(user)}
      activeOpacity={0.88}
      style={[
        styles.memberCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: isSelected ? NAVY : theme.colors.outlineVariant,
          borderWidth: isSelected ? 2 : 1,
          boxShadow: isSelected
            ? '0 4px 20px rgba(15,37,87,0.14)'
            : '0 1px 5px rgba(0,0,0,0.05)',
        },
        isInactive && { opacity: 0.65 },
      ]}
    >
      {/* Selected accent strip */}
      {isSelected && <View style={[styles.cardStrip, { backgroundColor: NAVY }]} />}

      {/* Card body */}
      <View style={styles.cardBody}>
        {/* Avatar with status indicator */}
        <View style={{ position: 'relative', alignSelf: 'flex-start', marginTop: 2 }}>
          <View style={[styles.cardAvatarRing, {
            borderColor: isSelected ? NAVY + '30' : theme.colors.outlineVariant,
            backgroundColor: theme.colors.background,
          }]}>
            <UserAvatar user={user} size={46} inactive={isInactive} />
          </View>
          <View style={[styles.cardStatusDot, {
            backgroundColor: isInactive ? '#EF4444' : '#22C55E',
            borderColor: theme.colors.surface,
          }]} />
        </View>

        {/* Name / email / role */}
        <View style={{ flex: 1, marginLeft: 13 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text
              style={[styles.cardName, {
                color: isInactive ? theme.colors.onSurfaceVariant : theme.colors.onSurface,
                textDecorationLine: isInactive ? 'line-through' : 'none',
              }]}
              numberOfLines={1}
            >
              {user.firstName} {user.lastName}
            </Text>
            {isMe && (
              <View style={styles.youBadge}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: NAVY }}>YOU</Text>
              </View>
            )}
          </View>
          <Text style={[styles.cardEmail, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
            {user.email}
          </Text>
          <View style={[styles.rolePill, {
            backgroundColor: (isInactive ? '#94A3B8' : rc) + '14',
            borderColor: (isInactive ? '#94A3B8' : rc) + '40',
            marginTop: 7, alignSelf: 'flex-start',
          }]}>
            <View style={[styles.roleDot, { backgroundColor: isInactive ? '#94A3B8' : rc }]} />
            <Text style={[styles.rolePillTxt, { color: isInactive ? '#94A3B8' : rc }]}>
              {ROLE_LABELS[user.role] || user.role}
            </Text>
          </View>
        </View>

        {/* Deactivate toggle */}
        {canManage && !isMe && (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); onDeactivate(user); }}
            style={[styles.cardActionBtn, {
              backgroundColor: isInactive ? '#F0FDF4' : '#FEF2F2',
              borderColor: isInactive ? '#86EFAC' : '#FCA5A5',
            }]}
          >
            <MaterialCommunityIcons
              name={isInactive ? 'account-check-outline' : 'account-cancel-outline'}
              size={13} color={isInactive ? '#16A34A' : '#DC2626'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Footer: workload stats */}
      <View style={[styles.cardFooter, { borderTopColor: theme.colors.outlineVariant }]}>
        <View style={styles.cardStat}>
          <View style={[styles.cardStatDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.cardStatNum, { color: '#D97706' }]}>{user.openIssues || 0}</Text>
          <Text style={[styles.cardStatLbl, { color: theme.colors.onSurfaceVariant }]}>Open</Text>
        </View>
        <View style={[styles.cardStatSep, { backgroundColor: theme.colors.outlineVariant }]} />
        <View style={styles.cardStat}>
          <View style={[styles.cardStatDot, { backgroundColor: '#22C55E' }]} />
          <Text style={[styles.cardStatNum, { color: '#16A34A' }]}>{user.doneIssues || 0}</Text>
          <Text style={[styles.cardStatLbl, { color: theme.colors.onSurfaceVariant }]}>Done</Text>
        </View>
        <View style={[styles.cardStatSep, { backgroundColor: theme.colors.outlineVariant }]} />
        {total > 0 ? (
          <View style={{ flex: 1, paddingLeft: 10, justifyContent: 'center' }}>
            <View style={[styles.cardWorkTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View style={[styles.cardWorkFill, { width: `${openPct}%`, backgroundColor: workColor }]} />
            </View>
            <Text style={{ fontSize: 10, color: theme.colors.onSurfaceVariant, marginTop: 3 }}>
              {openPct}% open ratio
            </Text>
          </View>
        ) : (
          <Text style={{ fontSize: 10, color: theme.colors.onSurfaceVariant, marginLeft: 10, flex: 1, alignSelf: 'center' }}>
            No issues assigned
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

/* ─── Project assign row ─── */
const ProjectRow = ({ project, userId, selectedRole, theme, onSuccess }) => {
  const { data: membersData } = useGetProjectMembersQuery(project.id);
  const [addMember, { isLoading }] = useAddProjectMemberMutation();
  const [added, setAdded] = useState(false);
  const isMember = added || (membersData?.data || []).some(m => (m.userId ?? m.id) === userId);

  return (
    <View style={[styles.projRow, { borderColor: theme.colors.outlineVariant }]}>
      <View style={[styles.projKey, { backgroundColor: NAVY }]}>
        <Text style={styles.projKeyTxt}>{project.key?.substring(0, 2)}</Text>
      </View>
      <Text style={[styles.projName, { color: theme.colors.onSurface, flex: 1 }]} numberOfLines={1}>
        {project.name}
      </Text>
      {isMember ? (
        <View style={styles.memberBadge}>
          <MaterialCommunityIcons name="check-circle" size={11} color="#10B981" />
          <Text style={styles.memberBadgeTxt}>Member</Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={async () => {
            try {
              await addMember({ projectId: project.id, userId, role: selectedRole }).unwrap();
              setAdded(true);
              onSuccess?.();
            } catch (e) { onSuccess?.(e?.data?.message || 'Failed', true); }
          }}
          disabled={isLoading}
          style={[styles.addBtn, { backgroundColor: NAVY, opacity: isLoading ? 0.6 : 1 }]}
        >
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>+ Add</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/* ─── User Detail Drawer ─── */
const UserDrawer = ({ user, canManage, isMe, theme, onClose, onDeactivate, onRoleChanged, onToast }) => {
  const { data: projectsData } = useGetProjectsQuery({});
  const [roleMenuOpen,   setRoleMenuOpen]   = useState(false);
  const [assignRole,     setAssignRole]     = useState('developer');
  const [assignRoleMenu, setAssignRoleMenu] = useState(false);
  const allProjects  = projectsData?.data?.data || [];
  const isInactive   = user.isActive === false;
  const rc           = ROLE_COLOR[user.role] || '#6B7280';
  const total        = (user.openIssues || 0) + (user.doneIssues || 0);
  const workPct      = total > 0 ? Math.round((user.openIssues / total) * 100) : 0;
  const workColor    = workPct > 70 ? '#EF4444' : workPct > 40 ? '#F59E0B' : '#10B981';
  const surf         = theme.colors.surface;
  const border       = theme.colors.outlineVariant;

  return (
    <View style={[styles.drawer, { backgroundColor: theme.colors.background, borderLeftColor: border }]}>

      {/* ── Slim NAVY header strip ── */}
      <View style={styles.drawerHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="account-details-outline" size={15} color="rgba(255,255,255,0.65)" />
          <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)', letterSpacing: 1 }}>
            MEMBER DETAILS
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.drawerCloseBtn}>
          <MaterialCommunityIcons name="close" size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

        {/* ── Identity card: avatar + name/email/badges + mini stats ── */}
        <View style={[styles.identityCard, { backgroundColor: surf, borderColor: border }]}>
          {/* Top row: avatar + info */}
          <View style={styles.identityTop}>
            <View style={{ position: 'relative' }}>
              <View style={[styles.identityAvatarRing, { borderColor: isInactive ? '#CBD5E1' : rc + '50' }]}>
                <UserAvatar user={user} size={52} inactive={isInactive} />
              </View>
              <View style={[styles.identityStatusDot, {
                backgroundColor: isInactive ? '#EF4444' : '#22C55E',
                borderColor: surf,
              }]} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={[styles.identityName, {
                  color: isInactive ? theme.colors.onSurfaceVariant : theme.colors.onSurface,
                  textDecorationLine: isInactive ? 'line-through' : 'none',
                }]}>
                  {user.firstName} {user.lastName}
                </Text>
                {isMe && (
                  <View style={styles.youBadge}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: NAVY }}>YOU</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.identityEmail, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                {user.email}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <View style={[styles.rolePill, { backgroundColor: (isInactive ? '#94A3B8' : rc) + '14', borderColor: (isInactive ? '#94A3B8' : rc) + '40' }]}>
                  <View style={[styles.roleDot, { backgroundColor: isInactive ? '#94A3B8' : rc }]} />
                  <Text style={[styles.rolePillTxt, { color: isInactive ? '#94A3B8' : rc }]}>
                    {ROLE_LABELS[user.role] || user.role}
                  </Text>
                </View>
                <View style={[styles.identityStatusBadge, {
                  backgroundColor: isInactive ? '#FEF2F2' : '#F0FDF4',
                  borderColor: isInactive ? '#FECACA' : '#BBF7D0',
                }]}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isInactive ? '#EF4444' : '#22C55E' }} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: isInactive ? '#DC2626' : '#16A34A' }}>
                    {isInactive ? 'Inactive' : 'Active'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Mini workload stats row */}
          <View style={[styles.identityStats, { borderTopColor: border }]}>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatNum, { color: '#D97706' }]}>{user.openIssues || 0}</Text>
              <Text style={[styles.miniStatLbl, { color: theme.colors.onSurfaceVariant }]}>Open</Text>
            </View>
            <View style={[styles.miniStatSep, { backgroundColor: border }]} />
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatNum, { color: '#16A34A' }]}>{user.doneIssues || 0}</Text>
              <Text style={[styles.miniStatLbl, { color: theme.colors.onSurfaceVariant }]}>Resolved</Text>
            </View>
            <View style={[styles.miniStatSep, { backgroundColor: border }]} />
            <View style={{ flex: 1, paddingHorizontal: 14, justifyContent: 'center' }}>
              {total > 0 ? (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text style={{ fontSize: 10, color: theme.colors.onSurfaceVariant }}>Open ratio</Text>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: workColor }}>{workPct}%</Text>
                  </View>
                  <View style={[styles.miniWorkBar, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <View style={[styles.miniWorkFill, { width: `${workPct}%`, backgroundColor: workColor }]} />
                  </View>
                </>
              ) : (
                <Text style={{ fontSize: 10, color: theme.colors.onSurfaceVariant }}>No issues assigned</Text>
              )}
            </View>
          </View>
        </View>

        {/* ── Account info ── */}
        <View style={[styles.drawerCard, { backgroundColor: surf, borderColor: border }]}>
          <View style={styles.drawerCardHeader}>
            <View style={[styles.drawerCardAccent, { backgroundColor: rc }]} />
            <Text style={[styles.drawerCardTitle, { color: theme.colors.onSurfaceVariant }]}>ACCOUNT INFO</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.infoIconBox, { backgroundColor: rc + '12' }]}>
              <MaterialCommunityIcons name="shield-account-outline" size={14} color={rc} />
            </View>
            <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>Role</Text>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
              <View style={[styles.rolePill, { backgroundColor: rc + '12', borderColor: rc + '35' }]}>
                <View style={[styles.roleDot, { backgroundColor: isInactive ? '#94A3B8' : rc }]} />
                <Text style={[styles.rolePillTxt, { color: isInactive ? '#94A3B8' : rc }]}>
                  {ROLE_LABELS[user.role] || user.role}
                </Text>
              </View>
              {canManage && !isMe && !isInactive && (
                <Menu
                  visible={roleMenuOpen}
                  onDismiss={() => setRoleMenuOpen(false)}
                  anchor={
                    <TouchableOpacity
                      onPress={() => setRoleMenuOpen(true)}
                      style={[styles.editPencilBtn, { borderColor: border }]}
                    >
                      <MaterialCommunityIcons name="pencil-outline" size={13} color={theme.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  }
                >
                  {ALL_ROLES.map(r => (
                    <Menu.Item key={r} title={ROLE_LABELS[r] || r}
                      leadingIcon={user.role === r ? 'check' : 'shield-account-outline'}
                      onPress={() => { setRoleMenuOpen(false); onRoleChanged(user.id, r); }}
                    />
                  ))}
                </Menu>
              )}
            </View>
          </View>

          <View style={[styles.infoRow, { marginBottom: 0 }]}>
            <View style={[styles.infoIconBox, { backgroundColor: '#4C9AFF12' }]}>
              <MaterialCommunityIcons name="calendar-outline" size={14} color="#4C9AFF" />
            </View>
            <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>Joined</Text>
            <Text style={{ fontSize: 12, color: theme.colors.onSurface, fontWeight: '600' }}>
              {formatDate(user.createdAt)}
            </Text>
          </View>
        </View>

        {/* ── Workload ── */}
        <View style={[styles.drawerCard, { backgroundColor: surf, borderColor: border }]}>
          <View style={styles.drawerCardHeader}>
            <View style={[styles.drawerCardAccent, { backgroundColor: workColor }]} />
            <Text style={[styles.drawerCardTitle, { color: theme.colors.onSurfaceVariant }]}>WORKLOAD</Text>
          </View>
          <View style={styles.statRow}>
            <View style={[styles.statBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
              <Text style={[styles.statVal, { color: '#D97706' }]}>{user.openIssues || 0}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#F59E0B' }} />
                <Text style={[styles.statLabel, { color: '#92400E' }]}>Open</Text>
              </View>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
              <Text style={[styles.statVal, { color: '#16A34A' }]}>{user.doneIssues || 0}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#22C55E' }} />
                <Text style={[styles.statLabel, { color: '#14532D' }]}>Resolved</Text>
              </View>
            </View>
          </View>
          {total > 0 && (
            <View style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>Open ratio</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: workColor }}>{workPct}%</Text>
              </View>
              <View style={[styles.workTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View style={[styles.workFill, { width: `${workPct}%`, backgroundColor: workColor }]} />
              </View>
              <Text style={{ fontSize: 10, color: theme.colors.onSurfaceVariant, marginTop: 5 }}>
                {user.openIssues || 0} of {total} issues still open
              </Text>
            </View>
          )}
          {total === 0 && (
            <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingTop: 8, paddingBottom: 4 }}>
              No issues assigned yet
            </Text>
          )}
        </View>

        {/* ── Project assignment ── */}
        {canManage && !isInactive && (
          <View style={[styles.drawerCard, { backgroundColor: surf, borderColor: border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={styles.drawerCardHeader}>
                <View style={[styles.drawerCardAccent, { backgroundColor: NAVY }]} />
                <Text style={[styles.drawerCardTitle, { color: theme.colors.onSurfaceVariant, marginBottom: 0 }]}>PROJECTS</Text>
              </View>
              <Menu
                visible={assignRoleMenu}
                onDismiss={() => setAssignRoleMenu(false)}
                anchor={
                  <TouchableOpacity
                    onPress={() => setAssignRoleMenu(true)}
                    style={[styles.roleAsBtn, { borderColor: border }]}
                  >
                    <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>
                      as {ROLE_LABELS[assignRole] || assignRole}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={12} color={theme.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                }
              >
                {ALL_ROLES.map(r => (
                  <Menu.Item key={r} title={ROLE_LABELS[r] || r}
                    leadingIcon={assignRole === r ? 'check' : 'shield-account-outline'}
                    onPress={() => { setAssignRole(r); setAssignRoleMenu(false); }}
                  />
                ))}
              </Menu>
            </View>
            {allProjects.map(p => (
              <ProjectRow
                key={p.id} project={p} userId={user.id}
                selectedRole={assignRole} theme={theme}
                onSuccess={(msg, isErr) => onToast(msg || 'Done', isErr ? 'error' : 'success')}
              />
            ))}
            {allProjects.length === 0 && (
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, textAlign: 'center', paddingVertical: 10 }}>
                No projects
              </Text>
            )}
          </View>
        )}

        {/* ── Deactivate ── */}
        {canManage && !isMe && (
          <View style={{ paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 28 }}>
            <TouchableOpacity
              onPress={() => onDeactivate(user)}
              style={[styles.deactivateBtn, {
                backgroundColor: isInactive ? '#F0FDF4' : '#FFF5F5',
                borderColor: isInactive ? '#BBF7D0' : '#FECACA',
              }]}
            >
              <MaterialCommunityIcons
                name={isInactive ? 'account-check-outline' : 'account-cancel-outline'}
                size={16} color={isInactive ? '#16A34A' : '#DC2626'}
              />
              <Text style={{ color: isInactive ? '#16A34A' : '#DC2626', fontSize: 13, fontWeight: '700' }}>
                {isInactive ? 'Reactivate Account' : 'Deactivate Account'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

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
          <MaterialCommunityIcons
            name={isCurrentlyInactive ? 'account-check-outline' : 'account-cancel-outline'}
            size={22} color={isCurrentlyInactive ? '#22C55E' : '#EF4444'}
          />
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

  const [search,           setSearch]           = useState('');
  const [statusFilter,     setStatusFilter]     = useState('active');
  const [roleFilter,       setRoleFilter]       = useState('all');
  const [roleMenuOpen,     setRoleMenuOpen]     = useState(false);
  const [selectedUser,     setSelectedUser]     = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [toast,            setToast]            = useState('');
  const [toastType,        setToastType]        = useState('success');

  const showToast = (msg, type = 'success') => { setToast(msg); setToastType(type); };

  const { data, isLoading, refetch } = useGetOrgUsersQuery({ search, limit: 100 });
  const [updateUser, { isLoading: toggling }] = useUpdateUserMutation();

  const allUsers      = data?.data?.data || [];
  const activeCount   = allUsers.filter(u => u.isActive !== false).length;
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

  const surf   = theme.colors.surface;
  const border = theme.colors.outlineVariant;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>

      {/* ── Page header ── */}
      <View style={[styles.pageHeader, { backgroundColor: surf, borderBottomColor: border }]}>
        <View style={styles.pageTitleRow}>
          <View style={styles.titleAccent} />
          <View>
            <Text style={[styles.pageTitle, { color: theme.colors.onSurface }]}>Team</Text>
            <Text style={[styles.pageSub, { color: theme.colors.onSurfaceVariant }]}>
              {activeCount} active{inactiveCount > 0 ? ` · ${inactiveCount} inactive` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {/* Search */}
          <View style={[styles.searchBox, { backgroundColor: theme.colors.background, borderColor: border }]}>
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
          <View style={styles.chipGroup}>
            {[['all', 'All'], ['active', 'Active'], ['inactive', 'Inactive']].map(([v, l]) => {
              const isActive = statusFilter === v;
              const dotColor = v === 'active' ? '#22C55E' : v === 'inactive' ? '#EF4444' : null;
              return (
                <TouchableOpacity
                  key={v} onPress={() => setStatusFilter(v)}
                  style={[styles.chip, {
                    backgroundColor: isActive ? NAVY : 'transparent',
                    borderColor: isActive ? NAVY : border,
                  }]}
                >
                  {dotColor && (
                    <View style={[styles.chipDot, { backgroundColor: isActive ? '#ffffff88' : dotColor }]} />
                  )}
                  <Text style={{ fontSize: 12, fontWeight: '600', color: isActive ? '#fff' : theme.colors.onSurfaceVariant }}>
                    {l}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Role filter */}
          <Menu
            visible={roleMenuOpen}
            onDismiss={() => setRoleMenuOpen(false)}
            anchor={
              <TouchableOpacity
                onPress={() => setRoleMenuOpen(true)}
                style={[styles.roleFilterBtn, {
                  backgroundColor: roleFilter !== 'all' ? NAVY + '10' : 'transparent',
                  borderColor: roleFilter !== 'all' ? NAVY + '50' : border,
                }]}
              >
                <MaterialCommunityIcons
                  name="filter-variant" size={14}
                  color={roleFilter !== 'all' ? NAVY : theme.colors.onSurfaceVariant}
                />
                <Text style={{ fontSize: 12, fontWeight: '600', color: roleFilter !== 'all' ? NAVY : theme.colors.onSurfaceVariant }}>
                  {roleFilter === 'all' ? 'All roles' : ROLE_LABELS[roleFilter] || roleFilter}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-down" size={13}
                  color={roleFilter !== 'all' ? NAVY : theme.colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            }
          >
            <Menu.Item title="All roles"
              leadingIcon={roleFilter === 'all' ? 'check' : 'account-multiple-outline'}
              onPress={() => { setRoleFilter('all'); setRoleMenuOpen(false); }}
            />
            <Divider />
            {ALL_ROLES.map(r => (
              <Menu.Item key={r} title={ROLE_LABELS[r] || r}
                leadingIcon={roleFilter === r ? 'check' : 'shield-account-outline'}
                onPress={() => { setRoleFilter(r); setRoleMenuOpen(false); }}
              />
            ))}
          </Menu>
        </View>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>

        {/* ── Member card grid ── */}
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cardGrid}>
            {isLoading && (
              <View style={styles.emptyState}>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>Loading…</Text>
              </View>
            )}
            {!isLoading && filtered.length === 0 && (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <MaterialCommunityIcons name="account-group-outline" size={28} color={NAVY} />
                </View>
                <Text style={{ color: theme.colors.onSurface, fontSize: 14, fontWeight: '700', marginTop: 14 }}>
                  No members found
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginTop: 4 }}>
                  Try adjusting your filters
                </Text>
              </View>
            )}
            {!isLoading && filtered.map(u => (
              <MemberCard
                key={u.id}
                user={u}
                isSelected={selectedUser?.id === u.id}
                isMe={u.id === me?.id}
                canManage={canManage}
                theme={theme}
                onSelect={u => setSelectedUser(selectedUser?.id === u.id ? null : u)}
                onDeactivate={setDeactivateTarget}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── Detail Drawer ── */}
        {selectedUser && (
          <UserDrawer
            user={selectedUser}
            canManage={canManage}
            isMe={selectedUser.id === me?.id}
            theme={theme}
            onClose={() => setSelectedUser(null)}
            onDeactivate={u => setDeactivateTarget(u)}
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

  /* ── Page header ── */
  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1,
    boxShadow: '0 1px 4px rgba(6,43,111,0.06)',
  },
  pageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleAccent:  { width: 4, height: 28, borderRadius: 2, backgroundColor: NAVY },
  pageTitle:    { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  pageSub:      { fontSize: 12, marginTop: 2 },

  filterRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, height: 36, minWidth: 180,
  },
  searchInput: { flex: 1, fontSize: 13, height: '100%', borderWidth: 0, backgroundColor: 'transparent' },

  chipGroup: { flexDirection: 'row', gap: 5 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 5, borderRadius: 8, borderWidth: 1, cursor: 'pointer',
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },

  roleFilterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 5, borderRadius: 8, borderWidth: 1, cursor: 'pointer',
  },

  /* ── Body ── */
  body: { flex: 1, flexDirection: 'row', overflow: 'hidden' },

  /* ── Card grid ── */
  cardGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    padding: 18, gap: 14,
    alignContent: 'flex-start',
  },

  /* ── Member card ── */
  memberCard: {
    flex: 1, minWidth: 260,
    borderRadius: 14, overflow: 'hidden',
    cursor: 'pointer',
    position: 'relative',
  },
  cardStrip: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
    zIndex: 1,
  },
  cardBody: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  cardAvatarRing: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
  },
  cardStatusDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6, borderWidth: 2,
  },
  cardName:      { fontSize: 13, fontWeight: '700' },
  cardEmail:     { fontSize: 11, marginTop: 2 },
  cardActionBtn: {
    width: 28, height: 28, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, cursor: 'pointer',
    alignSelf: 'flex-start',
  },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cardStat: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 6 },
  cardStatDot: { width: 6, height: 6, borderRadius: 3 },
  cardStatNum: { fontSize: 14, fontWeight: '800' },
  cardStatLbl: { fontSize: 11 },
  cardStatSep: { width: StyleSheet.hairlineWidth, height: 16, marginHorizontal: 2 },

  cardWorkTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  cardWorkFill:  { height: '100%', borderRadius: 3 },

  /* Shared pills */
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
    alignSelf: 'flex-start', borderWidth: 1,
  },
  roleDot:     { width: 6, height: 6, borderRadius: 3 },
  rolePillTxt: { fontSize: 11, fontWeight: '700' },

  youBadge: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, backgroundColor: '#EFF6FF' },

  emptyState:    { width: '100%', alignItems: 'center', paddingVertical: 70 },
  emptyIconWrap: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },

  /* ── Drawer ── */
  drawer: {
    width: 360, borderLeftWidth: 1,
    boxShadow: '-4px 0 24px rgba(6,43,111,0.10)',
  },

  /* Slim NAVY strip at the top */
  drawerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: NAVY,
    paddingHorizontal: 16, height: 50,
  },
  drawerCloseBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'center', alignItems: 'center',
    cursor: 'pointer',
  },

  /* Identity card (avatar + name/email/badges + mini stats) */
  identityCard: {
    marginHorizontal: 14, marginTop: 14,
    borderRadius: 14, borderWidth: 1,
    overflow: 'hidden',
  },
  identityTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 16,
  },
  identityAvatarRing: {
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 2.5, justifyContent: 'center', alignItems: 'center',
  },
  identityStatusDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6, borderWidth: 2.5,
  },
  identityName:  { fontSize: 15, fontWeight: '800', letterSpacing: -0.1 },
  identityEmail: { fontSize: 11, marginTop: 3 },
  identityStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
  },

  /* Mini workload row at the bottom of identity card */
  identityStats: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth,
  },
  miniStat: { alignItems: 'center', paddingHorizontal: 16 },
  miniStatNum: { fontSize: 20, fontWeight: '800', lineHeight: 24 },
  miniStatLbl: { fontSize: 10, marginTop: 2 },
  miniStatSep: { width: StyleSheet.hairlineWidth, height: 30 },
  miniWorkBar:  { height: 5, borderRadius: 3, overflow: 'hidden' },
  miniWorkFill: { height: '100%', borderRadius: 3 },

  /* Drawer cards */
  drawerCard: {
    marginHorizontal: 14, marginTop: 12,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  drawerCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12,
  },
  drawerCardAccent: {
    width: 4, height: 14, borderRadius: 2,
  },
  drawerCardTitle: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.9, textTransform: 'uppercase',
  },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  infoIconBox: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  infoLabel:   { fontSize: 12, width: 42 },

  editPencilBtn: {
    width: 26, height: 26, borderRadius: 6,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, cursor: 'pointer',
  },

  statRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1, borderRadius: 10, borderWidth: 1,
    paddingVertical: 14, alignItems: 'center',
  },
  statVal:   { fontSize: 28, fontWeight: '800', lineHeight: 32 },
  statLabel: { fontSize: 11, fontWeight: '600' },

  workTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  workFill:  { height: '100%', borderRadius: 4 },

  roleAsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, borderWidth: 1, cursor: 'pointer',
  },

  projRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  projKey:    { width: 28, height: 28, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  projKeyTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  projName:   { fontSize: 12, fontWeight: '600' },

  memberBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, backgroundColor: '#ECFDF5' },
  memberBadgeTxt: { color: '#10B981', fontSize: 10, fontWeight: '700' },
  addBtn:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, cursor: 'pointer' },

  deactivateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, cursor: 'pointer',
  },

  /* Dialog */
  confirmDialog: { maxWidth: 440, alignSelf: 'center', width: '100%', borderRadius: 12 },
  warnBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 14, borderRadius: 10, borderWidth: 1, marginTop: 8,
  },
});
