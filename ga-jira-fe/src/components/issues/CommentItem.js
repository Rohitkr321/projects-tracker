import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme, IconButton, TextInput, Button } from 'react-native-paper';
import Avatar from '../common/Avatar';
import { formatRelative } from '../../utils/dateUtils';
import { useUpdateCommentMutation, useDeleteCommentMutation } from '../../api/issueApi';

const CommentItem = ({ comment, issueId, currentUserId, onRefresh }) => {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.body || '');
  const [updateComment, { isLoading: isUpdating }] = useUpdateCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();

  const isOwner = comment.author?.id === currentUserId;

  const handleSaveEdit = async () => {
    try {
      await updateComment({ issueId, commentId: comment.id, body: editText }).unwrap();
      setEditing(false);
      onRefresh?.();
    } catch {
      console.error('Failed to update comment');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteComment({ issueId, commentId: comment.id }).unwrap();
      onRefresh?.();
    } catch {
      console.error('Failed to delete comment');
    }
  };

  const authorName = comment.author
    ? `${comment.author.firstName} ${comment.author.lastName}`.trim()
    : 'Unknown';

  return (
    <View style={styles.container}>
      <Avatar user={comment.author} size={32} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
            {authorName}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatRelative(comment.createdAt)}
            {comment.isEdited ? ' (edited)' : ''}
          </Text>
          {isOwner && !editing && (
            <View style={styles.actions}>
              <IconButton icon="pencil" size={14} iconColor={theme.colors.onSurfaceVariant} onPress={() => setEditing(true)} style={styles.iconBtn} />
              <IconButton icon="delete" size={14} iconColor={theme.colors.error} onPress={handleDelete} style={styles.iconBtn} />
            </View>
          )}
        </View>

        {editing ? (
          <View style={styles.editContainer}>
            <TextInput value={editText} onChangeText={setEditText} mode="outlined" multiline style={styles.editInput} />
            <View style={styles.editActions}>
              <Button compact onPress={() => setEditing(false)}>Cancel</Button>
              <Button compact mode="contained" onPress={handleSaveEdit} loading={isUpdating}>Save</Button>
            </View>
          </View>
        ) : (
          <Text variant="bodyMedium" style={[styles.commentText, { color: theme.colors.onSurface }]}>
            {comment.body}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  content: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', marginLeft: 'auto' },
  iconBtn: { margin: 0, padding: 0 },
  commentText: { lineHeight: 22 },
  editContainer: { gap: 8 },
  editInput: { backgroundColor: 'transparent' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});

export default CommentItem;
