import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme, Button, Divider, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '../../api/notificationApi';
import { markAsRead, markAllAsRead } from '../../store/notificationSlice';
import { formatRelative } from '../../utils/dateUtils';

const FILTER_ALL    = 'all';
const FILTER_UNREAD = 'unread';

const NOTIF_ICON = {
  issue_assigned:   { icon: 'ticket-account',         color: '#3B82F6' },
  issue_commented:  { icon: 'comment-text-outline',   color: '#8B5CF6' },
  issue_updated:    { icon: 'pencil-circle-outline',  color: '#0891B2' },
  issue_resolved:   { icon: 'check-circle-outline',   color: '#10B981' },
  sprint_started:   { icon: 'lightning-bolt',         color: '#F59E0B' },
  sprint_completed: { icon: 'flag-checkered',         color: '#6B7280' },
  mentioned:        { icon: 'at',                     color: '#EC4899' },
};

const getIconInfo = (type) => NOTIF_ICON[type] || { icon: 'bell-outline', color: '#6B7280' };

const AvatarHue = (str) => {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = str.charCodeAt(i) * 37 + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360},50%,44%)`;
};

export default function NotificationsScreen() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [filter, setFilter] = useState(FILTER_ALL);

  const { data, isLoading, refetch } = useGetNotificationsQuery({ limit: 100 });
  const [markReadMutation]    = useMarkNotificationReadMutation();
  const [markAllReadMutation] = useMarkAllNotificationsReadMutation();

  const markRead = (id) => {
    dispatch(markAsRead(id));
    markReadMutation(id);
  };
  const markAllRead = () => {
    dispatch(markAllAsRead());
    markAllReadMutation();
  };

  const all = data?.data?.data || [];
  const displayed = filter === FILTER_UNREAD ? all.filter(n => !n.isRead) : all;
  const unreadCount = all.filter(n => !n.isRead).length;

  const surf = theme.colors.surface;
  const bg   = theme.colors.background;

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: surf, borderBottomColor: theme.colors.outlineVariant }]}>
        <View>
          <Text variant="titleLarge" style={{ color: theme.colors.onBackground, fontWeight: '800' }}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
              {unreadCount} unread
            </Text>
          )}
        </View>

        <View style={styles.headerActions}>
          {/* Filter tabs */}
          <View style={[styles.filterGroup, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
            {[
              { key: FILTER_ALL,    label: 'All' },
              { key: FILTER_UNREAD, label: `Unread${unreadCount ? ` (${unreadCount})` : ''}` },
            ].map(f => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[
                  styles.filterTab,
                  filter === f.key && { backgroundColor: surf, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
                ]}
              >
                <Text
                  variant="labelMedium"
                  style={{ color: filter === f.key ? theme.colors.onSurface : theme.colors.onSurfaceVariant, fontWeight: filter === f.key ? '700' : '400' }}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button
            mode="text"
            compact
            icon="check-all"
            onPress={() => markAllRead()}
            disabled={unreadCount === 0}
            textColor={theme.colors.primary}
          >
            Mark all read
          </Button>

          <Button mode="outlined" compact icon="refresh" onPress={refetch} loading={isLoading}>
            Refresh
          </Button>
        </View>
      </View>

      {/* ── Content ── */}
      <View style={styles.body}>

        {/* Notification list */}
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {displayed.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="bell-check-outline" size={52} color={theme.colors.onSurfaceVariant} />
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginTop: 16 }}>
                {filter === FILTER_UNREAD ? 'No unread notifications' : 'All caught up!'}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                {filter === FILTER_UNREAD ? 'Switch to "All" to see past notifications.' : 'New activity will appear here.'}
              </Text>
            </View>
          ) : (
            displayed.map((n, i) => {
              const iconInfo = getIconInfo(n.type);
              const actorInitials = n.actor
                ? `${n.actor.firstName?.[0] || ''}${n.actor.lastName?.[0] || ''}`
                : 'GA';
              const actorColor = AvatarHue(n.actor?.email || n.actor?.firstName || 'GA');
              return (
                <TouchableOpacity
                  key={n.id}
                  onPress={() => !n.isRead && markRead(n.id)}
                  activeOpacity={0.8}
                  style={[
                    styles.notifRow,
                    {
                      backgroundColor: n.isRead ? surf : theme.colors.primary + '08',
                      borderBottomColor: theme.colors.outlineVariant,
                    },
                  ]}
                >
                  {/* Unread indicator */}
                  <View style={styles.unreadStrip}>
                    {!n.isRead && <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />}
                  </View>

                  {/* Actor avatar */}
                  <View style={[styles.notifAvatar, { backgroundColor: actorColor }]}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{actorInitials.toUpperCase()}</Text>
                  </View>

                  {/* Content */}
                  <View style={styles.notifContent}>
                    <Text
                      variant="bodyMedium"
                      style={{ color: theme.colors.onSurface, fontWeight: n.isRead ? '400' : '600', lineHeight: 22 }}
                    >
                      {n.title}
                    </Text>
                    {!!n.body && (
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 3, lineHeight: 18 }} numberOfLines={2}>
                        {n.body}
                      </Text>
                    )}
                    <View style={styles.notifMeta}>
                      <View style={[styles.notifTypePill, { backgroundColor: iconInfo.color + '18' }]}>
                        <MaterialCommunityIcons name={iconInfo.icon} size={12} color={iconInfo.color} />
                        <Text variant="labelSmall" style={{ color: iconInfo.color, marginLeft: 4, fontSize: 11 }}>
                          {n.type?.replace(/_/g, ' ') || 'notification'}
                        </Text>
                      </View>
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {formatRelative(n.createdAt)}
                      </Text>
                    </View>
                  </View>

                  {/* Mark read button */}
                  {!n.isRead && (
                    <TouchableOpacity
                      onPress={() => markRead(n.id)}
                      style={[styles.markReadBtn, { borderColor: theme.colors.outline }]}
                    >
                      <MaterialCommunityIcons name="check" size={14} color={theme.colors.primary} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* ── Right panel: summary ── */}
        <View style={[styles.summaryPanel, { backgroundColor: surf, borderLeftColor: theme.colors.outlineVariant }]}>
          <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 20 }}>Summary</Text>

          <SummaryRow icon="bell-ring-outline" color="#3B82F6" label="Total" value={all.length} theme={theme} />
          <SummaryRow icon="bell-badge-outline" color="#EF4444" label="Unread" value={unreadCount} theme={theme} />
          <SummaryRow icon="bell-check-outline" color="#10B981" label="Read" value={all.length - unreadCount} theme={theme} />

          <Divider style={{ marginVertical: 20 }} />

          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12, fontWeight: '700', letterSpacing: 0 }}>BY TYPE</Text>

          {Object.entries(NOTIF_ICON).map(([type, { icon, color }]) => {
            const typeCount = all.filter(n => n.type === type).length;
            if (typeCount === 0) return null;
            return (
              <View key={type} style={styles.typeRow}>
                <View style={[styles.typeIcon, { backgroundColor: color + '18' }]}>
                  <MaterialCommunityIcons name={icon} size={14} color={color} />
                </View>
                <Text variant="labelSmall" style={{ flex: 1, color: theme.colors.onSurface, textTransform: 'capitalize' }}>
                  {type.replace(/_/g, ' ')}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{typeCount}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const SummaryRow = ({ icon, color, label, value, theme }) => (
  <View style={styles.summaryRow}>
    <View style={[styles.summaryIcon, { backgroundColor: color + '18' }]}>
      <MaterialCommunityIcons name={icon} size={16} color={color} />
    </View>
    <Text variant="bodySmall" style={{ flex: 1, color: theme.colors.onSurface }}>{label}</Text>
    <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'column' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 28, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  filterGroup: {
    flexDirection: 'row', borderRadius: 10, padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },

  body: { flex: 1, flexDirection: 'row' },

  list: { flex: 1 },
  empty: { alignItems: 'center', paddingVertical: 80 },

  notifRow: {
    flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 16,
    paddingHorizontal: 24, borderBottomWidth: StyleSheet.hairlineWidth, gap: 14,
  },
  unreadStrip: { width: 6, alignSelf: 'stretch', justifyContent: 'center', marginLeft: -6 },
  unreadDot: { width: 6, height: 6, borderRadius: 3 },
  notifAvatar: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  notifContent: { flex: 1 },
  notifMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  notifTypePill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  markReadBtn: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },

  summaryPanel: {
    width: 240, borderLeftWidth: StyleSheet.hairlineWidth, padding: 24,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  summaryIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  typeIcon: { width: 26, height: 26, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
});
