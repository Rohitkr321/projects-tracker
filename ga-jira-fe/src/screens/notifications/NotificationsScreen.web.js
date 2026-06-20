import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions } from 'react-native';
import { Text, useTheme, Button, Divider, Surface, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '../../api/notificationApi';
import { markAsRead, markAllAsRead } from '../../store/notificationSlice';
import { formatRelative } from '../../utils/dateUtils';
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

const getIconInfo = (type) =>
  NOTIF_ICON[type] || { icon: 'bell-outline', color: colors.onSurfaceVariant, label: titleCase(type || 'Notification') };

const titleCase = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());

const avatarHue = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) * 37 + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360},50%,44%)`;
};

const actorInitials = (actor) => {
  if (!actor) return 'GA';
  const initials = `${actor.firstName?.[0] || ''}${actor.lastName?.[0] || ''}`.toUpperCase();
  return initials || actor.email?.substring(0, 2).toUpperCase() || 'GA';
};

export default function NotificationsScreen() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { width } = useWindowDimensions();
  const isNarrow = width < 980;
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching, refetch } = useGetNotificationsQuery({ limit: 100 });
  const [markReadMutation] = useMarkNotificationReadMutation();
  const [markAllReadMutation] = useMarkAllNotificationsReadMutation();

  const all = data?.data?.data || [];
  const unreadCount = all.filter((n) => !n.isRead).length;
  const readCount = all.length - unreadCount;

  const typeCounts = useMemo(() => all.reduce((acc, n) => {
    const type = n.type || 'notification';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {}), [all]);

  const displayed = useMemo(() => {
    const query = search.trim().toLowerCase();
    return all.filter((n) => {
      if (filter === 'unread' && n.isRead) return false;
      if (filter === 'read' && !n.isRead) return false;
      if (!query) return true;
      const haystack = [
        n.title,
        n.body,
        n.type,
        n.actor?.firstName,
        n.actor?.lastName,
        n.actor?.email,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [all, filter, search]);

  const markRead = (id) => {
    dispatch(markAsRead(id));
    markReadMutation(id);
  };

  const markAllRead = () => {
    dispatch(markAllAsRead());
    markAllReadMutation();
  };

  const activeLabel = FILTERS.find((item) => item.key === filter)?.label || 'All';

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]} elevation={0}>
        <View style={[styles.headerTop, isNarrow && styles.headerTopStack]}>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: theme.colors.onSurfaceVariant }]}>Activity inbox</Text>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>Notifications</Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Review project updates, comments, assignments, and sprint activity in one focused queue.
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Button
              mode="text"
              compact
              icon="check-all"
              onPress={markAllRead}
              disabled={unreadCount === 0}
              textColor={theme.colors.primary}
            >
              Mark all read
            </Button>
            <Button
              mode="outlined"
              compact
              icon="refresh"
              onPress={refetch}
              loading={isFetching}
              style={[styles.refreshButton, { borderColor: theme.colors.outlineVariant }]}
              labelStyle={{ color: theme.colors.primary, fontWeight: '800' }}
            >
              Refresh
            </Button>
          </View>
        </View>

        <View style={[styles.metricGrid, isNarrow && styles.metricGridStack]}>
          <MetricTile icon="bell-ring-outline" value={all.length} label="Total" tone={colors.info} theme={theme} />
          <MetricTile icon="bell-badge-outline" value={unreadCount} label="Unread" tone={colors.danger} theme={theme} />
          <MetricTile icon="bell-check-outline" value={readCount} label="Read" tone={colors.success} theme={theme} />
          <MetricTile icon="shape-outline" value={Object.keys(typeCounts).length} label="Types" tone="#7C5EA7" theme={theme} />
        </View>
      </Surface>

      <Surface style={[styles.toolbar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]} elevation={0}>
        <View style={[styles.searchBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
          <MaterialCommunityIcons name="magnify" size={16} color={theme.colors.onSurfaceVariant} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search notifications..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
            style={[styles.searchInput, { color: theme.colors.onSurface, outlineStyle: 'none' }]}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={15} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.segmented, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
          {FILTERS.map((item) => {
            const active = filter === item.key;
            const count = item.key === 'all' ? all.length : item.key === 'unread' ? unreadCount : readCount;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setFilter(item.key)}
                style={[styles.segment, active && { backgroundColor: theme.colors.surface, boxShadow: '0 2px 6px rgba(20,33,61,0.08)' }]}
              >
                <Text style={[styles.segmentText, { color: active ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>
                  {item.label}
                </Text>
                <View style={[styles.segmentCount, { backgroundColor: active ? theme.colors.primaryContainer : theme.colors.surfaceVariant }]}>
                  <Text style={[styles.segmentCountText, { color: active ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Surface>

      <View style={[styles.body, isNarrow && styles.bodyStack]}>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          <View style={styles.listHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{activeLabel} activity</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {displayed.length} item{displayed.length !== 1 ? 's' : ''} shown
              </Text>
            </View>
            {isLoading && <ActivityIndicator size="small" color={theme.colors.primary} />}
          </View>

          {displayed.length === 0 ? (
            <EmptyPanel
              icon={search ? 'magnify-close' : 'bell-check-outline'}
              title={search ? 'No matching notifications' : 'All caught up'}
              text={search ? 'Try a different search term or clear the filters.' : 'New project activity will appear here.'}
              theme={theme}
            />
          ) : (
            displayed.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                theme={theme}
                onMarkRead={markRead}
              />
            ))
          )}
        </ScrollView>

        <Surface
          style={[
            styles.summaryPanel,
            isNarrow && styles.summaryPanelStack,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
          ]}
          elevation={0}
        >
          <View style={styles.summaryHeader}>
            <View style={[styles.summaryIcon, { backgroundColor: `${colors.info}14` }]}>
              <MaterialCommunityIcons name="chart-donut" size={18} color={colors.info} />
            </View>
            <View>
              <Text style={[styles.summaryTitle, { color: theme.colors.onSurface }]}>Summary</Text>
              <Text style={[styles.summarySub, { color: theme.colors.onSurfaceVariant }]}>Inbox health</Text>
            </View>
          </View>

          <View style={styles.summaryRows}>
            <SummaryRow icon="bell-ring-outline" color={colors.info} label="Total" value={all.length} theme={theme} />
            <SummaryRow icon="bell-badge-outline" color={colors.danger} label="Unread" value={unreadCount} theme={theme} />
            <SummaryRow icon="bell-check-outline" color={colors.success} label="Read" value={readCount} theme={theme} />
          </View>

          <Divider style={{ marginVertical: 18 }} />

          <Text style={[styles.groupLabel, { color: theme.colors.onSurfaceVariant }]}>By type</Text>
          <View style={styles.typeList}>
            {Object.entries(typeCounts).length === 0 ? (
              <Text style={[styles.emptyTypeText, { color: theme.colors.onSurfaceVariant }]}>No notification types yet</Text>
            ) : (
              Object.entries(typeCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const iconInfo = getIconInfo(type);
                  return (
                    <View key={type} style={styles.typeRow}>
                      <View style={[styles.typeIcon, { backgroundColor: `${iconInfo.color}16` }]}>
                        <MaterialCommunityIcons name={iconInfo.icon} size={14} color={iconInfo.color} />
                      </View>
                      <Text style={[styles.typeLabel, { color: theme.colors.onSurface }]} numberOfLines={1}>
                        {iconInfo.label}
                      </Text>
                      <Text style={[styles.typeCount, { color: theme.colors.onSurfaceVariant }]}>{count}</Text>
                    </View>
                  );
                })
            )}
          </View>
        </Surface>
      </View>
    </View>
  );
}

const MetricTile = ({ icon, value, label, tone, theme }) => (
  <View style={[styles.metricTile, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
    <View style={[styles.metricIcon, { backgroundColor: `${tone}14` }]}>
      <MaterialCommunityIcons name={icon} size={16} color={tone} />
    </View>
    <View>
      <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
    </View>
  </View>
);

const NotificationCard = ({ notification, theme, onMarkRead }) => {
  const iconInfo = getIconInfo(notification.type);
  const actor = notification.actor;
  const initials = actorInitials(actor);
  const actorColor = avatarHue(actor?.email || actor?.firstName || initials);
  const unread = !notification.isRead;

  return (
    <TouchableOpacity
      onPress={() => unread && onMarkRead(notification.id)}
      activeOpacity={0.86}
      style={[
        styles.notificationCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: unread ? `${theme.colors.primary}45` : theme.colors.outlineVariant,
          borderLeftColor: unread ? theme.colors.primary : theme.colors.outlineVariant,
        },
      ]}
    >
      <View style={[styles.actorAvatar, { backgroundColor: actorColor }]}>
        <Text style={styles.actorText}>{initials}</Text>
      </View>

      <View style={styles.notificationMain}>
        <View style={styles.notificationTopLine}>
          <View style={[styles.typePill, { backgroundColor: `${iconInfo.color}14` }]}>
            <MaterialCommunityIcons name={iconInfo.icon} size={12} color={iconInfo.color} />
            <Text style={[styles.typePillText, { color: iconInfo.color }]}>{iconInfo.label}</Text>
          </View>
          <Text style={[styles.timeText, { color: theme.colors.onSurfaceVariant }]}>
            {formatRelative(notification.createdAt)}
          </Text>
        </View>

        <Text style={[styles.notificationTitle, { color: theme.colors.onSurface, fontWeight: unread ? '800' : '700' }]} numberOfLines={2}>
          {notification.title}
        </Text>

        {!!notification.body && (
          <Text style={[styles.notificationBody, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
            {notification.body}
          </Text>
        )}
      </View>

      {unread ? (
        <TouchableOpacity
          onPress={() => onMarkRead(notification.id)}
          style={[styles.markReadButton, { backgroundColor: theme.colors.primaryContainer }]}
        >
          <MaterialCommunityIcons name="check" size={15} color={theme.colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={[styles.readBadge, { backgroundColor: colors.successLight }]}>
          <MaterialCommunityIcons name="check-circle-outline" size={15} color={colors.success} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const SummaryRow = ({ icon, color, label, value, theme }) => (
  <View style={styles.summaryRow}>
    <View style={[styles.rowIcon, { backgroundColor: `${color}14` }]}>
      <MaterialCommunityIcons name={icon} size={15} color={color} />
    </View>
    <Text style={[styles.summaryLabel, { color: theme.colors.onSurface }]}>{label}</Text>
    <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>{value}</Text>
  </View>
);

const EmptyPanel = ({ icon, title, text, theme }) => (
  <View style={[styles.emptyPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
    <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
      <MaterialCommunityIcons name={icon} size={28} color={theme.colors.onSurfaceVariant} />
    </View>
    <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>{title}</Text>
    <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'column' },

  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
  },
  headerTopStack: { flexDirection: 'column' },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
    maxWidth: 620,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  refreshButton: { borderRadius: 8 },

  metricGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metricGridStack: { width: '100%' },
  metricTile: {
    flex: 1,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metricIcon: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  metricValue: { fontSize: 20, fontWeight: '900' },
  metricLabel: { fontSize: 12, fontWeight: '700', marginTop: 1 },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchBox: {
    minWidth: 260,
    maxWidth: 460,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  segmented: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 32,
  },
  segmentText: { fontSize: 12, fontWeight: '800' },
  segmentCount: { minWidth: 22, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  segmentCountText: { fontSize: 11, fontWeight: '900' },

  body: { flex: 1, flexDirection: 'row', minHeight: 0 },
  bodyStack: { flexDirection: 'column' },
  list: { flex: 1 },
  listContent: { padding: 28, gap: 10, paddingBottom: 44 },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sectionTitle: { fontSize: 17, fontWeight: '900' },
  sectionSubtitle: { fontSize: 12, marginTop: 2 },

  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 16,
    boxShadow: '0 8px 18px rgba(20,33,61,0.05)',
  },
  actorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actorText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  notificationMain: { flex: 1, minWidth: 0 },
  notificationTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 7,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typePillText: { fontSize: 11, fontWeight: '800' },
  timeText: { fontSize: 12, flexShrink: 0 },
  notificationTitle: { fontSize: 15, lineHeight: 21 },
  notificationBody: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  markReadButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  readBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  summaryPanel: {
    width: 286,
    borderLeftWidth: 1,
    padding: 22,
  },
  summaryPanelStack: {
    width: 'auto',
    borderLeftWidth: 0,
    borderTopWidth: 1,
    marginHorizontal: 28,
    marginBottom: 28,
    borderWidth: 1,
    borderRadius: 8,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  summaryIcon: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  summaryTitle: { fontSize: 16, fontWeight: '900' },
  summarySub: { fontSize: 12, marginTop: 1 },
  summaryRows: { gap: 10 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowIcon: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  summaryLabel: { flex: 1, fontSize: 13, fontWeight: '700' },
  summaryValue: { fontSize: 14, fontWeight: '900' },
  groupLabel: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0, marginBottom: 10 },
  typeList: { gap: 10 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  typeIcon: { width: 28, height: 28, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  typeLabel: { flex: 1, fontSize: 12, fontWeight: '700' },
  typeCount: { fontSize: 12, fontWeight: '800' },
  emptyTypeText: { fontSize: 12 },

  emptyPanel: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 44,
    minHeight: 260,
  },
  emptyIcon: { width: 58, height: 58, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '900', marginTop: 14 },
  emptyText: { fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' },
});
