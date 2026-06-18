import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
  Text, useTheme, Button, TextInput, HelperText, Dialog, Portal, Menu, Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useGetProjectsQuery, useCreateProjectMutation, useUpdateProjectMutation } from '../../api/projectApi';
import { useDispatch } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import { setSelectedProject } from '../../store/projectSlice';
import LoadingScreen from '../../components/common/LoadingScreen';
import { formatDate } from '../../utils/dateUtils';
import colors from '../../theme/colors';
import AppToast from '../../components/common/AppToast';

const PROJECT_COLORS = [
  colors.primary, colors.secondary, colors.success, colors.warning,
  colors.danger, colors.info, '#7C5EA7', '#5A9E71',
];

const createSchema = Yup.object().shape({
  name: Yup.string().min(2).required('Project name is required'),
  key: Yup.string().min(2).max(6).required('Project key is required'),
  description: Yup.string(),
});

/* ─── Project card ─── */
const ProjectCard = ({ project, onPress, onArchive, canManage, theme }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isArchived = project.status === 'archived';
  const accent = isArchived ? '#9CA3AF' : (project.color || colors.primary);
  const accentFaint = accent + '15';
  const accentMid = accent + '35';

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: isArchived ? '#E5E7EB' : theme.colors.outlineVariant },
        isArchived && { opacity: 0.78 },
      ]}
    >
      {/* Banner — tappable to open project */}
      <TouchableOpacity
        style={[styles.cardBanner, { backgroundColor: accent }]}
        onPress={isArchived ? undefined : onPress}
        activeOpacity={isArchived ? 1 : 0.85}
      >
        {isArchived && (
          <View style={styles.archivedRibbon}>
            <MaterialCommunityIcons name="archive" size={11} color="#fff" />
            <Text style={styles.archivedRibbonText}>ARCHIVED</Text>
          </View>
        )}
        <View style={styles.keyCircle}>
          <Text style={styles.keyCircleText}>{project.key?.substring(0, 2) || 'P'}</Text>
        </View>
        {project.activeSprint && !isArchived && (
          <View style={styles.activeSprintPill}>
            <View style={styles.activeSprintDot} />
            <Text style={styles.activeSprintLabel}>Active Sprint</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Body — tappable to open project */}
      <TouchableOpacity
        style={styles.cardBody}
        onPress={isArchived ? undefined : onPress}
        activeOpacity={isArchived ? 1 : 0.85}
      >
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardName, { color: isArchived ? theme.colors.onSurfaceVariant : theme.colors.onSurface }]} numberOfLines={1}>
            {project.name}
          </Text>
          <View style={[styles.keyChip, { backgroundColor: accentFaint, borderColor: accentMid }]}>
            <Text style={[styles.keyChipText, { color: accent }]}>{project.key}</Text>
          </View>
        </View>

        {!!project.description ? (
          <Text style={[styles.cardDesc, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
            {project.description}
          </Text>
        ) : (
          <Text style={[styles.cardDesc, { color: theme.colors.onSurfaceVariant, fontStyle: 'italic', opacity: 0.5 }]}>
            No description
          </Text>
        )}

        <View style={[styles.cardStats, { borderTopColor: theme.colors.outlineVariant }]}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="ticket-outline" size={13} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>{project.issueCount || 0} issues</Text>
          </View>
          <View style={[styles.statSep, { backgroundColor: theme.colors.outlineVariant }]} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="account-group-outline" size={13} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>{project.memberCount || 0} members</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Footer — always rendered outside main touch area */}
      <View style={[styles.cardFooter, { borderTopColor: theme.colors.outlineVariant }]}>
        <Text style={[styles.footerDate, { color: theme.colors.onSurfaceVariant }]}>
          {project.updatedAt ? `Updated ${formatDate(project.updatedAt)}` : `Created ${formatDate(project.createdAt)}`}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {!isArchived && (
            <TouchableOpacity
              onPress={onPress}
              style={[styles.footerArrowBtn, { backgroundColor: accentFaint }]}
            >
              <MaterialCommunityIcons name="arrow-right" size={14} color={accent} />
            </TouchableOpacity>
          )}
          {canManage && (
            <Menu
              visible={menuOpen}
              onDismiss={() => setMenuOpen(false)}
              anchor={
                <TouchableOpacity
                  onPress={() => setMenuOpen(true)}
                  style={[styles.footerMenuBtn, {
                    backgroundColor: isArchived ? '#FEF3C7' : theme.colors.surfaceVariant,
                    borderColor: isArchived ? '#FDE68A' : theme.colors.outlineVariant,
                  }]}
                >
                  <MaterialCommunityIcons
                    name="dots-horizontal"
                    size={16}
                    color={isArchived ? '#D97706' : theme.colors.onSurfaceVariant}
                  />
                </TouchableOpacity>
              }
            >
              {isArchived ? (
                <Menu.Item
                  title="Unarchive Project"
                  leadingIcon="archive-arrow-up-outline"
                  onPress={() => { setMenuOpen(false); onArchive('active'); }}
                  titleStyle={{ color: '#0369A1', fontWeight: '600' }}
                />
              ) : (
                <>
                  <Menu.Item
                    title="Open Project"
                    leadingIcon="arrow-right-circle-outline"
                    onPress={() => { setMenuOpen(false); onPress(); }}
                  />
                  <Divider />
                  <Menu.Item
                    title="Archive Project"
                    leadingIcon="archive-outline"
                    onPress={() => { setMenuOpen(false); onArchive('archived'); }}
                    titleStyle={{ color: '#B45309' }}
                  />
                </>
              )}
            </Menu>
          )}
        </View>
      </View>
    </View>
  );
};

