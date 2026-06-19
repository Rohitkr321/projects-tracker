import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme, TextInput, Button, Menu, Divider, Portal, Dialog } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppToast from '../../components/common/AppToast';
import {
  useGetProjectQuery,
  useUpdateProjectMutation,
  useGetProjectMembersQuery,
  useAddProjectMemberMutation,
  useRemoveProjectMemberMutation,
  useDeleteProjectMutation,
} from '../../api/projectApi';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../constants';

const NAVY = '#0F2557';

const PROJECT_COLORS = [
  NAVY, '#B8860B', '#059669', '#D97706',
  '#DC2626', '#2563EB', '#7C5EA7', '#5A9E71',
  '#DB2777', '#0891B2', '#64748B', '#EA580C',
];

const NAV_SECTIONS = [
  { key: 'general',  label: 'General',        icon: 'tune' },
  { key: 'members',  label: 'Members',         icon: 'account-group-outline' },
  { key: 'access',   label: 'Access & Roles',  icon: 'shield-account-outline' },
  { key: 'danger',   label: 'Danger Zone',     icon: 'alert-circle-outline' },
];

const PROJECT_TYPES = ['scrum', 'kanban', 'business'];
const MEMBER_ROLES  = ['developer', 'reporter', 'viewer', 'team_lead', 'project_manager'];

