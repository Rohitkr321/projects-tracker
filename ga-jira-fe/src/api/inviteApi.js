import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './apiClient';

export const inviteApi = createApi({
  reducerPath: 'inviteApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Invite'],
  endpoints: (builder) => ({
    listInvites: builder.query({
      query: () => '/invites',
      providesTags: ['Invite'],
    }),
    createInvite: builder.mutation({
      query: (data) => ({ url: '/invites', method: 'POST', body: data }),
      invalidatesTags: ['Invite'],
    }),
    revokeInvite: builder.mutation({
      query: (id) => ({ url: `/invites/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Invite'],
    }),
  }),
});

export const {
  useListInvitesQuery,
  useCreateInviteMutation,
  useRevokeInviteMutation,
} = inviteApi;
