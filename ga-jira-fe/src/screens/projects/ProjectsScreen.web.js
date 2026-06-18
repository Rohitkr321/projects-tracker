import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
  Text, Surface, useTheme, Button, TextInput, HelperText, Chip, Dialog, Portal,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useGetProjectsQuery, useCreateProjectMutation } from '../../api/projectApi';
import { useDispatch } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import { setSelectedProject } from '../../store/projectSlice';
import LoadingScreen from '../../components/common/LoadingScreen';
import { formatDate } from '../../utils/dateUtils';
import colors from '../../theme/colors';

const PROJECT_COLORS = [
  colors.primary, colors.secondary, colors.success, colors.warning,
  colors.danger, colors.info, '#7C5EA7', '#5A9E71',
];

const createSchema = Yup.object().shape({
  name: Yup.string().min(2).required('Project name is required'),
  key: Yup.string().min(2).max(6).required('Project key is required'),
  description: Yup.string(),
});

const ProjectsScreen = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const canCreate = ['super_admin', 'org_admin', 'project_manager'].includes(user?.role);

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0]);

  const { data, isLoading, refetch } = useGetProjectsQuery({ search });
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();

  const projects = data?.data?.data || [];

  const handleProjectPress = useCallback((project) => {
    dispatch(setSelectedProject(project));
    navigation.navigate('ProjectStack', {
      screen: 'ProjectDetail',
      params: { projectId: project.id },
    });
  }, [dispatch, navigation]);

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
      <View style={[styles.pageHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
        <View>
          <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, fontWeight: '800' }}>Projects</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.pageHeaderRight}>
          {/* Search */}
          <View style={[styles.searchWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            <MaterialCommunityIcons name="magnify" size={18} color={theme.colors.onSurfaceVariant} style={{ marginRight: 8 }} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search projects..."
              mode="flat"
              underlineStyle={{ display: 'none' }}
              style={styles.searchInput}
              dense
              placeholderTextColor={theme.colors.onSurfaceVariant}
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialCommunityIcons name="close-circle" size={16} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>
          {canCreate && (
            <Button mode="contained" icon="plus" onPress={() => setShowCreate(true)} style={styles.createBtn}>
              Create Project
            </Button>
          )}
        </View>
      </View>

      {/* Project grid */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.grid}>
        {projects.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            <MaterialCommunityIcons name="folder-outline" size={48} color={theme.colors.onSurfaceVariant} style={{ marginBottom: 12 }} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 6 }}>
              {search ? 'No projects found' : 'No projects yet'}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              {search ? 'Try a different search term' : 'Create your first project to get started'}
            </Text>
            {!search && canCreate && (
              <Button mode="contained" icon="plus" onPress={() => setShowCreate(true)} style={{ marginTop: 20 }}>
                Create Project
              </Button>
            )}
          </View>
        ) : (
          <View style={styles.cardGrid}>
            {projects.map((project) => (
              <TouchableOpacity
                key={project.id}
                style={[styles.projectCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
                onPress={() => handleProjectPress(project)}
                activeOpacity={0.85}
              >
                {/* Color banner */}
                <View style={[styles.cardBanner, { backgroundColor: project.color || colors.primary }]}>
                  <Text style={styles.cardBannerKey}>{project.key?.substring(0, 2) || 'P'}</Text>
                </View>

                <View style={styles.cardBody}>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }} numberOfLines={1}>
                    {project.name}
                  </Text>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                    {project.key}
                  </Text>
                  {!!project.description && (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6, lineHeight: 18 }} numberOfLines={2}>
                      {project.description}
                    </Text>
                  )}

                  <View style={styles.cardMeta}>
                    <View style={styles.cardStat}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={13} color={theme.colors.onSurfaceVariant} />
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                        {project.issueCount || 0} issues
                      </Text>
                    </View>
                    <View style={styles.cardStat}>
                      <MaterialCommunityIcons name="account-multiple" size={13} color={theme.colors.onSurfaceVariant} />
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                        {project.memberCount || 0} members
                      </Text>
                    </View>
                  </View>

                  {project.activeSprint && (
                    <View style={[styles.sprintBadge, { backgroundColor: colors.primary + '18' }]}>
                      <View style={[styles.sprintDot, { backgroundColor: colors.primary }]} />
                      <Text variant="labelSmall" style={{ color: colors.primary, fontSize: 11 }}>Sprint Active</Text>
                    </View>
                  )}
                </View>

                <View style={[styles.cardFooter, { borderTopColor: theme.colors.outlineVariant }]}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {project.updatedAt ? `Updated ${formatDate(project.updatedAt)}` : `Created ${formatDate(project.createdAt)}`}
                  </Text>
                  <MaterialCommunityIcons name="arrow-right" size={14} color={theme.colors.primary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create Project Dialog */}
      <Portal>
        <Dialog
          visible={showCreate}
          onDismiss={() => setShowCreate(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={{ fontWeight: '700' }}>Create Project</Dialog.Title>
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

                    <Text variant="labelMedium" style={{ color: theme.colors.onSurface, marginTop: 20, marginBottom: 10, fontWeight: '600' }}>
                      Project Color
                    </Text>
                    <View style={styles.colorPicker}>
                      {PROJECT_COLORS.map((color) => (
                        <TouchableOpacity
                          key={color}
                          onPress={() => setSelectedColor(color)}
                          style={[styles.colorSwatch, { backgroundColor: color }, selectedColor === color && styles.selectedSwatch]}
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

  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 40, paddingVertical: 20, borderBottomWidth: 1,
  },
  pageHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, height: 40, minWidth: 280,
  },
  searchInput: { flex: 1, height: 40, backgroundColor: 'transparent', fontSize: 14 },
  createBtn: { borderRadius: 8 },

  scroll: { flex: 1 },
  grid: { padding: 40, paddingTop: 28 },

  cardGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 20,
  },
  projectCard: {
    width: 280, borderRadius: 8, borderWidth: 1,
    overflow: 'hidden',
    cursor: 'pointer',
  },
  cardBanner: { height: 72, justifyContent: 'center', alignItems: 'center' },
  cardBannerKey: { color: '#fff', fontWeight: '900', fontSize: 24, opacity: 0.9 },
  cardBody: { padding: 16, gap: 0 },
  cardMeta: { flexDirection: 'row', gap: 14, marginTop: 12 },
  cardStat: { flexDirection: 'row', alignItems: 'center' },
  sprintBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 10, alignSelf: 'flex-start',
  },
  sprintDot: { width: 7, height: 7, borderRadius: 4 },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1,
  },

  emptyState: {
    alignItems: 'center', justifyContent: 'center', padding: 60,
    borderRadius: 8, borderWidth: 1, borderStyle: 'dashed',
  },

  dialog: { maxWidth: 520, alignSelf: 'center', width: '100%', borderRadius: 8 },
  dialogForm: { gap: 2, paddingBottom: 8 },
  colorPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  selectedSwatch: { borderWidth: 3, borderColor: 'rgba(0,0,0,0.25)' },
  dialogActions: { flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 4 },
});

export default ProjectsScreen;
