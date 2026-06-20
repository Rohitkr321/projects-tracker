import React, { useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity, TextInput } from 'react-native';
import { Text, useTheme, Avatar, Button, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '../../api/notificationApi';
import { markAsRead, markAllAsRead } from '../../store/notificationSlice';
import { formatRelative } from '../../utils/dateUtils';
import EmptyState from '../../components/common/EmptyState';
import colors from '../../theme/colors';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];

const NOTIF_ICON = {
  issue_assigned: { icon: 'ticket-account', color: colors.info, label: 'Issue assigned' },
  issue_commented: { icon: 'comment-text-outline', color: '#7C5EA7', label: 'Comment added' },
  comment_added: { icon: 'comment-text-outline', color: '#7C5EA7', label: 'Comment added' },
  issue_updated: { icon: 'pencil-circle-outline', color: '#0891B2', label: 'Issue updated' },
  issue_resolved: { icon: 'check-circle-outline', color: colors.success, label: 'Issue resolved' },
  sprint_started: { icon: 'lightning-bolt', color: colors.warning, label: 'Sprint started' },
  sprint_completed: { icon: 'flag-checkered', color: colors.onSurfaceVariant, label: 'Sprint completed' },
  mentioned: { icon: 'at', color: '#BE4B88', label: 'Mentioned' },
};

const titleCase = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());

const getIconInfo = (type) =>
  NOTIF_ICON[type] || { icon: 'bell-outline', color: colors.onSurfaceVariant, label: titleCase(type || 'Notification') };

const getInitials = (actor) => {
  if (!actor) return 'GA';
  const initials = `${actor.firstName?.[0] || ''}${actor.lastName?.[0] || ''}`.toUpperCase();
  return initials || actor.email?.substring(0, 2).toUpperCase() || 'GA';
};

