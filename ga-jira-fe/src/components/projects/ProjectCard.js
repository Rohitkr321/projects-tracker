import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text, useTheme, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ProjectCard = ({ project, onPress }) => {
  const theme = useTheme();
  const initial = project.name?.[0]?.toUpperCase() || 'P';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
    >
      <View style={styles.header}>
        <Avatar.Text
          size={40}
          label={project.key || initial}
          style={{ backgroundColor: theme.colors.primary }}
          labelStyle={{ fontSize: 13, color: '#fff', fontWeight: '700' }}
        />
        <View style={styles.info}>
          <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }} numberOfLines={1}>
            {project.name}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
            {project.key}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
      </View>

      {project.description ? (
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
          numberOfLines={2}
        >
          {project.description}
        </Text>
      ) : null}

      <View style={styles.footer}>
        {project.memberCount != null && (
          <View style={styles.meta}>
            <MaterialCommunityIcons name="account-multiple-outline" size={14} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
              {project.memberCount} members
            </Text>
          </View>
        )}
        {project.openIssues != null && (
          <View style={styles.meta}>
            <MaterialCommunityIcons name="ticket-outline" size={14} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
              {project.openIssues} open
            </Text>
          </View>
        )}
        {project.isPrivate && (
          <View style={styles.meta}>
            <MaterialCommunityIcons name="lock-outline" size={14} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
              Private
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1 },
  footer: { flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' },
  meta: { flexDirection: 'row', alignItems: 'center' },
});

export default ProjectCard;
