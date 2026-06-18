import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme, Menu, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCreateIssueMutation } from '../../api/issueApi';
import { useGetProjectWorkflowQuery, useGetProjectMembersQuery, useGetEpicsQuery } from '../../api/projectApi';
import { useGetSprintsQuery } from '../../api/sprintApi';
import { ISSUE_TYPE_LABELS, PRIORITY_LABELS } from '../../constants';
import AppToast from '../../components/common/AppToast';

const NAVY = '#0F2557';

const TYPE_META = {
  task:    { icon: 'check-circle-outline', color: '#0052CC' },
  bug:     { icon: 'bug-outline',          color: '#DE350B' },
  story:   { icon: 'bookmark-outline',     color: '#00875A' },
  epic:    { icon: 'lightning-bolt',       color: '#6554C0' },
  subtask: { icon: 'minus-circle-outline', color: '#4C9AFF' },
};

const PRIORITY_META = {
  highest: { icon: 'arrow-up-bold',   color: '#DE350B', label: 'Highest' },
  high:    { icon: 'arrow-up',        color: '#FF8B00', label: 'High'    },
  medium:  { icon: 'minus',           color: '#0052CC', label: 'Medium'  },
  low:     { icon: 'arrow-down',      color: '#2684FF', label: 'Low'     },
  lowest:  { icon: 'arrow-down-bold', color: '#8993A4', label: 'Lowest'  },
};

const avatarHue = (str) => {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = str.charCodeAt(i) * 37 + ((h << 5) - h);
  return Math.abs(h) % 360;
};
const MiniAvatar = ({ user, size = 22 }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${avatarHue(user?.email)},52%,44%)`, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '800' }}>
      {`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase()}
    </Text>
  </View>
);

/* Sidebar section header */
const SideLabel = ({ icon, iconColor, iconBg, text }) => (
  <View style={ss.labelRow}>
    <View style={[ss.labelIcon, { backgroundColor: iconBg }]}>
      <MaterialCommunityIcons name={icon} size={12} color={iconColor} />
    </View>
    <Text style={ss.labelText}>{text}</Text>
  </View>
);

/* Sidebar dropdown trigger */
const DropTrigger = ({ onPress, children, theme }) => (
  <TouchableOpacity onPress={onPress} style={[ss.dropTrigger, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.background }]}>
    {children}
    <MaterialCommunityIcons name="chevron-down" size={15} color={theme.colors.onSurfaceVariant} />
  </TouchableOpacity>
);

