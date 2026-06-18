import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
  selectUser,
  selectIsAuthenticated,
  selectAccessToken,
  setCredentials,
  logout as logoutAction,
  setDarkMode,
} from '../store/authSlice';
import { storage } from '../utils/storage';
import { clearProjectState } from '../store/projectSlice';
import { clearNotifications } from '../store/notificationSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const accessToken = useSelector(selectAccessToken);

  const login = useCallback(async ({ user, accessToken, refreshToken }) => {
    await storage.setTokens({ accessToken, refreshToken });
    await storage.setUser(user);
    dispatch(setCredentials({ user, accessToken, refreshToken }));
  }, [dispatch]);

  const logout = useCallback(async () => {
    await storage.clearAll();
    dispatch(logoutAction());
    dispatch(clearProjectState());
    dispatch(clearNotifications());
  }, [dispatch]);

  const updateUser = useCallback(async (updatedUser) => {
    await storage.setUser(updatedUser);
    dispatch(setCredentials({ user: updatedUser, accessToken }));
  }, [dispatch, accessToken]);

  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const permissions = {
      project_manager: ['create_project', 'edit_project', 'manage_members', 'create_sprint', 'manage_sprint'],
      developer: ['create_issue', 'edit_issue', 'comment', 'log_time'],
      viewer: ['view'],
    };
    const userPermissions = permissions[user.role] || [];
    return userPermissions.includes(permission);
  }, [user]);

  const hasProjectRole = useCallback((project, role) => {
    if (!user || !project) return false;
    if (user.role === 'admin') return true;
    const member = project.members?.find(m => m.user?.id === user.id || m.user === user.id);
    if (!member) return false;
    const roleHierarchy = { admin: 4, project_manager: 3, developer: 2, viewer: 1 };
    return (roleHierarchy[member.role] || 0) >= (roleHierarchy[role] || 0);
  }, [user]);

  return {
    user,
    isAuthenticated,
    accessToken,
    login,
    logout,
    updateUser,
    hasPermission,
    hasProjectRole,
  };
};
