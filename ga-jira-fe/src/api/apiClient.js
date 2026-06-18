import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../constants';
import { storage } from '../utils/storage';
import { setCredentials, logout } from '../store/authSlice';

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: async (headers, { getState }) => {
    const token = getState().auth.accessToken || await storage.getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Mutex: only one refresh call in-flight at a time.
// All concurrent 401s share the same promise instead of each racing to refresh.
let refreshingPromise = null;

const doRefresh = async (api, extraOptions) => {
  if (refreshingPromise) return refreshingPromise;

  refreshingPromise = (async () => {
    try {
      const refreshToken = api.getState().auth.refreshToken || await storage.getRefreshToken();
      if (!refreshToken) {
        api.dispatch(logout());
        await storage.clearAll();
        return false;
      }

      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh-token',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { refreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult.data?.data) {
        const { accessToken, refreshToken: newRefreshToken } = refreshResult.data.data;
        const user = api.getState().auth.user;
        api.dispatch(setCredentials({ user, accessToken, refreshToken: newRefreshToken }));
        await storage.setTokens({ accessToken, refreshToken: newRefreshToken });
        return true;
      } else {
        api.dispatch(logout());
        await storage.clearAll();
        return false;
      }
    } finally {
      refreshingPromise = null;
    }
  })();

  return refreshingPromise;
};

export const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const refreshed = await doRefresh(api, extraOptions);
    if (refreshed) {
      result = await baseQuery(args, api, extraOptions);
    }
  }

  return result;
};
