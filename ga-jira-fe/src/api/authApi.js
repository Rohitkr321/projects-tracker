import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './apiClient';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'TwoFactor'],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    forgotPassword: builder.mutation({
      query: (data) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: data,
      }),
    }),
    resetPassword: builder.mutation({
      query: (data) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: data,
      }),
    }),
    refreshToken: builder.mutation({
      query: (data) => ({
        url: '/auth/refresh-token',
        method: 'POST',
        body: data,
      }),
    }),
    getMe: builder.query({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
    updateProfile: builder.mutation({
      query: (data) => ({ url: '/auth/profile', method: 'PUT', body: data }),
      invalidatesTags: ['User'],
    }),
    changePassword: builder.mutation({
      query: (data) => ({
        url: '/auth/change-password',
        method: 'POST',
        body: data,
      }),
    }),
    logout: builder.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
    validateInvite: builder.query({
      query: (token) => `/auth/validate-invite/${token}`,
    }),
    get2faStatus: builder.query({
      query: () => '/auth/2fa/status',
      providesTags: ['TwoFactor'],
    }),
    setup2fa: builder.mutation({
      query: () => ({ url: '/auth/2fa/setup', method: 'POST' }),
    }),
    enable2fa: builder.mutation({
      query: (data) => ({ url: '/auth/2fa/enable', method: 'POST', body: data }),
      invalidatesTags: ['TwoFactor'],
    }),
    disable2fa: builder.mutation({
      query: (data) => ({ url: '/auth/2fa/disable', method: 'POST', body: data }),
      invalidatesTags: ['TwoFactor'],
    }),
    challenge2fa: builder.mutation({
      query: (data) => ({ url: '/auth/2fa/challenge', method: 'POST', body: data }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useRefreshTokenMutation,
  useGetMeQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useLogoutMutation,
  useValidateInviteQuery,
  useGet2faStatusQuery,
  useSetup2faMutation,
  useEnable2faMutation,
  useDisable2faMutation,
  useChallenge2faMutation,
} = authApi;
