import React, { useState, useRef } from 'react';
import { useProjectScrollbar } from '../../hooks/useProjectScrollbar';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme, Button, ActivityIndicator, Menu, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  useGetIssueQuery, useUpdateIssueMutation, useAddCommentMutation,
  useWatchIssueMutation, useUnwatchIssueMutation, useCreateIssueMutation,
  useUploadAttachmentMutation, usePresignImageUploadMutation, useConfirmImageUploadMutation, useDeleteAttachmentMutation,
} from '../../api/issueApi';
import { useGetProjectQuery, useGetProjectWorkflowQuery, useGetProjectMembersQuery, useGetLabelsQuery, useGetReleasesQuery, useGetCustomFieldsQuery, useSetCustomFieldValueMutation } from '../../api/projectApi';
import { useGetActiveSprintQuery } from '../../api/sprintApi';
import { useAuth } from '../../hooks/useAuth';
import { formatRelative, formatDate } from '../../utils/dateUtils';
import { getPriorityColor } from '../../utils/helpers';
import CommentItem from '../../components/issues/CommentItem';
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
  bug:     { icon: 'bug',                      color: '#DE350B', bg: '#FFEBE6', label: 'Bug'     },
  story:   { icon: 'bookmark',                 color: '#00875A', bg: '#E3FCEF', label: 'Story'   },
  task:    { icon: 'check-circle-outline',     color: '#0052CC', bg: '#DEEBFF', label: 'Task'    },
  epic:    { icon: 'lightning-bolt',           color: '#6554C0', bg: '#EAE6FF', label: 'Epic'    },
  subtask: { icon: 'subdirectory-arrow-right', color: '#4C9AFF', bg: '#DEEBFF', label: 'Subtask' },
};

const PRIORITY_CFG = {
  highest: { icon: 'arrow-up-bold',   color: '#DE350B', bg: '#FFEBE6' },
  high:    { icon: 'arrow-up',        color: '#FF5630', bg: '#FFF0EB' },
  medium:  { icon: 'minus',           color: '#FF8B00', bg: '#FFF7E6' },
  low:     { icon: 'arrow-down',      color: '#36B37E', bg: '#E3FCEF' },
  lowest:  { icon: 'arrow-down-bold', color: '#00B8D9', bg: '#E6FCFF' },
};

const Avatar = ({ user, size = 28, style }) => {
  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : '?';
  const hue = user?.email ? user.email.charCodeAt(0) * 7 % 360 : 220;
  return (
    <View style={[{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: `hsl(${hue},55%,50%)`,
      justifyContent: 'center', alignItems: 'center',
    }, style]}>
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '700' }}>{initials.toUpperCase()}</Text>
    </View>
  );
};

