import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSocket } from '../../hooks/useSocket';
import { addNotification, setUnreadCount } from '../../store/notificationSlice';
import { SOCKET_EVENTS } from '../../constants';
import { useGetUnreadCountQuery } from '../../api/notificationApi';
import { selectIsAuthenticated } from '../../store/authSlice';

const NotificationListener = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { on } = useSocket();

  const { data: countData } = useGetUnreadCountQuery(undefined, {
    skip: !isAuthenticated,
    pollingInterval: 60000,
  });

  useEffect(() => {
    const count = countData?.data?.count ?? countData?.data?.unreadCount ?? countData?.count ?? null;
    if (count !== null) {
      dispatch(setUnreadCount(count));
    }
  }, [countData, dispatch]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const cleanup = on(SOCKET_EVENTS.NOTIFICATION, (notification) => {
      dispatch(addNotification(notification));
    });
    return cleanup;
  }, [on, dispatch, isAuthenticated]);

  return null;
};

export default NotificationListener;
