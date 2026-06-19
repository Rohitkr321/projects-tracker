import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authReducer from './authSlice';
import projectReducer from './projectSlice';
import notificationReducer from './notificationSlice';
import { authApi } from '../api/authApi';
import { projectApi } from '../api/projectApi';
import { issueApi } from '../api/issueApi';
import { sprintApi } from '../api/sprintApi';
import { notificationApi } from '../api/notificationApi';
import { reportApi } from '../api/reportApi';
import { inviteApi } from '../api/inviteApi';
import { userApi } from '../api/userApi';
import { searchApi } from '../api/searchApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    project: projectReducer,
    notification: notificationReducer,
    [authApi.reducerPath]: authApi.reducer,
    [projectApi.reducerPath]: projectApi.reducer,
    [issueApi.reducerPath]: issueApi.reducer,
    [sprintApi.reducerPath]: sprintApi.reducer,
    [notificationApi.reducerPath]: notificationApi.reducer,
    [reportApi.reducerPath]: reportApi.reducer,
    [inviteApi.reducerPath]: inviteApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [searchApi.reducerPath]: searchApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    })
      .concat(authApi.middleware)
      .concat(projectApi.middleware)
      .concat(issueApi.middleware)
      .concat(sprintApi.middleware)
      .concat(notificationApi.middleware)
      .concat(reportApi.middleware)
      .concat(inviteApi.middleware)
      .concat(userApi.middleware)
      .concat(searchApi.middleware),
});

setupListeners(store.dispatch);

export default store;