/* ─── Main screen ─── */
const ProjectsScreen = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const canCreate = ['super_admin', 'org_admin', 'project_manager'].includes(user?.role);
  const canManage = ['super_admin', 'org_admin'].includes(user?.role);

  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0]);
  const [toast, setToast]         = useState('');
  const [toastType, setToastType] = useState('success');

  const queryParams = { search };
  if (!showArchived) queryParams.status = 'active';

  const { data, isLoading, refetch } = useGetProjectsQuery(queryParams);
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();
  const [updateProject] = useUpdateProjectMutation();

  const projects = data?.data?.data || [];

  const handleProjectPress = useCallback((project) => {
    dispatch(setSelectedProject(project));
    navigation.navigate('ProjectStack', {
      screen: 'ProjectDetail',
      params: { projectId: project.id },
    });
  }, [dispatch, navigation]);

  const handleArchive = async (project, newStatus) => {
    try {
      await updateProject({ id: project.id, status: newStatus }).unwrap();
      setToastType(newStatus === 'archived' ? 'warning' : 'success');
      setToast(newStatus === 'archived' ? `"${project.name}" archived` : `"${project.name}" unarchived`);
      refetch();
    } catch (err) {
      setToastType('error'); setToast(err?.data?.message || 'Action failed');
    }
  };

  const handleCreateProject = async (values, { resetForm }) => {
    try {
      await createProject({ ...values, color: selectedColor }).unwrap();
      setShowCreate(false);
      resetForm();
      refetch();
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  if (isLoading) return <LoadingScreen message="Loading projects..." />;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>

      {/* Page header */}
      <View style={[styles.pageHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
        <View style={styles.pageHeaderLeft}>
          <View style={styles.titleAccent} />
          <View>
            <Text style={[styles.pageTitle, { color: theme.colors.onSurface }]}>Projects</Text>
            <Text style={[styles.pageSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              {projects.length} project{projects.length !== 1 ? 's' : ''} in your organisation
            </Text>
          </View>
        </View>

        <View style={styles.pageHeaderRight}>
          <View style={[styles.searchWrap, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
            <MaterialCommunityIcons name="magnify" size={16} color={theme.colors.onSurfaceVariant} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search projects…"
              mode="flat"
              underlineStyle={{ display: 'none' }}
              style={styles.searchInput}
              dense
              placeholderTextColor={theme.colors.onSurfaceVariant}
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialCommunityIcons name="close-circle" size={15} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>
          {canManage && (
            <TouchableOpacity
              onPress={() => setShowArchived(v => !v)}
              style={[styles.archiveToggle, {
                backgroundColor: showArchived ? '#FEF3C7' : theme.colors.background,
                borderColor: showArchived ? '#D97706' : theme.colors.outlineVariant,
              }]}
            >
              <MaterialCommunityIcons
                name={showArchived ? 'archive' : 'archive-outline'}
                size={15}
                color={showArchived ? '#D97706' : theme.colors.onSurfaceVariant}
              />
              <Text style={[styles.archiveToggleText, { color: showArchived ? '#D97706' : theme.colors.onSurfaceVariant }]}>
                {showArchived ? 'Showing archived' : 'Show archived'}
              </Text>
            </TouchableOpacity>
          )}
          {canCreate && (
            <Button
              mode="contained"
              icon="plus"
              onPress={() => setShowCreate(true)}
              style={styles.createBtn}
              labelStyle={styles.createBtnLabel}
            >
              Create Project
            </Button>
          )}
        </View>
      </View>

      {/* Grid */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {projects.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.brand.skyLight }]}>
              <MaterialCommunityIcons name="folder-open-outline" size={36} color={colors.brand.navy} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
              {search ? 'No projects found' : 'No projects yet'}
            </Text>
            <Text style={[styles.emptySub, { color: theme.colors.onSurfaceVariant }]}>
              {search
                ? 'Try a different search term'
                : showArchived
                ? 'No archived projects found'
                : 'Create your first project to get started'}
            </Text>
            {!search && canCreate && (
              <Button mode="contained" icon="plus" onPress={() => setShowCreate(true)} style={{ marginTop: 20, borderRadius: 8 }}>
                Create Project
              </Button>
            )}
          </View>
        ) : (
          <View style={styles.cardGrid}>
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                theme={theme}
                canManage={canManage}
                onPress={() => handleProjectPress(project)}
                onArchive={(newStatus) => handleArchive(project, newStatus)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {!!toast && <AppToast message={toast} type={toastType} onDone={() => setToast('')} />}

      {/* Create Project Dialog */}
      <Portal>
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>New Project</Dialog.Title>
          <Dialog.ScrollArea style={{ paddingHorizontal: 0 }}>
            <ScrollView style={{ paddingHorizontal: 24 }}>
              <Formik
                initialValues={{ name: '', key: '', description: '' }}
                validationSchema={createSchema}
                onSubmit={handleCreateProject}
              >
                {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
                  <View style={styles.dialogForm}>
                    <TextInput
                      label="Project Name *"
                      value={values.name}
                      onChangeText={(text) => {
                        handleChange('name')(text);
                        if (!touched.key) {
                          setFieldValue('key', text.replace(/[^A-Za-z]/g, '').toUpperCase().substring(0, 5));
                        }
                      }}
                      onBlur={handleBlur('name')}
                      mode="outlined"
                      error={touched.name && !!errors.name}
                      autoFocus
                    />
                    {touched.name && errors.name && <HelperText type="error">{errors.name}</HelperText>}

                    <TextInput
                      label="Project Key *"
                      value={values.key}
                      onChangeText={(text) => handleChange('key')(text.toUpperCase())}
                      onBlur={handleBlur('key')}
                      mode="outlined"
                      autoCapitalize="characters"
                      maxLength={6}
                      error={touched.key && !!errors.key}
                      style={{ marginTop: 12 }}
                    />
                    {touched.key && errors.key && <HelperText type="error">{errors.key}</HelperText>}

                    <TextInput
                      label="Description"
                      value={values.description}
                      onChangeText={handleChange('description')}
                      mode="outlined"
                      multiline
                      numberOfLines={3}
                      style={{ marginTop: 12 }}
                    />

                    <Text style={[styles.colorLabel, { color: theme.colors.onSurface }]}>Project Colour</Text>
                    <View style={styles.colorPicker}>
                      {PROJECT_COLORS.map((color) => (
                        <TouchableOpacity
                          key={color}
                          onPress={() => setSelectedColor(color)}
                          style={[styles.colorSwatch, { backgroundColor: color },
                            selectedColor === color && styles.selectedSwatch]}
                        >
                          {selectedColor === color && (
                            <MaterialCommunityIcons name="check" size={16} color="#fff" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.dialogActions}>
                      <Button mode="outlined" onPress={() => setShowCreate(false)} style={{ flex: 1 }}>Cancel</Button>
                      <Button mode="contained" onPress={handleSubmit} loading={isCreating} disabled={isCreating} style={{ flex: 1 }}>
                        Create
                      </Button>
                    </View>
                  </View>
                )}
              </Formik>
            </ScrollView>
          </Dialog.ScrollArea>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 28, paddingVertical: 16,
    borderBottomWidth: 1,
    boxShadow: '0px 1px 4px rgba(6,43,111,0.05)',
  },
  pageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleAccent: { width: 4, height: 28, borderRadius: 2, backgroundColor: colors.brand.navy },
  pageTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  pageSubtitle: { fontSize: 12, marginTop: 2 },
  pageHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, height: 38, minWidth: 260,
  },
  searchInput: { flex: 1, height: 38, backgroundColor: 'transparent', fontSize: 13 },
  createBtn: { borderRadius: 8 },
  createBtnLabel: { fontSize: 13, fontWeight: '700' },

  /* Grid */
  scroll: { flex: 1 },
  scrollContent: { padding: 28, paddingTop: 24 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },

  /* Card */
  card: {
    width: 290, borderRadius: 12, borderWidth: 1,
    overflow: 'hidden',
    cursor: 'pointer',
    boxShadow: '0px 2px 12px rgba(6,43,111,0.07)',
  },
  cardBanner: {
    height: 96,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    padding: 14,
  },
  keyCircle: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  keyCircleText: { color: '#fff', fontWeight: '900', fontSize: 20, letterSpacing: 0.5 },
  activeSprintPill: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  activeSprintDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  activeSprintLabel: { color: '#fff', fontSize: 10, fontWeight: '700' },

  cardBody: { padding: 16, gap: 0 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  cardName: { fontSize: 14, fontWeight: '700', flex: 1, letterSpacing: -0.2 },
  keyChip: {
    borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  keyChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardDesc: { fontSize: 12, lineHeight: 18, marginBottom: 2 },

  cardStats: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: 12 },
  statSep: { width: 1, height: 12 },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1,
  },
  footerDate: { fontSize: 11 },
  footerArrowBtn: {
    width: 26, height: 26, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },

  /* Empty */
  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    padding: 60, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed',
    gap: 8,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center' },

  /* Archive toggle */
  archiveToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  archiveToggleText: { fontSize: 12, fontWeight: '600' },

  /* Archived ribbon on card banner */
  archivedRibbon: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
  },
  archivedRibbonText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },

  /* ⋯ menu button in footer */
  footerMenuBtn: {
    width: 28, height: 28, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },

  /* Dialog */
  dialog: { maxWidth: 520, alignSelf: 'center', width: '100%', borderRadius: 12 },
  dialogTitle: { fontWeight: '800', fontSize: 17 },
  dialogForm: { gap: 2, paddingBottom: 8 },
  colorLabel: { fontSize: 13, fontWeight: '600', marginTop: 20, marginBottom: 10 },
  colorPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  selectedSwatch: { borderWidth: 3, borderColor: 'rgba(0,0,0,0.25)' },
  dialogActions: { flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 4 },
});

export default ProjectsScreen;