export default function IssueDetailScreen({ route, navigation }) {
  const { issueId } = route.params;
  const theme = useTheme();
  const { user } = useAuth();
  const isDark = theme.dark;

  const [commentText, setCommentText]           = useState('');
  const [subtaskTitle, setSubtaskTitle]         = useState('');
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [mentionSearch, setMentionSearch]       = useState('');
  const [showMentions, setShowMentions]         = useState(false);
  const [mentionAnchor, setMentionAnchor]       = useState(-1);
  const [mentionIdx, setMentionIdx]             = useState(0);
  const [mentionMap, setMentionMap]             = useState({}); // { 'Full Name': userId }
  const textareaRef    = useRef(null);
  const imgInputRef    = useRef(null);
  const fileInputRef   = useRef(null);
  const [uploadingImg,  setUploadingImg]  = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [linkUrl, setLinkUrl]   = useState('');
  const [linkName, setLinkName] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft,   setDescDraft]   = useState('');
  const [statusMenuOpen, setStatusMenuOpen]     = useState(false);
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false);
  const [labelMenuOpen, setLabelMenuOpen]       = useState(false);
  const [fixVersionMenuOpen, setFixVersionMenuOpen] = useState(false);
  const [cfMenuOpenId, setCfMenuOpenId] = useState(null);
  const [toast, setToast]                       = useState('');
  const [toastType, setToastType]               = useState('success');
  const showToast = (msg, type = 'success') => { setToast(msg); setToastType(type); };

  const { data, isLoading, refetch } = useGetIssueQuery(issueId);
  const [updateIssue, { isLoading: updating }] = useUpdateIssueMutation();
  const [addComment,  { isLoading: commenting }] = useAddCommentMutation();
  const [createIssue, { isLoading: creatingSubtask }] = useCreateIssueMutation();
  const [watchIssue]   = useWatchIssueMutation();
  const [unwatchIssue] = useUnwatchIssueMutation();
  const [uploadAttachment]    = useUploadAttachmentMutation();
  const [presignImageUpload]  = usePresignImageUploadMutation();
  const [confirmImageUpload]  = useConfirmImageUploadMutation();
  const [deleteAttachment]    = useDeleteAttachmentMutation();

  const issue     = data?.data;
  const projectId = issue?.projectId;

  const { data: projectResp }      = useGetProjectQuery(projectId,          { skip: !projectId });
  useProjectScrollbar(projectResp?.data?.color);
  const accent = projectResp?.data?.color || NAVY;
  const { data: workflowData }     = useGetProjectWorkflowQuery(projectId, { skip: !projectId });
  const { data: membersData }      = useGetProjectMembersQuery(projectId,  { skip: !projectId });
  const { data: activeSprintData } = useGetActiveSprintQuery(projectId,    { skip: !projectId });
  const { data: labelsData }       = useGetLabelsQuery(projectId,          { skip: !projectId });
  const { data: releasesData }     = useGetReleasesQuery(projectId,        { skip: !projectId });
  const { data: customFieldsData } = useGetCustomFieldsQuery(projectId,    { skip: !projectId });

  const workflows   = workflowData?.data || [];
  const defaultWf   = workflows.find(w => w.isDefault) || workflows[0];
  const allStatuses = defaultWf?.statuses ? [...defaultWf.statuses].sort((a, b) => a.order - b.order) : [];
  const members     = (membersData?.data || []).map(m => m.user).filter(Boolean);
  const filteredMembers = showMentions
    ? members.filter(m => `${m.firstName} ${m.lastName}`.toLowerCase().includes(mentionSearch.toLowerCase())).slice(0, 7)
    : [];
  const isWatching  = issue?.watchers?.some(w => (w.id || w) === user?.id);
  const activeSprint = activeSprintData?.data;
  const allLabels   = labelsData?.data || [];
  const allReleases    = (releasesData?.data || []).filter(r => r.status !== 'archived');
  const customFields   = customFieldsData?.data || [];
  const [setCfValue]   = useSetCustomFieldValueMutation();

  const handleCfValue = async (fieldId, value) => {
    try { await setCfValue({ projectId, fieldId, issueId, value }).unwrap(); }
    catch (err) { showToast(err?.data?.message || 'Failed to update field', 'error'); }
  };

  const handleFixVersion = async (releaseId) => {
    try { await updateIssue({ id: issueId, releaseId: releaseId || null }).unwrap(); showToast('Fix version updated'); }
    catch (err) { showToast(err?.data?.message || 'Failed to update fix version', 'error'); }
  };

  const handleLabelToggle = async (labelId) => {
    const currentIds = (issue?.labels || []).map(l => l.id);
    const next = currentIds.includes(labelId)
      ? currentIds.filter(id => id !== labelId)
      : [...currentIds, labelId];
    try { await updateIssue({ id: issueId, labelIds: next }).unwrap(); }
    catch (err) { showToast(err?.data?.message || 'Failed to update labels', 'error'); }
  };

  const handleStatus = async (s) => {
    setStatusMenuOpen(false);
    if (s.id === issue?.status?.id) return;
    try { await updateIssue({ id: issueId, workflowStatusId: s.id }).unwrap(); showToast('Status updated'); }
    catch (err) { showToast(err?.data?.message || 'Failed to update status', 'error'); }
  };
  const handleAssignee = async (id) => {
    setAssigneeMenuOpen(false);
    try { await updateIssue({ id: issueId, assigneeId: id || null }).unwrap(); showToast('Assignee updated'); }
    catch (err) { showToast(err?.data?.message || 'Failed to update assignee', 'error'); }
  };
  const handlePriority = async (p) => {
    setPriorityMenuOpen(false);
    try { await updateIssue({ id: issueId, priority: p }).unwrap(); showToast('Priority updated'); }
    catch (err) { showToast(err?.data?.message || 'Failed to update priority', 'error'); }
  };
  const handleWatch = async () => {
    try {
      isWatching ? await unwatchIssue(issueId).unwrap() : await watchIssue(issueId).unwrap();
      refetch();
    } catch (err) { showToast(err?.data?.message || 'Failed to update watch', 'error'); }
  };
  const handleAddToSprint = async () => {
    if (!activeSprint) return;
    try { await updateIssue({ id: issueId, sprintId: activeSprint.id }).unwrap(); showToast(`Added to ${activeSprint.name}`); refetch(); }
    catch (err) { showToast(err?.data?.message || 'Failed to add to sprint', 'error'); }
  };
  const handleRemoveFromSprint = async () => {
    try { await updateIssue({ id: issueId, sprintId: null }).unwrap(); showToast('Removed from sprint'); refetch(); }
    catch (err) { showToast(err?.data?.message || 'Failed to remove from sprint', 'error'); }
  };
  const handleCommentChange = (e) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    setCommentText(val);
    const textBefore = val.slice(0, cursor);
    const atIdx = textBefore.lastIndexOf('@');
    if (atIdx >= 0) {
      const between = textBefore.slice(atIdx + 1);
      if (!between.includes(' ') && !between.includes('\n') && between.length <= 30) {
        setMentionAnchor(atIdx);
        setMentionSearch(between);
        setShowMentions(true);
        setMentionIdx(0);
        return;
      }
    }
    setShowMentions(false);
  };

  const insertMention = (member) => {
    const cursor = textareaRef.current?.selectionStart ?? (mentionAnchor + 1 + mentionSearch.length);
    const before  = commentText.slice(0, mentionAnchor);
    const after   = commentText.slice(cursor);
    const displayName = `${member.firstName} ${member.lastName}`;
    // Show readable @Name in textarea; track mapping for submit conversion
    setCommentText(before + `@${displayName} ` + after);
    setMentionMap(prev => ({ ...prev, [displayName]: member.id }));
    setShowMentions(false);
    setTimeout(() => textareaRef.current?.focus(), 10);
  };

  const handleCommentKeyDown = (e) => {
    if (showMentions && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(v => Math.min(v + 1, filteredMembers.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIdx(v => Math.max(v - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(filteredMembers[mentionIdx]); return; }
      if (e.key === 'Escape') { setShowMentions(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    // Convert @Name to @[Name](userId) for backend mention parsing
    let body = commentText.trim();
    Object.entries(mentionMap).forEach(([name, userId]) => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      body = body.replace(new RegExp(`@${escaped}`, 'g'), `@[${name}](${userId})`);
    });
    try {
      await addComment({ issueId, body }).unwrap();
      setCommentText('');
      setMentionMap({});
      setShowMentions(false);
      refetch();
    }
    catch (err) { showToast(err?.data?.message || 'Failed to post comment', 'error'); }
  };

  const handleCreateSubtask = async () => {
    if (!subtaskTitle.trim() || !projectId) return;
    try {
      await createIssue({
        body: {
          title: subtaskTitle.trim(),
          type: 'subtask',
          projectId,
          parentId: issueId,
          ...(issue.sprintId ? { sprintId: issue.sprintId } : {}),
        },
        projectId,
        sprintId: issue.sprintId || null,
      }).unwrap();
      setSubtaskTitle('');
      setShowSubtaskInput(false);
      showToast('Subtask created');
      refetch();
    } catch (err) { showToast(err?.data?.message || 'Failed to create subtask', 'error'); }
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

  const handleUploadImage = async (files) => {
    if (!files?.length) return;
    setUploadingImg(true);
    try {
      for (const f of Array.from(files)) {
        if (!f.type.startsWith('image/')) continue;
        const compressed = await compressImage(f);
        // 1. Get presigned PUT URL from backend
        const presignData = await presignImageUpload({
          issueId, filename: compressed.name, contentType: 'image/jpeg', type: 'images',
        }).unwrap();
        const { presignedUrl, key } = presignData.data;
        // 2. Upload directly to S3 (no auth header; presigned URL handles auth)
        const s3Res = await fetch(presignedUrl, {
          method: 'PUT',
          body: compressed,
          headers: { 'Content-Type': 'image/jpeg' },
        });
        if (!s3Res.ok) throw new Error('S3 upload failed');
        // 3. Tell backend to store the S3 key
        await confirmImageUpload({
          issueId, key, name: f.name,
          mimeType: 'image/jpeg', size: compressed.size,
        }).unwrap();
      }
      showToast('Image uploaded');
      refetch();
    } catch (err) { showToast(err?.data?.message || 'Upload failed', 'error'); }
    finally { setUploadingImg(false); }
  };

  const handleUploadFile = async (files) => {
    if (!files?.length) return;
    setUploadingFile(true);
    try {
      for (const f of Array.from(files)) {
        const presignData = await presignImageUpload({
          issueId, filename: f.name, contentType: f.type || 'application/octet-stream', type: 'files',
        }).unwrap();
        const { presignedUrl, key } = presignData.data;
        const s3Res = await fetch(presignedUrl, {
          method: 'PUT',
          body: f,
          headers: { 'Content-Type': f.type || 'application/octet-stream' },
        });
        if (!s3Res.ok) throw new Error('S3 upload failed');
        await confirmImageUpload({
          issueId, key, name: f.name, mimeType: f.type || 'application/octet-stream', size: f.size,
        }).unwrap();
      }
      showToast('File uploaded');
      refetch();
    } catch (err) { showToast(err?.data?.message || 'File upload failed', 'error'); }
    finally { setUploadingFile(false); }
  };

  const handleAddLink = async () => {
    const url = linkUrl.trim();
    if (!url) return;
    const name = linkName.trim() || url;
    setAddingLink(true);
    try {
      await uploadAttachment({ issueId, url, name }).unwrap();
      showToast('Link added');
      setLinkUrl('');
      setLinkName('');
      refetch();
    } catch (err) { showToast(err?.data?.message || 'Failed to add link', 'error'); }
    finally { setAddingLink(false); }
  };

  const handleDeleteAttachment = async (attId) => {
    try {
      await deleteAttachment({ issueId, attachmentId: attId }).unwrap();
      showToast('Link removed');
      refetch();
    } catch (err) { showToast(err?.data?.message || 'Failed to remove link', 'error'); }
  };

  if (isLoading) return (
    <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 14 }}>Loading...</Text>
    </View>
  );
  if (!issue) return (
    <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
      <MaterialCommunityIcons name="alert-circle-outline" size={48} color={theme.colors.error} />
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: 16, fontWeight: '700' }}>Issue not found</Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>It may have been deleted or you don't have access.</Text>
      <Button mode="outlined" onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>Go Back</Button>
    </View>
  );

  const typeMeta    = TYPE_META[issue.type] || TYPE_META.task;
  const priorityCfg = PRIORITY_CFG[issue.priority] || PRIORITY_CFG.medium;
  const statusColor = issue.status?.color || '#6B7280';
  const isOverdue   = issue.dueDate && new Date(issue.dueDate) < new Date();
  const assigneeName = issue.assignee ? `${issue.assignee.firstName} ${issue.assignee.lastName}` : 'Unassigned';
  const reporterName = issue.reporter ? `${issue.reporter.firstName} ${issue.reporter.lastName}` : 'No reporter';
  const sprintName = issue.sprint?.name || 'Backlog';
  const commentCount = issue.comments?.length || 0;
  const subtaskCount = issue.subtasks?.length || 0;
  const doneSubtasks = issue.subtasks?.filter(st => st.status?.category === 'done').length || 0;
  const attachmentCount = (issue.attachments || []).filter(a => a.mimeType !== 'link').length;
  const linkCount = (issue.attachments || []).filter(a => a.mimeType === 'link').length;
  const watcherCount = issue.watchers?.length || 0;

  const bg   = isDark ? '#1A1A2E' : '#F0F2F5';
  const surf = isDark ? '#16213E' : '#FFFFFF';
  const border = isDark ? '#2D2D4E' : '#E5E7EB';

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>

      {/* Top bar */}
      <View style={[styles.topBar, { backgroundColor: surf, borderBottomColor: border }]}>
        <View style={styles.breadcrumb}>
          {/* Back button */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={18} color={accent} />
          </TouchableOpacity>
          <View style={{ width: 1, height: 16, backgroundColor: border, marginHorizontal: 2 }} />
          {/* Project name (non-subtasks show project; subtasks show parent's project via parent) */}
          {issue.project && (
            <>
              <TouchableOpacity onPress={() => navigation.navigate('ProjectDetail', { projectId: issue.project.id })}>
                <Text style={{ color: accent, fontSize: 13, fontWeight: '700' }}>{issue.project.name}</Text>
              </TouchableOpacity>
              <MaterialCommunityIcons name="chevron-right" size={15} color={theme.colors.onSurfaceVariant} />
            </>
          )}

          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>Issues</Text>
          <MaterialCommunityIcons name="chevron-right" size={15} color={theme.colors.onSurfaceVariant} />

          {/* For subtasks: show parent key → this key */}
          {issue.type === 'subtask' && issue.parent ? (
            <>
              <TouchableOpacity
                onPress={() => navigation.navigate('IssueDetail', { issueId: issue.parent.id })}
                style={[styles.keyPill, { backgroundColor: TYPE_META[issue.parent.type]?.bg || '#DEEBFF', borderColor: (TYPE_META[issue.parent.type]?.color || '#0052CC') + '40' }]}
              >
                <MaterialCommunityIcons name={TYPE_META[issue.parent.type]?.icon || 'check-circle-outline'} size={12} color={TYPE_META[issue.parent.type]?.color || '#0052CC'} />
                <Text style={{ color: TYPE_META[issue.parent.type]?.color || '#0052CC', marginLeft: 5, fontWeight: '700', fontSize: 12 }}>{issue.parent.key}</Text>
              </TouchableOpacity>
              <MaterialCommunityIcons name="chevron-right" size={15} color={theme.colors.onSurfaceVariant} />
            </>
          ) : null}

          <View style={[styles.keyPill, { backgroundColor: typeMeta.bg, borderColor: typeMeta.color + '40' }]}>
            <MaterialCommunityIcons name={typeMeta.icon} size={12} color={typeMeta.color} />
            <Text style={{ color: typeMeta.color, marginLeft: 5, fontWeight: '700', fontSize: 12 }}>{issue.key}</Text>
          </View>
        </View>

        <View style={styles.topActions}>
          {updating && <ActivityIndicator size={14} color={theme.colors.primary} style={{ marginRight: 8 }} />}
          <TouchableOpacity onPress={handleWatch} style={[styles.watchBtn, {
            backgroundColor: isWatching ? theme.colors.primaryContainer : 'transparent',
            borderColor: isWatching ? theme.colors.primary + '80' : border,
          }]}>
            <MaterialCommunityIcons
              name={isWatching ? 'eye' : 'eye-outline'}
              size={15}
              color={isWatching ? theme.colors.primary : theme.colors.onSurfaceVariant}
            />
            <Text style={{ color: isWatching ? theme.colors.primary : theme.colors.onSurfaceVariant, marginLeft: 5, fontSize: 13, fontWeight: isWatching ? '700' : '400' }}>
              {isWatching ? 'Watching' : 'Watch'}{watcherCount ? ` - ${watcherCount}` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>

        {/* Left panel */}
        <ScrollView style={styles.leftScroll} contentContainerStyle={styles.leftContent} showsVerticalScrollIndicator={false}>

          {/* Issue header card */}
          <View style={[styles.issueHero, { backgroundColor: surf, borderColor: border, borderTopColor: accent }]}>
            <View style={styles.heroTop}>
              <View style={[styles.issueTypeMark, { backgroundColor: typeMeta.bg }]}>
                <MaterialCommunityIcons name={typeMeta.icon} size={26} color={typeMeta.color} />
              </View>
              <View style={styles.heroCopy}>
                <View style={styles.headerMeta}>
                  <View style={[styles.typePill, { backgroundColor: typeMeta.bg, borderColor: typeMeta.color + '35' }]}>
                    <MaterialCommunityIcons name={typeMeta.icon} size={13} color={typeMeta.color} />
                    <Text style={{ color: typeMeta.color, marginLeft: 5, fontWeight: '800', fontSize: 11, textTransform: 'uppercase' }}>
                      {typeMeta.label}
                    </Text>
                  </View>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, fontWeight: '700' }}>{issue.key}</Text>
                </View>

                <Text style={[styles.issueTitle, { color: isDark ? '#F3F4F6' : '#101828' }]}>{issue.title}</Text>

                {/* Parent task row (subtasks) */}
                {issue.type === 'subtask' && issue.parent && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('IssueDetail', { issueId: issue.parent.id })}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 2 }}
                  >
                    <MaterialCommunityIcons name="subdirectory-arrow-left" size={13} color={theme.colors.onSurfaceVariant} />
                    <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '600' }}>
                      {issue.parent.key}
                    </Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }} numberOfLines={1}>
                      {issue.parent.title}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Project name row (non-subtasks) */}
                {issue.type !== 'subtask' && issue.project && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 2 }}>
                    <MaterialCommunityIcons name="folder-outline" size={13} color={theme.colors.onSurfaceVariant} />
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                      {issue.project.name}
                    </Text>
                  </View>
                )}

                <View style={styles.badgeRow}>
                  {/* Status dropdown */}
                  <Menu
                    visible={statusMenuOpen}
                    onDismiss={() => setStatusMenuOpen(false)}
                    anchor={
                      <TouchableOpacity
                        onPress={() => setStatusMenuOpen(true)}
                        style={[styles.statusBtn, { backgroundColor: statusColor + '18', borderColor: statusColor + '55' }]}
                      >
                        <View style={[styles.dot, { backgroundColor: statusColor }]} />
                        <Text style={{ color: statusColor, fontWeight: '800', fontSize: 12, marginLeft: 7 }}>
                          {issue.status?.name || 'No Status'}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={14} color={statusColor} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    }
                  >
                    <Text style={styles.menuHeader}>CHANGE STATUS</Text>
                    {allStatuses.map(s => (
                      <Menu.Item
                        key={s.id}
                        onPress={() => handleStatus(s)}
                        title={s.name}
                        leadingIcon={() => <View style={[styles.dot, { backgroundColor: s.color }]} />}
                        titleStyle={s.id === issue.status?.id ? { fontWeight: '700', color: s.color } : {}}
                      />
                    ))}
                  </Menu>

                  {/* Priority dropdown */}
                  <Menu
                    visible={priorityMenuOpen}
                    onDismiss={() => setPriorityMenuOpen(false)}
                    anchor={
                      <TouchableOpacity
                        onPress={() => setPriorityMenuOpen(true)}
                        style={[styles.priorityBtn, { backgroundColor: priorityCfg.bg, borderColor: priorityCfg.color + '55' }]}
                      >
                        <MaterialCommunityIcons name={priorityCfg.icon} size={13} color={priorityCfg.color} />
                        <Text style={{ color: priorityCfg.color, fontSize: 12, fontWeight: '700', marginLeft: 5, textTransform: 'capitalize' }}>
                          {issue.priority || 'Medium'}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={13} color={priorityCfg.color} style={{ marginLeft: 3 }} />
                      </TouchableOpacity>
                    }
                  >
                    <Text style={styles.menuHeader}>CHANGE PRIORITY</Text>
                    {Object.entries(PRIORITY_CFG).map(([p, cfg]) => (
                      <Menu.Item
                        key={p}
                        onPress={() => handlePriority(p)}
                        title={p.charAt(0).toUpperCase() + p.slice(1)}
                        leadingIcon={() => <MaterialCommunityIcons name={cfg.icon} size={16} color={cfg.color} />}
                        titleStyle={p === issue.priority ? { fontWeight: '700', color: cfg.color } : {}}
                      />
                    ))}
                  </Menu>
                </View>
              </View>
            </View>

            <View style={styles.issueSummaryGrid}>
              <View style={[styles.summaryTile, { backgroundColor: isDark ? '#111827' : '#F8FAFC', borderColor: border }]}>
                <View style={[styles.summaryIcon, { backgroundColor: '#6366F118' }]}>
                  <MaterialCommunityIcons name="account-outline" size={17} color="#6366F1" />
                </View>
                <View style={styles.summaryCopy}>
                  <Text style={styles.summaryLabel}>Assignee</Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]} numberOfLines={1}>{assigneeName}</Text>
                </View>
              </View>
              <View style={[styles.summaryTile, { backgroundColor: isDark ? '#111827' : '#F8FAFC', borderColor: border }]}>
                <View style={[styles.summaryIcon, { backgroundColor: '#F59E0B18' }]}>
                  <MaterialCommunityIcons name="lightning-bolt-outline" size={17} color="#F59E0B" />
                </View>
                <View style={styles.summaryCopy}>
                  <Text style={styles.summaryLabel}>Sprint</Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]} numberOfLines={1}>{sprintName}</Text>
                </View>
              </View>
              <View style={[styles.summaryTile, { backgroundColor: isDark ? '#111827' : '#F8FAFC', borderColor: border }]}>
                <View style={[styles.summaryIcon, { backgroundColor: '#0EA5E918' }]}>
                  <MaterialCommunityIcons name="paperclip" size={17} color="#0EA5E9" />
                </View>
                <View style={styles.summaryCopy}>
                  <Text style={styles.summaryLabel}>Assets</Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>{attachmentCount} files, {linkCount} links</Text>
                </View>
              </View>
              <View style={[styles.summaryTile, { backgroundColor: isDark ? '#111827' : '#F8FAFC', borderColor: border }]}>
                <View style={[styles.summaryIcon, { backgroundColor: '#10B98118' }]}>
                  <MaterialCommunityIcons name="comment-text-outline" size={17} color="#10B981" />
                </View>
                <View style={styles.summaryCopy}>
                  <Text style={styles.summaryLabel}>Activity</Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>{commentCount} comments, {doneSubtasks}/{subtaskCount} subtasks</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Description card */}
          <View style={[styles.card, { backgroundColor: surf, borderColor: border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons name="text-box-outline" size={14} color={theme.colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: isDark ? '#F3F4F6' : '#111827' }]}>Description</Text>
              <View style={{ flex: 1 }} />
              {!editingDesc && (
                <TouchableOpacity
                  onPress={() => { setDescDraft(issue.description || ''); setEditingDesc(true); }}
                  style={[styles.addLinkBtn, { backgroundColor: theme.colors.primaryContainer, borderWidth: 1, borderColor: theme.colors.primary + '40' }]}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={13} color={theme.colors.primary} />
                  <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '600', marginLeft: 4 }}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {editingDesc ? (
              <View>
                <textarea
                  autoFocus
                  value={descDraft}
                  onChange={e => setDescDraft(e.target.value)}
                  placeholder="Add a description…"
                  rows={6}
                  style={{
                    width: '100%', border: `1px solid ${border}`, borderRadius: 8,
                    outline: 'none', padding: '10px 12px', fontSize: 14, lineHeight: '22px',
                    background: isDark ? '#111827' : '#F9FAFB',
                    color: isDark ? '#F3F4F6' : '#111827',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    resize: 'vertical', minHeight: 100, boxSizing: 'border-box',
                  }}
                />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <Button
                    mode="contained"
                    compact
                    loading={updating}
                    disabled={updating}
                    onPress={async () => {
                      try {
                        await updateIssue({ id: issueId, description: descDraft.trim() }).unwrap();
                        setEditingDesc(false);
                        showToast('Description updated');
                      } catch (err) {
                        showToast(err?.data?.message || 'Failed to save description', 'error');
                      }
                    }}
                    style={{ borderRadius: 7 }}
                  >
                    Save
                  </Button>
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => setEditingDesc(false)}
                    style={{ borderRadius: 7 }}
                  >
                    Cancel
                  </Button>
                </View>
              </View>
            ) : issue.description ? (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => { setDescDraft(issue.description); setEditingDesc(true); }}
              >
                <Text style={{ color: theme.colors.onSurface, lineHeight: 26, fontSize: 14 }}>
                  {issue.description}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => { setDescDraft(''); setEditingDesc(true); }}
                style={[styles.emptyDesc, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: border }]}
              >
                <MaterialCommunityIcons name="pencil-plus-outline" size={22} color={theme.colors.outlineVariant} />
                <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, fontSize: 13, fontStyle: 'italic', textAlign: 'center' }}>
                  No description yet.{'\n'}Click to add details.
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Attachments card */}
          <View style={[styles.card, { backgroundColor: surf, borderColor: border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#F59E0B18' }]}>
                <MaterialCommunityIcons name="paperclip" size={14} color="#F59E0B" />
              </View>
              <Text style={[styles.cardTitle, { color: isDark ? '#F3F4F6' : '#111827' }]}>Attachments</Text>
              {(() => { const n = (issue.attachments || []).filter(a => a.mimeType !== 'link').length; return n > 0 ? (
                <View style={[styles.countBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 10 }}>{n}</Text>
                </View>
              ) : null; })()}
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => imgInputRef.current?.click()} disabled={uploadingImg}
                style={[styles.addLinkBtn, { backgroundColor: theme.colors.primaryContainer, borderWidth: 1, borderColor: theme.colors.primary + '40', marginRight: 6 }]}>
                {uploadingImg ? <ActivityIndicator size={11} color={theme.colors.primary} /> : <MaterialCommunityIcons name="image-plus" size={13} color={theme.colors.primary} />}
                <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '700' }}>{uploadingImg ? 'Uploading...' : 'Image'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => fileInputRef.current?.click()} disabled={uploadingFile}
                style={[styles.addLinkBtn, { backgroundColor: theme.colors.primaryContainer, borderWidth: 1, borderColor: theme.colors.primary + '40' }]}>
                {uploadingFile ? <ActivityIndicator size={11} color={theme.colors.primary} /> : <MaterialCommunityIcons name="file-plus-outline" size={13} color={theme.colors.primary} />}
                <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '700' }}>{uploadingFile ? 'Uploading...' : 'File'}</Text>
              </TouchableOpacity>
            </View>

            <input ref={imgInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
              onChange={e => { handleUploadImage(e.target.files); e.target.value = ''; }} />
            <input ref={fileInputRef} type="file" multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
              style={{ display: 'none' }}
              onChange={e => { handleUploadFile(e.target.files); e.target.value = ''; }} />

            {(() => {
              const imgs     = (issue.attachments || []).filter(a => a.mimeType?.startsWith('image/'));
              const docFiles = (issue.attachments || []).filter(a => a.mimeType !== 'link' && !a.mimeType?.startsWith('image/'));
              if (!imgs.length && !docFiles.length) return (
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleUploadImage(e.dataTransfer.files); }}
                  onClick={() => imgInputRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                >
                  <View style={[styles.attDropZone, { borderColor: border, backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                    <MaterialCommunityIcons name="tray-plus" size={24} color={theme.colors.onSurfaceVariant} />
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginTop: 6 }}>No attachments yet</Text>
                    <Text style={{ color: theme.colors.outline, fontSize: 11, marginTop: 2 }}>Drag images here, or use the buttons above</Text>
                  </View>
                </div>
              );
              return (
                <>
                  {imgs.length > 0 && (
                    <View style={[styles.imgGrid, { marginBottom: docFiles.length ? 12 : 0 }]}>
                      {imgs.map(att => (
                        <View key={att.id} style={styles.imgThumbWrap}>
                          <TouchableOpacity onPress={() => window.open(att.viewUrl, '_blank')} activeOpacity={0.85}>
                            <img
                              src={att.viewUrl}
                              alt={att.originalName || 'image'}
                              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                              style={{ width: 112, height: 84, objectFit: 'cover', borderRadius: 8, display: 'block' }}
                            />
                            <div style={{ display: 'none', width: 112, height: 84, borderRadius: 8, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 4 }}>
                              <span style={{ fontSize: 10, color: '#64748B', fontWeight: 700 }}>IMG</span>
                              <span style={{ fontSize: 9, color: '#64748B', textAlign: 'center', padding: '0 4px', wordBreak: 'break-all' }}>{att.originalName}</span>
                            </div>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteAttachment(att.id)} style={styles.imgThumbDelete}>
                            <MaterialCommunityIcons name="close-circle" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                  {docFiles.length > 0 && (
                    <View style={{ gap: 6 }}>
                      {docFiles.map(att => {
                        const fm = getFileMeta(att.mimeType);
                        return (
                          <View key={att.id} style={[styles.attRow, { borderColor: border, backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                            <View style={[styles.attIconBox, { backgroundColor: fm.color + '15' }]}>
                              <MaterialCommunityIcons name={fm.icon} size={22} color={fm.color} />
                            </View>
                            <TouchableOpacity style={{ flex: 1, minWidth: 0 }} onPress={() => window.open(att.viewUrl, '_blank')} activeOpacity={0.7}>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.onSurface }} numberOfLines={1}>{att.originalName}</Text>
                              <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, marginTop: 2 }}>{fmtSize(att.size)}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteAttachment(att.id)}
                              style={[styles.attDeleteBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                              <MaterialCommunityIcons name="close" size={13} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </>
              );
            })()}
          </View>

          {/* Links card */}
          <View style={[styles.card, { backgroundColor: surf, borderColor: border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#3B82F618' }]}>
                <MaterialCommunityIcons name="link-variant" size={14} color="#3B82F6" />
              </View>
              <Text style={[styles.cardTitle, { color: isDark ? '#F3F4F6' : '#111827' }]}>Links</Text>
              {(() => { const n = (issue.attachments || []).filter(a => a.mimeType === 'link').length; return n > 0 ? (
                <View style={[styles.countBadge, { backgroundColor: '#3B82F6' }]}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 10 }}>{n}</Text>
                </View>
              ) : null; })()}
            </View>

            <View style={[styles.linkInputRow, { borderColor: border, backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
              <MaterialCommunityIcons name="link" size={14} color={theme.colors.onSurfaceVariant} style={{ flexShrink: 0 }} />
              <input
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddLink(); } }}
                placeholder="Paste OneDrive / SharePoint / any URL..."
                style={{ flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: 13, color: theme.colors.onSurface, fontFamily: 'inherit', minWidth: 0 }}
              />
            </View>
            <View style={[styles.linkNameRow, { borderColor: border, backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
              <MaterialCommunityIcons name="tag-outline" size={13} color={theme.colors.onSurfaceVariant} style={{ flexShrink: 0 }} />
              <input
                value={linkName}
                onChange={e => setLinkName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddLink(); } }}
                placeholder="Label (optional)"
                style={{ flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: 13, color: theme.colors.onSurface, fontFamily: 'inherit', minWidth: 0 }}
              />
              <TouchableOpacity onPress={handleAddLink} disabled={addingLink || !linkUrl.trim()}
                style={[styles.addLinkBtn, { backgroundColor: linkUrl.trim() ? theme.colors.primary : (isDark ? '#374151' : '#E5E7EB') }]}>
                {addingLink ? <ActivityIndicator size={11} color="#fff" /> : <MaterialCommunityIcons name="plus" size={13} color={linkUrl.trim() ? '#fff' : theme.colors.onSurfaceVariant} />}
                <Text style={{ color: linkUrl.trim() ? '#fff' : theme.colors.onSurfaceVariant, fontSize: 12, fontWeight: '700' }}>{addingLink ? '...' : 'Add'}</Text>
              </TouchableOpacity>
            </View>

            {(issue.attachments || []).filter(a => a.mimeType === 'link').map(att => (
              <View key={att.id} style={[styles.attRow, { borderColor: border, backgroundColor: isDark ? '#1F2937' : '#F9FAFB', marginTop: 6 }]}>
                <View style={[styles.attIconBox, { backgroundColor: '#3B82F610' }]}>
                  <MaterialCommunityIcons name="link-variant" size={18} color="#3B82F6" />
                </View>
                <TouchableOpacity style={{ flex: 1, minWidth: 0 }} onPress={() => window.open(att.url, '_blank')} activeOpacity={0.7}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#60A5FA' : '#1D4ED8' }} numberOfLines={1}>
                    {att.originalName !== att.url ? att.originalName : att.url}
                  </Text>
                  {att.originalName !== att.url && (
                    <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, marginTop: 2 }} numberOfLines={1}>{att.url}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteAttachment(att.id)}
                  style={[styles.attDeleteBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                  <MaterialCommunityIcons name="close" size={13} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            {(issue.attachments || []).filter(a => a.mimeType === 'link').length === 0 && (
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, textAlign: 'center', paddingVertical: 10 }}>
                No links yet - paste a URL above
              </Text>
            )}
          </View>

          {/* Sub-tasks card (hidden for subtasks themselves) */}
          {issue.type !== 'subtask' && (
            <View style={[styles.card, { backgroundColor: surf, borderColor: border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: '#4C9AFF18' }]}>
                  <MaterialCommunityIcons name="subdirectory-arrow-right" size={14} color="#4C9AFF" />
                </View>
                <Text style={[styles.cardTitle, { color: isDark ? '#F3F4F6' : '#111827' }]}>
                  Sub-tasks
                </Text>
                {(issue.subtasks?.length || 0) > 0 && (
                  <View style={[styles.countBadge, { backgroundColor: '#4C9AFF' }]}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 10 }}>{issue.subtasks.length}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.addSubtaskBtn, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary + '40' }]}
                  onPress={() => setShowSubtaskInput(v => !v)}
                >
                  <MaterialCommunityIcons name={showSubtaskInput ? 'close' : 'plus'} size={14} color={theme.colors.primary} />
                  <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
                    {showSubtaskInput ? 'Cancel' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Quick-create subtask input */}
              {showSubtaskInput && (
                <View style={[styles.subtaskInputRow, { borderColor: border }]}>
                  <input
                    autoFocus
                    value={subtaskTitle}
                    onChange={e => setSubtaskTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateSubtask(); if (e.key === 'Escape') setShowSubtaskInput(false); }}
                    placeholder="Subtask title..."
                    style={{
                      flex: 1, border: 'none', outline: 'none', fontSize: 14,
                      background: 'transparent', fontFamily: 'inherit',
                      color: isDark ? '#F3F4F6' : '#111827',
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleCreateSubtask}
                    disabled={!subtaskTitle.trim() || creatingSubtask}
                    style={[styles.sendBtn, { backgroundColor: subtaskTitle.trim() ? accent : border, opacity: creatingSubtask ? 0.6 : 1 }]}
                  >
                    {creatingSubtask
                      ? <ActivityIndicator size={12} color="#fff" />
                      : <MaterialCommunityIcons name="send" size={13} color="#fff" />
                    }
                  </TouchableOpacity>
                </View>
              )}

              {/* Subtask list */}
              {(issue.subtasks?.length || 0) === 0 ? (
                !showSubtaskInput && (
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>
                    No sub-tasks yet
                  </Text>
                )
              ) : (
                <View style={styles.subtaskList}>
                  {issue.subtasks.map(st => {
                    const isDone = st.status?.category === 'done';
                    return (
                      <TouchableOpacity
                        key={st.id}
                        style={[styles.subtaskRow, { borderBottomColor: border }]}
                        onPress={() => navigation.navigate('IssueDetail', { issueId: st.id })}
                      >
                        <MaterialCommunityIcons
                          name={isDone ? 'check-circle' : 'circle-outline'}
                          size={18}
                          color={isDone ? '#10B981' : theme.colors.onSurfaceVariant}
                        />
                        <Text
                          style={{ flex: 1, fontSize: 13, color: isDone ? theme.colors.onSurfaceVariant : theme.colors.onSurface, textDecorationLine: isDone ? 'line-through' : 'none' }}
                          numberOfLines={1}
                        >
                          {st.title}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>{st.key}</Text>
                        <MaterialCommunityIcons name="chevron-right" size={14} color={theme.colors.onSurfaceVariant} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Comments card */}
          <View style={[styles.card, { backgroundColor: surf, borderColor: border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#6366F115' }]}>
                <MaterialCommunityIcons name="comment-text-outline" size={14} color="#6366F1" />
              </View>
              <Text style={[styles.cardTitle, { color: isDark ? '#F3F4F6' : '#111827' }]}>Comments</Text>
              {(issue.comments?.length || 0) > 0 && (
                <View style={[styles.countBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 10 }}>{issue.comments.length}</Text>
                </View>
              )}
            </View>

            {/* Compose box (with @mention dropdown) */}
            <View style={{ position: 'relative' }}>
              {/* @mention dropdown */}
              {showMentions && filteredMembers.length > 0 && (
                <View style={[styles.mentionDropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                  {filteredMembers.map((m, i) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.mentionItem, mentionIdx === i && { backgroundColor: theme.colors.primaryContainer + '44' }]}
                      onPress={() => insertMention(m)}
                      onMouseEnter={() => setMentionIdx(i)}
                    >
                      <Avatar user={m} size={22} />
                      <Text style={{ color: theme.colors.onSurface, fontSize: 13, fontWeight: '500' }}>{m.firstName} {m.lastName}</Text>
                      <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, marginLeft: 'auto' }}>{m.email}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={[styles.commentBox, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor: border }]}>
                <Avatar user={user} size={32} style={{ flexShrink: 0, marginTop: 2 }} />
                <View style={styles.commentInputWrap}>
                  <textarea
                    ref={textareaRef}
                    value={commentText}
                    onChange={handleCommentChange}
                    placeholder="Add a comment... type @ to mention someone"
                    onKeyDown={handleCommentKeyDown}
                    rows={2}
                    style={{
                      width: '100%', border: 'none', outline: 'none',
                      background: 'transparent', fontSize: 14, lineHeight: '22px',
                      color: theme.colors.onSurface,
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      resize: 'vertical', minHeight: 44,
                    }}
                  />
                  <View style={styles.commentActions}>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}>
                      @ to mention - Shift+Enter for new line
                    </Text>
                    <TouchableOpacity
                      onPress={handleComment}
                      disabled={!commentText.trim() || commenting}
                      style={[styles.sendBtn, {
                        backgroundColor: commentText.trim() ? accent : theme.colors.outlineVariant,
                        opacity: commenting ? 0.6 : 1,
                      }]}
                    >
                      {commenting
                        ? <ActivityIndicator size={12} color="#fff" />
                        : <>
                            <MaterialCommunityIcons name="send" size={13} color="#fff" />
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12, marginLeft: 5 }}>Send</Text>
                          </>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Comment list */}
            <View style={styles.commentList}>
              {!issue.comments?.length ? (
                <View style={styles.emptyComments}>
                  <MaterialCommunityIcons name="comment-outline" size={34} color={theme.colors.outlineVariant} />
                  <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 10, fontSize: 13 }}>
                    No comments yet. Be the first to comment.
                  </Text>
                </View>
              ) : (
                issue.comments.map(c => (
                  <View key={c.id} style={[styles.commentRow, { borderBottomColor: isDark ? '#374151' : '#F0F2F5' }]}>
                    <CommentItem comment={c} issueId={issueId} currentUserId={user?.id} onRefresh={refetch} />
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Activity card */}
          {issue.activities?.length > 0 && (
            <View style={[styles.card, { backgroundColor: surf, borderColor: border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: '#10B98115' }]}>
                  <MaterialCommunityIcons name="history" size={14} color="#10B981" />
                </View>
                <Text style={[styles.cardTitle, { color: isDark ? '#F3F4F6' : '#111827' }]}>Activity</Text>
              </View>
              <View style={styles.activityList}>
                {issue.activities.slice(0, 12).map((a, i, arr) => (
                  <View key={a.id || i} style={styles.activityRow}>
                    <View style={styles.activityLeft}>
                      <Avatar user={a.actor} size={26} />
                      {i < arr.length - 1 && (
                        <View style={[styles.activityLine, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
                      )}
                    </View>
                    <View style={[styles.activityBody, {
                      backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                      borderColor: isDark ? '#374151' : '#E5E7EB',
                    }]}>
                      <Text style={{ color: theme.colors.onSurface, fontSize: 13 }}>
                        <Text style={{ fontWeight: '700' }}>{a.actor?.firstName} {a.actor?.lastName}</Text>
                        {' '}{a.action}{a.field ? ` ${a.field}` : ''}
                      </Text>
                      <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, marginTop: 3 }}>
                        {formatRelative(a.createdAt)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Right sidebar */}
        <View style={[styles.sidebar, { backgroundColor: surf, borderColor: border }]}>
          <View style={[styles.sidebarHeader, { backgroundColor: theme.colors.surfaceVariant, borderBottomColor: theme.colors.outlineVariant }]}>
            <View style={[styles.sidebarTitleIcon, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons name="information-outline" size={15} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={[styles.sidebarHeaderText, { color: theme.colors.onSurface }]}>Issue details</Text>
              <Text style={[styles.sidebarSubText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                Routing, ownership and dates
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.sidebarContent} showsVerticalScrollIndicator={false}>

            {/* Assignee */}
            <SbRow icon="account-outline" label="Assignee" iconBg="#6366F118" iconColor="#6366F1" theme={theme}>
              <Menu
                visible={assigneeMenuOpen}
                onDismiss={() => setAssigneeMenuOpen(false)}
                anchor={
                  <TouchableOpacity onPress={() => setAssigneeMenuOpen(true)} style={styles.sbValueRow}>
                    {issue.assignee ? (
                      <>
                        <Avatar user={issue.assignee} size={20} style={{ marginRight: 6 }} />
                        <Text style={{ color: theme.colors.onSurface, fontWeight: '500', fontSize: 13 }}>
                          {issue.assignee.firstName} {issue.assignee.lastName}
                        </Text>
                      </>
                    ) : (
                      <Text style={{ color: theme.colors.primary, fontSize: 13 }}>Unassigned</Text>
                    )}
                    <MaterialCommunityIcons name="chevron-down" size={14} color={theme.colors.onSurfaceVariant} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                }
              >
                <Text style={styles.menuHeader}>ASSIGN TO</Text>
                <Menu.Item onPress={() => handleAssignee(null)} title="Unassigned" leadingIcon="account-off-outline"
                  titleStyle={!issue.assignee ? { fontWeight: '700', color: theme.colors.primary } : {}} />
                <Divider />
                {members.map(m => (
                  <Menu.Item key={m.id} onPress={() => handleAssignee(m.id)}
                    title={`${m.firstName} ${m.lastName}`}
                    leadingIcon={() => <Avatar user={m} size={20} />}
                    titleStyle={m.id === issue.assignee?.id ? { fontWeight: '700', color: theme.colors.primary } : {}} />
                ))}
              </Menu>
            </SbRow>

            <SbDivider theme={theme} />

            {/* Reporter */}
            <SbRow icon="account-edit-outline" label="Reporter" iconBg="#10B98118" iconColor="#10B981" theme={theme}>
              {issue.reporter ? (
                <View style={styles.sbValueRow}>
                  <Avatar user={issue.reporter} size={20} style={{ marginRight: 6 }} />
                  <Text style={{ color: theme.colors.onSurface, fontSize: 13 }}>
                    {reporterName}
                  </Text>
                </View>
              ) : (
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>-</Text>
              )}
            </SbRow>

            <SbDivider theme={theme} />

            {/* Sprint */}
            <SbRow icon="lightning-bolt-outline" label="Sprint" iconBg="#F59E0B18" iconColor="#F59E0B" theme={theme}>
              {issue.sprint ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.sprintChip, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary + '40' }]}>
                    <MaterialCommunityIcons name="lightning-bolt" size={11} color={theme.colors.primary} />
                    <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 12, marginLeft: 3 }} numberOfLines={1}>
                      {issue.sprint.name}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={handleRemoveFromSprint} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <MaterialCommunityIcons name="close-circle" size={15} color={theme.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>
              ) : activeSprint ? (
                <TouchableOpacity onPress={handleAddToSprint} style={[styles.addSprintBtn, { backgroundColor: theme.colors.primary }]}>
                  <MaterialCommunityIcons name="plus" size={12} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12, marginLeft: 3 }}>Add to sprint</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.sprintChip, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6', borderColor: border }]}>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>Backlog</Text>
                </View>
              )}
            </SbRow>

            <SbDivider theme={theme} />

            {/* Story Points */}
            <SbRow icon="poker-chip" label="Story Points" iconBg="#8B5CF618" iconColor="#8B5CF6" theme={theme}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                {[1, 2, 3, 5, 8, 13].map(pts => {
                  const active = issue.storyPoints === pts;
                  return (
                    <TouchableOpacity
                      key={pts}
                      onPress={() => updateIssue({ id: issueId, storyPoints: active ? null : pts }).unwrap().catch(err => showToast(err?.data?.message || 'Failed to update story points', 'error'))}
                      style={{
                        width: 28, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center',
                        backgroundColor: active ? theme.colors.primary : (isDark ? '#1E2D40' : '#F1F5F9'),
                        borderWidth: 1,
                        borderColor: active ? theme.colors.primary : (isDark ? '#2D3F55' : '#CBD5E1'),
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: active ? '#fff' : theme.colors.onSurfaceVariant }}>{pts}</Text>
                    </TouchableOpacity>
                  );
                })}
                {issue.storyPoints != null && (
                  <TouchableOpacity onPress={() => updateIssue({ id: issueId, storyPoints: null }).unwrap().catch(err => showToast(err?.data?.message || 'Failed to clear story points', 'error'))} style={{ padding: 4 }}>
                    <MaterialCommunityIcons name="close-circle-outline" size={15} color={theme.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                )}
              </View>
            </SbRow>

            <SbDivider theme={theme} />

            {/* Due Date */}
            <SbRow icon="calendar-outline" label="Due Date" iconBg={isOverdue ? '#DC262618' : '#05906918'} iconColor={isOverdue ? '#DC2626' : '#059669'} theme={theme}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <TouchableOpacity
                  onPress={() => { const el = document.getElementById('issue-due-date'); el && el.showPicker?.(); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  {issue.dueDate ? (
                    <View style={[styles.dateBadge, {
                      backgroundColor: isOverdue ? '#FEF2F2' : '#F0FDF4',
                      borderColor: isOverdue ? '#FCA5A5' : '#86EFAC',
                    }]}>
                      <MaterialCommunityIcons name={isOverdue ? 'calendar-alert' : 'calendar-check'} size={12} color={isOverdue ? '#DC2626' : '#16A34A'} />
                      <Text style={{ color: isOverdue ? '#DC2626' : '#15803D', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
                        {formatDate(issue.dueDate)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>Not set</Text>
                  )}
                  <MaterialCommunityIcons name="pencil-outline" size={13} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
                <input
                  id="issue-due-date"
                  type="date"
                  value={issue.dueDate || ''}
                  onChange={e => updateIssue({ id: issueId, dueDate: e.target.value || null }).unwrap().catch(err => showToast(err?.data?.message || 'Failed to update due date', 'error'))}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, pointerEvents: 'none' }}
                />
                {issue.dueDate && (
                  <TouchableOpacity
                    onPress={() => updateIssue({ id: issueId, dueDate: null }).unwrap().catch(err => showToast(err?.data?.message || 'Failed to clear due date', 'error'))}
                    style={{ position: 'absolute', top: -4, right: -18 }}
                  >
                    <MaterialCommunityIcons name="close-circle" size={14} color={theme.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                )}
              </div>
            </SbRow>

            {issue.epic && (
              <>
                <SbDivider theme={theme} />
                <SbRow icon="flash-outline" label="Epic" iconBg="#6554C018" iconColor="#6554C0" theme={theme}>
                  <View style={[styles.epicChip, {
                    backgroundColor: (issue.epic.color || '#6554C0') + '18',
                    borderColor: (issue.epic.color || '#6554C0') + '40',
                  }]}>
                    <Text style={{ color: issue.epic.color || '#6554C0', fontWeight: '700', fontSize: 12 }}>
                      {issue.epic.name}
                    </Text>
                  </View>
                </SbRow>
              </>
            )}

            {allLabels.length > 0 && (
              <>
                <SbDivider theme={theme} />
                <SbRow icon="tag-outline" label="Labels" iconBg="#06B6D418" iconColor="#06B6D4" theme={theme} wrap>
                  <Menu
                    visible={labelMenuOpen}
                    onDismiss={() => setLabelMenuOpen(false)}
                    anchor={
                      <TouchableOpacity
                        onPress={() => setLabelMenuOpen(true)}
                        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}
                      >
                        {(issue.labels || []).map(l => (
                          <View key={l.id || l.name} style={[styles.labelPill, {
                            backgroundColor: (l.color || '#6B7280') + '18',
                            borderColor: (l.color || '#6B7280') + '40',
                          }]}>
                            <Text style={{ color: l.color || '#6B7280', fontSize: 11, fontWeight: '600' }}>{l.name}</Text>
                          </View>
                        ))}
                        <View style={[styles.labelPill, {
                          backgroundColor: isDark ? '#1E2D40' : '#F1F5F9',
                          borderColor: isDark ? '#2D3F55' : '#CBD5E1',
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                        }]}>
                          <MaterialCommunityIcons name="plus" size={11} color={theme.colors.onSurfaceVariant} />
                          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, fontWeight: '600' }}>
                            {(issue.labels || []).length === 0 ? 'Add label' : 'Edit'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    }
                  >
                    {allLabels.map(lbl => {
                      const isActive = (issue.labels || []).some(l => l.id === lbl.id);
                      return (
                        <Menu.Item
                          key={lbl.id}
                          title={lbl.name}
                          leadingIcon={isActive ? 'check-circle' : 'circle-outline'}
                          onPress={() => handleLabelToggle(lbl.id)}
                          titleStyle={{ color: isActive ? lbl.color || '#3B82F6' : theme.colors.onSurface }}
                        />
                      );
                    })}
                  </Menu>
                </SbRow>
              </>
            )}

            {allReleases.length > 0 && (
              <>
                <SbDivider theme={theme} />
                <SbRow icon="package-variant-closed" label="Fix version" iconBg="#8B5CF618" iconColor="#8B5CF6" theme={theme}>
                  <Menu
                    visible={fixVersionMenuOpen}
                    onDismiss={() => setFixVersionMenuOpen(false)}
                    anchor={
                      <TouchableOpacity onPress={() => setFixVersionMenuOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {issue.releaseId ? (
                          (() => {
                            const rel = allReleases.find(r => r.id === issue.releaseId);
                            return rel ? (
                              <View style={{ backgroundColor: '#8B5CF618', borderWidth: 1, borderColor: '#8B5CF640', borderRadius: 5, paddingHorizontal: 9, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <MaterialCommunityIcons name="package-variant" size={13} color="#8B5CF6" />
                                <Text style={{ color: '#8B5CF6', fontSize: 12, fontWeight: '600' }}>{rel.name}{rel.version ? ` v${rel.version}` : ''}</Text>
                              </View>
                            ) : <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>None</Text>;
                          })()
                        ) : (
                          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>None</Text>
                        )}
                        <MaterialCommunityIcons name="chevron-down" size={14} color={theme.colors.onSurfaceVariant} />
                      </TouchableOpacity>
                    }
                  >
                    <Menu.Item title="None" leadingIcon="close-circle-outline" onPress={() => { setFixVersionMenuOpen(false); handleFixVersion(null); }} />
                    <Divider />
                    {allReleases.map(rel => (
                      <Menu.Item
                        key={rel.id}
                        title={`${rel.name}${rel.version ? ` v${rel.version}` : ''}`}
                        leadingIcon={issue.releaseId === rel.id ? 'check-circle' : 'package-variant-closed'}
                        onPress={() => { setFixVersionMenuOpen(false); handleFixVersion(rel.id); }}
                        titleStyle={{ color: issue.releaseId === rel.id ? '#8B5CF6' : undefined }}
                      />
                    ))}
                  </Menu>
                </SbRow>
              </>
            )}

            {customFields.length > 0 && (
              <>
                <SbDivider theme={theme} />
                {customFields.map((cf) => {
                  const cfVal = (issue.customFieldValues || []).find(v => v.customFieldId === cf.id);
                  const currentVal = cfVal?.value ?? '';
                  const CF_ICON = { text: 'format-text', number: 'numeric', date: 'calendar-outline', select: 'chevron-down-circle-outline', multi_select: 'format-list-checks', checkbox: 'checkbox-marked-outline', url: 'link-variant' };
                  return (
                    <SbRow key={cf.id} icon={CF_ICON[cf.type] || 'form-textbox'} label={cf.name + (cf.isRequired ? ' *' : '')} iconBg="#8B5CF618" iconColor="#8B5CF6" theme={theme}>
                      {cf.type === 'checkbox' ? (
                        <TouchableOpacity
                          onPress={() => handleCfValue(cf.id, currentVal === 'true' ? 'false' : 'true')}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                          <MaterialCommunityIcons
                            name={currentVal === 'true' ? 'checkbox-marked' : 'checkbox-blank-outline'}
                            size={20} color={currentVal === 'true' ? '#8B5CF6' : theme.colors.onSurfaceVariant}
                          />
                          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>{currentVal === 'true' ? 'Yes' : 'No'}</Text>
                        </TouchableOpacity>
                      ) : cf.type === 'select' && cf.options?.length ? (
                        <Menu
                          visible={cfMenuOpenId === cf.id}
                          onDismiss={() => setCfMenuOpenId(null)}
                          anchor={
                            <TouchableOpacity onPress={() => setCfMenuOpenId(cf.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                              <Text style={{ color: currentVal ? theme.colors.onSurface : theme.colors.onSurfaceVariant, fontSize: 13 }}>
                                {currentVal || 'None'}
                              </Text>
                              <MaterialCommunityIcons name="chevron-down" size={14} color={theme.colors.onSurfaceVariant} />
                            </TouchableOpacity>
                          }
                        >
                          <Menu.Item title="None" leadingIcon="close-circle-outline" onPress={() => { setCfMenuOpenId(null); handleCfValue(cf.id, ''); }} />
                          <Divider />
                          {(cf.options || []).map(opt => (
                            <Menu.Item
                              key={opt}
                              title={opt}
                              leadingIcon={currentVal === opt ? 'check-circle' : 'circle-outline'}
                              onPress={() => { setCfMenuOpenId(null); handleCfValue(cf.id, opt); }}
                              titleStyle={{ color: currentVal === opt ? '#8B5CF6' : undefined }}
                            />
                          ))}
                        </Menu>
                      ) : cf.type === 'date' ? (
                        <input
                          type="date"
                          value={currentVal}
                          onChange={e => handleCfValue(cf.id, e.target.value)}
                          style={{ border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: 13, color: currentVal ? (isDark ? '#E2E8F0' : '#0F172A') : (isDark ? '#64748B' : '#94A3B8'), fontFamily: 'inherit', cursor: 'pointer', colorScheme: isDark ? 'dark' : 'light' }}
                        />
                      ) : (
                        <input
                          type={cf.type === 'number' ? 'number' : 'text'}
                          defaultValue={currentVal}
                          onBlur={e => { if (e.target.value !== currentVal) handleCfValue(cf.id, e.target.value); }}
                          placeholder={cf.type === 'url' ? 'https://...' : `Enter ${cf.name.toLowerCase()}`}
                          style={{ border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: 13, color: isDark ? '#E2E8F0' : '#0F172A', fontFamily: 'inherit', width: '100%', minWidth: 0 }}
                        />
                      )}
                    </SbRow>
                  );
                })}
              </>
            )}

            {/* Timestamps */}
            <View style={[styles.timestamps, { borderTopColor: isDark ? '#374151' : '#E5E7EB' }]}>
              <View style={styles.tsRow}>
                <MaterialCommunityIcons name="clock-plus-outline" size={12} color={theme.colors.onSurfaceVariant} />
                <Text style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6, fontSize: 11 }}>
                  Created {formatRelative(issue.createdAt)}
                </Text>
              </View>
              <View style={styles.tsRow}>
                <MaterialCommunityIcons name="clock-edit-outline" size={12} color={theme.colors.onSurfaceVariant} />
                <Text style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6, fontSize: 11 }}>
                  Updated {formatRelative(issue.updatedAt)}
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      {!!toast && <AppToast message={toast} type={toastType} onDone={() => setToast('')} />}
    </View>
  );
}

/* Sidebar row */
const SbRow = ({ icon, label, iconBg, iconColor, children, theme, wrap }) => (
  <View style={[sbS.row, wrap && { alignItems: 'flex-start', paddingVertical: 12 }]}>
    <View style={sbS.label}>
      <View style={[sbS.iconWrap, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={13} color={iconColor} />
      </View>
      <Text style={[sbS.labelText, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
    </View>
    <View style={sbS.value}>{children}</View>
  </View>
);

const SbDivider = ({ theme }) => (
  <View style={[sbS.divider, { backgroundColor: theme.colors.outlineVariant }]} />
);

const sbS = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11 },
  label:    { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 110 },
  iconWrap: { width: 26, height: 26, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  labelText:{ fontSize: 12, fontWeight: '500' },
  value:    { flex: 1, alignItems: 'flex-end' },
  divider:  { height: 1 },
});

const styles = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 22, paddingVertical: 12,
    borderBottomWidth: 1, gap: 12,
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
  },
  backBtn:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingRight: 6 },
  breadcrumb: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  keyPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4, borderWidth: 1,
  },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  watchBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },

  body:        { flex: 1, flexDirection: 'row', gap: 20, padding: 22 },
  leftScroll:  { flex: 1, minWidth: 0 },
  leftContent: { padding: 0, paddingBottom: 72, gap: 16 },

  card: {
    borderRadius: 8, padding: 22, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E5E7EB',
    boxShadow: '0 8px 22px rgba(15, 23, 42, 0.06)',
  },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 16 },
  cardIconWrap: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardTitle:   { fontSize: 14, fontWeight: '700' },

  issueHero: {
    borderRadius: 8, padding: 24,
    borderWidth: 1, borderTopWidth: 4,
    overflow: 'hidden',
    boxShadow: '0 14px 32px rgba(15, 23, 42, 0.08)',
  },
  heroTop: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' },
  issueTypeMark: {
    width: 58, height: 58, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  heroCopy: { flex: 1, minWidth: 0 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' },
  typePill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
  },
  issueTitle: { fontSize: 28, fontWeight: '800', lineHeight: 34, marginBottom: 18, letterSpacing: 0 },
  issueSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 22,
  },
  summaryTile: {
    flexBasis: 220,
    minWidth: 190,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  summaryIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryLabel: { color: '#667085', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  summaryValue: { fontSize: 13, fontWeight: '800', marginTop: 2 },

  badgeRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  statusBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1,
  },
  priorityBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  menuHeader: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
    color: '#6B7280', fontSize: 10, letterSpacing: 0.5, fontWeight: '700',
  },

  emptyDesc: {
    alignItems: 'center', paddingVertical: 28,
    borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', marginTop: 4,
  },


  attSubHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  attSubTitle:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  imgGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imgThumbWrap: { position: 'relative', width: 112, height: 84 },
  imgThumbDelete: {
    position: 'absolute', top: -4, right: -4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
  },
  imgThumbAdd: {
    width: 80, height: 80, borderRadius: 8, borderWidth: 1.5, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
  },

  linkInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6,
  },
  linkNameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8,
  },
  addLinkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, cursor: 'pointer',
  },
  attDropZone: {
    alignItems: 'center', paddingVertical: 20,
    borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', marginTop: 4,
  },
  attList:    { gap: 6, marginTop: 4 },
  attRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth,
  },
  attIconBox:   { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  attDeleteBtn: { width: 26, height: 26, borderRadius: 6, justifyContent: 'center', alignItems: 'center', borderWidth: 1, flexShrink: 0 },

  countBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  commentBox: {
    flexDirection: 'row', gap: 12,
    borderWidth: 1, borderRadius: 8,
    padding: 12, marginBottom: 20,
  },
  commentInputWrap: { flex: 1 },
  commentActions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8, paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E0E0E0',
  },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 7,
  },
  addSubtaskBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1,
    marginLeft: 'auto',
  },
  subtaskInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 8,
  },
  subtaskList: { gap: 0 },
  subtaskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth,
    cursor: 'pointer',
  },
  mentionDropdown: {
    position: 'absolute', bottom: '100%', left: 0, right: 0,
    borderRadius: 8, borderWidth: 1, marginBottom: 4, zIndex: 100,
    overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  },
  mentionItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7, gap: 8, cursor: 'pointer',
  },
  commentList:   { gap: 0 },
  commentRow:    { paddingVertical: 12, borderBottomWidth: 1 },
  emptyComments: { alignItems: 'center', paddingVertical: 36 },

  activityList: { gap: 0 },
  activityRow:  { flexDirection: 'row', gap: 12, marginBottom: 0 },
  activityLeft: { alignItems: 'center', width: 26 },
  activityLine: { width: 2, flex: 1, minHeight: 16, marginTop: 4 },
  activityBody: { flex: 1, padding: 10, borderRadius: 8, marginBottom: 10, borderWidth: 1 },

  sidebar:       {
    width: 340,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
  },
  sidebarHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 16,
  },
  sidebarTitleIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sidebarHeaderText: { fontSize: 15, fontWeight: '800', letterSpacing: 0 },
  sidebarSubText: { fontSize: 11, marginTop: 2 },
  sidebarContent:    { padding: 16, paddingBottom: 48 },
  sbValueRow:        { flexDirection: 'row', alignItems: 'center', minWidth: 0 },

  sprintChip:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1, maxWidth: 140 },
  addSprintBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7 },
  pointsBadge:  { width: 30, height: 30, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  dateBadge:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, borderWidth: 1 },
  epicChip:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  labelsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  labelPill:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },

  timestamps: { marginTop: 20, paddingTop: 14, borderTopWidth: 1, gap: 7 },
  tsRow:      { flexDirection: 'row', alignItems: 'center' },
});
