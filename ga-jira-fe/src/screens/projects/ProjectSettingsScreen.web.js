import React, { useEffect, useState } from 'react';
import { useProjectScrollbar } from '../../hooks/useProjectScrollbar';
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
  useGetLabelsQuery,
  useCreateLabelMutation,
  useUpdateLabelMutation,
  useDeleteLabelMutation,
  useGetCustomFieldsQuery,
  useCreateCustomFieldMutation,
  useDeleteCustomFieldMutation,
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
  { key: 'labels', label: 'Labels', icon: 'tag-multiple-outline' },
  { key: 'custom-fields', label: 'Custom Fields', icon: 'form-textbox' },
  { key: 'access', label: 'Access & Roles', icon: 'shield-account-outline' },
  { key: 'danger', label: 'Danger Zone', icon: 'alert-circle-outline' },
];

const LABEL_PRESETS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#EC4899', '#6366F1', '#84CC16', '#F97316',
];

const CF_TYPES = [
  { value: 'text', label: 'Text', icon: 'format-text' },
  { value: 'number', label: 'Number', icon: 'numeric' },
  { value: 'date', label: 'Date', icon: 'calendar-outline' },
  { value: 'select', label: 'Dropdown', icon: 'chevron-down-circle-outline' },
  { value: 'checkbox', label: 'Checkbox', icon: 'checkbox-marked-outline' },
  { value: 'url', label: 'URL', icon: 'link-variant' },
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
  useProjectScrollbar(projectData?.data?.color);
  const { data: membersData, refetch: refetchMembers } = useGetProjectMembersQuery(projectId);
  const { data: labelsData, refetch: refetchLabels } = useGetLabelsQuery(projectId);
  const { data: cfData, refetch: refetchCf } = useGetCustomFieldsQuery(projectId);
  const [updateProject, { isLoading: saving }] = useUpdateProjectMutation();
  const [addMember, { isLoading: adding }] = useAddProjectMemberMutation();
  const [removeMember] = useRemoveProjectMemberMutation();
  const [deleteProject, { isLoading: deleting }] = useDeleteProjectMutation();
  const [createLabel, { isLoading: creatingLabel }] = useCreateLabelMutation();
  const [updateLabel] = useUpdateLabelMutation();
  const [deleteLabel, { isLoading: deletingLabel }] = useDeleteLabelMutation();
  const [createCustomField, { isLoading: creatingCf }] = useCreateCustomFieldMutation();
  const [deleteCustomField, { isLoading: deletingCf }] = useDeleteCustomFieldMutation();

  const project = projectData?.data;
  const members = membersData?.data || [];
  const canManage = ['super_admin', 'org_admin', 'project_manager'].includes(me?.role);
  const canDelete = ['super_admin', 'org_admin'].includes(me?.role);

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
  const [addMemberError, setAddMemberError] = useState('');

  const handleAddMember = async () => {
    if (!addEmail.trim()) return;
    setAddMemberError('');
    try {
      await addMember({ projectId, email: addEmail.trim(), role: addRole }).unwrap();
      setAddEmail('');
      setAddRole('developer');
      refetchMembers();
      showToast('Member added successfully');
    } catch (err) {
      const msg = err?.data?.message || 'Failed to add member';
      setAddMemberError(msg);
      showToast(msg, true);
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

  // Label state
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3B82F6');
  const [editLabelId, setEditLabelId] = useState(null);
  const [editLabelName, setEditLabelName] = useState('');
  const [editLabelColor, setEditLabelColor] = useState('');
  const [deleteLabelDialog, setDeleteLabelDialog] = useState(null);

  // Custom field state
  const [newCfName, setNewCfName] = useState('');
  const [newCfType, setNewCfType] = useState('text');
  const [newCfRequired, setNewCfRequired] = useState(false);
  const [cfTypeMenu, setCfTypeMenu] = useState(false);
  const [deleteCfDialog, setDeleteCfDialog] = useState(null);

  const labels = labelsData?.data || [];
  const customFields = cfData?.data || [];

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    try {
      await createLabel({ projectId, name: newLabelName.trim(), color: newLabelColor }).unwrap();
      setNewLabelName('');
      setNewLabelColor('#3B82F6');
      refetchLabels();
      showToast('Label created');
    } catch (err) { showToast(err?.data?.message || 'Failed to create label', true); }
  };

  const handleUpdateLabel = async (labelId) => {
    try {
      await updateLabel({ projectId, labelId, name: editLabelName, color: editLabelColor }).unwrap();
      setEditLabelId(null);
      refetchLabels();
      showToast('Label updated');
    } catch (err) { showToast(err?.data?.message || 'Failed to update label', true); }
  };

  const handleDeleteLabel = async () => {
    if (!deleteLabelDialog) return;
    try {
      await deleteLabel({ projectId, labelId: deleteLabelDialog.id }).unwrap();
      setDeleteLabelDialog(null);
      refetchLabels();
      showToast('Label deleted');
    } catch (err) { showToast(err?.data?.message || 'Failed to delete label', true); }
  };

  const handleCreateCf = async () => {
    if (!newCfName.trim()) return;
    const key = newCfName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    try {
      await createCustomField({ projectId, name: newCfName.trim(), key, type: newCfType, isRequired: newCfRequired }).unwrap();
      setNewCfName('');
      setNewCfType('text');
      setNewCfRequired(false);
      refetchCf();
      showToast('Custom field created');
    } catch (err) { showToast(err?.data?.message || 'Failed to create field', true); }
  };

  const handleDeleteCf = async () => {
    if (!deleteCfDialog) return;
    try {
      await deleteCustomField({ projectId, fieldId: deleteCfDialog.id }).unwrap();
      setDeleteCfDialog(null);
      refetchCf();
      showToast('Custom field deleted');
    } catch (err) { showToast(err?.data?.message || 'Failed to delete field', true); }
  };

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
                    {s.key === 'general' ? 'Identity and color' : s.key === 'members' ? 'People and access' : s.key === 'labels' ? `${labels.length} labels` : s.key === 'custom-fields' ? `${customFields.length} fields` : s.key === 'access' ? 'Role permissions' : 'Archive or delete'}
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
                : section === 'labels'
                  ? 'Create and manage labels to categorise issues across this project.'
                  : section === 'custom-fields'
                    ? 'Add custom metadata fields to issues in this project.'
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
                      onChangeText={v => { setAddEmail(v); if (addMemberError) setAddMemberError(''); }}
                      mode="outlined"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      dense
                      style={{ flex: 2 }}
                      error={!!addMemberError}
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
                  {!!addMemberError && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingHorizontal: 4 }}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#DC2626" />
                      <Text style={{ fontSize: 12, color: '#DC2626', flex: 1 }}>{addMemberError}</Text>
                    </View>
                  )}
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

          {section === 'labels' && (
            <View style={styles.stack}>
              {/* Create label */}
              <Surface style={[styles.card, { backgroundColor: surf, borderColor: border }]} elevation={0}>
                <CardHeader icon="tag-plus-outline" title="Create label" subtitle="Add a new label to categorise issues" tone={accent} theme={theme} />
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
                  <View style={{ flex: 1 }}>
                    <FieldLabel theme={theme}>Label name</FieldLabel>
                    <TextInput
                      value={newLabelName}
                      onChangeText={setNewLabelName}
                      mode="outlined"
                      dense
                      placeholder="e.g. frontend, bug, customer-reported"
                      onSubmitEditing={handleCreateLabel}
                    />
                  </View>
                  <View>
                    <FieldLabel theme={theme}>Color</FieldLabel>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', maxWidth: 200 }}>
                      {LABEL_PRESETS.map((c) => (
                        <TouchableOpacity
                          key={c}
                          onPress={() => setNewLabelColor(c)}
                          style={{
                            width: 28, height: 28, borderRadius: 6, backgroundColor: c,
                            justifyContent: 'center', alignItems: 'center',
                            boxShadow: newLabelColor === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : 'none',
                          }}
                        >
                          {newLabelColor === c && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <Button
                    mode="contained"
                    icon="plus"
                    onPress={handleCreateLabel}
                    loading={creatingLabel}
                    disabled={!newLabelName.trim() || creatingLabel}
                    style={[styles.headerButton, { backgroundColor: accent }]}
                    labelStyle={styles.containedLabel}
                  >
                    Create
                  </Button>
                </View>
              </Surface>

              {/* Label list */}
              <Surface style={[styles.card, { backgroundColor: surf, borderColor: border }]} elevation={0}>
                <CardHeader icon="tag-multiple-outline" title="Project labels" subtitle={`${labels.length} label${labels.length !== 1 ? 's' : ''} in this project`} tone="#06B6D4" theme={theme} />
                {labels.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 36 }}>
                    <MaterialCommunityIcons name="tag-outline" size={32} color={theme.colors.onSurfaceVariant} />
                    <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, fontSize: 13 }}>No labels yet. Create your first one above.</Text>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {labels.map((lbl) => (
                      <View key={lbl.id} style={[styles.memberCard, { backgroundColor: theme.colors.background, borderColor: border }]}>
                        {editLabelId === lbl.id ? (
                          <>
                            <TextInput
                              value={editLabelName}
                              onChangeText={setEditLabelName}
                              mode="outlined"
                              dense
                              style={{ flex: 1 }}
                              onSubmitEditing={() => handleUpdateLabel(lbl.id)}
                            />
                            <View style={{ flexDirection: 'row', gap: 5 }}>
                              {LABEL_PRESETS.map((c) => (
                                <TouchableOpacity
                                  key={c}
                                  onPress={() => setEditLabelColor(c)}
                                  style={{
                                    width: 22, height: 22, borderRadius: 5, backgroundColor: c,
                                    justifyContent: 'center', alignItems: 'center',
                                  }}
                                >
                                  {editLabelColor === c && <MaterialCommunityIcons name="check" size={11} color="#fff" />}
                                </TouchableOpacity>
                              ))}
                            </View>
                            <Button compact mode="contained" style={{ backgroundColor: accent }} labelStyle={{ color: '#fff', fontSize: 11 }} onPress={() => handleUpdateLabel(lbl.id)}>Save</Button>
                            <Button compact onPress={() => setEditLabelId(null)}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: (lbl.color || '#3B82F6') + '20', borderWidth: 1, borderColor: (lbl.color || '#3B82F6') + '50', justifyContent: 'center', alignItems: 'center' }}>
                              <MaterialCommunityIcons name="tag" size={16} color={lbl.color || '#3B82F6'} />
                            </View>
                            <View style={styles.memberCardMain}>
                              <Text style={[styles.memberName, { color: theme.colors.onSurface }]}>{lbl.name}</Text>
                              {!!lbl.description && <Text style={[styles.memberEmail, { color: theme.colors.onSurfaceVariant }]}>{lbl.description}</Text>}
                            </View>
                            <View style={[styles.rolePill, { backgroundColor: (lbl.color || '#3B82F6') + '18', borderColor: (lbl.color || '#3B82F6') + '40' }]}>
                              <Text style={[styles.rolePillText, { color: lbl.color || '#3B82F6' }]}>{lbl.color || '#3B82F6'}</Text>
                            </View>
                            {canManage && (
                              <View style={{ flexDirection: 'row', gap: 6 }}>
                                <TouchableOpacity
                                  style={[styles.removeBtn, { borderColor: `${accent}40` }]}
                                  onPress={() => { setEditLabelId(lbl.id); setEditLabelName(lbl.name); setEditLabelColor(lbl.color || '#3B82F6'); }}
                                >
                                  <MaterialCommunityIcons name="pencil-outline" size={14} color={accent} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.removeBtn, { borderColor: `${colors.danger}40` }]}
                                  onPress={() => setDeleteLabelDialog(lbl)}
                                >
                                  <MaterialCommunityIcons name="trash-can-outline" size={14} color={colors.danger} />
                                </TouchableOpacity>
                              </View>
                            )}
                          </>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </Surface>
            </View>
          )}

          {section === 'custom-fields' && (
            <View style={styles.stack}>
              {/* Create custom field */}
              <Surface style={[styles.card, { backgroundColor: surf, borderColor: border }]} elevation={0}>
                <CardHeader icon="form-textbox" title="Add custom field" subtitle="Extend issues with project-specific metadata" tone={accent} theme={theme} />
                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
                    <View style={{ flex: 1 }}>
                      <FieldLabel theme={theme}>Field name</FieldLabel>
                      <TextInput
                        value={newCfName}
                        onChangeText={setNewCfName}
                        mode="outlined"
                        dense
                        placeholder="e.g. Customer Name, Browser, Environment"
                      />
                    </View>
                    <View style={{ minWidth: 160 }}>
                      <FieldLabel theme={theme}>Field type</FieldLabel>
                      <Menu
                        visible={cfTypeMenu}
                        onDismiss={() => setCfTypeMenu(false)}
                        anchor={
                          <TouchableOpacity
                            onPress={() => setCfTypeMenu(true)}
                            style={[styles.selectBtn, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }]}
                          >
                            <MaterialCommunityIcons name={CF_TYPES.find(t => t.value === newCfType)?.icon || 'format-text'} size={15} color={theme.colors.onSurfaceVariant} />
                            <Text style={{ flex: 1, marginLeft: 8, color: theme.colors.onSurface, fontSize: 14 }}>
                              {CF_TYPES.find(t => t.value === newCfType)?.label || 'Text'}
                            </Text>
                            <MaterialCommunityIcons name="chevron-down" size={16} color={theme.colors.onSurfaceVariant} />
                          </TouchableOpacity>
                        }
                      >
                        {CF_TYPES.map((t) => (
                          <Menu.Item
                            key={t.value}
                            title={t.label}
                            leadingIcon={newCfType === t.value ? 'check' : t.icon}
                            onPress={() => { setNewCfType(t.value); setCfTypeMenu(false); }}
                          />
                        ))}
                      </Menu>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <TouchableOpacity
                        onPress={() => setNewCfRequired(!newCfRequired)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                      >
                        <View style={{
                          width: 20, height: 20, borderRadius: 5, borderWidth: 2,
                          borderColor: newCfRequired ? accent : theme.colors.outline,
                          backgroundColor: newCfRequired ? accent : 'transparent',
                          justifyContent: 'center', alignItems: 'center',
                        }}>
                          {newCfRequired && <MaterialCommunityIcons name="check" size={13} color="#fff" />}
                        </View>
                        <Text style={{ fontSize: 13, color: theme.colors.onSurface, fontWeight: '600' }}>Required field</Text>
                      </TouchableOpacity>
                    </View>
                    <Button
                      mode="contained"
                      icon="plus"
                      onPress={handleCreateCf}
                      loading={creatingCf}
                      disabled={!newCfName.trim() || creatingCf}
                      style={[styles.headerButton, { backgroundColor: accent }]}
                      labelStyle={styles.containedLabel}
                    >
                      Add Field
                    </Button>
                  </View>
                </View>
              </Surface>

              {/* Field list */}
              <Surface style={[styles.card, { backgroundColor: surf, borderColor: border }]} elevation={0}>
                <CardHeader icon="table-column" title="Custom fields" subtitle={`${customFields.length} field${customFields.length !== 1 ? 's' : ''} defined for this project`} tone="#8B5CF6" theme={theme} />
                {customFields.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 36 }}>
                    <MaterialCommunityIcons name="form-textbox" size={32} color={theme.colors.onSurfaceVariant} />
                    <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, fontSize: 13 }}>No custom fields yet. Add your first one above.</Text>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {customFields.map((cf) => {
                      const typeInfo = CF_TYPES.find(t => t.value === cf.type) || CF_TYPES[0];
                      return (
                        <View key={cf.id} style={[styles.memberCard, { backgroundColor: theme.colors.background, borderColor: border }]}>
                          <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#8B5CF618', borderWidth: 1, borderColor: '#8B5CF640', justifyContent: 'center', alignItems: 'center' }}>
                            <MaterialCommunityIcons name={typeInfo.icon} size={17} color="#8B5CF6" />
                          </View>
                          <View style={styles.memberCardMain}>
                            <Text style={[styles.memberName, { color: theme.colors.onSurface }]}>
                              {cf.name}{cf.isRequired ? ' *' : ''}
                            </Text>
                            <Text style={[styles.memberEmail, { color: theme.colors.onSurfaceVariant }]}>
                              {typeInfo.label} · key: {cf.key}
                            </Text>
                          </View>
                          <View style={[styles.rolePill, { backgroundColor: '#8B5CF618', borderColor: '#8B5CF640' }]}>
                            <Text style={[styles.rolePillText, { color: '#8B5CF6' }]}>{typeInfo.label}</Text>
                          </View>
                          {cf.isRequired && (
                            <View style={[styles.rolePill, { backgroundColor: `${colors.danger}12`, borderColor: `${colors.danger}30` }]}>
                              <Text style={[styles.rolePillText, { color: colors.danger }]}>Required</Text>
                            </View>
                          )}
                          {canManage && (
                            <TouchableOpacity
                              style={[styles.removeBtn, { borderColor: `${colors.danger}40` }]}
                              onPress={() => setDeleteCfDialog(cf)}
                            >
                              <MaterialCommunityIcons name="trash-can-outline" size={14} color={colors.danger} />
                            </TouchableOpacity>
                          )}
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
                <Button mode="contained" style={[styles.headerButton, { backgroundColor: colors.danger }]} onPress={() => { setDeleteDialog(true); setDeleteConfirm(''); }} icon="delete-outline" disabled={!canDelete}>
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

        <Dialog visible={!!deleteLabelDialog} onDismiss={() => setDeleteLabelDialog(null)} style={styles.dialog}>
          <Dialog.Icon icon="tag-remove-outline" color={colors.danger} />
          <Dialog.Title style={{ textAlign: 'center' }}>Delete Label</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.onSurface }}>
              Delete label <Text style={{ fontWeight: '700' }}>{deleteLabelDialog?.name}</Text>?{'\n'}
              It will be removed from all issues in this project.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteLabelDialog(null)}>Cancel</Button>
            <Button mode="contained" buttonColor={colors.danger} onPress={handleDeleteLabel} loading={deletingLabel}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!deleteCfDialog} onDismiss={() => setDeleteCfDialog(null)} style={styles.dialog}>
          <Dialog.Icon icon="form-textbox-minus" color={colors.danger} />
          <Dialog.Title style={{ textAlign: 'center' }}>Delete Custom Field</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.onSurface }}>
              Delete field <Text style={{ fontWeight: '700' }}>{deleteCfDialog?.name}</Text>?{'\n'}
              All values stored for this field will be permanently removed.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteCfDialog(null)}>Cancel</Button>
            <Button mode="contained" buttonColor={colors.danger} onPress={handleDeleteCf} loading={deletingCf}>
              Delete
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
