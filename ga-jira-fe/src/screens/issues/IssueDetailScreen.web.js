import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text, useTheme, Button, ActivityIndicator, Menu, Divider, Surface, Chip, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  useGetIssueQuery, useUpdateIssueMutation, useAddCommentMutation,
  useWatchIssueMutation, useUnwatchIssueMutation,
} from '../../api/issueApi';
import { useGetProjectWorkflowQuery, useGetProjectMembersQuery } from '../../api/projectApi';
import { useGetActiveSprintQuery } from '../../api/sprintApi';
import { useAuth } from '../../hooks/useAuth';
import { formatRelative, formatDate } from '../../utils/dateUtils';
import { getPriorityColor } from '../../utils/helpers';
import { WS_URL } from '../../constants';
import CommentItem from '../../components/issues/CommentItem';

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
      <Text style={toastS.text}>{message}</Text>
    </Animated.View>
  );
};
const toastS = StyleSheet.create({
  wrap: { position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, zIndex: 999, maxWidth: 400 },
  text: { color: '#fff', fontWeight: '600', fontSize: 14 },
});

const TYPE_META = {
  bug:     { icon: 'bug',                      color: '#DE350B', bg: '#FFEBE6' },
  story:   { icon: 'bookmark',                 color: '#00875A', bg: '#E3FCEF' },
  task:    { icon: 'check-circle-outline',     color: '#0052CC', bg: '#DEEBFF' },
  epic:    { icon: 'lightning-bolt',           color: '#6554C0', bg: '#EAE6FF' },
  subtask: { icon: 'subdirectory-arrow-right', color: '#4C9AFF', bg: '#DEEBFF' },
};

