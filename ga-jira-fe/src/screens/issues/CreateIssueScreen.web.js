import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme, Menu, Divider, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCreateIssueMutation, usePresignImageUploadMutation, useConfirmImageUploadMutation } from '../../api/issueApi';
import { useGetProjectWorkflowQuery, useGetProjectMembersQuery, useGetEpicsQuery } from '../../api/projectApi';
import { useGetSprintsQuery } from '../../api/sprintApi';
import { ISSUE_TYPE_LABELS, PRIORITY_LABELS } from '../../constants';
import AppToast from '../../components/common/AppToast';

const NAVY = '#0F2557';

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

const ISSUE_TEMPLATES = [
  {
    id: 'bug',
    label: 'Bug Report',
    icon: 'bug-outline',
    color: '#DE350B',
    type: 'bug',
    priority: 'high',
    storyPoints: '2',
    description: `**Steps to reproduce:**
1.
2.
3.

**Expected result:**


**Actual result:**


**Environment:**
- Browser/OS:
- Version:`,
  },
  {
    id: 'feature',
    label: 'Feature Request',
    icon: 'star-outline',
    color: '#00875A',
    type: 'story',
    priority: 'medium',
    storyPoints: '5',
    description: `**Summary:**
What is the feature and why is it needed?

**Acceptance criteria:**
- [ ]
- [ ]
- [ ]

**Out of scope:**`,
  },
  {
    id: 'story',
    label: 'User Story',
    icon: 'account-outline',
    color: '#6554C0',
    type: 'story',
    priority: 'medium',
    storyPoints: '3',
    description: `**As a** [type of user],
**I want** [some goal],
**So that** [some reason].

**Acceptance criteria:**
- Given [context], when [action], then [result]
-

**Notes:**`,
  },
  {
    id: 'task',
    label: 'Tech Task',
    icon: 'wrench-outline',
    color: '#0052CC',
    type: 'task',
    priority: 'medium',
    storyPoints: '3',
    description: `**Objective:**


**Implementation notes:**
-
-

**Definition of done:**
- [ ] Code reviewed
- [ ] Tests passing`,
  },
  {
    id: 'epic',
    label: 'Epic',
    icon: 'lightning-bolt',
    color: '#6554C0',
    type: 'epic',
    priority: 'high',
    storyPoints: '13',
    description: `**Goal:**


**Background:**


**Success metrics:**
-

**Key stories:**
- `,
  },
];

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
  const [attachments, setAttachments]     = useState([]); // [{ file, isImage, previewUrl }]
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

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

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
          } catch (_) { /* best-effort — issue already created */ }
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
            style={[styles.submitBtn, { backgroundColor: title.trim().length >= 3 && !uploading ? NAVY : '#94A3B8' }]}
            onPress={handleSubmit}
            disabled={uploading}
          >
            {uploading
              ? <ActivityIndicator size={14} color="#fff" animating />
              : <MaterialCommunityIcons name="plus" size={16} color="#fff" />
            }
            <Text style={styles.submitBtnText}>
              {uploading ? (uploadStatus || 'Please wait…') : 'Create Issue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>

        {/* ══ LEFT: main panel ══ */}
        <ScrollView style={styles.mainPanel} contentContainerStyle={styles.mainInner} showsVerticalScrollIndicator={false}>

          {/* ── Issue Templates ── */}
          <View style={[styles.templateSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            <TouchableOpacity
              style={styles.templateHeader}
              onPress={() => setShowTemplates(v => !v)}
            >
              <MaterialCommunityIcons name="file-document-multiple-outline" size={16} color={NAVY} />
              <Text style={{ color: NAVY, fontWeight: '700', fontSize: 13, marginLeft: 8, flex: 1 }}>
                Start from a template
              </Text>
              <MaterialCommunityIcons
                name={showTemplates ? 'chevron-up' : 'chevron-down'}
                size={18} color={theme.colors.onSurfaceVariant}
              />
            </TouchableOpacity>
            {showTemplates && (
              <View style={styles.templateGrid}>
                {ISSUE_TEMPLATES.map(tpl => (
                  <TouchableOpacity
                    key={tpl.id}
                    style={[styles.templateCard, { borderColor: tpl.color + '50', backgroundColor: tpl.color + '08' }]}
                    onPress={() => applyTemplate(tpl)}
                  >
                    <View style={[styles.templateIcon, { backgroundColor: tpl.color + '20' }]}>
                      <MaterialCommunityIcons name={tpl.icon} size={18} color={tpl.color} />
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: tpl.color, marginTop: 8, textAlign: 'center' }}>
                      {tpl.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

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

          {/* Attachments — images + files combined */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="paperclip" size={15} color={NAVY} />
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Attachments</Text>
              {attachments.length > 0 && (
                <View style={[styles.attachCount, { backgroundColor: NAVY }]}>
                  <Text style={styles.attachCountText}>{attachments.length}</Text>
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
              <View style={[styles.imgDropZone, {
                borderColor:     dragOver ? NAVY : theme.colors.outlineVariant,
                backgroundColor: dragOver ? '#EFF6FF' : theme.colors.background,
              }]}>
                <MaterialCommunityIcons name="tray-arrow-up" size={22} color={dragOver ? NAVY : theme.colors.onSurfaceVariant} />
                <Text style={{ color: dragOver ? NAVY : theme.colors.onSurface, fontSize: 13, fontWeight: '600', marginTop: 6 }}>
                  {dragOver ? 'Release to add' : 'Click or drag files here'}
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, marginTop: 2 }}>
                  Images (auto-compressed) · PDF, Word, Excel, PPT, CSV, ZIP
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

            {/* Image thumbnails */}
            {attachments.some(a => a.isImage) && (
              <View style={[styles.imgPreviewRow, { marginTop: 10 }]}>
                {attachments.map((a, idx) => !a.isImage ? null : (
                  <View key={idx} style={styles.imgPreviewWrap}>
                    <img src={a.previewUrl} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                    <TouchableOpacity onPress={() => removeAttachment(idx)} style={styles.imgRemoveBtn}>
                      <MaterialCommunityIcons name="close-circle" size={16} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.imgCompressBadge}>
                      <MaterialCommunityIcons name="zip-disk" size={9} color="#fff" />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* File list */}
            {attachments.some(a => !a.isImage) && (
              <View style={{ gap: 6, marginTop: 10 }}>
                {attachments.map((a, idx) => a.isImage ? null : (() => {
                  const fm = getFileMeta(a.file.type);
                  return (
                    <View key={idx} style={[styles.linkRow, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.background }]}>
                      <View style={[styles.linkIconBox, { backgroundColor: fm.color + '15' }]}>
                        <MaterialCommunityIcons name={fm.icon} size={18} color={fm.color} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.onSurface }} numberOfLines={1}>{a.file.name}</Text>
                        <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, marginTop: 1 }}>{fmtSize(a.file.size)}</Text>
                      </View>
                      <TouchableOpacity onPress={() => removeAttachment(idx)} style={styles.linkRemoveBtn}>
                        <MaterialCommunityIcons name="close" size={13} color={theme.colors.onSurfaceVariant} />
                      </TouchableOpacity>
                    </View>
                  );
                })())}
              </View>
            )}
          </View>

          {/* Links / Attachments */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="link-variant" size={15} color={NAVY} />
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Links</Text>
              {links.length > 0 && (
                <View style={[styles.attachCount, { backgroundColor: NAVY }]}>
                  <Text style={styles.attachCountText}>{links.length}</Text>
                </View>
              )}
            </View>

            {/* URL input row */}
            <View style={[styles.linkInputRow, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.background }]}>
              <MaterialCommunityIcons name="link" size={15} color={theme.colors.onSurfaceVariant} style={{ flexShrink: 0 }} />
              <input
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddLink(); } }}
                placeholder="Paste OneDrive / SharePoint / any URL…"
                style={{
                  flex: 1, border: 'none', outline: 'none',
                  backgroundColor: 'transparent', fontSize: 13,
                  color: theme.colors.onSurface, fontFamily: 'inherit',
                  minWidth: 0,
                }}
              />
            </View>
            <View style={[styles.linkNameRow, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.background }]}>
              <MaterialCommunityIcons name="tag-outline" size={14} color={theme.colors.onSurfaceVariant} style={{ flexShrink: 0 }} />
              <input
                value={linkName}
                onChange={e => setLinkName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddLink(); } }}
                placeholder="Label (optional)"
                style={{
                  flex: 1, border: 'none', outline: 'none',
                  backgroundColor: 'transparent', fontSize: 13,
                  color: theme.colors.onSurface, fontFamily: 'inherit',
                  minWidth: 0,
                }}
              />
              <TouchableOpacity
                onPress={handleAddLink}
                disabled={!linkUrl.trim()}
                style={[styles.addLinkBtn, { backgroundColor: linkUrl.trim() ? NAVY : theme.colors.surfaceVariant }]}
              >
                <MaterialCommunityIcons name="plus" size={14} color={linkUrl.trim() ? '#fff' : theme.colors.onSurfaceVariant} />
                <Text style={{ color: linkUrl.trim() ? '#fff' : theme.colors.onSurfaceVariant, fontSize: 12, fontWeight: '700' }}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Link list */}
            {links.length > 0 && (
              <View style={styles.linkList}>
                {links.map((lnk, idx) => (
                  <View key={idx} style={[styles.linkRow, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.background }]}>
                    <View style={[styles.linkIconBox, { backgroundColor: NAVY + '12' }]}>
                      <MaterialCommunityIcons name="link-variant" size={16} color={NAVY} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.onSurface }} numberOfLines={1}>{lnk.name}</Text>
                      <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, marginTop: 1 }} numberOfLines={1}>{lnk.url}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setLinks(prev => prev.filter((_, i) => i !== idx))}
                      style={styles.linkRemoveBtn}
                    >
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
                  min={new Date().toISOString().split('T')[0]}
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
  templateSection: { borderWidth: 1, borderRadius: 12, marginBottom: 24, overflow: 'hidden' },
  templateHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, cursor: 'pointer' },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingBottom: 16 },
  templateCard: {
    width: 90, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8,
    borderRadius: 10, borderWidth: 1.5, cursor: 'pointer',
  },
  templateIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
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
  attachCount:     { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  attachCountText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  /* Image drop zone */
  imgDropZone: {
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 10,
    alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16, gap: 4,
  },
  imgPreviewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  imgPreviewWrap: { position: 'relative', width: 72, height: 72 },
  imgRemoveBtn: {
    position: 'absolute', top: -5, right: -5,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
  },
  imgCompressBadge: {
    position: 'absolute', bottom: 3, left: 3,
    backgroundColor: 'rgba(15,37,87,0.75)', borderRadius: 4,
    width: 14, height: 14, justifyContent: 'center', alignItems: 'center',
  },

  /* Link inputs */
  linkInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6,
  },
  linkNameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  addLinkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, cursor: 'pointer',
  },

  /* Link list */
  linkList:      { gap: 6, marginTop: 12 },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 8, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth,
  },
  linkIconBox:   { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  linkRemoveBtn: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', cursor: 'pointer' },

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
