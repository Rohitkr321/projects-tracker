import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './apiClient';

export const sprintApi = createApi({
  reducerPath: 'sprintApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Sprint'],
  endpoints: (builder) => ({
    getSprints: builder.query({
      query: ({ projectId, ...params }) => ({
        url: `/projects/${projectId}/sprints`,
        params,
      }),
      providesTags: (result, error, { projectId }) => [{ type: 'Sprint', id: projectId }],
    }),
    getActiveSprint: builder.query({
      query: (projectId) => `/projects/${projectId}/sprints/active`,
      providesTags: (result, error, projectId) => [{ type: 'Sprint', id: `active-${projectId}` }],
    }),
    getSprint: builder.query({
      query: (id) => `/sprints/${id}`,
      providesTags: (result, error, id) => [{ type: 'Sprint', id }],
    }),
    createSprint: builder.mutation({
      query: ({ projectId, ...data }) => ({
        url: `/projects/${projectId}/sprints`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Sprint', id: projectId }],
    }),
    updateSprint: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/sprints/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Sprint', id }, 'Sprint'],
    }),
    startSprint: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/sprints/${id}/start`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Sprint', id }, 'Sprint'],
    }),
    completeSprint: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/sprints/${id}/complete`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Sprint', id }, 'Sprint'],
    }),
    deleteSprint: builder.mutation({
      query: (id) => ({
        url: `/sprints/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Sprint'],
    }),
    getSprintStats: builder.query({
      query: (id) => `/sprints/${id}/stats`,
    }),
  }),
});

export const {
  useGetSprintsQuery,
  useGetActiveSprintQuery,
  useGetSprintQuery,
  useCreateSprintMutation,
  useUpdateSprintMutation,
  useStartSprintMutation,
  useCompleteSprintMutation,
  useDeleteSprintMutation,
  useGetSprintStatsQuery,
} = sprintApi;
