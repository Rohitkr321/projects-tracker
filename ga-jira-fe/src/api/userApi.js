import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './apiClient';

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User'],
  endpoints: (builder) => ({
    getOrgUsers: builder.query({
      query: (params = {}) => ({ url: '/users', params }),
      providesTags: ['User'],
    }),
    updateUser: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/users/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const { useGetOrgUsersQuery, useUpdateUserMutation } = userApi;
