import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme, TextInput, Button, Menu, Divider, Portal, Dialog, Surface } from 'react-native-paper';
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
import colors from '../../theme/colors';

const NAVY = colors.brand.navy;

const PROJECT_COLORS = [
  NAVY, colors.secondary, colors.success, colors.warning,
  colors.danger, colors.info, '#7C5EA7', '#5A9E71',
  '#DB2777', '#0891B2', '#64748B', '#EA580C',
];

const NAV_SECTIONS = [
  { key: 'general', label: 'General', icon: 'tune' },
  { key: 'members', label: 'Members', icon: 'account-group-outline' },
  { key: 'access', label: 'Access & Roles', icon: 'shield-account-outline' },
  { key: 'danger', label: 'Danger Zone', icon: 'alert-circle-outline' },
];

const PROJECT_TYPES = ['scrum', 'kanban', 'business'];
const MEMBER_ROLES = ['developer', 'reporter', 'viewer', 'team_lead', 'project_manager'];

const AVATAR_COLOR = (str) => {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = str.charCodeAt(i) * 37 + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360},50%,44%)`;
};

const titleCase = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());

const MemberAvatar = ({ user, size = 36 }) => {
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}` || user?.email?.[0] || '?';
  return (
    <View style={{ width: size, height: size, borderRadius: 8, backgroundColor: AVATAR_COLOR(user?.email), justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.36, fontWeight: '900' }}>{initials.toUpperCase()}</Text>
    </View>
  );
};

