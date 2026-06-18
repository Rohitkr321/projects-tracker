import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  Text,
  FAB,
  useTheme,
  Portal,
  Modal,
  TextInput,
  Button,
  HelperText,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useGetProjectsQuery, useCreateProjectMutation } from '../../api/projectApi';
import { useDispatch } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import { setSelectedProject } from '../../store/projectSlice';
import SearchBar from '../../components/common/SearchBar';
import EmptyState from '../../components/common/EmptyState';
import LoadingScreen from '../../components/common/LoadingScreen';
import { formatDate } from '../../utils/dateUtils';
import colors from '../../theme/colors';

const projectColors = [
  colors.primary, colors.secondary, colors.success, colors.warning,
  colors.danger, colors.info, '#7C5EA7', '#5A9E71',
];

const createSchema = Yup.object().shape({
  name: Yup.string().min(2).required('Project name is required'),
  key: Yup.string().min(2).max(6).required('Project key is required'),
  description: Yup.string(),
});

const ProjectCard = ({ project, onPress, theme }) => {
  const accentColor = project.color || colors.primary;
  const openIssues = project.openIssues ?? project.issueCount ?? 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[styles.projectCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
    >
      {/* Colored left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.projectCardInner}>
        {/* Header: avatar + name/key + chevron */}
        <View style={styles.projectCardHeader}>
          <View style={[styles.projectAvatar, { backgroundColor: accentColor + '22' }]}>
            <Text style={[styles.projectAvatarText, { color: accentColor }]}>
              {project.key?.substring(0, 2) || 'P'}
            </Text>
          </View>

          <View style={styles.projectTitleBlock}>
            <Text
              variant="titleSmall"
              style={{ color: theme.colors.onSurface, fontWeight: '700', lineHeight: 20 }}
              numberOfLines={1}
            >
              {project.name}
            </Text>
            <View style={[styles.keyBadge, { backgroundColor: accentColor + '18' }]}>
              <Text style={[styles.keyBadgeText, { color: accentColor }]}>{project.key}</Text>
            </View>
          </View>

          <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
        </View>

        {/* Description */}
        {!!project.description && (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, lineHeight: 18 }}
            numberOfLines={2}
          >
            {project.description}
          </Text>
        )}

        {/* Footer stats */}
        <View style={styles.projectFooter}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="ticket-outline" size={13} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 3 }}>
              {openIssues} open
            </Text>
          </View>
          {project.memberCount != null && (
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="account-multiple-outline" size={13} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 3 }}>
                {project.memberCount} members
              </Text>
            </View>
          )}
          {project.activeSprint && (
            <View style={[styles.sprintBadge, { backgroundColor: '#00875A18' }]}>
              <View style={styles.sprintDot} />
              <Text style={styles.sprintBadgeText}>Sprint Active</Text>
            </View>
          )}
          {project.isPrivate && (
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="lock-outline" size={13} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 3 }}>
                Private
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const ProjectsScreen = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const canCreateProject = ['super_admin', 'org_admin', 'project_manager'].includes(user?.role);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedColor, setSelectedColor] = useState(projectColors[0]);

  const { data, isLoading, refetch, isFetching } = useGetProjectsQuery({ search });
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();

  const projects = data?.data?.data || [];

  const handleProjectPress = useCallback((project) => {
    dispatch(setSelectedProject(project));
    navigation.navigate('ProjectStack', {
      screen: 'ProjectDetail',
      params: { projectId: project.id },
    });
  }, [dispatch, navigation]);

  const handleCreateProject = async (values) => {
    try {
      await createProject({ ...values, color: selectedColor }).unwrap();
      setShowCreate(false);
      refetch();
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  if (isLoading) return <LoadingScreen message="Loading projects..." />;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.searchContainer}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search projects..."
          style={styles.searchBar}
        />
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => handleProjectPress(item)}
            theme={theme}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="folder-outline"
            title="No projects found"
            description={search ? 'Try a different search term' : 'Create your first project to get started'}
            actionLabel={!search && canCreateProject ? 'Create Project' : undefined}
            onAction={() => setShowCreate(true)}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />

      {canCreateProject && (
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShowCreate(true)}
          color="#FFFFFF"
        />
      )}

      {canCreateProject && <Portal>
        <Modal
          visible={showCreate}
          onDismiss={() => setShowCreate(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
            Create Project
          </Text>

          <Formik
            initialValues={{ name: '', key: '', description: '' }}
            validationSchema={createSchema}
            onSubmit={handleCreateProject}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
              <View style={styles.modalForm}>
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

                <Text variant="labelMedium" style={{ color: theme.colors.onSurface, marginTop: 16, marginBottom: 8 }}>
                  Project Color
                </Text>
                <View style={styles.colorPicker}>
                  {projectColors.map((color) => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => setSelectedColor(color)}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: color },
                        selectedColor === color && styles.selectedSwatch,
                      ]}
                    >
                      {selectedColor === color && (
                        <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.modalActions}>
                  <Button mode="outlined" onPress={() => setShowCreate(false)} style={styles.actionBtn}>
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleSubmit}
                    loading={isCreating}
                    disabled={isCreating}
                    style={styles.actionBtn}
                  >
                    Create
                  </Button>
                </View>
              </View>
            )}
          </Formik>
        </Modal>
      </Portal>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: { padding: 16, paddingBottom: 8 },
  searchBar: {},
  listContent: { padding: 16, paddingTop: 8, paddingBottom: 100 },
  projectCard: {
    borderRadius: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  accentBar: { width: 4, borderRadius: 0 },
  projectCardInner: { flex: 1, padding: 14 },
  projectCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  projectAvatar: {
    width: 42,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  projectAvatarText: { fontWeight: '800', fontSize: 15, letterSpacing: 0 },
  projectTitleBlock: { flex: 1, gap: 4 },
  keyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  keyBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0 },
  projectFooter: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 10 },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  sprintBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, gap: 5 },
  sprintDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00875A' },
  sprintBadgeText: { fontSize: 11, fontWeight: '600', color: '#00875A' },
  fab: { position: 'absolute', bottom: 24, right: 24 },
  modal: { margin: 20, borderRadius: 16, padding: 24 },
  modalTitle: { fontWeight: '700', marginBottom: 20 },
  modalForm: { gap: 4 },
  colorPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedSwatch: { borderWidth: 3, borderColor: 'rgba(0,0,0,0.3)' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: { flex: 1 },
});

export default ProjectsScreen;