const ss = StyleSheet.create({
  labelRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
  labelIcon:  { width: 20, height: 20, borderRadius: 5, justifyContent: 'center', alignItems: 'center' },
  labelText:  { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3 },
  dropTrigger:{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
});

export default function CreateIssueScreen({ route, navigation }) {
  const { projectId, sprintId: defaultSprintId } = route.params || {};
  const theme = useTheme();

  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [issueType, setIssueType]       = useState('task');
  const [priority, setPriority]         = useState('medium');
  const [assigneeId, setAssigneeId]     = useState(null);
  const [sprintId, setSprintId]         = useState(defaultSprintId || null);
  const [epicId, setEpicId]             = useState(null);
  const [storyPoints, setStoryPoints]   = useState('');
  const [dueDate, setDueDate]           = useState('');
  const [attachments, setAttachments]   = useState([]);
  const [isDragOver, setIsDragOver]     = useState(false);
  const [titleError, setTitleError]     = useState('');
  const [toast, setToast]               = useState('');
  const [toastType, setToastType]       = useState('error');

  const [priorityMenu, setPriorityMenu] = useState(false);
  const [assigneeMenu, setAssigneeMenu] = useState(false);
  const [sprintMenu, setSprintMenu]     = useState(false);
  const [epicMenu, setEpicMenu]         = useState(false);
  const fileInputRef = useRef(null);

  const { data: workflowData } = useGetProjectWorkflowQuery(projectId, { skip: !projectId });
  const { data: membersData  } = useGetProjectMembersQuery(projectId, { skip: !projectId });
  const { data: sprintsData  } = useGetSprintsQuery({ projectId }, { skip: !projectId });
  const { data: epicsData    } = useGetEpicsQuery({ projectId }, { skip: !projectId });
  const [createIssue, { isLoading }] = useCreateIssueMutation();

  const workflows      = workflowData?.data || [];
  const defaultWF      = workflows.find(w => w.isDefault) || workflows[0];
  const statuses       = [...(defaultWF?.statuses || [])].sort((a, b) => a.order - b.order);
  const members        = membersData?.data || [];
  const allSprints     = sprintsData?.data?.data || sprintsData?.data || [];
  const sprints        = allSprints.filter(s => s.status !== 'completed');
  const epics          = epicsData?.data?.data || epicsData?.data || [];
  const assignee       = members.find(m => m.userId === assigneeId)?.user;
  const selectedSprint = sprints.find(s => s.id === sprintId);
  const selectedEpic   = epics.find(e => e.id === epicId);
  const typeMeta       = TYPE_META[issueType]  || TYPE_META.task;
  const priorityMeta   = PRIORITY_META[priority] || PRIORITY_META.medium;

  const addFiles = useCallback((incoming) => {
    const images = incoming.filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(f.name));
    setAttachments(prev => [...prev, ...images].slice(0, 10));
  }, []);

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
      if (sprintId)   formData.append('sprintId', sprintId);
      if (epicId)     formData.append('epicId', epicId);
      if (statuses[0]?.id) formData.append('workflowStatusId', statuses[0].id);
      if (storyPoints) formData.append('storyPoints', String(parseInt(storyPoints, 10)));
      if (dueDate) formData.append('dueDate', dueDate);
      attachments.forEach(f => formData.append('attachments', f));
      const result = await createIssue({ formData, projectId, sprintId: sprintId || null }).unwrap();
      navigation.goBack();
      if (result.data?.id) navigation.navigate('IssueDetail', { issueId: result.data.id });
    } catch (err) {
      setToastType('error');
      setToast(err?.data?.message || 'Failed to create issue');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
        {/* Left: back + breadcrumb */}
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="chevron-left" size={18} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.backText, { color: theme.colors.onSurfaceVariant }]}>Back</Text>
          </TouchableOpacity>
          <View style={styles.breadcrumbSep} />
          {/* Type badge */}
          <View style={[styles.typeBadge, { backgroundColor: typeMeta.color + '15', borderColor: typeMeta.color + '40' }]}>
            <MaterialCommunityIcons name={typeMeta.icon} size={13} color={typeMeta.color} />
            <Text style={[styles.typeBadgeText, { color: typeMeta.color }]}>
              {ISSUE_TYPE_LABELS[issueType]}
            </Text>
          </View>
          <Text style={[styles.topTitle, { color: theme.colors.onSurface }]}>Create Issue</Text>
        </View>

        {/* Right: actions */}
        <View style={styles.topActions}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.background }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.cancelBtnText, { color: theme.colors.onSurfaceVariant }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: title.trim().length >= 3 && !isLoading ? NAVY : '#94A3B8' }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <MaterialCommunityIcons name="loading" size={16} color="#fff" />
            ) : (
              <MaterialCommunityIcons name="plus" size={16} color="#fff" />
            )}
            <Text style={styles.submitBtnText}>
              {isLoading ? 'Creating…' : 'Create Issue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>

        {/* ══ LEFT: main panel ══ */}
        <ScrollView style={styles.mainPanel} contentContainerStyle={styles.mainInner} showsVerticalScrollIndicator={false}>

          {/* Issue type tabs */}
          <View style={styles.typeTabs}>
            {Object.entries(TYPE_META).map(([val, tm]) => {
              const active = issueType === val;
              return (
                <TouchableOpacity
                  key={val}
                  onPress={() => setIssueType(val)}
                  style={[styles.typeTab, {
                    backgroundColor: active ? tm.color : theme.colors.surface,
                    borderColor: active ? tm.color : theme.colors.outlineVariant,
                    boxShadow: active ? `0 2px 8px ${tm.color}33` : 'none',
                  }]}
                >
                  <MaterialCommunityIcons name={tm.icon} size={15} color={active ? '#fff' : tm.color} />
                  <Text style={[styles.typeTabText, { color: active ? '#fff' : theme.colors.onSurfaceVariant, fontWeight: active ? '700' : '500' }]}>
                    {ISSUE_TYPE_LABELS[val]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Title */}
          <View style={[styles.titleWrap, { borderBottomColor: titleError ? theme.colors.error : theme.colors.outlineVariant }]}>
            <textarea
              value={title}
              onChange={e => { setTitle(e.target.value); if (e.target.value.trim()) setTitleError(''); }}
              placeholder="What needs to be done? (Issue title) *"
              rows={2}
              style={{
                width: '100%', resize: 'none', border: 'none', outline: 'none',
                fontSize: 20, fontWeight: '700', fontFamily: 'inherit',
                color: theme.colors.onSurface, backgroundColor: 'transparent',
                lineHeight: '1.45', boxSizing: 'border-box', padding: 0,
              }}
            />
            {!!titleError && (
              <View style={styles.titleError}>
                <MaterialCommunityIcons name="alert-circle-outline" size={13} color={theme.colors.error} />
                <Text style={[styles.titleErrorText, { color: theme.colors.error }]}>{titleError}</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="text-box-outline" size={15} color={NAVY} />
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Description</Text>
            </View>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add steps to reproduce, acceptance criteria, context, links…"
              rows={7}
              style={{
                width: '100%', resize: 'vertical', border: 'none', outline: 'none',
                fontSize: 14, fontFamily: 'inherit', lineHeight: '1.65',
                color: theme.colors.onSurface, backgroundColor: 'transparent',
                boxSizing: 'border-box', padding: 0,
              }}
            />
          </View>

          {/* Attachments */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="paperclip" size={15} color={NAVY} />
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Attachments</Text>
              {attachments.length > 0 && (
                <View style={[styles.attachCount, { backgroundColor: NAVY }]}>
                  <Text style={styles.attachCountText}>{attachments.length}/10</Text>
                </View>
              )}
            </View>

            <div
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={e => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); addFiles(Array.from(e.dataTransfer.files)); }}
              onClick={() => fileInputRef.current?.click()}
              style={{ cursor: 'pointer' }}
            >
              <View style={[styles.dropZone, {
                borderColor:     isDragOver ? NAVY : theme.colors.outlineVariant,
                backgroundColor: isDragOver ? '#EFF6FF' : theme.colors.background,
              }]}>
                <View style={[styles.dropZoneIcon, { backgroundColor: isDragOver ? '#DBEAFE' : theme.colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name="cloud-upload-outline" size={24} color={isDragOver ? NAVY : theme.colors.onSurfaceVariant} />
                </View>
                <Text style={[styles.dropZoneMain, { color: isDragOver ? NAVY : theme.colors.onSurface }]}>
                  {isDragOver ? 'Release to attach' : 'Click or drag images here'}
                </Text>
                <Text style={[styles.dropZoneSub, { color: theme.colors.onSurfaceVariant }]}>
                  PNG, JPG, GIF, WebP · max 10 MB · up to 10 files
                </Text>
              </View>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
              onChange={e => { addFiles(Array.from(e.target.files)); e.target.value = ''; }} />

            {attachments.length > 0 && (
              <>
                <View style={styles.previewGrid}>
                  {attachments.map((file, idx) => (
                    <View key={idx} style={styles.previewItem}>
                      <img src={URL.createObjectURL(file)} alt={file.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <TouchableOpacity
                        style={styles.previewRemove}
                        onPress={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <MaterialCommunityIcons name="close" size={10} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <TouchableOpacity onPress={() => setAttachments([])} style={styles.clearAll}>
                  <MaterialCommunityIcons name="trash-can-outline" size={13} color={theme.colors.error} />
                  <Text style={[styles.clearAllText, { color: theme.colors.error }]}>Clear all attachments</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* ══ RIGHT: sidebar ══ */}
        <View style={[styles.sidebar, { backgroundColor: '#F8FAFC', borderLeftColor: theme.colors.outlineVariant }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarInner}>

            {/* Priority */}
            <View style={styles.sideField}>
              <SideLabel icon="flag-outline" iconColor="#D97706" iconBg="#FFF7ED" text="Priority" />
              <Menu
                visible={priorityMenu}
                onDismiss={() => setPriorityMenu(false)}
                anchor={
                  <DropTrigger onPress={() => setPriorityMenu(true)} theme={theme}>
                    <View style={[styles.priorityDot, { backgroundColor: priorityMeta.color }]} />
                    <Text style={[styles.dropValue, { color: theme.colors.onSurface }]}>{priorityMeta.label}</Text>
                  </DropTrigger>
                }
              >
                {Object.entries(PRIORITY_META).map(([val, pm]) => (
                  <Menu.Item
                    key={val}
                    title={pm.label}
                    leadingIcon={({ size }) => <MaterialCommunityIcons name={pm.icon} size={size} color={pm.color} />}
                    onPress={() => { setPriority(val); setPriorityMenu(false); }}
                    titleStyle={priority === val ? { color: theme.colors.primary, fontWeight: '700' } : {}}
                  />
                ))}
              </Menu>
            </View>

            {/* Assignee */}
            <View style={styles.sideField}>
              <SideLabel icon="account-outline" iconColor="#0369A1" iconBg="#E0F2FE" text="Assignee" />
              <Menu
                visible={assigneeMenu}
                onDismiss={() => setAssigneeMenu(false)}
                anchor={
                  <DropTrigger onPress={() => setAssigneeMenu(true)} theme={theme}>
                    {assignee ? (
                      <>
                        <MiniAvatar user={assignee} size={20} />
                        <Text style={[styles.dropValue, { color: theme.colors.onSurface }]}>{assignee.firstName} {assignee.lastName}</Text>
                      </>
                    ) : (
                      <>
                        <MaterialCommunityIcons name="account-plus-outline" size={16} color={theme.colors.onSurfaceVariant} />
                        <Text style={[styles.dropPlaceholder, { color: theme.colors.onSurfaceVariant }]}>Unassigned</Text>
                      </>
                    )}
                  </DropTrigger>
                }
              >
                <Menu.Item title="Unassigned" leadingIcon="account-off-outline" onPress={() => { setAssigneeId(null); setAssigneeMenu(false); }} />
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
            </View>

            {/* Sprint */}
            <View style={styles.sideField}>
              <SideLabel icon="lightning-bolt-outline" iconColor="#7C3AED" iconBg="#F5F3FF" text="Sprint" />
              <Menu
                visible={sprintMenu}
                onDismiss={() => setSprintMenu(false)}
                anchor={
                  <DropTrigger onPress={() => setSprintMenu(true)} theme={theme}>
                    <MaterialCommunityIcons
                      name="lightning-bolt-outline" size={14}
                      color={selectedSprint ? '#7C3AED' : theme.colors.onSurfaceVariant}
                    />
                    <Text style={[styles.dropValue, { color: selectedSprint ? theme.colors.onSurface : theme.colors.onSurfaceVariant }]}>
                      {selectedSprint ? selectedSprint.name : 'Backlog (no sprint)'}
                    </Text>
                  </DropTrigger>
                }
              >
                <Menu.Item title="Backlog (no sprint)" leadingIcon="inbox-outline" onPress={() => { setSprintId(null); setSprintMenu(false); }} />
                <Divider />
                {sprints.map(s => (
                  <Menu.Item
                    key={s.id}
                    title={s.name}
                    description={s.status === 'active' ? '⚡ Active sprint' : 'Planned'}
                    leadingIcon={({ size }) => (
                      <MaterialCommunityIcons name="lightning-bolt-outline" size={size} color={s.status === 'active' ? '#10B981' : '#9CA3AF'} />
                    )}
                    onPress={() => { setSprintId(s.id); setSprintMenu(false); }}
                    titleStyle={sprintId === s.id ? { color: theme.colors.primary, fontWeight: '700' } : {}}
                  />
                ))}
              </Menu>
            </View>

            {/* Epic */}
            {epics.length > 0 && (
              <View style={styles.sideField}>
                <SideLabel icon="lightning-bolt" iconColor="#6554C0" iconBg="#EDE9FE" text="Epic" />
                <Menu
                  visible={epicMenu}
                  onDismiss={() => setEpicMenu(false)}
                  anchor={
                    <DropTrigger onPress={() => setEpicMenu(true)} theme={theme}>
                      <MaterialCommunityIcons name="lightning-bolt" size={14} color="#6554C0" />
                      <Text style={[styles.dropValue, { color: selectedEpic ? theme.colors.onSurface : theme.colors.onSurfaceVariant }]}>
                        {selectedEpic ? selectedEpic.name : 'No epic'}
                      </Text>
                    </DropTrigger>
                  }
                >
                  <Menu.Item title="No epic" leadingIcon="close" onPress={() => { setEpicId(null); setEpicMenu(false); }} />
                  <Divider />
                  {epics.map(e => (
                    <Menu.Item key={e.id} title={e.name} leadingIcon="lightning-bolt"
                      onPress={() => { setEpicId(e.id); setEpicMenu(false); }} />
                  ))}
                </Menu>
              </View>
            )}

            <Divider style={{ marginVertical: 4 }} />

            {/* Story Points */}
            <View style={styles.sideField}>
              <SideLabel icon="star-circle-outline" iconColor="#0D9488" iconBg="#F0FDFA" text="Story Points" />
              <View style={styles.ptsGrid}>
                {[1, 2, 3, 5, 8, 13].map(pts => {
                  const active = storyPoints === String(pts);
                  return (
                    <TouchableOpacity
                      key={pts}
                      onPress={() => setStoryPoints(active ? '' : String(pts))}
                      style={[styles.ptsBtn, {
                        backgroundColor: active ? NAVY : theme.colors.background,
                        borderColor:     active ? NAVY : theme.colors.outlineVariant,
                      }]}
                    >
                      <Text style={[styles.ptsBtnText, { color: active ? '#fff' : theme.colors.onSurfaceVariant }]}>
                        {pts}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {/* Custom points input */}
              <View style={[styles.customPtsWrap, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.background }]}>
                <MaterialCommunityIcons name="pencil-outline" size={13} color={theme.colors.onSurfaceVariant} />
                <input
                  type="number"
                  min="1"
                  placeholder="Custom pts"
                  value={storyPoints}
                  onChange={e => setStoryPoints(e.target.value)}
                  style={{
                    flex: 1, border: 'none', outline: 'none', marginLeft: 6,
                    fontSize: 13, fontFamily: 'inherit',
                    color: theme.colors.onSurface, backgroundColor: 'transparent',
                  }}
                />
              </View>
            </View>

            {/* Due Date */}
            <View style={styles.sideField}>
              <SideLabel icon="calendar-outline" iconColor="#DC2626" iconBg="#FEF2F2" text="Due Date" />
              {/* Wrap in a relative div so the hidden date input sits exactly below the button */}
              <div style={{ position: 'relative' }}>
                <TouchableOpacity
                  onPress={() => { const el = document.getElementById('ci-due-date'); el && el.showPicker?.(); el && el.focus(); }}
                  style={[styles.dateWrap, { borderColor: dueDate ? '#DC2626' : theme.colors.outlineVariant, backgroundColor: theme.colors.background }]}
                >
                  <MaterialCommunityIcons name="calendar-month-outline" size={16} color={dueDate ? '#DC2626' : theme.colors.onSurfaceVariant} />
                  <Text style={[styles.dateValue, { color: dueDate ? theme.colors.onSurface : theme.colors.onSurfaceVariant }]}>
                    {dueDate
                      ? new Date(dueDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Pick a date'}
                  </Text>
                  {dueDate ? (
                    <TouchableOpacity onPress={() => setDueDate('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <MaterialCommunityIcons name="close-circle" size={15} color="#94A3B8" />
                    </TouchableOpacity>
                  ) : (
                    <MaterialCommunityIcons name="chevron-down" size={15} color={theme.colors.onSurfaceVariant} />
                  )}
                </TouchableOpacity>
                {/* Hidden native date input positioned below the button */}
                <input
                  id="ci-due-date"
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  style={{
                    position: 'absolute', top: '100%', left: 0,
                    opacity: 0, width: 1, height: 1,
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </View>

            <Divider style={{ marginVertical: 4 }} />

            {/* Status hint */}
            <View style={[styles.statusHint, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <MaterialCommunityIcons name="information-outline" size={15} color={NAVY} />
              <Text style={styles.statusHintText}>
                New issues start as{' '}
                <Text style={{ fontWeight: '800', color: NAVY }}>{statuses[0]?.name || 'To Do'}</Text>.{'\n'}
                Change status from the issue detail page.
              </Text>
            </View>

          </ScrollView>
        </View>
      </View>

      {!!toast && <AppToast message={toast} type={toastType} onDone={() => setToast('')} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Top bar */
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1,
    boxShadow: '0px 1px 4px rgba(0,0,0,0.04)',
  },
  topLeft:       { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  backBtn:       { flexDirection: 'row', alignItems: 'center', gap: 3 },
  backText:      { fontSize: 13 },
  breadcrumbSep: { width: 1, height: 18, backgroundColor: '#E2E8F0' },
  typeBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  typeBadgeText: { fontSize: 12, fontWeight: '700' },
  topTitle:      { fontSize: 15, fontWeight: '700' },
  topActions:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cancelBtn:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  cancelBtnText: { fontSize: 13, fontWeight: '600' },
  submitBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  submitBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  /* Body */
  body: { flex: 1, flexDirection: 'row' },

  /* Main panel */
  mainPanel: { flex: 1 },
  mainInner: { padding: 32, paddingTop: 28, maxWidth: 800 },

  /* Type tabs */
  typeTabs: { flexDirection: 'row', gap: 8, marginBottom: 28, flexWrap: 'wrap' },
  typeTab:  {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
  },
  typeTabText: { fontSize: 12 },

  /* Title */
  titleWrap: { borderBottomWidth: 2, paddingBottom: 16, marginBottom: 24 },
  titleError: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  titleErrorText: { fontSize: 12 },

  /* Sections */
  section: {
    borderWidth: 1, borderRadius: 12, padding: 18, marginBottom: 16,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle:  { fontSize: 13, fontWeight: '700' },
  attachCount:   { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  attachCountText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  /* Drop zone */
  dropZone: {
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 10,
    alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16, gap: 6,
  },
  dropZoneIcon:  { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  dropZoneMain:  { fontSize: 13, fontWeight: '600' },
  dropZoneSub:   { fontSize: 11 },

  /* Preview */
  previewGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  previewItem:   { width: 80, height: 80, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  previewRemove: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 9,
    width: 18, height: 18, justifyContent: 'center', alignItems: 'center',
  },
  clearAll:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, alignSelf: 'flex-start' },
  clearAllText:  { fontSize: 12, fontWeight: '600' },

  /* Sidebar */
  sidebar: { width: 284, borderLeftWidth: StyleSheet.hairlineWidth },
  sidebarInner: { padding: 20, gap: 0 },
  sideField:    { marginBottom: 20 },

  /* Dropdown */
  dropValue:       { flex: 1, fontSize: 13, fontWeight: '500' },
  dropPlaceholder: { flex: 1, fontSize: 13 },
  priorityDot:     { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },

  /* Story points */
  ptsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  ptsBtn:  {
    width: 38, height: 34, borderRadius: 8, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  ptsBtnText: { fontSize: 13, fontWeight: '700' },
  customPtsWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
  },

  /* Date */
  dateWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9,
  },
  dateValue: { flex: 1, fontSize: 13, fontWeight: '500' },

  /* Status hint */
  statusHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 4,
  },
  statusHintText: { flex: 1, fontSize: 12, color: '#1D4ED8', lineHeight: 18 },
});
