import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSocket } from './useSocket';
import {
  addNotification,
  selectUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../store/notificationSlice';
import { SOCKET_EVENTS } from '../constants';
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '../api/notificationApi';

export const useNotifications = () => {
  const dispatch = useDispatch();
  const { on } = useSocket();
  const unreadCount = useSelector(selectUnreadCount);
  const { data: notificationsData, refetch } = useGetNotificationsQuery({ page: 1, limit: 20 });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  useEffect(() => {
    const cleanup = on(SOCKET_EVENTS.NOTIFICATION, (notification) => {
      dispatch(addNotification(notification));
    });
    return cleanup;
  }, [on, dispatch]);

  const handleMarkRead = async (id) => {
    dispatch(markAsRead(id));
    try {
      await markRead(id).unwrap();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    dispatch(markAllAsRead());
    try {
      await markAllRead().unwrap();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  return {
    unreadCount,
    notifications: notificationsData?.notifications || [],
    hasMore: notificationsData?.hasMore || false,
    refetch,
    markRead: handleMarkRead,
    markAllRead: handleMarkAllRead,
  };
};