export default function ProjectSettingsScreen({ route, navigation }) {
  const { projectId } = route.params;
  const theme = useTheme();
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

  const [form, setForm] = useState({ name: '', description: '', type: '', key: '' });
  const [selectedColor, setSelectedColor] = useState(NAVY);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name || '',
        description: project.description || '',
        type: project.type || 'scrum',
        key: project.key || '',
      });
      setSelectedColor(project.color || NAVY);
      setDirty(false);
    }
  }, [project]);

  const setField = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await updateProject({ id: projectId, name: form.name, description: form.description, type: form.type, color: selectedColor }).unwrap();
      setDirty(false);
      showToast('Project settings saved');
    } catch (err) {
      showToast(err?.data?.message || 'Failed to save settings', true);
    }
  };

  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState('developer');
  const [addRoleMenu, setAddRoleMenu] = useState(false);

  const handleAddMember = async () => {
    if (!addEmail.trim()) return;
    try {
      await addMember({ projectId, email: addEmail.trim(), role: addRole }).unwrap();
      setAddEmail('');
      setAddRole('developer');
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

  const [removeMemberDialog, setRemoveMemberDialog] = useState(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');
  const showToast = (msg, isError = false) => { setToast(msg); setToastType(isError ? 'error' : 'success'); };

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
  const bg = theme.colors.background;
  const border = theme.colors.outlineVariant;
  const accent = selectedColor || project?.color || NAVY;
  const activeSection = NAV_SECTIONS.find((s) => s.key === section);

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <Surface style={[styles.header, { backgroundColor: surf, borderBottomColor: border }]} elevation={0}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.colors.surfaceVariant, borderColor: border }]}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={18} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
          <View style={[styles.projectAvatar, { backgroundColor: accent }]}>
            <Text style={styles.projectAvatarText}>{(form.key || project?.key || 'PR').substring(0, 2)}</Text>
          </View>
          <View style={styles.headerTitleBlock}>
            <Text style={[styles.headerEyebrow, { color: theme.colors.onSurfaceVariant }]}>Project settings</Text>
            <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
              {form.name || project?.name || 'Project'}
            </Text>
            <View style={styles.headerMetaRow}>
              <MetaPill icon="pound" label={form.key || project?.key || 'KEY'} tone={accent} theme={theme} />
              <MetaPill icon="source-branch" label={titleCase(form.type || 'scrum')} theme={theme} />
              <MetaPill icon="account-group-outline" label={`${members.length} members`} theme={theme} />
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          {dirty && <Text style={[styles.dirtyText, { color: theme.colors.onSurfaceVariant }]}>Unsaved changes</Text>}
          <Button
            mode="contained"
            icon="content-save-outline"
            onPress={handleSave}
            loading={saving}
            disabled={!dirty || saving}
            style={[styles.headerButton, { backgroundColor: accent }]}
            labelStyle={styles.containedLabel}
          >
            Save Changes
          </Button>
        </View>
      </Surface>

      <View style={styles.content}>
        <View style={[styles.rail, { backgroundColor: surf, borderRightColor: border }]}>
          <Text style={[styles.railLabel, { color: theme.colors.onSurfaceVariant }]}>Settings</Text>
          {NAV_SECTIONS.map((s) => {
            const active = section === s.key;
            const danger = s.key === 'danger';
            const color = danger ? colors.danger : accent;
            return (
              <TouchableOpacity
                key={s.key}
                style={[
                  styles.railItem,
                  {
                    backgroundColor: active ? `${color}12` : 'transparent',
                    borderColor: active ? `${color}28` : 'transparent',
                  },
                ]}
                onPress={() => setSection(s.key)}
              >
                <View style={[styles.railIcon, { backgroundColor: active ? `${color}14` : theme.colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name={s.icon} size={17} color={active ? color : theme.colors.onSurfaceVariant} />
                </View>
                <View style={styles.railText}>
                  <Text style={[styles.railItemLabel, { color: active ? color : theme.colors.onSurface }]}>{s.label}</Text>
                  <Text style={[styles.railItemSub, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                    {s.key === 'general' ? 'Identity and color' : s.key === 'members' ? 'People and access' : s.key === 'access' ? 'Role permissions' : 'Archive or delete'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView style={styles.main} contentContainerStyle={styles.mainInner} showsVerticalScrollIndicator>
          <SectionHeader
            title={activeSection?.label || 'Settings'}
            desc={section === 'general'
              ? 'Update project identity, type, description, and visual accent.'
              : section === 'members'
                ? 'Manage project membership and inherited organization access.'
                : section === 'access'
                  ? 'Review what each project role can do.'
                  : 'Archive or permanently delete this project.'}
            theme={theme}
            icon={activeSection?.icon || 'tune'}
            tone={section === 'danger' ? colors.danger : accent}
          />

          {section === 'general' && (
            <View style={styles.twoCol}>
              <Surface style={[styles.card, styles.formCard, { backgroundColor: surf, borderColor: border }]} elevation={0}>
                <CardHeader icon="card-text-outline" title="Project identity" subtitle="Name, key, type, and description" tone={accent} theme={theme} />

                <FieldLabel theme={theme}>Project Name</FieldLabel>
                <TextInput
                  value={form.name}
                  onChangeText={(v) => setField('name', v)}
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
                  {PROJECT_TYPES.map((t) => (
                    <Menu.Item
                      key={t}
                      title={titleCase(t)}
                      leadingIcon={form.type === t ? 'check' : 'view-dashboard-outline'}
                      onPress={() => { setField('type', t); setTypeMenuOpen(false); }}
                    />
                  ))}
                </Menu>

                <FieldLabel theme={theme} mt>Description</FieldLabel>
                <textarea
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  rows={5}
                  placeholder="What is this project about?"
                  style={{
                    width: '100%',
                    resize: 'vertical',
                    padding: '12px 14px',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    borderRadius: 8,
                    border: `1px solid ${theme.colors.outline}`,
                    backgroundColor: theme.dark ? theme.colors.surfaceVariant : '#fff',
                    color: theme.colors.onSurface,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </Surface>

              <Surface style={[styles.card, styles.previewCard, { backgroundColor: surf, borderColor: border }]} elevation={0}>
                <CardHeader icon="palette-outline" title="Appearance" subtitle="Accent color and card preview" tone={accent} theme={theme} />

                <View style={[styles.previewShell, { borderColor: border, backgroundColor: theme.colors.background }]}>
                  <View style={[styles.previewBanner, { backgroundColor: accent }]}>
                    <View style={styles.previewAvatar}>
                      <Text style={styles.previewAvatarText}>{(form.key || 'PR').substring(0, 2)}</Text>
                    </View>
                    <View style={styles.previewStatus}>
                      <View style={styles.previewStatusDot} />
                      <Text style={styles.previewStatusText}>Active Sprint</Text>
                    </View>
                  </View>
                  <View style={styles.previewBody}>
                    <Text style={[styles.previewTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>{form.name || 'Project Name'}</Text>
                    <Text style={[styles.previewSub, { color: theme.colors.onSurfaceVariant }]}>
                      {form.key || 'KEY'} - {titleCase(form.type || 'scrum')} - settings preview
                    </Text>
                  </View>
                </View>

                <Text style={[styles.swatchLabel, { color: theme.colors.onSurface }]}>Project color</Text>
                <View style={styles.colorPicker}>
                  {PROJECT_COLORS.map((color) => {
                    const selected = selectedColor === color;
                    return (
                      <TouchableOpacity
                        key={color}
                        onPress={() => { setSelectedColor(color); setDirty(true); }}
                        style={[
                          styles.colorSwatch,
                          {
                            backgroundColor: color,
                            boxShadow: selected ? `0 0 0 2px #fff, 0 0 0 5px ${color}` : 'none',
                            transform: selected ? [{ scale: 1.12 }] : [{ scale: 1 }],
                          },
                        ]}
                      >
                        {selected && <MaterialCommunityIcons name="check" size={15} color="#fff" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Surface>
            </View>
          )}

          {section === 'members' && (
            <View style={styles.stack}>
              {canManage && (
                <Surface style={[styles.card, { backgroundColor: surf, borderColor: border }]} elevation={0}>
                  <CardHeader icon="account-plus-outline" title="Add member" subtitle="Invite someone by email and assign a project role" tone={accent} theme={theme} />
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
                          <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface }}>
                            {ROLE_LABELS[addRole] || addRole}
                          </Text>
                          <MaterialCommunityIcons name="chevron-down" size={16} color={theme.colors.onSurfaceVariant} />
                        </TouchableOpacity>
                      }
                    >
                      {MEMBER_ROLES.map((r) => (
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
                      style={[styles.headerButton, { backgroundColor: accent }]}
                      labelStyle={styles.containedLabel}
                    >
                      Add
                    </Button>
                  </View>
                </Surface>
              )}

              <Surface style={[styles.card, { backgroundColor: surf, borderColor: border }]} elevation={0}>
                <CardHeader icon="account-group-outline" title="Member directory" subtitle={`${members.length} people have project access`} tone="#7C5EA7" theme={theme} />
                {members.length === 0 ? (
                  <View style={styles.emptyMembers}>
                    <MaterialCommunityIcons name="account-group-outline" size={34} color={theme.colors.onSurfaceVariant} />
                    <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>No members yet</Text>
                  </View>
                ) : (
                  <View style={styles.memberGrid}>
                    {members.map((m) => {
                      const isOrg = String(m.id).startsWith('org-');
                      return (
                        <View key={m.id || m.userId} style={[styles.memberCard, { backgroundColor: theme.colors.background, borderColor: border }]}>
                          <MemberAvatar user={m.user} />
                          <View style={styles.memberCardMain}>
                            <Text style={[styles.memberName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                              {m.user?.firstName} {m.user?.lastName}
                            </Text>
                            <Text style={[styles.memberEmail, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                              {m.user?.email}
                            </Text>
                            {isOrg && <Text style={[styles.inheritedText, { color: accent }]}>Org-level access</Text>}
                          </View>
                          <View style={styles.memberCardRight}>
                            <View style={[styles.rolePill, { backgroundColor: `${accent}12`, borderColor: `${accent}28` }]}>
                              <Text style={[styles.rolePillText, { color: accent }]}>{ROLE_LABELS[m.role] || titleCase(m.role)}</Text>
                            </View>
                            {canManage && !isOrg && m.userId !== me?.id && (
                              <TouchableOpacity
                                style={[styles.removeBtn, { borderColor: `${colors.danger}40` }]}
                                onPress={() => handleRemoveMember(m.userId, `${m.user?.firstName} ${m.user?.lastName}`)}
                              >
                                <MaterialCommunityIcons name="trash-can-outline" size={14} color={colors.danger} />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </Surface>
            </View>
          )}

          {section === 'access' && (
            <Surface style={[styles.card, { backgroundColor: surf, borderColor: border }]} elevation={0}>
              <CardHeader icon="shield-check-outline" title="Role permissions" subtitle="Reference for each project access level" tone={accent} theme={theme} />
              <View style={styles.roleGrid}>
                {[
                  { role: 'project_manager', color: '#7C3AED', perms: ['Create and delete issues', 'Manage sprints', 'Add or remove members', 'Edit project settings', 'View all reports'] },
                  { role: 'team_lead', color: colors.info, perms: ['Create and edit issues', 'Manage sprint scope', 'Assign issues', 'View reports'] },
                  { role: 'developer', color: '#0891B2', perms: ['Create and edit issues', 'Log time', 'Comment', 'Move issues on board'] },
                  { role: 'reporter', color: colors.success, perms: ['Create issues', 'Add comments', 'View board and backlog'] },
                  { role: 'viewer', color: colors.warning, perms: ['View issues', 'View board read-only'] },
                ].map(({ role, color, perms }) => (
                  <View key={role} style={[styles.roleCard, { borderColor: `${color}28`, backgroundColor: `${color}08` }]}>
                    <View style={[styles.roleIcon, { backgroundColor: `${color}16` }]}>
                      <MaterialCommunityIcons name="shield-account-outline" size={18} color={color} />
                    </View>
                    <Text style={[styles.roleTitle, { color }]}>{ROLE_LABELS[role] || titleCase(role)}</Text>
                    <View style={styles.permList}>
                      {perms.map((p) => (
                        <View key={p} style={styles.permRow}>
                          <MaterialCommunityIcons name="check-circle" size={14} color={colors.success} />
                          <Text style={[styles.permText, { color: theme.colors.onSurface }]}>{p}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </Surface>
          )}

          {section === 'danger' && (
            <Surface style={[styles.card, styles.dangerCard, { backgroundColor: surf, borderColor: `${colors.danger}45` }]} elevation={0}>
              <CardHeader icon="alert-circle-outline" title="Danger zone" subtitle="These actions affect project availability and data" tone={colors.danger} theme={theme} />

              <View style={styles.dangerAction}>
                <View style={[styles.dangerIcon, { backgroundColor: colors.warningLight }]}>
                  <MaterialCommunityIcons name="archive-outline" size={20} color={colors.warning} />
                </View>
                <View style={styles.dangerCopy}>
                  <Text style={[styles.dangerTitle, { color: theme.colors.onSurface }]}>Archive Project</Text>
                  <Text style={[styles.dangerSub, { color: theme.colors.onSurfaceVariant }]}>Hide this project from active lists while preserving all data.</Text>
                </View>
                <Button mode="outlined" style={[styles.headerButton, { borderColor: `${colors.warning}70` }]} textColor={colors.warning} onPress={() => setArchiveDialog(true)} icon="archive-outline">
                  Archive
                </Button>
              </View>

              <Divider style={{ marginVertical: 18 }} />

              <View style={styles.dangerAction}>
                <View style={[styles.dangerIcon, { backgroundColor: colors.dangerLight }]}>
                  <MaterialCommunityIcons name="delete-outline" size={20} color={colors.danger} />
                </View>
                <View style={styles.dangerCopy}>
                  <Text style={[styles.dangerTitle, { color: colors.danger }]}>Delete Project</Text>
                  <Text style={[styles.dangerSub, { color: theme.colors.onSurfaceVariant }]}>Permanently delete this project and all issues, sprints, and data.</Text>
                </View>
                <Button mode="contained" style={[styles.headerButton, { backgroundColor: colors.danger }]} onPress={() => { setDeleteDialog(true); setDeleteConfirm(''); }} icon="delete-outline" disabled={!canManage}>
                  Delete
                </Button>
              </View>
            </Surface>
          )}
        </ScrollView>
      </View>

      <Portal>
        <Dialog visible={!!removeMemberDialog} onDismiss={() => setRemoveMemberDialog(null)} style={styles.dialog}>
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

        <Dialog visible={archiveDialog} onDismiss={() => setArchiveDialog(false)} style={styles.dialog}>
          <Dialog.Icon icon="archive-outline" />
          <Dialog.Title style={{ textAlign: 'center' }}>Archive Project</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.onSurface }}>
              Archive <Text style={{ fontWeight: '700' }}>{project?.name}</Text>?{'\n\n'}
              The project will be hidden from active lists but all data will be preserved.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setArchiveDialog(false)}>Cancel</Button>
            <Button mode="contained" buttonColor={colors.warning} onPress={handleArchive}>
              Archive Project
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={deleteDialog} onDismiss={() => setDeleteDialog(false)} style={styles.dialog}>
          <Dialog.Icon icon="alert-circle-outline" color={colors.danger} />
          <Dialog.Title style={{ textAlign: 'center', color: colors.danger }}>Delete Project</Dialog.Title>
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
              style={{ backgroundColor: colors.danger }}
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

const SectionHeader = ({ title, desc, theme, icon, tone }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionIcon, { backgroundColor: `${tone}14` }]}>
      <MaterialCommunityIcons name={icon} size={20} color={tone} />
    </View>
    <View style={styles.sectionHeaderText}>
      <Text style={[styles.sectionTitle, { color: tone === colors.danger ? colors.danger : theme.colors.onBackground }]}>{title}</Text>
      <Text style={[styles.sectionDesc, { color: theme.colors.onSurfaceVariant }]}>{desc}</Text>
    </View>
  </View>
);

const CardHeader = ({ icon, title, subtitle, tone, theme }) => (
  <View style={styles.cardHeader}>
    <View style={[styles.cardHeaderIcon, { backgroundColor: `${tone}14` }]}>
      <MaterialCommunityIcons name={icon} size={17} color={tone} />
    </View>
    <View>
      <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{title}</Text>
      <Text style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}>{subtitle}</Text>
    </View>
  </View>
);

const FieldLabel = ({ children, theme, mt }) => (
  <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontWeight: '800', marginBottom: 6, marginTop: mt ? 20 : 0 }}>
    {children}
  </Text>
);

const MetaPill = ({ icon, label, tone, theme }) => (
  <View style={[
    styles.metaPill,
    {
      backgroundColor: tone ? `${tone}12` : theme.colors.surfaceVariant,
      borderColor: tone ? `${tone}28` : theme.colors.outlineVariant,
    },
  ]}>
    <MaterialCommunityIcons name={icon} size={12} color={tone || theme.colors.onSurfaceVariant} />
    <Text style={[styles.metaPillText, { color: tone || theme.colors.onSurfaceVariant }]} numberOfLines={1}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 28,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 18,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  backBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  projectAvatar: { width: 50, height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  projectAvatarText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  headerTitleBlock: { flex: 1, minWidth: 0, gap: 5 },
  headerEyebrow: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  headerTitle: { fontSize: 23, fontWeight: '900' },
  headerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  headerButton: { borderRadius: 8, borderWidth: 1 },
  containedLabel: { color: '#fff', fontSize: 12, fontWeight: '800' },
  dirtyText: { fontSize: 12, fontWeight: '700' },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, maxWidth: 180 },
  metaPillText: { fontSize: 11, fontWeight: '800' },

  content: { flex: 1, flexDirection: 'row' },
  rail: { width: 286, borderRightWidth: 1, padding: 18, gap: 8 },
  railLabel: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4 },
  railItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 8, padding: 10 },
  railIcon: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  railText: { flex: 1, minWidth: 0 },
  railItemLabel: { fontSize: 13, fontWeight: '900' },
  railItemSub: { fontSize: 11, fontWeight: '600', marginTop: 1 },

  main: { flex: 1 },
  mainInner: { padding: 28, paddingBottom: 56 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  sectionIcon: { width: 44, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionHeaderText: { flex: 1, minWidth: 0 },
  sectionTitle: { fontSize: 24, fontWeight: '900' },
  sectionDesc: { fontSize: 13, marginTop: 3 },

  twoCol: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' },
  stack: { gap: 18 },
  card: { borderRadius: 8, borderWidth: 1, padding: 20, boxShadow: '0 8px 20px rgba(20,33,61,0.06)' },
  formCard: { flex: 1.4, minWidth: 440 },
  previewCard: { flex: 1, minWidth: 320 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  cardHeaderIcon: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '900' },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, minHeight: 48 },

  previewShell: { borderWidth: 1, borderRadius: 8, overflow: 'hidden', marginBottom: 18 },
  previewBanner: { height: 82, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  previewAvatar: { width: 44, height: 44, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.24)', justifyContent: 'center', alignItems: 'center' },
  previewAvatarText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  previewStatus: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  previewStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  previewStatusText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  previewBody: { padding: 14 },
  previewTitle: { fontSize: 15, fontWeight: '900' },
  previewSub: { fontSize: 12, marginTop: 4 },
  swatchLabel: { fontSize: 12, fontWeight: '900', marginBottom: 10 },
  colorPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  addMemberRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  memberGrid: { gap: 10 },
  memberCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 8, padding: 12 },
  memberCardMain: { flex: 1, minWidth: 0 },
  memberName: { fontSize: 13, fontWeight: '900' },
  memberEmail: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  inheritedText: { fontSize: 11, fontWeight: '800', marginTop: 3 },
  memberCardRight: { alignItems: 'flex-end', gap: 8 },
  rolePill: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  rolePillText: { fontSize: 11, fontWeight: '900' },
  removeBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  emptyMembers: { alignItems: 'center', paddingVertical: 42 },

  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  roleCard: { width: 300, borderWidth: 1, borderRadius: 8, padding: 16 },
  roleIcon: { width: 38, height: 38, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  roleTitle: { fontSize: 14, fontWeight: '900', marginBottom: 10 },
  permList: { gap: 7 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  permText: { fontSize: 12, fontWeight: '600', flex: 1 },

  dangerCard: { maxWidth: 920 },
  dangerAction: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  dangerIcon: { width: 42, height: 42, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  dangerCopy: { flex: 1, minWidth: 0 },
  dangerTitle: { fontSize: 14, fontWeight: '900' },
  dangerSub: { fontSize: 12, lineHeight: 18, marginTop: 3 },

  dialog: { maxWidth: 430, alignSelf: 'center', width: '100%', borderRadius: 8 },
});