const AVATAR_COLOR = (str) => {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = str.charCodeAt(i) * 37 + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360},50%,44%)`;
};

const MemberAvatar = ({ user, size = 34 }) => {
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: AVATAR_COLOR(user?.email), justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '700' }}>{initials.toUpperCase()}</Text>
    </View>
  );
};

export default function ProjectSettingsScreen({ route, navigation }) {
  const { projectId } = route.params;
  const theme  = useTheme();
  const { user: me } = useAuth();
  const [section, setSection] = useState('general');

  const { data: projectData } = useGetProjectQuery(projectId);
  const { data: membersData, refetch: refetchMembers } = useGetProjectMembersQuery(projectId);
  const [updateProject, { isLoading: saving }] = useUpdateProjectMutation();
  const [addMember, { isLoading: adding }] = useAddProjectMemberMutation();
  const [removeMember] = useRemoveProjectMemberMutation();
  const [deleteProject, { isLoading: deleting }] = useDeleteProjectMutation();

  const project = projectData?.data;
  const members = membersData?.data || [];
  const canManage = ['super_admin', 'org_admin', 'project_manager'].includes(me?.role);

  // General form state
  const [form, setForm]                 = useState({ name: '', description: '', type: '', key: '' });
  const [selectedColor, setSelectedColor] = useState(NAVY);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [dirty, setDirty]               = useState(false);

  useEffect(() => {
    if (project) {
      setForm({ name: project.name || '', description: project.description || '', type: project.type || 'scrum', key: project.key || '' });
      setSelectedColor(project.color || NAVY);
      setDirty(false);
    }
  }, [project]);

  const setField = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };

  const handleSave = async () => {
    try {
      await updateProject({ id: projectId, name: form.name, description: form.description, type: form.type, color: selectedColor }).unwrap();
      setDirty(false);
      showToast('Project settings saved');
    } catch (err) {
      showToast(err?.data?.message || 'Failed to save settings', true);
    }
  };

  // Members state
  const [addEmail, setAddEmail]   = useState('');
  const [addRole, setAddRole]     = useState('developer');
  const [addRoleMenu, setAddRoleMenu] = useState(false);
  const [roleMenuOpenFor, setRoleMenuOpenFor] = useState(null);

  const handleAddMember = async () => {
    if (!addEmail.trim()) return;
    try {
      await addMember({ projectId, email: addEmail.trim(), role: addRole }).unwrap();
      setAddEmail(''); setAddRole('developer');
      refetchMembers();
      showToast('Member added successfully');
    } catch (err) {
      showToast(err?.data?.message || 'Failed to add member', true);
    }
  };

  const handleRemoveMember = (userId, name) => setRemoveMemberDialog({ userId, name });

  const confirmRemoveMember = async () => {
    if (!removeMemberDialog) return;
    try {
      await removeMember({ projectId, userId: removeMemberDialog.userId }).unwrap();
      showToast(`${removeMemberDialog.name} removed from project`);
      refetchMembers();
    } catch (err) {
      showToast(err?.data?.message || 'Failed to remove member', true);
    } finally {
      setRemoveMemberDialog(null);
    }
  };

  // Remove member confirmation dialog
  const [removeMemberDialog, setRemoveMemberDialog] = useState(null); // { userId, name }

  const [toast, setToast]         = useState('');
  const [toastType, setToastType] = useState('success');
  const showToast = (msg, isError = false) => { setToast(msg); setToastType(isError ? 'error' : 'success'); };

  // Danger zone
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [archiveDialog, setArchiveDialog] = useState(false);

  const handleArchive = async () => {
    try {
      await updateProject({ id: projectId, status: 'archived' }).unwrap();
      setArchiveDialog(false);
      showToast('Project archived successfully');
      navigation.navigate('Projects');
    } catch (err) {
      showToast(err?.data?.message || 'Failed to archive project', true);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== project?.key) return;
    try {
      await deleteProject(projectId).unwrap();
      navigation.navigate('Projects');
    } catch (err) {
      showToast(err?.data?.message || 'Failed to delete project', true);
    }
  };

  const surf = theme.colors.surface;
  const bg   = theme.colors.background;
  const border = theme.colors.outlineVariant;

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>

      {/* ── Left nav ── */}
      <View style={[styles.nav, { backgroundColor: surf, borderRightColor: border }]}>
        {/* Back */}
        <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={18} color={theme.colors.onSurfaceVariant} />
          <Text style={{ color: theme.colors.onSurfaceVariant, marginLeft: 2, fontSize: 13 }}>Back to project</Text>
        </TouchableOpacity>

        <Divider style={{ marginBottom: 12 }} />

        {/* Project key badge */}
        {project && (
          <View style={[styles.projectBadge, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: '800' }}>{project.key}</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.primary, marginTop: 2 }} numberOfLines={1}>{project.name}</Text>
          </View>
        )}

        <Text variant="labelSmall" style={[styles.navGroupLabel, { color: theme.colors.onSurfaceVariant }]}>PROJECT SETTINGS</Text>

        {NAV_SECTIONS.map(s => {
          const active = section === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.navItem, active && { backgroundColor: theme.colors.primaryContainer }]}
              onPress={() => setSection(s.key)}
            >
              <MaterialCommunityIcons
                name={s.icon}
                size={18}
                color={active ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
              <Text
                variant="bodyMedium"
                style={{ marginLeft: 10, color: active ? theme.colors.primary : theme.colors.onSurface, fontWeight: active ? '700' : '400' }}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Main content ── */}
      <ScrollView style={styles.main} contentContainerStyle={styles.mainInner} showsVerticalScrollIndicator={false}>

        {/* ── GENERAL ── */}
        {section === 'general' && (
          <>
            <SectionHeader title="General Settings" desc="Update your project name, description, and configuration." theme={theme} />

            <View style={[styles.card, { backgroundColor: surf }]}>
              <FieldLabel theme={theme}>Project Name</FieldLabel>
              <TextInput
                value={form.name}
                onChangeText={v => setField('name', v)}
                mode="outlined"
                dense
                placeholder="e.g. Flight Control System"
              />

              <FieldLabel theme={theme} mt>Project Key</FieldLabel>
              <TextInput
                value={form.key}
                mode="outlined"
                dense
                disabled
                right={<TextInput.Icon icon="lock-outline" />}
              />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                Project key cannot be changed after creation.
              </Text>

              <FieldLabel theme={theme} mt>Project Type</FieldLabel>
              <Menu
                visible={typeMenuOpen}
                onDismiss={() => setTypeMenuOpen(false)}
                anchor={
                  <TouchableOpacity
                    onPress={() => setTypeMenuOpen(true)}
                    style={[styles.selectBtn, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }]}
                  >
                    <MaterialCommunityIcons name="view-dashboard-outline" size={16} color={theme.colors.onSurfaceVariant} />
                    <Text variant="bodyMedium" style={{ flex: 1, marginLeft: 10, color: theme.colors.onSurface, textTransform: 'capitalize' }}>
                      {form.type}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={16} color={theme.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                }
              >
                {PROJECT_TYPES.map(t => (
                  <Menu.Item
                    key={t}
                    title={t.charAt(0).toUpperCase() + t.slice(1)}
                    leadingIcon={form.type === t ? 'check' : 'view-dashboard-outline'}
                    onPress={() => { setField('type', t); setTypeMenuOpen(false); }}
                  />
                ))}
              </Menu>

              <FieldLabel theme={theme} mt>Description</FieldLabel>
              <textarea
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                rows={4}
                placeholder="What is this project about?"
                style={{
                  width: '100%', resize: 'vertical', padding: '12px 14px',
                  fontSize: 14, fontFamily: 'inherit', borderRadius: 8,
                  border: `1px solid ${theme.colors.outline}`,
                  backgroundColor: theme.dark ? theme.colors.surfaceVariant : '#fff',
                  color: theme.colors.onSurface,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />

              {/* ── Project Colour ── */}
              <View style={[styles.colorSection, { backgroundColor: theme.dark ? '#1F2937' : '#F8FAFC', borderColor: border }]}>
                <View style={styles.colorSectionTop}>
                  <View style={styles.colorSectionLabelRow}>
                    <View style={[styles.colorDot, { backgroundColor: selectedColor }]} />
                    <Text style={[styles.colorSectionTitle, { color: theme.colors.onSurface }]}>Project Colour</Text>
                  </View>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                    Sets the banner colour on the project card
                  </Text>
                </View>

                {/* Mini live preview */}
                <View style={[styles.colorPreviewCard, { borderColor: border, backgroundColor: theme.colors.surface }]}>
                  <View style={[styles.colorPreviewBanner, { backgroundColor: selectedColor }]}>
                    <View style={styles.colorPreviewBadge}>
                      <Text style={styles.colorPreviewBadgeText}>
                        {(form.key || 'PR').substring(0, 2)}
                      </Text>
                    </View>
                    <View style={styles.colorPreviewSprintPill}>
                      <View style={styles.colorPreviewSprintDot} />
                      <Text style={styles.colorPreviewSprintText}>Active Sprint</Text>
                    </View>
                  </View>
                  <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
                    <Text style={{ fontWeight: '700', fontSize: 14, color: theme.colors.onSurface }} numberOfLines={1}>
                      {form.name || 'Project Name'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <View style={[styles.keyChipPreview, { backgroundColor: selectedColor + '18', borderColor: selectedColor + '40' }]}>
                        <Text style={{ color: selectedColor, fontSize: 10, fontWeight: '800' }}>{form.key || 'KEY'}</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>scrum · card preview</Text>
                    </View>
                  </View>
                </View>

                {/* Swatches grid */}
                <View style={styles.colorPicker}>
                  {PROJECT_COLORS.map((color) => {
                    const selected = selectedColor === color;
                    return (
                      <TouchableOpacity
                        key={color}
                        onPress={() => { setSelectedColor(color); setDirty(true); }}
                        style={[styles.colorSwatch, {
                          backgroundColor: color,
                          boxShadow: selected ? `0 0 0 2.5px #fff, 0 0 0 5px ${color}` : 'none',
                          transform: selected ? [{ scale: 1.14 }] : [{ scale: 1 }],
                        }]}
                      >
                        {selected && <MaterialCommunityIcons name="check" size={15} color="#fff" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.saveRow}>
                <Button
                  mode="contained"
                  onPress={handleSave}
                  loading={saving}
                  disabled={!dirty || saving}
                  style={{ borderRadius: 8 }}
                >
                  Save Changes
                </Button>
                {dirty && (
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 12 }}>
                    You have unsaved changes
                  </Text>
                )}
              </View>
            </View>
          </>
        )}

        {/* ── MEMBERS ── */}
        {section === 'members' && (
          <>
            <SectionHeader title="Project Members" desc="Add or remove people from this project. Org admins and PMs always have access." theme={theme} />

            {canManage && (
              <View style={[styles.card, { backgroundColor: surf }]}>
                <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 16 }}>
                  Add Member
                </Text>
                <View style={styles.addMemberRow}>
                  <TextInput
                    label="Email address"
                    value={addEmail}
                    onChangeText={setAddEmail}
                    mode="outlined"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    dense
                    style={{ flex: 2 }}
                    left={<TextInput.Icon icon="email-outline" />}
                  />
                  <Menu
                    visible={addRoleMenu}
                    onDismiss={() => setAddRoleMenu(false)}
                    anchor={
                      <TouchableOpacity
                        onPress={() => setAddRoleMenu(true)}
                        style={[styles.selectBtn, { flex: 1, borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }]}
                      >
                        <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface, textTransform: 'capitalize' }}>
                          {ROLE_LABELS[addRole] || addRole}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={16} color={theme.colors.onSurfaceVariant} />
                      </TouchableOpacity>
                    }
                  >
                    {MEMBER_ROLES.map(r => (
                      <Menu.Item
                        key={r}
                        title={ROLE_LABELS[r] || r}
                        leadingIcon={addRole === r ? 'check' : 'shield-account-outline'}
                        onPress={() => { setAddRole(r); setAddRoleMenu(false); }}
                      />
                    ))}
                  </Menu>
                  <Button
                    mode="contained"
                    onPress={handleAddMember}
                    loading={adding}
                    disabled={!addEmail.trim() || adding}
                    icon="plus"
                    style={{ borderRadius: 8 }}
                  >
                    Add
                  </Button>
                </View>
              </View>
            )}

            <View style={[styles.card, { backgroundColor: surf }]}>
              <View style={[styles.tableHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text style={[styles.colHead, { flex: 2 }]}>Member</Text>
                <Text style={[styles.colHead, { flex: 1.2 }]}>Email</Text>
                <Text style={[styles.colHead, { flex: 1 }]}>Role</Text>
                <Text style={[styles.colHead, { width: 90 }]}></Text>
              </View>

              {members.length === 0 && (
                <View style={styles.emptyRow}>
                  <MaterialCommunityIcons name="account-group-outline" size={32} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>No members yet</Text>
                </View>
              )}

              {members.map((m, i) => {
                const isOrg = String(m.id).startsWith('org-');
                return (
                  <View
                    key={m.id || m.userId}
                    style={[styles.tableRow, {
                      borderBottomColor: border,
                      backgroundColor: i % 2 === 0 ? surf : bg,
                    }]}
                  >
                    {/* Avatar + name */}
                    <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <MemberAvatar user={m.user} size={34} />
                      <View>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                          {m.user?.firstName} {m.user?.lastName}
                        </Text>
                        {isOrg && (
                          <Text variant="labelSmall" style={{ color: theme.colors.primary }}>Org-level access</Text>
                        )}
                      </View>
                    </View>

                    {/* Email */}
                    <Text variant="labelSmall" style={{ flex: 1.2, color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                      {m.user?.email}
                    </Text>

                    {/* Role pill */}
                    <View style={{ flex: 1 }}>
                      <View style={[styles.rolePill, { backgroundColor: theme.colors.primaryContainer }]}>
                        <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '700', textTransform: 'capitalize' }}>
                          {ROLE_LABELS[m.role] || m.role}
                        </Text>
                      </View>
                    </View>

                    {/* Remove */}
                    <View style={{ width: 90, alignItems: 'flex-end' }}>
                      {canManage && !isOrg && m.userId !== me?.id && (
                        <Button
                          compact
                          mode="outlined"
                          textColor={theme.colors.error}
                          style={{ borderColor: theme.colors.error + '60', borderRadius: 6 }}
                          onPress={() => handleRemoveMember(m.userId, `${m.user?.firstName} ${m.user?.lastName}`)}
                        >
                          Remove
                        </Button>
                      )}
                      {isOrg && (
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>inherited</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ── ACCESS & ROLES ── */}
        {section === 'access' && (
          <>
            <SectionHeader title="Access & Roles" desc="Understand what each role can do within this project." theme={theme} />

            <View style={[styles.card, { backgroundColor: surf }]}>
              {[
                { role: 'project_manager', color: '#7C3AED', perms: ['Create & delete issues', 'Manage sprints', 'Add/remove members', 'Edit project settings', 'View all reports'] },
                { role: 'team_lead',       color: '#0369A1', perms: ['Create & edit issues', 'Manage sprint scope', 'Assign issues', 'View reports'] },
                { role: 'developer',       color: '#0891B2', perms: ['Create & edit issues', 'Log time', 'Comment', 'Move issues on board'] },
                { role: 'reporter',        color: '#15803D', perms: ['Create issues', 'Add comments', 'View board & backlog'] },
                { role: 'viewer',          color: '#92400E', perms: ['View issues', 'View board (read-only)'] },
              ].map(({ role, color, perms }) => (
                <View key={role} style={[styles.roleCard, { borderLeftColor: color, backgroundColor: theme.dark ? 'rgba(255,255,255,0.03)' : '#FAFAFA' }]}>
                  <View style={[styles.roleBadge, { backgroundColor: color + '22' }]}>
                    <Text variant="labelMedium" style={{ color, fontWeight: '800', textTransform: 'capitalize' }}>
                      {ROLE_LABELS[role] || role}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    {perms.map(p => (
                      <View key={p} style={styles.permRow}>
                        <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" />
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurface, marginLeft: 8 }}>{p}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── DANGER ZONE ── */}
        {section === 'danger' && (
          <>
            <SectionHeader title="Danger Zone" desc="These actions are irreversible. Please be certain." theme={theme} isDanger />

            <View style={[styles.card, { backgroundColor: surf, borderColor: '#FCA5A5', borderWidth: 1 }]}>
              {/* Archive */}
              <View style={styles.dangerRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>Archive Project</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                    The project will be hidden from active lists but data is preserved.
                  </Text>
                </View>
                <Button
                  mode="outlined"
                  style={{ borderColor: '#F59E0B', borderRadius: 8 }}
                  textColor="#B45309"
                  onPress={() => setArchiveDialog(true)}
                  icon="archive-outline"
                >
                  Archive
                </Button>
              </View>

              <Divider style={{ marginVertical: 20, backgroundColor: '#FCA5A5' }} />

              {/* Delete */}
              <View style={styles.dangerRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={{ color: '#DC2626', fontWeight: '700' }}>Delete Project</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                    Permanently delete this project and all its issues, sprints, and data. This cannot be undone.
                  </Text>
                </View>
                <Button
                  mode="contained"
                  style={{ backgroundColor: '#DC2626', borderRadius: 8 }}
                  onPress={() => { setDeleteDialog(true); setDeleteConfirm(''); }}
                  icon="delete-outline"
                  disabled={!canManage}
                >
                  Delete
                </Button>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Remove member confirmation */}
      <Portal>
        <Dialog visible={!!removeMemberDialog} onDismiss={() => setRemoveMemberDialog(null)} style={{ maxWidth: 400, alignSelf: 'center' }}>
          <Dialog.Icon icon="account-remove-outline" />
          <Dialog.Title style={{ textAlign: 'center' }}>Remove Member</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.onSurface }}>
              Remove <Text style={{ fontWeight: '700' }}>{removeMemberDialog?.name}</Text> from this project?{'\n'}
              They will lose access to all project issues.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRemoveMemberDialog(null)}>Cancel</Button>
            <Button mode="contained" buttonColor={theme.colors.error} onPress={confirmRemoveMember}>
              Remove
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Archive confirmation */}
      <Portal>
        <Dialog visible={archiveDialog} onDismiss={() => setArchiveDialog(false)} style={{ maxWidth: 420, alignSelf: 'center' }}>
          <Dialog.Icon icon="archive-outline" />
          <Dialog.Title style={{ textAlign: 'center' }}>Archive Project</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.onSurface }}>
              Archive <Text style={{ fontWeight: '700' }}>{project?.name}</Text>?{'\n\n'}
              The project will be hidden from active lists but all data (issues, sprints, members) will be preserved.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setArchiveDialog(false)}>Cancel</Button>
            <Button mode="contained" buttonColor="#B45309" onPress={handleArchive}>
              Archive Project
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Delete confirmation dialog */}
      <Portal>
        <Dialog visible={deleteDialog} onDismiss={() => setDeleteDialog(false)} style={{ maxWidth: 420, alignSelf: 'center' }}>
          <Dialog.Icon icon="alert-circle-outline" color="#DC2626" />
          <Dialog.Title style={{ textAlign: 'center', color: '#DC2626' }}>Delete Project</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, textAlign: 'center', marginBottom: 16 }}>
              This will permanently delete <Text style={{ fontWeight: '700' }}>{project?.name}</Text> and all its data.{'\n\n'}
              Type <Text style={{ fontWeight: '800', fontFamily: 'monospace' }}>{project?.key}</Text> to confirm:
            </Text>
            <TextInput
              value={deleteConfirm}
              onChangeText={setDeleteConfirm}
              mode="outlined"
              placeholder={project?.key}
              autoCapitalize="characters"
              error={deleteConfirm.length > 0 && deleteConfirm !== project?.key}
              dense
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialog(false)}>Cancel</Button>
            <Button
              mode="contained"
              style={{ backgroundColor: '#DC2626' }}
              onPress={handleDelete}
              disabled={deleteConfirm !== project?.key || deleting}
              loading={deleting}
            >
              Delete Forever
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {!!toast && <AppToast message={toast} type={toastType} onDone={() => setToast('')} />}
    </View>
  );
}

const SectionHeader = ({ title, desc, theme, isDanger }) => (
  <View style={styles.sectionHeader}>
    <Text variant="headlineSmall" style={{ color: isDanger ? '#DC2626' : theme.colors.onBackground, fontWeight: '800' }}>
      {title}
    </Text>
    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>{desc}</Text>
  </View>
);

const FieldLabel = ({ children, theme, mt }) => (
  <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 6, marginTop: mt ? 20 : 0 }}>
    {children}
  </Text>
);

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },

  nav: { width: 240, borderRightWidth: 1, padding: 20 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, opacity: 0.7 },
  projectBadge: { borderRadius: 10, padding: 12, marginBottom: 20, alignItems: 'center' },
  navGroupLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0, textTransform: 'uppercase', marginBottom: 6 },
  navItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 2 },

  main: { flex: 1 },
  mainInner: { padding: 28, paddingBottom: 56 },
  sectionHeader: { marginBottom: 20 },

  card: {
    borderRadius: 14, padding: 24, marginBottom: 20,
    boxShadow: '0px 1px 4px rgba(0,0,0,0.06)',
  },
  saveRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24 },

  addMemberRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 12, minHeight: 48,
  },

  tableHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 8, marginBottom: 4,
  },
  colHead: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emptyRow: { alignItems: 'center', paddingVertical: 40 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },

  roleCard: {
    flexDirection: 'row', gap: 16, padding: 16, borderRadius: 10, borderLeftWidth: 4,
    marginBottom: 12, alignItems: 'flex-start',
  },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, minWidth: 110, alignItems: 'center' },
  permRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },

  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },

  // Color picker
  colorSection: {
    borderRadius: 12, borderWidth: 1, padding: 18, marginTop: 20, marginBottom: 4,
  },
  colorSectionTop: { marginBottom: 14 },
  colorSectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  colorSectionTitle: { fontSize: 14, fontWeight: '700' },
  colorPreviewCard: {
    borderRadius: 10, borderWidth: 1, overflow: 'hidden', marginBottom: 16,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  colorPreviewBanner: {
    height: 52, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, gap: 10,
  },
  colorPreviewBadge: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  colorPreviewBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  colorPreviewSprintPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  colorPreviewSprintDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  colorPreviewSprintText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  keyChipPreview: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1,
  },
  colorPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: {
    width: 32, height: 32, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
});
