import React, { useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme, Button, ActivityIndicator, Menu, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  useGetIssueQuery, useUpdateIssueMutation, useAddCommentMutation,
  useWatchIssueMutation, useUnwatchIssueMutation, useCreateIssueMutation,
} from '../../api/issueApi';
import { useGetProjectWorkflowQuery, useGetProjectMembersQuery } from '../../api/projectApi';
import { useGetActiveSprintQuery } from '../../api/sprintApi';
import { useAuth } from '../../hooks/useAuth';
import { formatRelative, formatDate } from '../../utils/dateUtils';
import { getPriorityColor } from '../../utils/helpers';
import { WS_URL } from '../../constants';
import CommentItem from '../../components/issues/CommentItem';
import AppToast from '../../components/common/AppToast';

const NAVY = '#0F2557';

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
  const textareaRef = useRef(null);
  const [statusMenuOpen, setStatusMenuOpen]     = useState(false);
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false);
  const [toast, setToast]                       = useState('');
  const [toastType, setToastType]               = useState('success');
  const showToast = (msg, type = 'success') => { setToast(msg); setToastType(type); };

  const { data, isLoading, refetch } = useGetIssueQuery(issueId);
  const [updateIssue, { isLoading: updating }] = useUpdateIssueMutation();
  const [addComment,  { isLoading: commenting }] = useAddCommentMutation();
  const [createIssue, { isLoading: creatingSubtask }] = useCreateIssueMutation();
  const [watchIssue]   = useWatchIssueMutation();
  const [unwatchIssue] = useUnwatchIssueMutation();

  const issue     = data?.data;
  const projectId = issue?.projectId;

  const { data: workflowData }     = useGetProjectWorkflowQuery(projectId, { skip: !projectId });
  const { data: membersData }      = useGetProjectMembersQuery(projectId,  { skip: !projectId });
  const { data: activeSprintData } = useGetActiveSprintQuery(projectId,    { skip: !projectId });

  const workflows   = workflowData?.data || [];
  const defaultWf   = workflows.find(w => w.isDefault) || workflows[0];
  const allStatuses = defaultWf?.statuses ? [...defaultWf.statuses].sort((a, b) => a.order - b.order) : [];
  const members     = (membersData?.data || []).map(m => m.user).filter(Boolean);
  const filteredMembers = showMentions
    ? members.filter(m => `${m.firstName} ${m.lastName}`.toLowerCase().includes(mentionSearch.toLowerCase())).slice(0, 7)
    : [];
  const isWatching  = issue?.watchers?.some(w => (w.id || w) === user?.id);
  const activeSprint = activeSprintData?.data;

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
    const fd = new FormData();
    fd.append('title', subtaskTitle.trim());
    fd.append('type', 'subtask');
    fd.append('projectId', projectId);
    fd.append('parentId', issueId);
    if (issue.sprintId) fd.append('sprintId', issue.sprintId);
    try {
      await createIssue({ formData: fd, projectId, sprintId: issue.sprintId || null }).unwrap();
      setSubtaskTitle('');
      setShowSubtaskInput(false);
      showToast('Subtask created');
      refetch();
    } catch (err) { showToast(err?.data?.message || 'Failed to create subtask', 'error'); }
  };

  if (isLoading) return (
    <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={NAVY} />
      <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 14 }}>Loading…</Text>
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

  const bg   = isDark ? '#1A1A2E' : '#F0F2F5';
  const surf = isDark ? '#16213E' : '#FFFFFF';
  const border = isDark ? '#2D2D4E' : '#E5E7EB';

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { backgroundColor: surf, borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={20} color={NAVY} />
          <Text style={{ color: NAVY, marginLeft: 2, fontWeight: '600', fontSize: 13 }}>Back</Text>
        </TouchableOpacity>

        <View style={styles.breadcrumb}>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>Issues</Text>
          <MaterialCommunityIcons name="chevron-right" size={15} color={theme.colors.onSurfaceVariant} />
          <View style={[styles.keyPill, { backgroundColor: typeMeta.bg, borderColor: typeMeta.color + '40' }]}>
            <MaterialCommunityIcons name={typeMeta.icon} size={12} color={typeMeta.color} />
            <Text style={{ color: typeMeta.color, marginLeft: 5, fontWeight: '700', fontSize: 12 }}>{issue.key}</Text>
          </View>
        </View>

        <View style={styles.topActions}>
          {updating && <ActivityIndicator size={14} color={NAVY} style={{ marginRight: 8 }} />}
          <TouchableOpacity onPress={handleWatch} style={[styles.watchBtn, {
            backgroundColor: isWatching ? NAVY + '15' : 'transparent',
            borderColor: isWatching ? NAVY + '60' : border,
          }]}>
            <MaterialCommunityIcons
              name={isWatching ? 'eye' : 'eye-outline'}
              size={15}
              color={isWatching ? NAVY : theme.colors.onSurfaceVariant}
            />
            <Text style={{ color: isWatching ? NAVY : theme.colors.onSurfaceVariant, marginLeft: 5, fontSize: 13, fontWeight: isWatching ? '700' : '400' }}>
              {isWatching ? 'Watching' : 'Watch'}{issue.watchers?.length ? ` · ${issue.watchers.length}` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>

        {/* ──── Left panel ──── */}
        <ScrollView style={styles.leftScroll} contentContainerStyle={styles.leftContent} showsVerticalScrollIndicator={false}>

          {/* Issue header card — left border color = issue type */}
          <View style={[styles.card, { backgroundColor: surf, borderLeftColor: typeMeta.color, borderLeftWidth: 4 }]}>
            <View style={styles.headerMeta}>
              <View style={[styles.typePill, { backgroundColor: typeMeta.bg }]}>
                <MaterialCommunityIcons name={typeMeta.icon} size={13} color={typeMeta.color} />
                <Text style={{ color: typeMeta.color, marginLeft: 5, fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {typeMeta.label}
                </Text>
              </View>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, fontWeight: '500' }}>{issue.key}</Text>
            </View>

            <Text style={[styles.issueTitle, { color: isDark ? '#F3F4F6' : '#111827' }]}>{issue.title}</Text>

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
                    <Text style={{ color: statusColor, fontWeight: '700', fontSize: 12, marginLeft: 7 }}>
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
                    <Text style={{ color: priorityCfg.color, fontSize: 12, fontWeight: '600', marginLeft: 5, textTransform: 'capitalize' }}>
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

          {/* Description card */}
          <View style={[styles.card, { backgroundColor: surf }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: NAVY + '15' }]}>
                <MaterialCommunityIcons name="text-box-outline" size={14} color={NAVY} />
              </View>
              <Text style={[styles.cardTitle, { color: isDark ? '#F3F4F6' : '#111827' }]}>Description</Text>
            </View>
            {issue.description ? (
              <Text style={{ color: theme.colors.onSurface, lineHeight: 26, fontSize: 14 }}>
                {issue.description}
              </Text>
            ) : (
              <View style={[styles.emptyDesc, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: border }]}>
                <MaterialCommunityIcons name="pencil-plus-outline" size={22} color={theme.colors.outlineVariant} />
                <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, fontSize: 13, fontStyle: 'italic', textAlign: 'center' }}>
                  No description yet.{'\n'}Add details to help your team.
                </Text>
              </View>
            )}
          </View>

          {/* Attachments card */}
          {issue.attachments?.length > 0 && (
            <View style={[styles.card, { backgroundColor: surf }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: '#F59E0B18' }]}>
                  <MaterialCommunityIcons name="paperclip" size={14} color="#F59E0B" />
                </View>
                <Text style={[styles.cardTitle, { color: isDark ? '#F3F4F6' : '#111827' }]}>Attachments</Text>
                <View style={[styles.countBadge, { backgroundColor: NAVY }]}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 10 }}>{issue.attachments.length}</Text>
                </View>
              </View>
              <View style={styles.attGrid}>
                {issue.attachments.map(att => {
                  const src = att.url?.startsWith('http') ? att.url : `${WS_URL}${att.url}`;
                  const isImage = att.mimeType?.startsWith('image/');
                  return (
                    <TouchableOpacity
                      key={att.id}
                      onPress={() => window.open(src, '_blank')}
                      activeOpacity={0.8}
                      style={[styles.attItem, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6', borderColor: border }]}
                    >
                      {isImage ? (
                        <img src={src} alt={att.originalName} style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block', borderRadius: '7px 7px 0 0' }} />
                      ) : (
                        <View style={{ height: 90, justifyContent: 'center', alignItems: 'center' }}>
                          <MaterialCommunityIcons name="file-document-outline" size={36} color={NAVY} />
                        </View>
                      )}
                      <View style={{ padding: 6 }}>
                        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }} numberOfLines={1}>{att.originalName}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Sub-tasks card (hidden for subtasks themselves) */}
          {issue.type !== 'subtask' && (
            <View style={[styles.card, { backgroundColor: surf }]}>
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
                  style={[styles.addSubtaskBtn, { backgroundColor: NAVY + '12', borderColor: NAVY + '30' }]}
                  onPress={() => setShowSubtaskInput(v => !v)}
                >
                  <MaterialCommunityIcons name={showSubtaskInput ? 'close' : 'plus'} size={14} color={NAVY} />
                  <Text style={{ color: NAVY, fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
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
                    placeholder="Subtask title…"
                    style={{
                      flex: 1, border: 'none', outline: 'none', fontSize: 14,
                      background: 'transparent', fontFamily: 'inherit',
                      color: isDark ? '#F3F4F6' : '#111827',
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleCreateSubtask}
                    disabled={!subtaskTitle.trim() || creatingSubtask}
                    style={[styles.sendBtn, { backgroundColor: subtaskTitle.trim() ? NAVY : border, opacity: creatingSubtask ? 0.6 : 1 }]}
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
          <View style={[styles.card, { backgroundColor: surf }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#6366F115' }]}>
                <MaterialCommunityIcons name="comment-text-outline" size={14} color="#6366F1" />
              </View>
              <Text style={[styles.cardTitle, { color: isDark ? '#F3F4F6' : '#111827' }]}>Comments</Text>
              {(issue.comments?.length || 0) > 0 && (
                <View style={[styles.countBadge, { backgroundColor: NAVY }]}>
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
                    placeholder="Add a comment… type @ to mention someone"
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
                      @ to mention · Shift+Enter for new line
                    </Text>
                    <TouchableOpacity
                      onPress={handleComment}
                      disabled={!commentText.trim() || commenting}
                      style={[styles.sendBtn, {
                        backgroundColor: commentText.trim() ? NAVY : theme.colors.outlineVariant,
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
            <View style={[styles.card, { backgroundColor: surf }]}>
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

        {/* ──── Right sidebar ──── */}
        <View style={[styles.sidebar, { backgroundColor: surf, borderLeftColor: border }]}>
          {/* Navy header */}
          <View style={[styles.sidebarHeader, { backgroundColor: NAVY }]}>
            <MaterialCommunityIcons name="information-outline" size={14} color="#93B4E0" />
            <Text style={styles.sidebarHeaderText}>DETAILS</Text>
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
                  titleStyle={!issue.assignee ? { fontWeight: '700', color: NAVY } : {}} />
                <Divider />
                {members.map(m => (
                  <Menu.Item key={m.id} onPress={() => handleAssignee(m.id)}
                    title={`${m.firstName} ${m.lastName}`}
                    leadingIcon={() => <Avatar user={m} size={20} />}
                    titleStyle={m.id === issue.assignee?.id ? { fontWeight: '700', color: NAVY } : {}} />
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
                    {issue.reporter.firstName} {issue.reporter.lastName}
                  </Text>
                </View>
              ) : (
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>—</Text>
              )}
            </SbRow>

            <SbDivider theme={theme} />

            {/* Sprint */}
            <SbRow icon="lightning-bolt-outline" label="Sprint" iconBg="#F59E0B18" iconColor="#F59E0B" theme={theme}>
              {issue.sprint ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.sprintChip, { backgroundColor: NAVY + '12', borderColor: NAVY + '30' }]}>
                    <MaterialCommunityIcons name="lightning-bolt" size={11} color={NAVY} />
                    <Text style={{ color: NAVY, fontWeight: '600', fontSize: 12, marginLeft: 3 }} numberOfLines={1}>
                      {issue.sprint.name}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={handleRemoveFromSprint} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <MaterialCommunityIcons name="close-circle" size={15} color={theme.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>
              ) : activeSprint ? (
                <TouchableOpacity onPress={handleAddToSprint} style={[styles.addSprintBtn, { backgroundColor: NAVY }]}>
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
              {issue.storyPoints != null ? (
                <View style={[styles.pointsBadge, { backgroundColor: NAVY }]}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{issue.storyPoints}</Text>
                </View>
              ) : (
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>—</Text>
              )}
            </SbRow>

            <SbDivider theme={theme} />

            {/* Due Date */}
            <SbRow icon="calendar-outline" label="Due Date" iconBg={isOverdue ? '#DC262618' : '#05906918'} iconColor={isOverdue ? '#DC2626' : '#059669'} theme={theme}>
              {issue.dueDate ? (
                <View style={[styles.dateBadge, {
                  backgroundColor: isOverdue ? '#FEF2F2' : '#F0FDF4',
                  borderColor: isOverdue ? '#FCA5A5' : '#86EFAC',
                }]}>
                  <MaterialCommunityIcons
                    name={isOverdue ? 'calendar-alert' : 'calendar-check'}
                    size={12}
                    color={isOverdue ? '#DC2626' : '#16A34A'}
                  />
                  <Text style={{ color: isOverdue ? '#DC2626' : '#15803D', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
                    {formatDate(issue.dueDate)}
                  </Text>
                </View>
              ) : (
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>—</Text>
              )}
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

            {issue.labels?.length > 0 && (
              <>
                <SbDivider theme={theme} />
                <SbRow icon="tag-outline" label="Labels" iconBg="#06B6D418" iconColor="#06B6D4" theme={theme} wrap>
                  <View style={styles.labelsRow}>
                    {issue.labels.map(l => (
                      <View key={l.id || l.name} style={[styles.labelPill, {
                        backgroundColor: (l.color || '#6B7280') + '18',
                        borderColor: (l.color || '#6B7280') + '40',
                      }]}>
                        <Text style={{ color: l.color || '#6B7280', fontSize: 11, fontWeight: '600' }}>{l.name}</Text>
                      </View>
                    ))}
                  </View>
                </SbRow>
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

/* ─── Sidebar row ─── */
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
    paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, gap: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  backBtn:    { flexDirection: 'row', alignItems: 'center' },
  breadcrumb: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  keyPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4, borderWidth: 1,
  },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  watchBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 7,
    paddingHorizontal: 12, paddingVertical: 6,
  },

  body:        { flex: 1, flexDirection: 'row' },
  leftScroll:  { flex: 1 },
  leftContent: { padding: 24, paddingBottom: 72, gap: 16 },

  card: {
    borderRadius: 12, padding: 24, overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 16 },
  cardIconWrap: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardTitle:   { fontSize: 14, fontWeight: '700' },

  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  typePill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5,
  },
  issueTitle: { fontSize: 22, fontWeight: '800', lineHeight: 32, marginBottom: 18 },

  badgeRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  statusBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
  },
  priorityBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
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

  attGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  attItem:  { width: 120, borderRadius: 8, overflow: 'hidden', borderWidth: 1 },

  countBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  commentBox: {
    flexDirection: 'row', gap: 12,
    borderWidth: 1.5, borderRadius: 10,
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
    borderRadius: 10, borderWidth: 1, marginBottom: 4, zIndex: 100,
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

  sidebar:       { width: 310, borderLeftWidth: 1 },
  sidebarHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 13,
  },
  sidebarHeaderText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  sidebarContent:    { padding: 16, paddingBottom: 48 },
  sbValueRow:        { flexDirection: 'row', alignItems: 'center' },

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
