import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './apiClient';

export const searchApi = createApi({
  reducerPath: 'searchApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    globalSearch: builder.query({
      query: ({ q, projectId } = {}) => ({
        url: '/search',
        params: { q, ...(projectId ? { projectId } : {}) },
      }),
    }),
  }),
});

export const { useGlobalSearchQuery } = searchApi;
