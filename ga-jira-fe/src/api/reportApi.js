import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './apiClient';

export const reportApi = createApi({
  reducerPath: 'reportApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Report'],
  endpoints: (builder) => ({
    getBurndownReport: builder.query({
      query: ({ sprintId, ...params }) => ({
        url: `/reports/burndown/${sprintId}`,
        params,
      }),
    }),
    getVelocityReport: builder.query({
      query: ({ projectId, ...params }) => ({
        url: `/reports/velocity/${projectId}`,
        params,
      }),
    }),
    getTimeTrackingReport: builder.query({
      query: (params = {}) => ({
        url: '/reports/time-tracking',
        params,
      }),
    }),
    getCumulativeFlowReport: builder.query({
      query: ({ projectId, ...params }) => ({
        url: `/reports/cumulative-flow/${projectId}`,
        params,
      }),
    }),
    getIssueDistribution: builder.query({
      query: ({ projectId, ...params }) => ({
        url: `/reports/issue-distribution/${projectId}`,
        params,
      }),
    }),
    getTeamWorkload: builder.query({
      query: (params = {}) => ({
        url: '/reports/team-workload',
        params,
      }),
    }),
    getDashboardMetrics: builder.query({
      query: () => '/reports/dashboard',
      providesTags: ['Report'],
    }),
    getSprintComparison: builder.query({
      query: ({ projectId, ...params }) => ({
        url: `/reports/sprint-comparison/${projectId}`,
        params,
      }),
    }),
  }),
});

export const {
  useGetBurndownReportQuery,
  useGetVelocityReportQuery,
  useGetTimeTrackingReportQuery,
  useGetCumulativeFlowReportQuery,
  useGetIssueDistributionQuery,
  useGetTeamWorkloadQuery,
  useGetDashboardMetricsQuery,
  useGetSprintComparisonQuery,
} = reportApi;
