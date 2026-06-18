import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Text, useTheme, TextInput, Button, Menu, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCreateIssueMutation } from '../../api/issueApi';
import { useGetProjectWorkflowQuery, useGetProjectMembersQuery, useGetEpicsQuery } from '../../api/projectApi';
import { useGetSprintsQuery } from '../../api/sprintApi';
import { ISSUE_TYPE_LABELS, PRIORITY_LABELS } from '../../constants';

const TYPE_META = {
  task:    { icon: 'check-circle-outline',  color: '#0052CC' },
  bug:     { icon: 'bug-outline',           color: '#DE350B' },
  story:   { icon: 'bookmark-outline',      color: '#00875A' },
  epic:    { icon: 'lightning-bolt',        color: '#6554C0' },
  subtask: { icon: 'minus-circle-outline',  color: '#4C9AFF' },
};

const PRIORITY_META = {
  highest: { icon: 'arrow-up-bold',   color: '#DE350B' },
  high:    { icon: 'arrow-up',        color: '#FF8B00' },
  medium:  { icon: 'minus',           color: '#0052CC' },
  low:     { icon: 'arrow-down',      color: '#2684FF' },
  lowest:  { icon: 'arrow-down-bold', color: '#8993A4' },
};

const Toast = ({ message, isError, onDone }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2800),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDone?.());
  }, []);
  return (
    <Animated.View style={[toastS.wrap, { opacity, backgroundColor: isError ? '#DC2626' : '#16A34A' }]}>
      <MaterialCommunityIcons name={isError ? 'alert-circle' : 'check-circle'} size={16} color="#fff" />
      <Text variant="labelMedium" style={toastS.text}>{message}</Text>
    </Animated.View>
  );
};
const toastS = StyleSheet.create({
  wrap: { position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, zIndex: 999, maxWidth: 400 },
  text: { color: '#fff', fontWeight: '600' },
});

const avatarHue = (str) => {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = str.charCodeAt(i) * 37 + ((h << 5) - h);
  return Math.abs(h) % 360;
};

