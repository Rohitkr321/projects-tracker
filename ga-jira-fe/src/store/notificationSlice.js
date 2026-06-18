import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  notifications: [],
  unreadCount: 0,
  hasMore: true,
  page: 1,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    setNotifications: (state, action) => {
      state.notifications = action.payload.notifications;
      state.unreadCount = action.payload.unreadCount || 0;
      state.hasMore = action.payload.hasMore || false;
      state.page = 1;
    },
    appendNotifications: (state, action) => {
      state.notifications.push(...action.payload.notifications);
      state.hasMore = action.payload.hasMore || false;
      state.page += 1;
    },
    markAsRead: (state, action) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach(n => { n.read = true; });
      state.unreadCount = 0;
    },
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
      state.hasMore = true;
      state.page = 1;
    },
  },
});

export const {
  addNotification,
  setNotifications,
  appendNotifications,
  markAsRead,
  markAllAsRead,
  setUnreadCount,
  clearNotifications,
} = notificationSlice.actions;

export const selectNotifications = (state) => state.notification.notifications;
export const selectUnreadCount = (state) => state.notification.unreadCount;
export const selectHasMore = (state) => state.notification.hasMore;

export default notificationSlice.reducer;
