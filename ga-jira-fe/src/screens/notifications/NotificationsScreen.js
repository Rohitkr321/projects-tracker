import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, useTheme, Avatar, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useGetNotificationsQuery, useMarkNotificationReadMutation, useMarkAllNotificationsReadMutation } from '../../api/notificationApi';
import { markAsRead, markAllAsRead } from '../../store/notificationSlice';
import { formatRelative } from '../../utils/dateUtils';
import EmptyState from '../../components/common/EmptyState';

const NotificationItem = ({ notification, onMarkRead, theme }) => {
  const initials = notification.actor
    ? `${notification.actor.firstName?.[0]}${notification.actor.lastName?.[0]}`
    : 'GA';

  return (
    <TouchableOpacity
      onPress={() => !notification.isRead && onMarkRead(notification.id)}
      style={[styles.item, { backgroundColor: notification.isRead ? theme.colors.surface : theme.colors.primary + '08' }]}
    >
      <Avatar.Text size={40} label={initials} style={{ backgroundColor: theme.colors.primary }} />
      <View style={styles.itemContent}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: notification.isRead ? '400' : '600' }}>
          {notification.title}
        </Text>
        {notification.body && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
            {notification.body}
          </Text>
        )}
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
          {formatRelative(notification.createdAt)}
        </Text>
      </View>
      {!notification.isRead && (
        <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
      )}
    </TouchableOpacity>
  );
};

const NotificationsScreen = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { data, isLoading, refetch } = useGetNotificationsQuery({ limit: 50 });
  const [markReadMutation] = useMarkNotificationReadMutation();
  const [markAllReadMutation] = useMarkAllNotificationsReadMutation();

  const notifications = data?.data?.data || [];
  const hasUnread = notifications.some((n) => !n.isRead);

  const handleMarkRead = (id) => {
    dispatch(markAsRead(id));
    markReadMutation(id);
  };

  const handleMarkAllRead = () => {
    dispatch(markAllAsRead());
    markAllReadMutation();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {hasUnread && (
        <View style={[styles.topBar, { backgroundColor: theme.colors.surface }]}>
          <Button compact onPress={handleMarkAllRead}>Mark all as read</Button>
        </View>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onMarkRead={handleMarkRead}
            theme={theme}
          />
        )}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={
          <EmptyState icon="bell-outline" title="All caught up!" description="No new notifications" />
        }
        ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.outline }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', padding: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)' },
  item: { flexDirection: 'row', padding: 16, gap: 12, alignItems: 'flex-start' },
  itemContent: { flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});

export default NotificationsScreen;
