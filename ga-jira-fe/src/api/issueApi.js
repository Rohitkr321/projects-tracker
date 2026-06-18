import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './apiClient';

export const issueApi = createApi({
  reducerPath: 'issueApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Issue', 'Comment', 'TimeLog', 'Attachment'],
  endpoints: (builder) => ({
    getIssues: builder.query({
      query: (params = {}) => ({
        url: '/issues',
        params,
      }),
      providesTags: ['Issue'],
    }),
    getProjectIssues: builder.query({
      query: ({ projectId, ...params }) => ({
        url: '/issues',
        params: { projectId, ...params },
      }),
      providesTags: (result, error, { projectId }) => [{ type: 'Issue', id: `project-${projectId}` }],
    }),
    getSprintIssues: builder.query({
      query: ({ sprintId, ...params }) => ({
        url: '/issues',
        params: { sprintId, ...params },
      }),
      providesTags: (result, error, { sprintId }) => [{ type: 'Issue', id: `sprint-${sprintId}` }],
    }),
    getIssue: builder.query({
      query: (id) => `/issues/${id}`,
      providesTags: (result, error, id) => [{ type: 'Issue', id }],
    }),
    createIssue: builder.mutation({
      query: ({ formData, projectId, sprintId }) => ({
        url: '/issues',
        method: 'POST',
        body: formData,           // send FormData directly — not JSON-wrapped
      }),
      invalidatesTags: (result, error, { projectId, sprintId }) => [
        'Issue',
        { type: 'Issue', id: `project-${projectId}` },
        sprintId ? { type: 'Issue', id: `sprint-${sprintId}` } : null,
      ].filter(Boolean),
    }),
    updateIssue: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/issues/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Issue', id }, 'Issue'],
    }),
    updateIssueStatus: builder.mutation({
      query: ({ id, statusId }) => ({
        url: `/issues/${id}`,
        method: 'PATCH',
        body: { workflowStatusId: statusId },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Issue', id }, 'Issue'],
    }),
    deleteIssue: builder.mutation({
      query: (id) => ({
        url: `/issues/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Issue'],
    }),
    getComments: builder.query({
      query: (issueId) => `/issues/${issueId}/comments`,
      providesTags: (result, error, issueId) => [{ type: 'Comment', id: issueId }],
    }),
    addComment: builder.mutation({
      query: ({ issueId, ...data }) => ({
        url: `/issues/${issueId}/comments`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { issueId }) => [
        { type: 'Comment', id: issueId },
        { type: 'Issue', id: issueId },
      ],
    }),
    updateComment: builder.mutation({
      query: ({ issueId, commentId, ...data }) => ({
        url: `/issues/${issueId}/comments/${commentId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { issueId }) => [
        { type: 'Comment', id: issueId },
        { type: 'Issue', id: issueId },
      ],
    }),
    deleteComment: builder.mutation({
      query: ({ issueId, commentId }) => ({
        url: `/issues/${issueId}/comments/${commentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { issueId }) => [
        { type: 'Comment', id: issueId },
        { type: 'Issue', id: issueId },
      ],
    }),
    getTimeLogs: builder.query({
      query: (issueId) => `/issues/${issueId}/time-logs`,
      providesTags: (result, error, issueId) => [{ type: 'TimeLog', id: issueId }],
    }),
    addTimeLog: builder.mutation({
      query: ({ issueId, ...data }) => ({
        url: `/issues/${issueId}/time-logs`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { issueId }) => [{ type: 'TimeLog', id: issueId }],
    }),
    getAttachments: builder.query({
      query: (issueId) => `/issues/${issueId}/attachments`,
      providesTags: (result, error, issueId) => [{ type: 'Attachment', id: issueId }],
    }),
    uploadAttachment: builder.mutation({
      query: ({ issueId, formData }) => ({
        url: `/issues/${issueId}/attachments`,
        method: 'POST',
        body: formData,
        formData: true,
      }),
      invalidatesTags: (result, error, { issueId }) => [{ type: 'Attachment', id: issueId }],
    }),
    deleteAttachment: builder.mutation({
      query: ({ issueId, attachmentId }) => ({
        url: `/issues/${issueId}/attachments/${attachmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { issueId }) => [{ type: 'Attachment', id: issueId }],
    }),
    linkIssues: builder.mutation({
      query: ({ issueId, ...data }) => ({
        url: `/issues/${issueId}/links`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { issueId }) => [{ type: 'Issue', id: issueId }],
    }),
    getIssueActivity: builder.query({
      query: (issueId) => `/issues/${issueId}/activity`,
    }),
    bulkUpdateIssues: builder.mutation({
      query: (data) => ({
        url: '/issues/bulk',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Issue'],
    }),
    moveIssuesToSprint: builder.mutation({
      query: (data) => ({
        url: '/issues/move-to-sprint',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Issue'],
    }),
    watchIssue: builder.mutation({
      query: (issueId) => ({
        url: `/issues/${issueId}/watch`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, issueId) => [{ type: 'Issue', id: issueId }],
    }),
    unwatchIssue: builder.mutation({
      query: (issueId) => ({
        url: `/issues/${issueId}/watch`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, issueId) => [{ type: 'Issue', id: issueId }],
    }),
  }),
});

export const {
  useGetIssuesQuery,
  useGetProjectIssuesQuery,
  useGetSprintIssuesQuery,
  useGetIssueQuery,
  useCreateIssueMutation,
  useUpdateIssueMutation,
  useUpdateIssueStatusMutation,
  useDeleteIssueMutation,
  useGetCommentsQuery,
  useAddCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useGetTimeLogsQuery,
  useAddTimeLogMutation,
  useGetAttachmentsQuery,
  useUploadAttachmentMutation,
  useDeleteAttachmentMutation,
  useLinkIssuesMutation,
  useGetIssueActivityQuery,
  useBulkUpdateIssuesMutation,
  useMoveIssuesToSprintMutation,
  useWatchIssueMutation,
  useUnwatchIssueMutation,
} = issueApi;