const PRIORITY_ICON = {
  highest: 'arrow-up-bold',
  high:    'arrow-up',
  medium:  'minus',
  low:     'arrow-down',
  lowest:  'arrow-down-bold',
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
  const [statusMenuOpen, setStatusMenuOpen]     = useState(false);
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false);
  const [toast, setToast]                       = useState(null);
  const showToast = (msg, isError = false) => setToast({ msg, isError });

  const { data, isLoading, refetch } = useGetIssueQuery(issueId);
  const [updateIssue, { isLoading: updating }] = useUpdateIssueMutation();
  const [addComment,  { isLoading: commenting }] = useAddCommentMutation();
  const [watchIssue]   = useWatchIssueMutation();
  const [unwatchIssue] = useUnwatchIssueMutation();

  const issue     = data?.data;
  const projectId = issue?.projectId;

  const { data: workflowData }    = useGetProjectWorkflowQuery(projectId, { skip: !projectId });
  const { data: membersData }     = useGetProjectMembersQuery(projectId,  { skip: !projectId });
  const { data: activeSprintData } = useGetActiveSprintQuery(projectId,  { skip: !projectId });

  const workflows      = workflowData?.data || [];
  const defaultWf      = workflows.find(w => w.isDefault) || workflows[0];
  const allStatuses    = defaultWf?.statuses ? [...defaultWf.statuses].sort((a,b) => a.order - b.order) : [];
  const members        = (membersData?.data || []).map(m => m.user).filter(Boolean);
  const isWatching     = issue?.watchers?.some(w => (w.id || w) === user?.id);
  const activeSprint   = activeSprintData?.data;

  const handleStatus = async (s) => {
    setStatusMenuOpen(false);
    if (s.id === issue?.status?.id) return;
    try { await updateIssue({ id: issueId, workflowStatusId: s.id }).unwrap(); }
    catch (err) { showToast(err?.data?.message || 'Failed to update status', true); }
  };
  const handleAssignee = async (id) => {
    setAssigneeMenuOpen(false);
    try { await updateIssue({ id: issueId, assigneeId: id || null }).unwrap(); }
    catch (err) { showToast(err?.data?.message || 'Failed to update assignee', true); }
  };
  const handlePriority = async (p) => {
    setPriorityMenuOpen(false);
    try { await updateIssue({ id: issueId, priority: p }).unwrap(); }
    catch (err) { showToast(err?.data?.message || 'Failed to update priority', true); }
  };
  const handleWatch = async () => {
    try {
      isWatching ? await unwatchIssue(issueId).unwrap() : await watchIssue(issueId).unwrap();
      refetch();
    } catch (err) { showToast(err?.data?.message || 'Failed to update watch', true); }
  };
  const handleAddToSprint = async () => {
    if (!activeSprint) return;
    try {
      await updateIssue({ id: issueId, sprintId: activeSprint.id }).unwrap();
      showToast(`Added to ${activeSprint.name}`);
      refetch();
    } catch (err) { showToast(err?.data?.message || 'Failed to add to sprint', true); }
  };
  const handleRemoveFromSprint = async () => {
    try {
      await updateIssue({ id: issueId, sprintId: null }).unwrap();
      showToast('Removed from sprint');
      refetch();
    } catch (err) { showToast(err?.data?.message || 'Failed to remove from sprint', true); }
  };
  const handleComment = async () => {
    if (!commentText.trim()) return;
    try {
      await addComment({ issueId, body: commentText.trim() }).unwrap();
      setCommentText('');
      refetch();
    } catch (err) { showToast(err?.data?.message || 'Failed to post comment', true); }
  };

  /* ─── Loading / not found ─── */
  if (isLoading) return (
    <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
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

  const typeMeta      = TYPE_META[issue.type]  || TYPE_META.task;
  const priorityColor = getPriorityColor(issue.priority);
  const statusColor   = issue.status?.color || '#6B7280';

  const bg    = isDark ? '#1A1A2E' : '#F4F5F7';
  const surf  = isDark ? '#16213E' : '#FFFFFF';
  const panel = isDark ? '#0F3460' : '#F8F9FA';

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { backgroundColor: surf, borderBottomColor: isDark ? '#2D2D4E' : '#E8EAED' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={18} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6 }}>Back</Text>
        </TouchableOpacity>

        <View style={styles.breadcrumb}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Issues</Text>
          <MaterialCommunityIcons name="chevron-right" size={14} color={theme.colors.onSurfaceVariant} />
          <View style={[styles.keyPill, { backgroundColor: typeMeta.bg }]}>
            <MaterialCommunityIcons name={typeMeta.icon} size={12} color={typeMeta.color} />
            <Text variant="labelSmall" style={{ color: typeMeta.color, marginLeft: 4, fontWeight: '600' }}>
              {issue.key}
            </Text>
          </View>
        </View>

        <View style={styles.topActions}>
          {updating && <ActivityIndicator size={14} color={theme.colors.primary} style={{ marginRight: 8 }} />}
          <TouchableOpacity onPress={handleWatch} style={[styles.watchBtn, {
            backgroundColor: isWatching ? theme.colors.primaryContainer : surf,
            borderColor: theme.colors.outlineVariant,
          }]}>
            <MaterialCommunityIcons
              name={isWatching ? 'eye' : 'eye-outline'}
              size={15}
              color={isWatching ? theme.colors.primary : theme.colors.onSurfaceVariant}
            />
            <Text variant="labelSmall" style={{ color: isWatching ? theme.colors.primary : theme.colors.onSurfaceVariant, marginLeft: 5 }}>
              {isWatching ? 'Watching' : 'Watch'}{issue.watchers?.length ? ` · ${issue.watchers.length}` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>

        {/* ──── Left panel ──── */}
        <ScrollView style={styles.leftScroll} contentContainerStyle={styles.leftContent} showsVerticalScrollIndicator={false}>

          {/* Issue header card */}
          <View style={[styles.card, { backgroundColor: surf }]}>

            {/* Type + key row */}
            <View style={styles.headerMeta}>
              <View style={[styles.typePill, { backgroundColor: typeMeta.bg }]}>
                <MaterialCommunityIcons name={typeMeta.icon} size={13} color={typeMeta.color} />
                <Text variant="labelSmall" style={{ color: typeMeta.color, marginLeft: 5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0 }}>
                  {issue.type}
                </Text>
              </View>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{issue.key}</Text>
            </View>

            {/* Title */}
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
              {issue.title}
            </Text>

            {/* Status · Priority row */}
            <View style={styles.badgeRow}>
              {/* Status dropdown */}
              <Menu
                visible={statusMenuOpen}
                onDismiss={() => setStatusMenuOpen(false)}
                anchor={
                  <TouchableOpacity
                    onPress={() => setStatusMenuOpen(true)}
                    style={[styles.statusBtn, { backgroundColor: statusColor + '1A', borderColor: statusColor + '50' }]}
                  >
                    <View style={[styles.dot, { backgroundColor: statusColor }]} />
                    <Text style={{ color: statusColor, fontWeight: '700', fontSize: 12, marginLeft: 6 }}>
                      {issue.status?.name || 'No Status'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={14} color={statusColor} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                }
              >
                <Text variant="labelSmall" style={styles.menuHeader}>CHANGE STATUS</Text>
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
                    style={[styles.priorityBtn, { backgroundColor: priorityColor + '15', borderColor: priorityColor + '40' }]}
                  >
                    <MaterialCommunityIcons name={PRIORITY_ICON[issue.priority] || 'minus'} size={14} color={priorityColor} />
                    <Text style={{ color: priorityColor, fontSize: 12, fontWeight: '600', marginLeft: 5, textTransform: 'capitalize' }}>
                      {issue.priority || 'Medium'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={13} color={priorityColor} style={{ marginLeft: 3 }} />
                  </TouchableOpacity>
                }
              >
                <Text variant="labelSmall" style={styles.menuHeader}>CHANGE PRIORITY</Text>
                {['highest','high','medium','low','lowest'].map(p => (
                  <Menu.Item
                    key={p}
                    onPress={() => handlePriority(p)}
                    title={p.charAt(0).toUpperCase() + p.slice(1)}
                    leadingIcon={() => (
                      <MaterialCommunityIcons name={PRIORITY_ICON[p]} size={16} color={getPriorityColor(p)} />
                    )}
                    titleStyle={p === issue.priority ? { fontWeight: '700', color: theme.colors.primary } : {}}
                  />
                ))}
              </Menu>
            </View>
          </View>

          {/* Description card */}
          <View style={[styles.card, { backgroundColor: surf }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Description</Text>
            {issue.description ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 26 }}>
                {issue.description}
              </Text>
            ) : (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>
                No description provided. Click to add one.
              </Text>
            )}
          </View>

          {/* Attachments card */}
          {issue.attachments?.length > 0 && (
            <View style={[styles.card, { backgroundColor: surf }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Text style={[styles.cardTitle, { color: theme.colors.onSurface, marginBottom: 0 }]}>Attachments</Text>
                <View style={[styles.countBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                    {issue.attachments.length}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {issue.attachments.map(att => {
                  const src = att.url?.startsWith('http') ? att.url : `${WS_URL}${att.url}`;
                  const isImage = att.mimeType?.startsWith('image/');
                  return (
                    <TouchableOpacity
                      key={att.id}
                      onPress={() => window.open(src, '_blank')}
                      activeOpacity={0.85}
                      style={[styles.attItem, { backgroundColor: bg }]}
                    >
                      {isImage ? (
                        <img
                          src={src}
                          alt={att.originalName}
                          style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block', borderRadius: 6 }}
                        />
                      ) : (
                        <View style={{ height: 100, justifyContent: 'center', alignItems: 'center' }}>
                          <MaterialCommunityIcons name="file-outline" size={36} color={theme.colors.onSurfaceVariant} />
                        </View>
                      )}
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 5, fontSize: 10 }} numberOfLines={1}>
                        {att.originalName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Comments card */}
          <View style={[styles.card, { backgroundColor: surf }]}>
            <View style={styles.commentsHeader}>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Comments</Text>
              {(issue.comments?.length || 0) > 0 && (
                <View style={[styles.countBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                    {issue.comments.length}
                  </Text>
                </View>
              )}
            </View>

            {/* Add comment */}
            <View style={[styles.commentBox, { backgroundColor: isDark ? '#0D1B2A' : '#F8F9FA', borderColor: isDark ? '#2D2D4E' : '#DFE1E6' }]}>
              <Avatar user={user} size={30} style={{ flexShrink: 0, marginTop: 2 }} />
              <View style={styles.commentInputWrap}>
                {/* Native textarea — avoids the 'outline' StyleSheet error */}
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Add a comment... (Shift+Enter for new line)"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                  rows={2}
                  style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 14,
                    lineHeight: '22px',
                    color: theme.colors.onSurface,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    resize: 'vertical',
                    minHeight: 42,
                  }}
                />
                <View style={styles.commentActions}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Press Enter to send
                  </Text>
                  <Button
                    mode="contained"
                    compact
                    onPress={handleComment}
                    loading={commenting}
                    disabled={!commentText.trim() || commenting}
                    style={{ borderRadius: 6 }}
                  >
                    Save
                  </Button>
                </View>
              </View>
            </View>

            {/* Comment list */}
            <View style={styles.commentList}>
              {!issue.comments?.length ? (
                <View style={styles.emptyComments}>
                  <MaterialCommunityIcons name="comment-outline" size={28} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                    No comments yet
                  </Text>
                </View>
              ) : (
                issue.comments.map(c => (
                  <View key={c.id} style={[styles.commentRow, { borderBottomColor: isDark ? '#2D2D4E' : '#F0F2F5' }]}>
                    <CommentItem
                      comment={c}
                      issueId={issueId}
                      currentUserId={user?.id}
                      onRefresh={refetch}
                    />
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Activity card */}
          {issue.activities?.length > 0 && (
            <View style={[styles.card, { backgroundColor: surf }]}>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Activity</Text>
              <View style={styles.activityList}>
                {issue.activities.slice(0, 12).map((a, i) => (
                  <View key={a.id || i} style={styles.activityRow}>
                    <Avatar user={a.actor} size={24} style={{ flexShrink: 0 }} />
                    <View style={styles.activityBody}>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
                        <Text style={{ fontWeight: '700' }}>{a.actor?.firstName}</Text>
                        {' '}{a.action}{a.field ? ` ${a.field}` : ''}
                      </Text>
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
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
        <ScrollView style={[styles.sidebar, { backgroundColor: panel, borderLeftColor: isDark ? '#2D2D4E' : '#E8EAED' }]} contentContainerStyle={styles.sidebarContent} showsVerticalScrollIndicator={false}>

          <Text style={[styles.sidebarHeading, { color: theme.colors.onSurfaceVariant }]}>DETAILS</Text>

          {/* Assignee */}
          <SidebarRow icon="account-outline" label="Assignee" theme={theme}>
            <Menu
              visible={assigneeMenuOpen}
              onDismiss={() => setAssigneeMenuOpen(false)}
              anchor={
                <TouchableOpacity onPress={() => setAssigneeMenuOpen(true)} style={styles.sidebarValue}>
                  {issue.assignee ? (
                    <>
                      <Avatar user={issue.assignee} size={22} style={{ marginRight: 6 }} />
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '500' }}>
                        {issue.assignee.firstName} {issue.assignee.lastName}
                      </Text>
                    </>
                  ) : (
                    <Text variant="bodySmall" style={{ color: theme.colors.primary }}>Unassigned</Text>
                  )}
                  <MaterialCommunityIcons name="chevron-down" size={13} color={theme.colors.onSurfaceVariant} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              }
            >
              <Text variant="labelSmall" style={styles.menuHeader}>ASSIGN TO</Text>
              <Menu.Item
                onPress={() => handleAssignee(null)}
                title="Unassigned"
                leadingIcon="account-off-outline"
                titleStyle={!issue.assignee ? { fontWeight: '700', color: theme.colors.primary } : {}}
              />
              <Divider />
              {members.map(m => (
                <Menu.Item
                  key={m.id}
                  onPress={() => handleAssignee(m.id)}
                  title={`${m.firstName} ${m.lastName}`}
                  leadingIcon={() => <Avatar user={m} size={20} />}
                  titleStyle={m.id === issue.assignee?.id ? { fontWeight: '700', color: theme.colors.primary } : {}}
                />
              ))}
            </Menu>
          </SidebarRow>

          <SidebarDivider theme={theme} />

          {/* Reporter */}
          <SidebarRow icon="account-edit-outline" label="Reporter" theme={theme}>
            {issue.reporter ? (
              <View style={styles.sidebarValue}>
                <Avatar user={issue.reporter} size={22} style={{ marginRight: 6 }} />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
                  {issue.reporter.firstName} {issue.reporter.lastName}
                </Text>
              </View>
            ) : (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>—</Text>
            )}
          </SidebarRow>

          <SidebarDivider theme={theme} />

          {/* Sprint */}
          <SidebarRow icon="lightning-bolt-outline" label="Sprint" theme={theme}>
            {issue.sprint ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.sprintChip, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                    {issue.sprint.name}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleRemoveFromSprint} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <MaterialCommunityIcons name="close-circle-outline" size={14} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
            ) : activeSprint ? (
              <TouchableOpacity onPress={handleAddToSprint} style={[styles.addSprintBtn, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons name="plus" size={12} color={theme.colors.primary} />
                <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '600', marginLeft: 3 }}>
                  Add to sprint
                </Text>
              </TouchableOpacity>
            ) : (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Backlog</Text>
            )}
          </SidebarRow>

          <SidebarDivider theme={theme} />

          {/* Story Points */}
          <SidebarRow icon="poker-chip" label="Story Points" theme={theme}>
            {issue.storyPoints != null ? (
              <View style={[styles.pointsBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: '800' }}>
                  {issue.storyPoints}
                </Text>
              </View>
            ) : (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>—</Text>
            )}
          </SidebarRow>

          <SidebarDivider theme={theme} />

          {/* Due Date */}
          <SidebarRow icon="calendar-outline" label="Due Date" theme={theme}>
            <Text variant="bodySmall" style={{
              color: issue.dueDate
                ? (new Date(issue.dueDate) < new Date() ? '#DE350B' : theme.colors.onSurface)
                : theme.colors.onSurfaceVariant,
              fontWeight: issue.dueDate ? '500' : '400',
            }}>
              {issue.dueDate ? formatDate(issue.dueDate) : '—'}
            </Text>
          </SidebarRow>

          {issue.epic && (
            <>
              <SidebarDivider theme={theme} />
              <SidebarRow icon="flash-outline" label="Epic" theme={theme}>
                <View style={[styles.epicChip, { backgroundColor: (issue.epic.color || theme.colors.primary) + '20' }]}>
                  <Text variant="labelSmall" style={{ color: issue.epic.color || theme.colors.primary, fontWeight: '600' }}>
                    {issue.epic.name}
                  </Text>
                </View>
              </SidebarRow>
            </>
          )}

          {issue.labels?.length > 0 && (
            <>
              <SidebarDivider theme={theme} />
              <SidebarRow icon="tag-outline" label="Labels" theme={theme} wrap>
                <View style={styles.labelsRow}>
                  {issue.labels.map(l => (
                    <View key={l.id || l.name} style={[styles.labelPill, { backgroundColor: (l.color || '#6B7280') + '25' }]}>
                      <Text variant="labelSmall" style={{ color: l.color || '#6B7280', fontSize: 11 }}>{l.name}</Text>
                    </View>
                  ))}
                </View>
              </SidebarRow>
            </>
          )}

          {/* Timestamps */}
          <View style={[styles.timestamps, { borderTopColor: isDark ? '#2D2D4E' : '#E8EAED' }]}>
            <View style={styles.tsRow}>
              <MaterialCommunityIcons name="clock-plus-outline" size={13} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6 }}>
                Created {formatRelative(issue.createdAt)}
              </Text>
            </View>
            <View style={styles.tsRow}>
              <MaterialCommunityIcons name="clock-edit-outline" size={13} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6 }}>
                Updated {formatRelative(issue.updatedAt)}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {!!toast && <Toast message={toast.msg} isError={toast.isError} onDone={() => setToast(null)} />}
    </View>
  );
}

/* ─── Small reusable components ─── */
const SidebarRow = ({ icon, label, children, theme, wrap }) => (
  <View style={[styles.sbRow, wrap && { alignItems: 'flex-start' }]}>
    <View style={styles.sbLabel}>
      <MaterialCommunityIcons name={icon} size={14} color={theme.colors.onSurfaceVariant} />
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6, fontSize: 12 }}>{label}</Text>
    </View>
    {children}
  </View>
);

const SidebarDivider = ({ theme }) => (
  <View style={[styles.sbDivider, { backgroundColor: theme.colors.outlineVariant }]} />
);

const styles = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 9,
    borderBottomWidth: 1, gap: 12,
  },
  backBtn:    { flexDirection: 'row', alignItems: 'center' },
  breadcrumb: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  keyPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
  },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  watchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6,
  },

  // Body
  body:        { flex: 1, flexDirection: 'row' },
  leftScroll:  { flex: 1 },
  leftContent: { padding: 24, paddingBottom: 72, gap: 14 },

  // Cards
  card: {
    borderRadius: 12, padding: 24,
    boxShadow: '0px 1px 4px rgba(0,0,0,0.06)',
  },
  cardTitle: {
    fontSize: 14, fontWeight: '700', marginBottom: 16, letterSpacing: 0,
  },

  // Header
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  typePill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4,
  },
  title: { fontWeight: '800', lineHeight: 36, marginBottom: 16 },

  badgeRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
    color: '#6B7280', fontSize: 10, letterSpacing: 0, fontWeight: '700',
  },

  // Comments
  commentsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  countBadge: {
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  commentBox: {
    flexDirection: 'row', gap: 12,
    borderWidth: 1.5, borderRadius: 10,
    padding: 12, marginBottom: 20,
  },
  commentInputWrap: { flex: 1 },
  commentActions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E0E0E0',
  },
  commentList:   { gap: 0 },
  commentRow: { paddingVertical: 12, borderBottomWidth: 1 },
  emptyComments: { alignItems: 'center', paddingVertical: 32 },

  // Activity
  activityList: { gap: 16 },
  activityRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  activityBody: { flex: 1 },

  // Sidebar
  sidebar: {
    width: 300, borderLeftWidth: 1,
  },
  sidebarContent: { padding: 20, paddingBottom: 48 },
  sidebarHeading: {
    fontSize: 10, fontWeight: '800', letterSpacing: 0,
    marginBottom: 16,
  },
  sbRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  sbLabel:  { flexDirection: 'row', alignItems: 'center', minWidth: 110 },
  sbDivider: { height: 1, marginVertical: 2 },
  sidebarValue: { flexDirection: 'row', alignItems: 'center' },

  sprintChip:    { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  addSprintBtn:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  attItem:       { width: 110, borderRadius: 8, overflow: 'hidden', padding: 4 },
  pointsBadge:  { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  epicChip:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  labelsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1, justifyContent: 'flex-end' },
  labelPill:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },

  timestamps: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, gap: 8 },
  tsRow:      { flexDirection: 'row', alignItems: 'center' },
});
