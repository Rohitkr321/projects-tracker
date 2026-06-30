import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme, Menu, Divider, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCreateIssueMutation, usePresignImageUploadMutation, useConfirmImageUploadMutation } from '../../api/issueApi';
import { useGetProjectWorkflowQuery, useGetProjectMembersQuery, useGetEpicsQuery, useGetLabelsQuery } from '../../api/projectApi';
import { useGetSprintsQuery } from '../../api/sprintApi';
import { ISSUE_TYPE_LABELS, PRIORITY_LABELS } from '../../constants';
import AppToast from '../../components/common/AppToast';

const FILE_META = {
  'application/pdf':                                                                        { icon: 'file-pdf-box',        color: '#DC2626' },
  'application/msword':                                                                     { icon: 'file-word-box',       color: '#2563EB' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':               { icon: 'file-word-box',       color: '#2563EB' },
  'application/vnd.ms-excel':                                                               { icon: 'file-excel-box',      color: '#059669' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':                     { icon: 'file-excel-box',      color: '#059669' },
  'application/vnd.ms-powerpoint':                                                          { icon: 'file-powerpoint-box', color: '#EA580C' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':             { icon: 'file-powerpoint-box', color: '#EA580C' },
  'text/plain':                                                                              { icon: 'file-document-outline', color: '#6B7280' },
  'text/csv':                                                                               { icon: 'file-table-outline',  color: '#0891B2' },
  'application/zip':                                                                        { icon: 'folder-zip-outline',  color: '#7C3AED' },
  'application/x-zip-compressed':                                                           { icon: 'folder-zip-outline',  color: '#7C3AED' },
};
const getFileMeta = (mime) => FILE_META[mime] || { icon: 'file-outline', color: '#6B7280' };
const fmtSize = (b) => !b ? '' : b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

const TYPE_META = {
  task:    { icon: 'check-circle-outline', color: '#0052CC', bg: '#DEEBFF', label: 'Task'    },
  bug:     { icon: 'bug-outline',          color: '#DE350B', bg: '#FFEBE6', label: 'Bug'     },
  story:   { icon: 'bookmark-outline',     color: '#00875A', bg: '#E3FCEF', label: 'Story'   },
  epic:    { icon: 'lightning-bolt',       color: '#6554C0', bg: '#EAE6FF', label: 'Epic'    },
  subtask: { icon: 'minus-circle-outline', color: '#4C9AFF', bg: '#DEEBFF', label: 'Subtask' },
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

/* Compact sidebar field label */
const FieldLabel = ({ icon, iconColor, iconBg, text }) => (
  <View style={ss.fieldLabelRow}>
    <View style={[ss.fieldLabelIcon, { backgroundColor: iconBg }]}>
      <MaterialCommunityIcons name={icon} size={11} color={iconColor} />
    </View>
    <Text style={ss.fieldLabelText}>{text}</Text>
  </View>
);

const DropTrigger = ({ onPress, children, theme }) => (
  <TouchableOpacity onPress={onPress} style={[ss.dropTrigger, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.background }]}>
    {children}
    <MaterialCommunityIcons name="chevron-down" size={14} color={theme.colors.onSurfaceVariant} />
  </TouchableOpacity>
);

const ISSUE_TEMPLATES = [
  {
    id: 'bug', label: 'Bug Report', icon: 'bug-outline', color: '#DE350B', type: 'bug', priority: 'high', storyPoints: '2',
    description: `**Steps to reproduce:**\n1.\n2.\n3.\n\n**Expected result:**\n\n\n**Actual result:**\n\n\n**Environment:**\n- Browser/OS:\n- Version:`,
  },
  {
    id: 'feature', label: 'Feature Request', icon: 'star-outline', color: '#00875A', type: 'story', priority: 'medium', storyPoints: '5',
    description: `**Summary:**\nWhat is the feature and why is it needed?\n\n**Acceptance criteria:**\n- [ ]\n- [ ]\n- [ ]\n\n**Out of scope:**`,
  },
  {
    id: 'story', label: 'User Story', icon: 'account-outline', color: '#6554C0', type: 'story', priority: 'medium', storyPoints: '3',
    description: `**As a** [type of user],\n**I want** [some goal],\n**So that** [some reason].\n\n**Acceptance criteria:**\n- Given [context], when [action], then [result]\n-\n\n**Notes:**`,
  },
  {
    id: 'task', label: 'Tech Task', icon: 'wrench-outline', color: '#0052CC', type: 'task', priority: 'medium', storyPoints: '3',
    description: `**Objective:**\n\n\n**Implementation notes:**\n-\n-\n\n**Definition of done:**\n- [ ] Code reviewed\n- [ ] Tests passing`,
  },
  {
    id: 'epic', label: 'Epic', icon: 'lightning-bolt', color: '#6554C0', type: 'epic', priority: 'high', storyPoints: '13',
    description: `**Goal:**\n\n\n**Background:**\n\n\n**Success metrics:**\n-\n\n**Key stories:**\n- `,
  },
];

const ss = StyleSheet.create({
  fieldLabelRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  fieldLabelIcon: { width: 18, height: 18, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  fieldLabelText: { fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  dropTrigger:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
});

export default function CreateIssueScreen({ route, navigation }) {
  const { projectId, sprintId: defaultSprintId } = route.params || {};
  const theme = useTheme();
  const isDark = theme.dark;

  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [issueType, setIssueType]       = useState('task');
  const [priority, setPriority]         = useState('medium');
  const [assigneeId, setAssigneeId]     = useState(null);
  const [sprintId, setSprintId]         = useState(defaultSprintId || null);
  const [epicId, setEpicId]             = useState(null);
  const [storyPoints, setStoryPoints]   = useState('');
  const [dueDate, setDueDate]           = useState('');
  const [selectedLabelIds, setSelectedLabelIds] = useState([]);
  const [labelMenuOpen, setLabelMenuOpen]       = useState(false);
  const [attachments, setAttachments]     = useState([]);
  const [dragOver, setDragOver]           = useState(false);
  const [links, setLinks]                 = useState([]);
  const [linkUrl, setLinkUrl]             = useState('');
  const [linkName, setLinkName]           = useState('');
  const attachInputRef = useRef(null);
  const [uploading, setUploading]         = useState(false);
  const [uploadStatus, setUploadStatus]   = useState('');
  const [titleError, setTitleError]       = useState('');
  const [toast, setToast]                 = useState('');
  const [toastType, setToastType]         = useState('error');
  const [showTemplates, setShowTemplates] = useState(true);

  const [priorityMenu, setPriorityMenu] = useState(false);
  const [assigneeMenu, setAssigneeMenu] = useState(false);
  const [sprintMenu, setSprintMenu]     = useState(false);
  const [epicMenu, setEpicMenu]         = useState(false);

  const { data: workflowData } = useGetProjectWorkflowQuery(projectId, { skip: !projectId });
  const { data: membersData  } = useGetProjectMembersQuery(projectId, { skip: !projectId });
  const { data: sprintsData  } = useGetSprintsQuery({ projectId }, { skip: !projectId });
  const { data: epicsData    } = useGetEpicsQuery({ projectId }, { skip: !projectId });
  const { data: labelsData   } = useGetLabelsQuery(projectId, { skip: !projectId });
  const allLabels = labelsData?.data || [];
  const [createIssue, { isLoading }]  = useCreateIssueMutation();
  const [presignImageUpload]           = usePresignImageUploadMutation();
  const [confirmImageUpload]           = useConfirmImageUploadMutation();

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
  const canSubmit      = title.trim().length >= 3 && !uploading;

  const surf   = isDark ? '#16213E' : '#FFFFFF';
  const bg     = isDark ? '#0F172A' : '#F1F5F9';
  const border = isDark ? '#1E293B' : '#E2E8F0';

  const applyTemplate = (tpl) => {
    setIssueType(tpl.type);
    setPriority(tpl.priority);
    setDescription(tpl.description);
    if (tpl.storyPoints) setStoryPoints(tpl.storyPoints);
    setShowTemplates(false);
  };

  const compressImage = (file, maxDim = 1920, quality = 0.82) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new window.Image();
        img.onload = () => {
          const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
          const canvas = document.createElement('canvas');
          canvas.width  = Math.round(img.width  * ratio);
          canvas.height = Math.round(img.height * ratio);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            blob => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
            'image/jpeg', quality,
          );
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });

  const addAttachments = (incoming) => {
    const items = Array.from(incoming).map(f => ({
      file: f,
      isImage: f.type.startsWith('image/'),
      previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    }));
    setAttachments(prev => [...prev, ...items].slice(0, 10));
  };

  const removeAttachment = (idx) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  const handleAddLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    const name = linkName.trim() || url;
    setLinks(prev => [...prev, { url, name }]);
    setLinkUrl('');
    setLinkName('');
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setTitleError('Title is required'); return; }
    if (title.trim().length < 3) { setTitleError('Title must be at least 3 characters'); return; }
    setTitleError('');
    setUploading(true);
    setUploadStatus(attachments.length ? 'Creating issue…' : 'Creating…');
    try {
      const pendingLinks = linkUrl.trim()
        ? [...links, { url: linkUrl.trim(), name: linkName.trim() || linkUrl.trim() }]
        : links;
      const body = {
        title: title.trim(),
        type: issueType,
        priority,
        projectId,
        ...(description      && { description }),
        ...(assigneeId       && { assigneeId }),
        ...(sprintId         && { sprintId }),
        ...(epicId           && { epicId }),
        ...(statuses[0]?.id  && { workflowStatusId: statuses[0].id }),
        ...(storyPoints      && { storyPoints: parseInt(storyPoints, 10) }),
        ...(dueDate          && { dueDate }),
        ...(selectedLabelIds.length && { labelIds: selectedLabelIds }),
        ...(pendingLinks.length && { attachmentLinks: pendingLinks }),
      };
      const result = await createIssue({ body, projectId, sprintId: sprintId || null }).unwrap();
      const newIssueId = result.data?.id;
      if (newIssueId && attachments.length) {
        for (let i = 0; i < attachments.length; i++) {
          const { file, isImage } = attachments[i];
          setUploadStatus(`Uploading ${isImage ? 'image' : 'file'} ${i + 1} of ${attachments.length}…`);
          try {
            let uploadFile = file;
            let contentType = file.type || 'application/octet-stream';
            let mimeType = contentType;
            if (isImage) {
              uploadFile = await compressImage(file);
              contentType = 'image/jpeg';
              mimeType    = 'image/jpeg';
            }
            const presignData = await presignImageUpload({
              issueId: newIssueId, filename: uploadFile.name,
              contentType, type: isImage ? 'images' : 'files',
            }).unwrap();
            const { presignedUrl, key } = presignData.data;
            const s3Res = await fetch(presignedUrl, {
              method: 'PUT', body: uploadFile, headers: { 'Content-Type': contentType },
            });
            if (s3Res.ok) {
              await confirmImageUpload({
                issueId: newIssueId, key, name: file.name, mimeType, size: uploadFile.size,
              }).unwrap();
            }
          } catch (_) {}
        }
      }
      navigation.goBack();
      if (newIssueId) navigation.navigate('IssueDetail', { issueId: newIssueId });
    } catch (err) {
      setToastType('error');
      setToast(err?.data?.message || 'Failed to create issue');
    } finally {
      setUploading(false);
      setUploadStatus('');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { backgroundColor: surf, borderBottomColor: border }]}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={17} color={typeMeta.color} />
            <Text style={[styles.backText, { color: theme.colors.onSurfaceVariant }]}>Back</Text>
          </TouchableOpacity>
          <View style={[styles.topDivider, { backgroundColor: border }]} />
          <View style={[styles.typeBadge, { backgroundColor: typeMeta.bg, borderColor: typeMeta.color + '55' }]}>
            <MaterialCommunityIcons name={typeMeta.icon} size={13} color={typeMeta.color} />
            <Text style={[styles.typeBadgeText, { color: typeMeta.color }]}>{typeMeta.label}</Text>
          </View>
          <Text style={[styles.topTitle, { color: theme.colors.onSurface }]}>Create Issue</Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: border, backgroundColor: bg }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.cancelBtnText, { color: theme.colors.onSurfaceVariant }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, { opacity: uploading ? 0.7 : 1, background: canSubmit ? 'linear-gradient(90deg,#3B82F6,#6366F1)' : undefined, backgroundColor: canSubmit ? '#3B82F6' : isDark ? '#1E293B' : '#E2E8F0' }]}
            onPress={handleSubmit}
            disabled={uploading}
          >
            {uploading
              ? <ActivityIndicator size={14} color="#fff" animating />
              : <MaterialCommunityIcons name="plus" size={16} color={canSubmit ? '#fff' : theme.colors.onSurfaceVariant} />
            }
            <Text style={[styles.submitBtnText, { color: canSubmit ? '#fff' : theme.colors.onSurfaceVariant }]}>
              {uploading ? (uploadStatus || 'Please wait…') : 'Create Issue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>

        {/* ══ LEFT: main panel ══ */}
        <ScrollView style={styles.mainPanel} contentContainerStyle={styles.mainInner} showsVerticalScrollIndicator={false}>

          {/* ── Templates strip ── */}
          <View style={[styles.templateBlock, { backgroundColor: surf, borderColor: border }]}>
            <TouchableOpacity style={styles.templateToggle} onPress={() => setShowTemplates(v => !v)}>
              <View style={[styles.templateToggleIcon, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' }]}>
                <MaterialCommunityIcons name="file-document-multiple-outline" size={14} color="#3B82F6" />
              </View>
              <Text style={[styles.templateToggleText, { color: theme.colors.onSurface }]}>Start from a template</Text>
              <View style={{ flex: 1 }} />
              <MaterialCommunityIcons name={showTemplates ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>

            {showTemplates && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateRow}>
                {ISSUE_TEMPLATES.map(tpl => (
                  <TouchableOpacity
                    key={tpl.id}
                    style={[styles.templateCard, { backgroundColor: isDark ? tpl.color + '14' : tpl.color + '08', borderColor: tpl.color + '45' }]}
                    onPress={() => applyTemplate(tpl)}
                  >
                    <View style={[styles.templateIconWrap, { backgroundColor: tpl.color + '20' }]}>
                      <MaterialCommunityIcons name={tpl.icon} size={20} color={tpl.color} />
                    </View>
                    <Text style={[styles.templateLabel, { color: tpl.color }]}>{tpl.label}</Text>
                    <Text style={[styles.templateHint, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                      {tpl.type.charAt(0).toUpperCase() + tpl.type.slice(1)} · {tpl.priority}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* ── Issue type tabs ── */}
          <View style={[styles.typeTabsWrap, { backgroundColor: surf, borderColor: border }]}>
            <Text style={[styles.typeTabsLabel, { color: theme.colors.onSurfaceVariant }]}>Issue Type</Text>
            <View style={styles.typeTabs}>
              {Object.entries(TYPE_META).map(([val, tm]) => {
                const active = issueType === val;
                return (
                  <TouchableOpacity
                    key={val}
                    onPress={() => setIssueType(val)}
                    style={[styles.typeTab, {
                      backgroundColor: active ? tm.color : 'transparent',
                      borderColor: active ? tm.color : border,
                      boxShadow: active ? `0 2px 10px ${tm.color}40` : 'none',
                    }]}
                  >
                    <MaterialCommunityIcons name={active ? tm.icon.replace('-outline', '') : tm.icon} size={14} color={active ? '#fff' : tm.color} />
                    <Text style={[styles.typeTabText, { color: active ? '#fff' : theme.colors.onSurfaceVariant, fontWeight: active ? '700' : '500' }]}>
                      {tm.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Title card ── */}
          <View style={[styles.titleCard, { backgroundColor: surf, borderColor: border, borderLeftColor: typeMeta.color }]}>
            <View style={styles.titleCardHeader}>
              <View style={[styles.titleTypeIcon, { backgroundColor: typeMeta.bg }]}>
                <MaterialCommunityIcons name={typeMeta.icon} size={16} color={typeMeta.color} />
              </View>
              <Text style={[styles.titleCardLabel, { color: typeMeta.color }]}>{typeMeta.label} Title</Text>
              <Text style={[styles.titleRequired, { color: theme.colors.error }]}>*</Text>
            </View>
            <textarea
              value={title}
              onChange={e => { setTitle(e.target.value); if (e.target.value.trim()) setTitleError(''); }}
              placeholder="What needs to be done?"
              rows={2}
              style={{
                width: '100%', resize: 'none', border: 'none', outline: 'none',
                fontSize: 22, fontWeight: '700', fontFamily: 'inherit',
                color: isDark ? '#F1F5F9' : '#0F172A',
                backgroundColor: 'transparent',
                lineHeight: '1.4', boxSizing: 'border-box', padding: 0, marginTop: 10,
              }}
            />
            {!!titleError && (
              <View style={styles.titleError}>
                <MaterialCommunityIcons name="alert-circle-outline" size={13} color={theme.colors.error} />
                <Text style={[styles.titleErrorText, { color: theme.colors.error }]}>{titleError}</Text>
              </View>
            )}
          </View>

          {/* ── Description ── */}
          <View style={[styles.section, { backgroundColor: surf, borderColor: border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrap, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' }]}>
                <MaterialCommunityIcons name="text-box-outline" size={13} color="#3B82F6" />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Description</Text>
            </View>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add steps to reproduce, acceptance criteria, context, links…"
              rows={7}
              style={{
                width: '100%', resize: 'vertical', border: 'none', outline: 'none',
                fontSize: 14, fontFamily: 'inherit', lineHeight: '1.7',
                color: isDark ? '#CBD5E1' : '#334155',
                backgroundColor: 'transparent',
                boxSizing: 'border-box', padding: 0,
              }}
            />
          </View>

          {/* ── Attachments ── */}
          <View style={[styles.section, { backgroundColor: surf, borderColor: border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrap, { backgroundColor: isDark ? '#1A2F1A' : '#F0FDF4' }]}>
                <MaterialCommunityIcons name="paperclip" size={13} color="#16A34A" />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Attachments</Text>
              {attachments.length > 0 && (
                <View style={[styles.countBadge, { backgroundColor: '#3B82F6' }]}>
                  <Text style={styles.countBadgeText}>{attachments.length}</Text>
                </View>
              )}
            </View>

            <div
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false); addAttachments(e.dataTransfer.files); }}
              onClick={() => attachInputRef.current?.click()}
              style={{ cursor: 'pointer' }}
            >
              <View style={[styles.dropZone, {
                borderColor:     dragOver ? '#3B82F6' : border,
                backgroundColor: dragOver ? (isDark ? '#1E3A5F' : '#EFF6FF') : 'transparent',
              }]}>
                <View style={[styles.dropZoneIcon, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <MaterialCommunityIcons name="tray-arrow-up" size={22} color={dragOver ? '#3B82F6' : theme.colors.onSurfaceVariant} />
                </View>
                <Text style={[styles.dropZoneText, { color: dragOver ? '#3B82F6' : theme.colors.onSurface }]}>
                  {dragOver ? 'Release to add files' : 'Click or drag files here'}
                </Text>
                <Text style={[styles.dropZoneHint, { color: theme.colors.onSurfaceVariant }]}>
                  Images auto-compressed · PDF, Word, Excel, PPT, CSV, ZIP
                </Text>
              </View>
            </div>
            <input
              ref={attachInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
              style={{ display: 'none' }}
              onChange={e => { addAttachments(e.target.files); e.target.value = ''; }}
            />

            {attachments.some(a => a.isImage) && (
              <View style={styles.imgRow}>
                {attachments.map((a, idx) => !a.isImage ? null : (
                  <View key={idx} style={styles.imgThumb}>
                    <img src={a.previewUrl} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                    <TouchableOpacity onPress={() => removeAttachment(idx)} style={styles.imgRemove}>
                      <MaterialCommunityIcons name="close-circle" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {attachments.some(a => !a.isImage) && (
              <View style={{ gap: 6, marginTop: 10 }}>
                {attachments.map((a, idx) => a.isImage ? null : (() => {
                  const fm = getFileMeta(a.file.type);
                  return (
                    <View key={idx} style={[styles.fileRow, { borderColor: border, backgroundColor: bg }]}>
                      <View style={[styles.fileIcon, { backgroundColor: fm.color + '15' }]}>
                        <MaterialCommunityIcons name={fm.icon} size={18} color={fm.color} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.onSurface }} numberOfLines={1}>{a.file.name}</Text>
                        <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, marginTop: 1 }}>{fmtSize(a.file.size)}</Text>
                      </View>
                      <TouchableOpacity onPress={() => removeAttachment(idx)} style={styles.fileRemove}>
                        <MaterialCommunityIcons name="close" size={13} color={theme.colors.onSurfaceVariant} />
                      </TouchableOpacity>
                    </View>
                  );
                })())}
              </View>
            )}
          </View>

          {/* ── Links ── */}
          <View style={[styles.section, { backgroundColor: surf, borderColor: border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrap, { backgroundColor: isDark ? '#2D1A4D' : '#FAF5FF' }]}>
                <MaterialCommunityIcons name="link-variant" size={13} color="#7C3AED" />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Links</Text>
              {links.length > 0 && (
                <View style={[styles.countBadge, { backgroundColor: '#7C3AED' }]}>
                  <Text style={styles.countBadgeText}>{links.length}</Text>
                </View>
              )}
            </View>

            <View style={[styles.linkInput, { borderColor: border, backgroundColor: bg }]}>
              <MaterialCommunityIcons name="link" size={14} color={theme.colors.onSurfaceVariant} />
              <input
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddLink(); } }}
                placeholder="Paste URL…"
                style={{ flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: 13, color: isDark ? '#F1F5F9' : '#0F172A', fontFamily: 'inherit', minWidth: 0 }}
              />
            </View>
            <View style={[styles.linkNameRow, { borderColor: border, backgroundColor: bg }]}>
              <MaterialCommunityIcons name="tag-outline" size={14} color={theme.colors.onSurfaceVariant} />
              <input
                value={linkName}
                onChange={e => setLinkName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddLink(); } }}
                placeholder="Label (optional)"
                style={{ flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: 13, color: isDark ? '#F1F5F9' : '#0F172A', fontFamily: 'inherit', minWidth: 0 }}
              />
              <TouchableOpacity
                onPress={handleAddLink}
                disabled={!linkUrl.trim()}
                style={[styles.addLinkBtn, { backgroundColor: linkUrl.trim() ? '#7C3AED' : (isDark ? '#1E293B' : '#E2E8F0') }]}
              >
                <MaterialCommunityIcons name="plus" size={14} color={linkUrl.trim() ? '#fff' : theme.colors.onSurfaceVariant} />
                <Text style={{ color: linkUrl.trim() ? '#fff' : theme.colors.onSurfaceVariant, fontSize: 12, fontWeight: '700' }}>Add</Text>
              </TouchableOpacity>
            </View>

            {links.length > 0 && (
              <View style={{ gap: 6, marginTop: 10 }}>
                {links.map((lnk, idx) => (
                  <View key={idx} style={[styles.fileRow, { borderColor: border, backgroundColor: bg }]}>
                    <View style={[styles.fileIcon, { backgroundColor: '#7C3AED15' }]}>
                      <MaterialCommunityIcons name="link-variant" size={16} color="#7C3AED" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.onSurface }} numberOfLines={1}>{lnk.name}</Text>
                      <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, marginTop: 1 }} numberOfLines={1}>{lnk.url}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setLinks(prev => prev.filter((_, i) => i !== idx))} style={styles.fileRemove}>
                      <MaterialCommunityIcons name="close" size={13} color={theme.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* ══ RIGHT: sidebar ══ */}
        <View style={[styles.sidebar, { backgroundColor: surf, borderLeftColor: border }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarInner}>

            {/* Priority */}
            <View style={styles.sideField}>
              <FieldLabel icon="flag-outline" iconColor="#D97706" iconBg={isDark ? '#2D1A00' : '#FFF7ED'} text="Priority" />
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
              <FieldLabel icon="account-outline" iconColor="#0369A1" iconBg={isDark ? '#0C2A3D' : '#E0F2FE'} text="Assignee" />
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
              <FieldLabel icon="lightning-bolt-outline" iconColor="#7C3AED" iconBg={isDark ? '#2D1A4D' : '#F5F3FF'} text="Sprint" />
              <Menu
                visible={sprintMenu}
                onDismiss={() => setSprintMenu(false)}
                anchor={
                  <DropTrigger onPress={() => setSprintMenu(true)} theme={theme}>
                    <MaterialCommunityIcons name="lightning-bolt-outline" size={14} color={selectedSprint ? '#7C3AED' : theme.colors.onSurfaceVariant} />
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
                <FieldLabel icon="lightning-bolt" iconColor="#6554C0" iconBg={isDark ? '#2A1A4D' : '#EDE9FE'} text="Epic" />
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

            <View style={[styles.sectionDivider, { backgroundColor: border }]} />

            {/* Story Points */}
            <View style={styles.sideField}>
              <FieldLabel icon="star-circle-outline" iconColor="#0D9488" iconBg={isDark ? '#0A2525' : '#F0FDFA'} text="Story Points" />
              <View style={styles.ptsGrid}>
                {[1, 2, 3, 5, 8, 13].map(pts => {
                  const active = storyPoints === String(pts);
                  return (
                    <TouchableOpacity
                      key={pts}
                      onPress={() => setStoryPoints(active ? '' : String(pts))}
                      style={[styles.ptsBtn, {
                        backgroundColor: active ? '#0D9488' : bg,
                        borderColor:     active ? '#0D9488' : border,
                        boxShadow:       active ? '0 2px 8px rgba(13,148,136,0.35)' : 'none',
                      }]}
                    >
                      <Text style={[styles.ptsBtnText, { color: active ? '#fff' : theme.colors.onSurfaceVariant }]}>{pts}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={[styles.customPtsInput, { borderColor: border, backgroundColor: bg }]}>
                <MaterialCommunityIcons name="pencil-outline" size={13} color={theme.colors.onSurfaceVariant} />
                <input
                  type="number"
                  min="1"
                  placeholder="Custom pts"
                  value={storyPoints}
                  onChange={e => setStoryPoints(e.target.value)}
                  style={{ flex: 1, border: 'none', outline: 'none', marginLeft: 6, fontSize: 13, fontFamily: 'inherit', color: isDark ? '#F1F5F9' : '#0F172A', backgroundColor: 'transparent' }}
                />
              </View>
            </View>

            {/* Due Date */}
            <View style={styles.sideField}>
              <FieldLabel icon="calendar-outline" iconColor="#DC2626" iconBg={isDark ? '#2D0A0A' : '#FEF2F2'} text="Due Date" />
              <div style={{ position: 'relative' }}>
                <TouchableOpacity
                  onPress={() => { const el = document.getElementById('ci-due-date'); el && el.showPicker?.(); el && el.focus(); }}
                  style={[styles.dateTrigger, { borderColor: dueDate ? '#DC2626' : border, backgroundColor: bg }]}
                >
                  <MaterialCommunityIcons name="calendar-month-outline" size={15} color={dueDate ? '#DC2626' : theme.colors.onSurfaceVariant} />
                  <Text style={[styles.dateValue, { color: dueDate ? theme.colors.onSurface : theme.colors.onSurfaceVariant }]}>
                    {dueDate
                      ? new Date(dueDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Pick a date'}
                  </Text>
                  {dueDate
                    ? <TouchableOpacity onPress={() => setDueDate('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <MaterialCommunityIcons name="close-circle" size={14} color="#94A3B8" />
                      </TouchableOpacity>
                    : <MaterialCommunityIcons name="chevron-down" size={14} color={theme.colors.onSurfaceVariant} />
                  }
                </TouchableOpacity>
                <input
                  id="ci-due-date"
                  type="date"
                  value={dueDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setDueDate(e.target.value)}
                  style={{ position: 'absolute', top: '100%', left: 0, opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
                />
              </div>
            </View>

            {/* Labels */}
            {allLabels.length > 0 && (
              <View style={styles.sideField}>
                <FieldLabel icon="tag-outline" iconColor="#06B6D4" iconBg={isDark ? '#0A2D35' : '#ECFEFF'} text="Labels" />
                <Menu
                  visible={labelMenuOpen}
                  onDismiss={() => setLabelMenuOpen(false)}
                  anchor={
                    <DropTrigger onPress={() => setLabelMenuOpen(true)} theme={theme}>
                      {selectedLabelIds.length === 0 ? (
                        <>
                          <MaterialCommunityIcons name="tag-outline" size={15} color={theme.colors.onSurfaceVariant} />
                          <Text style={[styles.dropPlaceholder, { color: theme.colors.onSurfaceVariant }]}>None</Text>
                        </>
                      ) : (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1 }}>
                          {allLabels.filter(l => selectedLabelIds.includes(l.id)).map(l => (
                            <View key={l.id} style={{ backgroundColor: (l.color || '#3B82F6') + '18', borderWidth: 1, borderColor: (l.color || '#3B82F6') + '40', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 }}>
                              <Text style={{ color: l.color || '#3B82F6', fontSize: 11, fontWeight: '600' }}>{l.name}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </DropTrigger>
                  }
                >
                  {allLabels.map(lbl => {
                    const active = selectedLabelIds.includes(lbl.id);
                    return (
                      <Menu.Item
                        key={lbl.id}
                        title={lbl.name}
                        leadingIcon={active ? 'check-circle' : 'circle-outline'}
                        onPress={() => setSelectedLabelIds(prev => active ? prev.filter(id => id !== lbl.id) : [...prev, lbl.id])}
                        titleStyle={{ color: active ? lbl.color || '#3B82F6' : undefined }}
                      />
                    );
                  })}
                </Menu>
              </View>
            )}

            <View style={[styles.sectionDivider, { backgroundColor: border }]} />

            {/* Status hint */}
            <View style={[styles.statusHint, { backgroundColor: isDark ? '#0F2040' : '#EFF6FF', borderColor: '#3B82F630' }]}>
              <MaterialCommunityIcons name="information-outline" size={14} color="#3B82F6" />
              <Text style={styles.statusHintText}>
                Opens as{' '}
                <Text style={{ fontWeight: '800', color: '#3B82F6' }}>{statuses[0]?.name || 'To Do'}</Text>.
                {'\n'}Change status from the issue page.
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

  /* ─ Top bar ─ */
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 11, borderBottomWidth: 1,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  topLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  backBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  backText:   { fontSize: 13, fontWeight: '500' },
  topDivider: { width: 1, height: 18 },
  typeBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: 1.5 },
  typeBadgeText: { fontSize: 12, fontWeight: '800' },
  topTitle:   { fontSize: 15, fontWeight: '700' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cancelBtn:  { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9, borderWidth: 1 },
  cancelBtnText: { fontSize: 13, fontWeight: '600' },
  submitBtn:  {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 9,
    boxShadow: '0 4px 14px rgba(59,130,246,0.4)',
  },
  submitBtnText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.1 },

  /* ─ Body ─ */
  body:       { flex: 1, flexDirection: 'row' },
  mainPanel:  { flex: 1 },
  mainInner:  { padding: 28, paddingTop: 24, gap: 14, maxWidth: 820 },

  /* ─ Templates ─ */
  templateBlock:  { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  templateToggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10, cursor: 'pointer' },
  templateToggleIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  templateToggleText: { fontSize: 13, fontWeight: '700' },
  templateRow:  { paddingHorizontal: 14, paddingBottom: 16, gap: 10 },
  templateCard: {
    width: 110, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10,
    borderRadius: 12, borderWidth: 1.5, cursor: 'pointer', gap: 8,
  },
  templateIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  templateLabel:    { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  templateHint:     { fontSize: 10, fontWeight: '500', textAlign: 'center' },

  /* ─ Type tabs ─ */
  typeTabsWrap:  { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14 },
  typeTabsLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  typeTabs:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeTab:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, borderWidth: 1.5 },
  typeTabText:   { fontSize: 12 },

  /* ─ Title card ─ */
  titleCard: {
    borderWidth: 1, borderRadius: 14, borderLeftWidth: 4,
    paddingHorizontal: 20, paddingVertical: 16,
  },
  titleCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleTypeIcon:   { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  titleCardLabel:  { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  titleRequired:   { fontSize: 16, fontWeight: '900', marginTop: -2 },
  titleError:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  titleErrorText:  { fontSize: 12 },

  /* ─ Sections ─ */
  section:       { borderWidth: 1, borderRadius: 14, padding: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionIconWrap:{ width: 26, height: 26, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  sectionTitle:  { fontSize: 13, fontWeight: '700', flex: 1 },
  countBadge:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  countBadgeText:{ color: '#fff', fontSize: 10, fontWeight: '800' },

  /* ─ Drop zone ─ */
  dropZone:     {
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12,
    alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16, gap: 6,
  },
  dropZoneIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  dropZoneText: { fontSize: 13, fontWeight: '700' },
  dropZoneHint: { fontSize: 11 },
  imgRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  imgThumb:     { position: 'relative', width: 72, height: 72 },
  imgRemove:    {
    position: 'absolute', top: -5, right: -5,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
  },

  /* ─ File / link rows ─ */
  fileRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 9, borderRadius: 9, borderWidth: 1 },
  fileIcon:   { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  fileRemove: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', cursor: 'pointer' },
  linkInput:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, marginBottom: 6 },
  linkNameRow:{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  addLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, cursor: 'pointer' },

  /* ─ Sidebar ─ */
  sidebar:      { width: 276, borderLeftWidth: StyleSheet.hairlineWidth },
  sidebarInner: { padding: 18, gap: 0 },
  sideField:    { marginBottom: 18 },
  sectionDivider: { height: 1, marginBottom: 18 },

  /* ─ Dropdown ─ */
  dropValue:    { flex: 1, fontSize: 13, fontWeight: '500' },
  dropPlaceholder: { flex: 1, fontSize: 13 },
  priorityDot:  { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },

  /* ─ Story points ─ */
  ptsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  ptsBtn:      { width: 38, height: 36, borderRadius: 9, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  ptsBtnText:  { fontSize: 13, fontWeight: '800' },
  customPtsInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },

  /* ─ Date ─ */
  dateTrigger: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9 },
  dateValue:   { flex: 1, fontSize: 13, fontWeight: '500' },

  /* ─ Status hint ─ */
  statusHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  statusHintText: { flex: 1, fontSize: 12, color: '#1D4ED8', lineHeight: 18 },
});
