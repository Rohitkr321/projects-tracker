import React, { useState, useRef, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TextInput as RNTextInput, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Image, Linking } from 'react-native';
import { Text, useTheme, Chip, Button, Card, ActivityIndicator, Menu, Portal, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useGetIssueQuery, useUpdateIssueMutation, useAddCommentMutation, useWatchIssueMutation, useUnwatchIssueMutation, useGetAttachmentsQuery } from '../../api/issueApi';
import { useGetProjectWorkflowQuery, useGetProjectMembersQuery } from '../../api/projectApi';
import { useAuth } from '../../hooks/useAuth';
import { formatRelative, formatDate, formatDuration } from '../../utils/dateUtils';
import { getPriorityColor } from '../../utils/helpers';
import { WS_URL } from '../../constants';
import StatusBadge from '../../components/issues/StatusBadge';
import CommentItem from '../../components/issues/CommentItem';

const IssueDetailScreen = ({ route, navigation }) => {
  const { issueId } = route.params;
  const theme = useTheme();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const commentRef = useRef(null);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [assigneeMenuVisible, setAssigneeMenuVisible] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');

  const { data, isLoading, refetch } = useGetIssueQuery(issueId);

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));
  const [updateIssue, { isLoading: isUpdating }] = useUpdateIssueMutation();
  const [addComment, { isLoading: commenting }] = useAddCommentMutation();
  const [watchIssue] = useWatchIssueMutation();
  const [unwatchIssue] = useUnwatchIssueMutation();

  const issue = data?.data;
  const projectId = issue?.projectId;

  const { data: attachmentsData } = useGetAttachmentsQuery(issueId, { skip: !issueId });
  const attachments = attachmentsData?.data || issue?.attachments || [];

  const { data: workflowData } = useGetProjectWorkflowQuery(projectId, { skip: !projectId });
  const { data: membersData } = useGetProjectMembersQuery(projectId, { skip: !projectId });

  const workflows = workflowData?.data || [];
  const defaultWorkflow = workflows.find((w) => w.isDefault) || workflows[0];
  const allStatuses = defaultWorkflow?.statuses
    ? [...defaultWorkflow.statuses].sort((a, b) => a.order - b.order)
    : [];

  const members = (membersData?.data || []).map((m) => m.user).filter(Boolean);

  const isWatching = issue?.watchers?.some((w) => (w.id || w) === user?.id);

  const handleStatusChange = async (status) => {
    setStatusMenuVisible(false);
    if (status.id === issue?.status?.id) return;
    try {
      await updateIssue({ id: issueId, workflowStatusId: status.id }).unwrap();
      refetch();
    } catch {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleAssigneeChange = async (memberId) => {
    setAssigneeMenuVisible(false);
    try {
      await updateIssue({ id: issueId, assigneeId: memberId || null }).unwrap();
      refetch();
    } catch {
      Alert.alert('Error', 'Failed to update assignee');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await addComment({ issueId, body: commentText.trim() }).unwrap();
      setCommentText('');
      refetch();
    } catch {
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const handleWatch = async () => {
    try {
      if (isWatching) await unwatchIssue(issueId).unwrap();
      else await watchIssue(issueId).unwrap();
      refetch();
    } catch {}
  };

  const handleSaveDescription = async () => {
    try {
      await updateIssue({ id: issueId, description: descriptionDraft }).unwrap();
      setEditingDescription(false);
      refetch();
    } catch {
      Alert.alert('Error', 'Failed to update description');
    }
  };

  if (isLoading) return <View style={styles.loading}><ActivityIndicator size="large" /></View>;
  if (!issue) return null;

  const assigneeLabel = issue.assignee
    ? `${issue.assignee.firstName} ${issue.assignee.lastName}`
    : 'Unassigned';

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          {/* Breadcrumb: project > parent > current issue */}
          <View style={styles.breadcrumb}>
            {issue.project && (
              <>
                <TouchableOpacity onPress={() => navigation.navigate('ProjectDetail', { projectId: issue.project.id })}>
                  <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '600' }}>{issue.project.name}</Text>
                </TouchableOpacity>
                <MaterialCommunityIcons name="chevron-right" size={15} color={theme.colors.onSurfaceVariant} />
              </>
            )}
            {issue.parent && (
              <>
                <TouchableOpacity onPress={() => navigation.push('IssueDetail', { issueId: issue.parent.id })}>
                  <Text style={{ color: theme.colors.primary, fontSize: 13 }}>{issue.parent.key}</Text>
                </TouchableOpacity>
                <MaterialCommunityIcons name="chevron-right" size={15} color={theme.colors.onSurfaceVariant} />
              </>
            )}
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>{issue.key}</Text>
          </View>

          <View style={styles.headerTop}>
            <Chip compact style={{ backgroundColor: theme.colors.background }}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{issue.key}</Text>
            </Chip>
            <Chip compact style={{ backgroundColor: getPriorityColor(issue.priority) + '20' }}>
              <Text variant="bodySmall" style={{ color: getPriorityColor(issue.priority) }}>{issue.priority}</Text>
            </Chip>
            {isUpdating && <ActivityIndicator size={16} />}
          </View>
          <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>{issue.title}</Text>

          {/* Tappable status badge */}
          <View style={styles.statusRow}>
            <Menu
              visible={statusMenuVisible}
              onDismiss={() => setStatusMenuVisible(false)}
              anchor={
                <TouchableOpacity onPress={() => setStatusMenuVisible(true)} style={styles.statusAnchor}>
                  {issue.status && <StatusBadge status={issue.status} />}
                  <MaterialCommunityIcons name="chevron-down" size={16} color={theme.colors.onSurfaceVariant} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              }
            >
              <Text variant="labelSmall" style={styles.menuHeader}>Change Status</Text>
              {allStatuses.map((s) => (
                <Menu.Item
                  key={s.id}
                  onPress={() => handleStatusChange(s)}
                  title={s.name}
                  leadingIcon={() => (
                    <View style={[styles.statusDot, { backgroundColor: s.color }]} />
                  )}
                  titleStyle={s.id === issue.status?.id ? { fontWeight: '700', color: theme.colors.primary } : {}}
                />
              ))}
            </Menu>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{issue.type}</Text>
          </View>

          <View style={styles.watchRow}>
            <Button icon={isWatching ? 'eye-off' : 'eye'} mode="text" compact onPress={handleWatch}>
              {isWatching ? 'Unwatch' : 'Watch'} · {issue.watchers?.length || 0}
            </Button>
          </View>
        </View>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Details</Text>
            <View style={styles.detailGrid}>

              {/* Tappable assignee row */}
              <Menu
                visible={assigneeMenuVisible}
                onDismiss={() => setAssigneeMenuVisible(false)}
                anchor={
                  <TouchableOpacity onPress={() => setAssigneeMenuVisible(true)} style={styles.detailItemPressable}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Assignee</Text>
                    <View style={styles.assigneeValue}>
                      <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: '500' }}>
                        {assigneeLabel}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={14} color={theme.colors.primary} />
                    </View>
                  </TouchableOpacity>
                }
              >
                <Text variant="labelSmall" style={styles.menuHeader}>Assign To</Text>
                <Menu.Item
                  onPress={() => handleAssigneeChange(null)}
                  title="Unassigned"
                  leadingIcon="account-off-outline"
                  titleStyle={!issue.assignee ? { fontWeight: '700', color: theme.colors.primary } : {}}
                />
                <Divider />
                {members.map((m) => (
                  <Menu.Item
                    key={m.id}
                    onPress={() => handleAssigneeChange(m.id)}
                    title={`${m.firstName} ${m.lastName}`}
                    leadingIcon="account-outline"
                    titleStyle={m.id === issue.assignee?.id ? { fontWeight: '700', color: theme.colors.primary } : {}}
                  />
                ))}
              </Menu>

              <DetailItem label="Reporter" value={issue.reporter ? `${issue.reporter.firstName} ${issue.reporter.lastName}` : '-'} theme={theme} />
              <DetailItem label="Sprint" value={issue.sprint?.name || 'Backlog'} theme={theme} />
              <DetailItem label="Epic" value={issue.epic?.name || 'None'} theme={theme} />
              <DetailItem label="Story Points" value={issue.storyPoints?.toString() || 'None'} theme={theme} />
              <DetailItem label="Due Date" value={issue.dueDate ? formatDate(issue.dueDate) : 'None'} theme={theme} />
              <DetailItem label="Time Logged" value={formatDuration(issue.timeSpent)} theme={theme} />
            </View>

            {issue.labels?.length > 0 && (
              <>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, marginBottom: 6 }}>Labels</Text>
                <View style={styles.labelsRow}>
                  {issue.labels.map((l) => (
                    <Chip key={l.id || l.name} compact style={{ backgroundColor: l.color + '20' }}>
                      <Text style={{ color: l.color, fontSize: 11 }}>{l.name}</Text>
                    </Chip>
                  ))}
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface, marginBottom: 0 }]}>Description</Text>
              {!editingDescription && (
                <TouchableOpacity onPress={() => { setDescriptionDraft(issue.description || ''); setEditingDescription(true); }}>
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            {editingDescription ? (
              <>
                <RNTextInput
                  style={[styles.descInput, { color: theme.colors.onSurface, borderColor: theme.colors.outline, backgroundColor: theme.colors.background }]}
                  value={descriptionDraft}
                  onChangeText={setDescriptionDraft}
                  multiline
                  autoFocus
                  placeholder="Add a description..."
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <Button mode="contained" compact onPress={handleSaveDescription} loading={isUpdating}>Save</Button>
                  <Button mode="text" compact onPress={() => setEditingDescription(false)}>Cancel</Button>
                </View>
              </>
            ) : (
              <Text variant="bodyMedium" style={{ color: issue.description ? theme.colors.onSurface : theme.colors.onSurfaceVariant, lineHeight: 22 }}>
                {issue.description || 'No description. Tap pencil to add one.'}
              </Text>
            )}
          </Card.Content>
        </Card>

        {attachments.length > 0 && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Attachments ({attachments.length})
              </Text>
              <View style={styles.attachmentGrid}>
                {attachments.map((att) => {
                  // viewUrl is a presigned S3 URL; fall back to att.url if it's already http
                  const src = att.viewUrl || (att.url?.startsWith('http') ? att.url : null);
                  const isImage = att.mimeType?.startsWith('image/');
                  return (
                    <TouchableOpacity
                      key={att.id}
                      style={[styles.attachmentItem, { backgroundColor: theme.colors.surfaceVariant }]}
                      onPress={() => src && Linking.openURL(src)}
                      activeOpacity={src ? 0.75 : 1}
                    >
                      {isImage && src ? (
                        <Image source={{ uri: src }} style={styles.attachmentImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.fileIconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
                          <MaterialCommunityIcons
                            name={isImage ? 'image-outline' : 'file-document-outline'}
                            size={28}
                            color={theme.colors.primary}
                          />
                        </View>
                      )}
                      <Text
                        variant="labelSmall"
                        style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' }}
                        numberOfLines={1}
                      >
                        {att.originalName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card.Content>
          </Card>
        )}

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Comments ({issue.comments?.length || 0})
            </Text>
            {issue.comments?.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                issueId={issueId}
                currentUserId={user?.id}
                onRefresh={refetch}
              />
            ))}
            {issue.comments?.length === 0 && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>No comments yet</Text>
            )}
          </Card.Content>
        </Card>

        {issue.activities?.length > 0 && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Activity</Text>
              {issue.activities.slice(0, 10).map((activity, idx) => (
                <View key={activity.id || idx} style={styles.activityItem}>
                  <MaterialCommunityIcons name="circle-small" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>{activity.actor?.firstName}</Text>
                    {' '}{activity.action}{activity.field ? ` ${activity.field}` : ''}
                    {' · '}{formatRelative(activity.createdAt)}
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      <View style={[styles.commentBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outline }]}>
        <RNTextInput
          ref={commentRef}
          style={[styles.commentInput, { color: theme.colors.onSurface, borderColor: theme.colors.outline }]}
          placeholder="Add a comment..."
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <Button mode="contained" compact onPress={handleAddComment} loading={commenting} disabled={!commentText.trim()}>
          Send
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const DetailItem = ({ label, value, theme }) => (
  <View style={styles.detailItem}>
    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '500' }}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, marginBottom: 8 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12, flexWrap: 'wrap' },
  backBtn: { marginRight: 4 },
  headerTop: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  descInput: { borderWidth: 1, borderRadius: 8, padding: 10, minHeight: 80, fontSize: 14, lineHeight: 20 },
  title: { fontWeight: '700', lineHeight: 28, marginBottom: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statusAnchor: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  menuHeader: { paddingHorizontal: 16, paddingVertical: 6, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0 },
  watchRow: { flexDirection: 'row' },
  card: { marginHorizontal: 12, marginBottom: 8, borderRadius: 12 },
  sectionTitle: { fontWeight: '700', marginBottom: 12 },
  detailGrid: { gap: 4 },
  detailItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailItemPressable: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  assigneeValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  labelsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  activityItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  commentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    maxHeight: 80,
    fontSize: 14,
  },
  bottomPad: { height: 16 },
  attachmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  attachmentItem: { width: 88, borderRadius: 8, padding: 4, alignItems: 'center' },
  attachmentImage: { width: 80, height: 80, borderRadius: 6 },
  fileIconWrap: { width: 80, height: 80, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
});

export default IssueDetailScreen;
