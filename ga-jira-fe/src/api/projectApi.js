import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './apiClient';

export const projectApi = createApi({
  reducerPath: 'projectApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Project', 'ProjectMember', 'Epic', 'Milestone', 'Release', 'Document', 'Label', 'CustomField'],
  endpoints: (builder) => ({
    getProjects: builder.query({
      query: (params = {}) => ({
        url: '/projects',
        params,
      }),
      providesTags: ['Project'],
    }),
    getProject: builder.query({
      query: (id) => `/projects/${id}`,
      providesTags: (result, error, id) => [{ type: 'Project', id }],
    }),
    createProject: builder.mutation({
      query: (data) => ({
        url: '/projects',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Project'],
    }),
    updateProject: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/projects/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Project', id }, 'Project'],
    }),
    deleteProject: builder.mutation({
      query: (id) => ({
        url: `/projects/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Project'],
    }),
    getProjectMembers: builder.query({
      query: (projectId) => `/projects/${projectId}/members`,
      providesTags: (result, error, projectId) => [{ type: 'ProjectMember', id: projectId }],
    }),
    addProjectMember: builder.mutation({
      query: ({ projectId, ...data }) => ({
        url: `/projects/${projectId}/members`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'ProjectMember', id: projectId }],
    }),
    removeProjectMember: builder.mutation({
      query: ({ projectId, userId }) => ({
        url: `/projects/${projectId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'ProjectMember', id: projectId }],
    }),
    updateMemberRole: builder.mutation({
      query: ({ projectId, userId, role }) => ({
        url: `/projects/${projectId}/members/${userId}`,
        method: 'PUT',
        body: { role },
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'ProjectMember', id: projectId }],
    }),
    getEpics: builder.query({
      query: (projectId) => `/projects/${projectId}/epics`,
      providesTags: (result, error, projectId) => [{ type: 'Epic', id: projectId }],
    }),
    createEpic: builder.mutation({
      query: ({ projectId, ...data }) => ({
        url: `/projects/${projectId}/epics`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Epic', id: projectId }],
    }),
    updateEpic: builder.mutation({
      query: ({ projectId, epicId, ...data }) => ({
        url: `/projects/${projectId}/epics/${epicId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Epic', id: projectId }],
    }),
    getMilestones: builder.query({
      query: (projectId) => `/projects/${projectId}/milestones`,
      providesTags: (result, error, projectId) => [{ type: 'Milestone', id: projectId }],
    }),
    createMilestone: builder.mutation({
      query: ({ projectId, ...data }) => ({
        url: `/projects/${projectId}/milestones`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Milestone', id: projectId }],
    }),
    getReleases: builder.query({
      query: (projectId) => `/projects/${projectId}/releases`,
      providesTags: (result, error, projectId) => [{ type: 'Release', id: projectId }],
    }),
    createRelease: builder.mutation({
      query: ({ projectId, ...data }) => ({
        url: `/projects/${projectId}/releases`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Release', id: projectId }],
    }),
    updateRelease: builder.mutation({
      query: ({ projectId, releaseId, ...data }) => ({
        url: `/projects/${projectId}/releases/${releaseId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Release', id: projectId }],
    }),
    markReleased: builder.mutation({
      query: ({ projectId, releaseId }) => ({
        url: `/projects/${projectId}/releases/${releaseId}/release`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Release', id: projectId }],
    }),
    deleteRelease: builder.mutation({
      query: ({ projectId, releaseId }) => ({
        url: `/projects/${projectId}/releases/${releaseId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Release', id: projectId }],
    }),
    // Labels
    getLabels: builder.query({
      query: (projectId) => `/projects/${projectId}/labels`,
      providesTags: (result, error, projectId) => [{ type: 'Label', id: projectId }],
    }),
    createLabel: builder.mutation({
      query: ({ projectId, ...data }) => ({
        url: `/projects/${projectId}/labels`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Label', id: projectId }],
    }),
    updateLabel: builder.mutation({
      query: ({ projectId, labelId, ...data }) => ({
        url: `/projects/${projectId}/labels/${labelId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Label', id: projectId }],
    }),
    deleteLabel: builder.mutation({
      query: ({ projectId, labelId }) => ({
        url: `/projects/${projectId}/labels/${labelId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Label', id: projectId }],
    }),
    // Custom Fields
    getCustomFields: builder.query({
      query: (projectId) => `/projects/${projectId}/custom-fields`,
      providesTags: (result, error, projectId) => [{ type: 'CustomField', id: projectId }],
    }),
    createCustomField: builder.mutation({
      query: ({ projectId, ...data }) => ({
        url: `/projects/${projectId}/custom-fields`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'CustomField', id: projectId }],
    }),
    updateCustomField: builder.mutation({
      query: ({ projectId, fieldId, ...data }) => ({
        url: `/projects/${projectId}/custom-fields/${fieldId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'CustomField', id: projectId }],
    }),
    deleteCustomField: builder.mutation({
      query: ({ projectId, fieldId }) => ({
        url: `/projects/${projectId}/custom-fields/${fieldId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'CustomField', id: projectId }],
    }),
    setCustomFieldValue: builder.mutation({
      query: ({ projectId, fieldId, issueId, value }) => ({
        url: `/projects/${projectId}/custom-fields/${fieldId}/values`,
        method: 'POST',
        body: { issueId, value },
      }),
    }),
    getDocuments: builder.query({
      query: ({ projectId, ...params }) => ({
        url: `/projects/${projectId}/documents`,
        params,
      }),
      providesTags: (result, error, { projectId }) => [{ type: 'Document', id: projectId }],
    }),
    createDocument: builder.mutation({
      query: ({ projectId, ...data }) => ({
        url: `/projects/${projectId}/documents`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Document', id: projectId }],
    }),
    updateDocument: builder.mutation({
      query: ({ projectId, docId, ...data }) => ({
        url: `/projects/${projectId}/documents/${docId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Document', id: projectId }],
    }),
    getProjectStats: builder.query({
      query: (projectId) => `/projects/${projectId}/stats`,
    }),
    getProjectWorkflow: builder.query({
      query: (projectId) => `/projects/${projectId}/workflows`,
    }),
    updateProjectWorkflow: builder.mutation({
      query: ({ projectId, ...data }) => ({
        url: `/projects/${projectId}/workflows`,
        method: 'PUT',
        body: data,
      }),
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useGetProjectMembersQuery,
  useAddProjectMemberMutation,
  useRemoveProjectMemberMutation,
  useUpdateMemberRoleMutation,
  useGetEpicsQuery,
  useCreateEpicMutation,
  useUpdateEpicMutation,
  useGetMilestonesQuery,
  useCreateMilestoneMutation,
  useGetReleasesQuery,
  useCreateReleaseMutation,
  useUpdateReleaseMutation,
  useMarkReleasedMutation,
  useDeleteReleaseMutation,
  useGetLabelsQuery,
  useCreateLabelMutation,
  useUpdateLabelMutation,
  useDeleteLabelMutation,
  useGetCustomFieldsQuery,
  useCreateCustomFieldMutation,
  useUpdateCustomFieldMutation,
  useDeleteCustomFieldMutation,
  useSetCustomFieldValueMutation,
  useGetDocumentsQuery,
  useCreateDocumentMutation,
  useUpdateDocumentMutation,
  useGetProjectStatsQuery,
  useGetProjectWorkflowQuery,
  useUpdateProjectWorkflowMutation,
} = projectApi;
