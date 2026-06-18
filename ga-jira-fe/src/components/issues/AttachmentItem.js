import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PropTypes from 'prop-types';
import { formatFileSize } from '../../utils/helpers';
import { formatRelative } from '../../utils/dateUtils';
import { useDeleteAttachmentMutation } from '../../api/issueApi';

const getFileIcon = (mimeType) => {
  if (!mimeType) return 'file';
  if (mimeType.startsWith('image/')) return 'file-image';
  if (mimeType.includes('pdf')) return 'file-pdf-box';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'file-excel';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'file-word';
  if (mimeType.startsWith('video/')) return 'file-video';
  if (mimeType.startsWith('audio/')) return 'file-music';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'zip-box';
  return 'file';
};

const AttachmentItem = ({ attachment, issueId, canDelete, onDeleted }) => {
  const theme = useTheme();
  const [deleteAttachment] = useDeleteAttachmentMutation();
  const icon = getFileIcon(attachment.mimeType);

  const handleOpen = () => {
    if (attachment.url) {
      Linking.openURL(attachment.url);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAttachment({ issueId, attachmentId: attachment.id }).unwrap();
      onDeleted?.();
    } catch (error) {
      console.error('Failed to delete attachment:', error);
    }
  };

  return (
    <TouchableOpacity onPress={handleOpen} activeOpacity={0.7}>
      <View style={[styles.container, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface }]}>
          <MaterialCommunityIcons name={icon} size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.info}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '500' }} numberOfLines={1}>
            {attachment.filename}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatFileSize(attachment.size)} • {formatRelative(attachment.createdAt)}
          </Text>
        </View>
        {canDelete && (
          <IconButton
            icon="close"
            size={16}
            iconColor={theme.colors.onSurfaceVariant}
            onPress={handleDelete}
            style={styles.deleteBtn}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

AttachmentItem.propTypes = {
  attachment: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    filename: PropTypes.string,
    mimeType: PropTypes.string,
    size: PropTypes.number,
    url: PropTypes.string,
    createdAt: PropTypes.string,
  }).isRequired,
  issueId: PropTypes.string.isRequired,
  canDelete: PropTypes.bool,
  onDeleted: PropTypes.func,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1 },
  deleteBtn: { margin: 0 },
});

export default AttachmentItem;
