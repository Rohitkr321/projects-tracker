import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedProject: null,
  selectedSprint: null,
  boardFilters: {
    assignee: null,
    priority: null,
    type: null,
    label: null,
    search: '',
  },
  backlogFilters: {
    assignee: null,
    priority: null,
    type: null,
    sprint: null,
    search: '',
  },
  recentProjects: [],
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setSelectedProject: (state, action) => {
      state.selectedProject = action.payload;
      if (action.payload) {
        const existing = state.recentProjects.find(p => p.id === action.payload.id);
        if (!existing) {
          state.recentProjects = [action.payload, ...state.recentProjects].slice(0, 5);
        }
      }
    },
    setSelectedSprint: (state, action) => {
      state.selectedSprint = action.payload;
    },
    setBoardFilter: (state, action) => {
      const { key, value } = action.payload;
      state.boardFilters[key] = value;
    },
    clearBoardFilters: (state) => {
      state.boardFilters = initialState.boardFilters;
    },
    setBacklogFilter: (state, action) => {
      const { key, value } = action.payload;
      state.backlogFilters[key] = value;
    },
    clearBacklogFilters: (state) => {
      state.backlogFilters = initialState.backlogFilters;
    },
    clearProjectState: (state) => {
      state.selectedProject = null;
      state.selectedSprint = null;
      state.boardFilters = initialState.boardFilters;
      state.backlogFilters = initialState.backlogFilters;
    },
  },
});

export const {
  setSelectedProject,
  setSelectedSprint,
  setBoardFilter,
  clearBoardFilters,
  setBacklogFilter,
  clearBacklogFilters,
  clearProjectState,
} = projectSlice.actions;

export const selectSelectedProject = (state) => state.project.selectedProject;
export const selectSelectedSprint = (state) => state.project.selectedSprint;
export const selectBoardFilters = (state) => state.project.boardFilters;
export const selectBacklogFilters = (state) => state.project.backlogFilters;
export const selectRecentProjects = (state) => state.project.recentProjects;

export default projectSlice.reducer;