const MiniAvatar = ({ user, size = 24 }) => {
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${avatarHue(user?.email)},52%,44%)`, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.4, fontWeight: '700' }}>{initials.toUpperCase()}</Text>
    </View>
  );
};

const SidebarField = ({ label, children }) => (
  <View style={sideStyles.field}>
    <Text style={sideStyles.label}>{label}</Text>
    {children}
  </View>
);

const sideStyles = StyleSheet.create({
  field: { marginBottom: 18 },
  label: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0, marginBottom: 6 },
});

export default function CreateIssueScreen({ route, navigation }) {
  const { projectId, sprintId: defaultSprintId, epicId: defaultEpicId } = route.params || {};
  const theme = useTheme();

  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [issueType, setIssueType]   = useState('task');
  const [priority, setPriority]     = useState('medium');
  const [assigneeId, setAssigneeId] = useState(null);
  const [sprintId, setSprintId]     = useState(defaultSprintId || null);
  const [epicId, setEpicId]         = useState(defaultEpicId || null);
  const [storyPoints, setStoryPoints] = useState('');
  const [dueDate, setDueDate]       = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [toast, setToast] = useState(null);
  const showToast = (msg, isError = false) => setToast({ msg, isError });
  const fileInputRef = useRef(null);

  const addFiles = useCallback((incoming) => {
    const images = incoming.filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(f.name));
    setAttachments(prev => [...prev, ...images].slice(0, 10));
  }, []);

  const handleFileChange = (e) => {
    addFiles(Array.from(e.target.files));
    e.target.value = '';
  };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const [typeMenu, setTypeMenu]         = useState(false);
  const [priorityMenu, setPriorityMenu] = useState(false);
  const [assigneeMenu, setAssigneeMenu] = useState(false);
  const [sprintMenu, setSprintMenu]     = useState(false);
  const [epicMenu, setEpicMenu]         = useState(false);

  const { data: workflowData } = useGetProjectWorkflowQuery(projectId, { skip: !projectId });
  const { data: membersData }  = useGetProjectMembersQuery(projectId, { skip: !projectId });
  const { data: sprintsData }  = useGetSprintsQuery({ projectId }, { skip: !projectId });
  const { data: epicsData }    = useGetEpicsQuery({ projectId }, { skip: !projectId });

  const [createIssue, { isLoading }] = useCreateIssueMutation();

  const workflows     = workflowData?.data || [];
  const defaultWF     = workflows.find(w => w.isDefault) || workflows[0];
  const statuses      = [...(defaultWF?.statuses || [])].sort((a, b) => a.order - b.order);
  const members       = membersData?.data || [];
  const allSprints    = sprintsData?.data?.data || sprintsData?.data || [];
  const sprints       = allSprints.filter(s => s.status !== 'completed');
  const epics         = epicsData?.data?.data || epicsData?.data || [];
  const assignee      = members.find(m => m.userId === assigneeId)?.user;
  const selectedSprint = sprints.find(s => s.id === sprintId);
  const selectedEpic   = epics.find(e => e.id === epicId);

  const handleSubmit = async () => {
    if (!title.trim()) { setTitleError('Title is required'); return; }
    if (title.trim().length < 3) { setTitleError('Title must be at least 3 characters'); return; }
    setTitleError('');
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      if (description) formData.append('description', description);
      formData.append('type', issueType);
      formData.append('priority', priority);
      formData.append('projectId', projectId);
      if (assigneeId) formData.append('assigneeId', assigneeId);
      if (sprintId) formData.append('sprintId', sprintId);
      if (epicId) formData.append('epicId', epicId);
      if (statuses[0]?.id) formData.append('workflowStatusId', statuses[0].id);
      if (storyPoints) formData.append('storyPoints', String(parseInt(storyPoints, 10)));
      if (dueDate) formData.append('dueDate', dueDate);
      attachments.forEach(f => formData.append('attachments', f));

      const result = await createIssue({ formData, projectId, sprintId: sprintId || null }).unwrap();
      navigation.goBack();
      if (result.data?.id) navigation.navigate('IssueDetail', { issueId: result.data.id });
    } catch (err) {
      showToast(err?.data?.message || 'Failed to create issue', true);
    }
  };

  const surf   = theme.colors.surface;
  const border = theme.colors.outline;
  const typeMeta     = TYPE_META[issueType]     || TYPE_META.task;
  const priorityMeta = PRIORITY_META[priority]  || PRIORITY_META.medium;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { backgroundColor: surf, borderBottomColor: theme.colors.outlineVariant }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={20} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Back</Text>
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <View style={[styles.typeTag, { backgroundColor: typeMeta.color + '18' }]}>
            <MaterialCommunityIcons name={typeMeta.icon} size={14} color={typeMeta.color} />
            <Text variant="labelSmall" style={{ color: typeMeta.color, marginLeft: 5, fontWeight: '700' }}>
              {ISSUE_TYPE_LABELS[issueType] || issueType}
            </Text>
          </View>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginLeft: 10 }}>
            Create Issue
          </Text>
        </View>

        <View style={styles.topBarActions}>
          <Button mode="outlined" onPress={() => navigation.goBack()} style={{ borderRadius: 8 }}>
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={isLoading || !title.trim()}
            style={{ borderRadius: 8 }}
            icon="plus"
          >
            Create Issue
          </Button>
        </View>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>

        {/* ── Left: main fields ── */}
        <ScrollView style={styles.mainPanel} contentContainerStyle={styles.mainInner} showsVerticalScrollIndicator={false}>

          {/* Type selector row */}
          <View style={styles.typeRow}>
            {Object.entries(ISSUE_TYPE_LABELS).map(([val, label]) => {
              const tm = TYPE_META[val] || TYPE_META.task;
              const active = issueType === val;
              return (
                <TouchableOpacity
                  key={val}
                  onPress={() => setIssueType(val)}
                  style={[
                    styles.typeChip,
                    { borderColor: active ? tm.color : theme.colors.outlineVariant, backgroundColor: active ? tm.color + '15' : 'transparent' },
                  ]}
                >
                  <MaterialCommunityIcons name={tm.icon} size={14} color={active ? tm.color : theme.colors.onSurfaceVariant} />
                  <Text variant="labelSmall" style={{ color: active ? tm.color : theme.colors.onSurfaceVariant, marginLeft: 5, fontWeight: active ? '700' : '400' }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Title */}
          <View style={{ marginBottom: 20 }}>
            <textarea
              value={title}
              onChange={e => { setTitle(e.target.value); if (e.target.value.trim()) setTitleError(''); }}
              placeholder="Issue title *"
              rows={2}
              style={{
                width: '100%', resize: 'none', border: 'none',
                fontSize: 22, fontWeight: '700', fontFamily: 'inherit',
                color: theme.colors.onSurface, backgroundColor: 'transparent',
                outline: 'none', lineHeight: '1.4', boxSizing: 'border-box',
                padding: 0,
              }}
            />
            {!!titleError && (
              <Text variant="labelSmall" style={{ color: theme.colors.error, marginTop: 4 }}>{titleError}</Text>
            )}
          </View>

          <Divider style={{ marginBottom: 20 }} />

          {/* Description */}
          <Text variant="labelMedium" style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>Description</Text>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add a description — steps to reproduce, acceptance criteria, context…"
            rows={8}
            style={{
              width: '100%', resize: 'vertical', padding: '14px 16px',
              border: `1px solid ${theme.colors.outline}`, borderRadius: 10,
              fontSize: 14, fontFamily: 'inherit', lineHeight: '1.6',
              color: theme.colors.onSurface,
              backgroundColor: theme.dark ? theme.colors.surfaceVariant : '#FAFAFA',
              outline: 'none', boxSizing: 'border-box',
            }}
          />

          {/* ── Attachments ── */}
          <View style={{ marginTop: 24 }}>
            <Text variant="labelMedium" style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>
              Attachments
            </Text>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              style={{ cursor: 'pointer' }}
            >
              <TouchableOpacity
                onPress={() => fileInputRef.current?.click()}
                activeOpacity={0.8}
                style={[
                  styles.dropZone,
                  {
                    borderColor: isDragOver ? theme.colors.primary : theme.colors.outlineVariant,
                    backgroundColor: isDragOver
                      ? theme.colors.primaryContainer
                      : (theme.dark ? theme.colors.surfaceVariant : '#FAFAFA'),
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="image-plus"
                  size={28}
                  color={isDragOver ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
                <Text variant="bodySmall" style={{ color: isDragOver ? theme.colors.primary : theme.colors.onSurfaceVariant, marginTop: 8, fontWeight: '600' }}>
                  {isDragOver ? 'Drop images here' : 'Click or drag images to attach'}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 3 }}>
                  PNG, JPG, GIF, WebP · max 10MB · up to 10 files
                </Text>
              </TouchableOpacity>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {/* Preview grid */}
            {attachments.length > 0 && (
              <View style={styles.previewGrid}>
                {attachments.map((file, idx) => {
                  const blobUrl = URL.createObjectURL(file);
                  return (
                    <View key={idx} style={styles.previewItem}>
                      <img
                        src={blobUrl}
                        alt={file.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      <TouchableOpacity
                        style={styles.previewRemove}
                        onPress={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <MaterialCommunityIcons name="close" size={11} color="#fff" />
                      </TouchableOpacity>
                      <View style={styles.previewLabel}>
                        <Text style={{ color: '#fff', fontSize: 9, lineHeight: 12 }} numberOfLines={1}>
                          {file.name}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {attachments.length > 0 && (
              <TouchableOpacity onPress={() => setAttachments([])} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                <Text variant="labelSmall" style={{ color: theme.colors.error }}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* ── Right: sidebar ── */}
        <View style={[styles.sidebar, { backgroundColor: surf, borderLeftColor: theme.colors.outlineVariant }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingTop: 28 }}>

            {/* Priority */}
            <SidebarField label="Priority">
              <Menu
                visible={priorityMenu}
                onDismiss={() => setPriorityMenu(false)}
                anchor={
                  <TouchableOpacity onPress={() => setPriorityMenu(true)} style={[styles.dropBtn, { borderColor: border }]}>
                    <MaterialCommunityIcons name={priorityMeta.icon} size={16} color={priorityMeta.color} />
                    <Text variant="bodySmall" style={{ flex: 1, marginLeft: 8, color: theme.colors.onSurface, textTransform: 'capitalize' }}>
                      {PRIORITY_LABELS[priority] || priority}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={14} color={theme.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                }
              >
                {Object.entries(PRIORITY_META).map(([val, pm]) => (
                  <Menu.Item
                    key={val}
                    title={PRIORITY_LABELS[val] || val}
                    leadingIcon={({ size, color }) => <MaterialCommunityIcons name={pm.icon} size={size} color={pm.color} />}
                    onPress={() => { setPriority(val); setPriorityMenu(false); }}
                    titleStyle={priority === val ? { color: theme.colors.primary, fontWeight: '700' } : {}}
                  />
                ))}
              </Menu>
            </SidebarField>

            {/* Assignee */}
            <SidebarField label="Assignee">
              <Menu
                visible={assigneeMenu}
                onDismiss={() => setAssigneeMenu(false)}
                anchor={
                  <TouchableOpacity onPress={() => setAssigneeMenu(true)} style={[styles.dropBtn, { borderColor: border }]}>
                    {assignee ? (
                      <>
                        <MiniAvatar user={assignee} size={22} />
                        <Text variant="bodySmall" style={{ flex: 1, marginLeft: 8, color: theme.colors.onSurface }}>
                          {assignee.firstName} {assignee.lastName}
                        </Text>
                      </>
                    ) : (
                      <>
                        <MaterialCommunityIcons name="account-outline" size={16} color={theme.colors.onSurfaceVariant} />
                        <Text variant="bodySmall" style={{ flex: 1, marginLeft: 8, color: theme.colors.onSurfaceVariant }}>
                          Unassigned
                        </Text>
                      </>
                    )}
                    <MaterialCommunityIcons name="chevron-down" size={14} color={theme.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                }
              >
                <Menu.Item
                  title="Unassigned"
                  leadingIcon="account-off-outline"
                  onPress={() => { setAssigneeId(null); setAssigneeMenu(false); }}
                />
                <Divider />
                {members.map(m => (
                  <Menu.Item
                    key={m.userId}
                    title={`${m.user?.firstName} ${m.user?.lastName}`}
                    leadingIcon={({ size }) => <MiniAvatar user={m.user} size={size} />}
                    onPress={() => { setAssigneeId(m.userId); setAssigneeMenu(false); }}
                    titleStyle={assigneeId === m.userId ? { color: theme.colors.primary, fontWeight: '700' } : {}}
                  />
                ))}
              </Menu>
            </SidebarField>

            {/* Sprint */}
            <SidebarField label="Sprint">
              <Menu
                visible={sprintMenu}
                onDismiss={() => setSprintMenu(false)}
                anchor={
                  <TouchableOpacity onPress={() => setSprintMenu(true)} style={[styles.dropBtn, { borderColor: border }]}>
                    <MaterialCommunityIcons name="lightning-bolt-outline" size={14} color={theme.colors.onSurfaceVariant} />
                    <Text variant="bodySmall" style={{ flex: 1, marginLeft: 8, color: selectedSprint ? theme.colors.onSurface : theme.colors.onSurfaceVariant }}>
                      {selectedSprint ? selectedSprint.name : 'Backlog (no sprint)'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={14} color={theme.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                }
              >
                <Menu.Item
                  title="Backlog (no sprint)"
                  leadingIcon="inbox-outline"
                  onPress={() => { setSprintId(null); setSprintMenu(false); }}
                />
                <Divider />
                {sprints.map(s => (
                  <Menu.Item
                    key={s.id}
                    title={s.name}
                    description={s.status === 'active' ? '⚡ Active' : 'Upcoming'}
                    leadingIcon={({ size }) => (
                      <MaterialCommunityIcons
                        name="lightning-bolt-outline"
                        size={size}
                        color={s.status === 'active' ? '#10B981' : theme.colors.onSurfaceVariant}
                      />
                    )}
                    onPress={() => { setSprintId(s.id); setSprintMenu(false); }}
                    titleStyle={sprintId === s.id ? { color: theme.colors.primary, fontWeight: '700' } : {}}
                  />
                ))}
              </Menu>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                Leave blank to add to backlog
              </Text>
            </SidebarField>

            {/* Epic */}
            {epics.length > 0 && (
              <SidebarField label="Epic">
                <Menu
                  visible={epicMenu}
                  onDismiss={() => setEpicMenu(false)}
                  anchor={
                    <TouchableOpacity onPress={() => setEpicMenu(true)} style={[styles.dropBtn, { borderColor: border }]}>
                      <MaterialCommunityIcons name="lightning-bolt" size={14} color="#6554C0" />
                      <Text variant="bodySmall" style={{ flex: 1, marginLeft: 8, color: selectedEpic ? theme.colors.onSurface : theme.colors.onSurfaceVariant }}>
                        {selectedEpic ? selectedEpic.name : 'None'}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={14} color={theme.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  }
                >
                  <Menu.Item title="None" leadingIcon="close" onPress={() => { setEpicId(null); setEpicMenu(false); }} />
                  <Divider />
                  {epics.map(e => (
                    <Menu.Item
                      key={e.id}
                      title={e.name}
                      leadingIcon="lightning-bolt"
                      onPress={() => { setEpicId(e.id); setEpicMenu(false); }}
                    />
                  ))}
                </Menu>
              </SidebarField>
            )}

            {/* Story Points */}
            <SidebarField label="Story Points">
              <View style={styles.pointsRow}>
                {[1, 2, 3, 5, 8, 13].map(pts => (
                  <TouchableOpacity
                    key={pts}
                    onPress={() => setStoryPoints(storyPoints === String(pts) ? '' : String(pts))}
                    style={[
                      styles.ptsChip,
                      {
                        borderColor: storyPoints === String(pts) ? theme.colors.primary : theme.colors.outlineVariant,
                        backgroundColor: storyPoints === String(pts) ? theme.colors.primaryContainer : 'transparent',
                      },
                    ]}
                  >
                    <Text variant="labelMedium" style={{ color: storyPoints === String(pts) ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: '600' }}>
                      {pts}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                value={storyPoints}
                onChangeText={setStoryPoints}
                keyboardType="numeric"
                placeholder="Custom…"
                mode="outlined"
                dense
                style={{ marginTop: 8 }}
              />
            </SidebarField>

            {/* Due Date */}
            <SidebarField label="Due Date">
              <View style={[styles.dropBtn, { borderColor: border }]}>
                <MaterialCommunityIcons name="calendar-outline" size={14} color={theme.colors.onSurfaceVariant} />
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  style={{
                    flex: 1, border: 'none', outline: 'none', marginLeft: 8,
                    fontSize: 13, fontFamily: 'inherit', color: theme.colors.onSurface,
                    backgroundColor: 'transparent', cursor: 'pointer',
                  }}
                />
              </View>
            </SidebarField>

            {/* Status hint */}
            <Divider style={{ marginVertical: 16 }} />
            <View style={[styles.statusHint, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="information-outline" size={14} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8, flex: 1, lineHeight: 18 }}>
                New issues start as <Text style={{ fontWeight: '700' }}>{statuses[0]?.name || 'To Do'}</Text>. Change status from the issue detail page.
              </Text>
            </View>

          </ScrollView>
        </View>
      </View>
      {!!toast && <Toast message={toast.msg} isError={toast.isError} onDone={() => setToast(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    boxShadow: '0px 1px 4px rgba(0,0,0,0.05)',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 80 },
  topBarCenter: { flexDirection: 'row', alignItems: 'center' },
  typeTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  topBarActions: { flexDirection: 'row', gap: 10, minWidth: 200, justifyContent: 'flex-end' },

  body: { flex: 1, flexDirection: 'row' },

  mainPanel: { flex: 1 },
  mainInner: { padding: 40, paddingTop: 32, maxWidth: 860 },

  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },

  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0, marginBottom: 10 },

  sidebar: { width: 280, borderLeftWidth: StyleSheet.hairlineWidth },

  dropBtn: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 9, minHeight: 38,
  },
  pointsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  ptsChip: {
    width: 36, height: 36, borderRadius: 8, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  statusHint: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 10, borderRadius: 8,
  },

  dropZone: {
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 28, paddingHorizontal: 16,
  },
  previewGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12,
  },
  previewItem: {
    width: 88, height: 88, borderRadius: 8, overflow: 'hidden',
    position: 'relative',
    boxShadow: '0px 1px 4px rgba(0,0,0,0.12)',
  },
  previewRemove: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.60)', borderRadius: 10,
    width: 18, height: 18, justifyContent: 'center', alignItems: 'center',
    zIndex: 1,
  },
  previewLabel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 4, paddingVertical: 3,
  },
});