const NotificationItem = ({ notification, onMarkRead, theme }) => {
  const iconInfo = getIconInfo(notification.type);
  const unread = !notification.isRead;

  return (
    <TouchableOpacity
      onPress={() => unread && onMarkRead(notification.id)}
      activeOpacity={0.86}
      style={[
        styles.item,
        {
          backgroundColor: theme.colors.surface,
          borderColor: unread ? `${theme.colors.primary}45` : theme.colors.outlineVariant,
          borderLeftColor: unread ? theme.colors.primary : theme.colors.outlineVariant,
        },
      ]}
    >
      <Avatar.Text size={42} label={getInitials(notification.actor)} style={{ backgroundColor: theme.colors.primary }} />

      <View style={styles.itemContent}>
        <View style={styles.itemTop}>
          <View style={[styles.typePill, { backgroundColor: `${iconInfo.color}14` }]}>
            <MaterialCommunityIcons name={iconInfo.icon} size={12} color={iconInfo.color} />
            <Text style={[styles.typePillText, { color: iconInfo.color }]}>{iconInfo.label}</Text>
          </View>
          <Text style={[styles.timeText, { color: theme.colors.onSurfaceVariant }]}>
            {formatRelative(notification.createdAt)}
          </Text>
        </View>

        <Text style={[styles.itemTitle, { color: theme.colors.onSurface, fontWeight: unread ? '800' : '700' }]} numberOfLines={2}>
          {notification.title}
        </Text>

        {!!notification.body && (
          <Text style={[styles.itemBody, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
            {notification.body}
          </Text>
        )}
      </View>

      {unread ? (
        <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
      ) : (
        <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.success} />
      )}
    </TouchableOpacity>
  );
};

const NotificationsScreen = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch } = useGetNotificationsQuery({ limit: 50 });
  const [markReadMutation] = useMarkNotificationReadMutation();
  const [markAllReadMutation] = useMarkAllNotificationsReadMutation();

  const notifications = data?.data?.data || [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const readCount = notifications.length - unreadCount;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notifications.filter((n) => {
      if (filter === 'unread' && n.isRead) return false;
      if (filter === 'read' && !n.isRead) return false;
      if (!query) return true;
      const haystack = [n.title, n.body, n.type, n.actor?.firstName, n.actor?.lastName, n.actor?.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [notifications, filter, search]);

  const handleMarkRead = (id) => {
    dispatch(markAsRead(id));
    markReadMutation(id);
  };

  const handleMarkAllRead = () => {
    dispatch(markAllAsRead());
    markAllReadMutation();
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Surface style={[styles.hero, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={0}>
        <Text style={[styles.eyebrow, { color: theme.colors.onSurfaceVariant }]}>Activity inbox</Text>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Notifications</Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Project updates, comments, assignments, and sprint activity.
        </Text>

        <View style={styles.metrics}>
          <MetricTile icon="bell-ring-outline" value={notifications.length} label="Total" tone={colors.info} theme={theme} />
          <MetricTile icon="bell-badge-outline" value={unreadCount} label="Unread" tone={colors.danger} theme={theme} />
          <MetricTile icon="bell-check-outline" value={readCount} label="Read" tone={colors.success} theme={theme} />
        </View>

        <View style={styles.actionRow}>
          <Button
            mode="contained"
            compact
            icon="check-all"
            onPress={handleMarkAllRead}
            disabled={unreadCount === 0}
            style={{ borderRadius: 8 }}
          >
            Mark all read
          </Button>
          <Button mode="outlined" compact icon="refresh" onPress={refetch} style={{ borderRadius: 8 }}>
            Refresh
          </Button>
        </View>
      </Surface>

      <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
        <MaterialCommunityIcons name="magnify" size={16} color={theme.colors.onSurfaceVariant} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search notifications..."
          placeholderTextColor={theme.colors.onSurfaceVariant}
          style={[styles.searchInput, { color: theme.colors.onSurface }]}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialCommunityIcons name="close-circle" size={16} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filters}>
        {FILTERS.map((item) => {
          const active = filter === item.key;
          const count = item.key === 'all' ? notifications.length : item.key === 'unread' ? unreadCount : readCount;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? theme.colors.primaryContainer : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.outlineVariant,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: active ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>
                {item.label}
              </Text>
              <Text style={[styles.filterCount, { color: active ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>
                {count}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem notification={item} onMarkRead={handleMarkRead} theme={theme} />
        )}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              icon={search ? 'magnify-close' : 'bell-check-outline'}
              title={search ? 'No matching notifications' : 'All caught up!'}
              description={search ? 'Try another search term or clear filters.' : 'New project activity will appear here.'}
            />
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const MetricTile = ({ icon, value, label, tone, theme }) => (
  <View style={[styles.metricTile, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
    <View style={[styles.metricIcon, { backgroundColor: `${tone}14` }]}>
      <MaterialCommunityIcons name={icon} size={15} color={tone} />
    </View>
    <View>
      <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 28 },
  listHeader: { gap: 12, marginBottom: 12 },

  hero: { borderWidth: 1, borderRadius: 12, padding: 16 },
  eyebrow: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0 },
  title: { fontSize: 26, fontWeight: '900', marginTop: 4 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  metrics: { flexDirection: 'row', gap: 8, marginTop: 14 },
  metricTile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  metricIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 17, fontWeight: '900' },
  metricLabel: { fontSize: 11, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 14, height: '100%' },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterText: { fontSize: 12, fontWeight: '800' },
  filterCount: { fontSize: 12, fontWeight: '900' },

  item: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 12,
  },
  itemContent: { flex: 1, minWidth: 0 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  typePillText: { fontSize: 10, fontWeight: '800' },
  timeText: { fontSize: 11 },
  itemTitle: { fontSize: 14, lineHeight: 20 },
  itemBody: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, marginTop: 6 },
  emptyWrap: { paddingTop: 18 },
});

export default NotificationsScreen;
