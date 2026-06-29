import React, { useState, useCallback, useMemo } from 'react';
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

const PROJECT_TEMPLATES = [
  {
    id: 'scrum',
    type: 'scrum',
    name: 'Scrum',
    icon: 'lightning-bolt-outline',
    color: '#3B82F6',
    description: 'Sprint-based delivery with backlog, sprint planning, and velocity tracking.',
    hint: 'Best for: iterative development, feature teams',
  },
  {
    id: 'kanban',
    type: 'kanban',
    name: 'Kanban',
    icon: 'view-column-outline',
    color: '#10B981',
    description: 'Continuous flow board with WIP limits and visual workflow management.',
    hint: 'Best for: support queues, ops, ongoing work',
  },
  {
    id: 'bug-tracker',
    type: 'scrum',
    name: 'Bug Tracker',
    icon: 'bug-outline',
    color: '#EF4444',
    description: 'Focused on capturing, triaging, and resolving defects with severity tracking.',
    hint: 'Best for: QA teams, production incidents',
    defaultDesc: 'Track and resolve bugs across the product.',
  },
  {
    id: 'feature',
    type: 'scrum',
    name: 'Feature Delivery',
    icon: 'star-shooting-outline',
    color: '#8B5CF6',
    description: 'End-to-end feature development from discovery through to release.',
    hint: 'Best for: product squads, release-driven teams',
    defaultDesc: 'Plan and deliver product features.',
  },
];

const createSchema = Yup.object().shape({
  name: Yup.string().min(2).required('Project name is required'),
  key: Yup.string().min(2).max(6).required('Project key is required'),
  description: Yup.string(),
});

const getInitials = (user) => {
  if (!user) return null;
  const init = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  return init || null;
};

/* ─── Project Card (Grid view) ─── */
const ProjectCard = ({ project, onPress, onArchive, canManage, theme }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isDark = theme.dark;
  const isArchived = project.status === 'archived';
  const accent = isArchived ? '#9CA3AF' : (project.color || colors.primary);
  const accentFaint = accent + '15';
  const accentMid = accent + '35';
  const leadInitials = getInitials(project.lead);

  return (
    <View style={[styles.card, {
      backgroundColor: theme.colors.surface,
      borderColor: isArchived ? (isDark ? '#374151' : '#E5E7EB') : theme.colors.outlineVariant,
    }, isArchived && { opacity: 0.78 }]}>

      {/* Banner */}
      <TouchableOpacity
        style={[styles.cardBanner, { backgroundColor: accent }]}
        onPress={isArchived ? undefined : onPress}
        activeOpacity={isArchived ? 1 : 0.85}
      >
        {/* Gradient overlay */}
        <View style={[StyleSheet.absoluteFillObject, { backgroundImage: 'linear-gradient(150deg, rgba(255,255,255,0.12) 0%, rgba(0,0,0,0.22) 100%)' }]} pointerEvents="none" />

        {/* Top row: type badge + sprint/archived pill */}
        <View style={{ position: 'absolute', top: 11, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {project.type ? (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' }}>
                {project.type}
              </Text>
            </View>
          ) : <View />}

          {isArchived ? (
            <View style={styles.archivedRibbon}>
              <MaterialCommunityIcons name="archive" size={10} color="#fff" />
              <Text style={styles.archivedRibbonText}>ARCHIVED</Text>
            </View>
          ) : project.activeSprint ? (
            <View style={styles.activeSprintPill}>
              <View style={styles.activeSprintDot} />
              <Text style={styles.activeSprintLabel}>Active Sprint</Text>
            </View>
          ) : null}
        </View>

        {/* Bottom row: key circle + lead initials */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%' }}>
          <View style={styles.keyCircle}>
            <Text style={styles.keyCircleText}>{project.key?.substring(0, 2) || 'P'}</Text>
          </View>
          {leadInitials ? (
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>{leadInitials}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Body */}
      <TouchableOpacity style={styles.cardBody} onPress={isArchived ? undefined : onPress} activeOpacity={isArchived ? 1 : 0.85}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardName, { color: isArchived ? theme.colors.onSurfaceVariant : theme.colors.onSurface }]} numberOfLines={1}>
            {project.name}
          </Text>
          <View style={[styles.keyChip, { backgroundColor: accentFaint, borderColor: accentMid }]}>
            <Text style={[styles.keyChipText, { color: accent }]}>{project.key}</Text>
          </View>
        </View>

        {project.description ? (
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

      {/* Footer */}
      <View style={[styles.cardFooter, { borderTopColor: theme.colors.outlineVariant }]}>
        <Text style={[styles.footerDate, { color: theme.colors.onSurfaceVariant }]}>
          {project.updatedAt ? `Updated ${formatDate(project.updatedAt)}` : `Created ${formatDate(project.createdAt)}`}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {!isArchived && (
            <TouchableOpacity onPress={onPress} style={[styles.footerArrowBtn, { backgroundColor: accentFaint }]}>
              <MaterialCommunityIcons name="arrow-right" size={14} color={accent} />
            </TouchableOpacity>
          )}
          {canManage && (
            <Menu visible={menuOpen} onDismiss={() => setMenuOpen(false)}
              anchor={
                <TouchableOpacity onPress={() => setMenuOpen(true)} style={[styles.footerMenuBtn, {
                  backgroundColor: isArchived ? '#FEF3C7' : theme.colors.surfaceVariant,
                  borderColor: isArchived ? '#FDE68A' : theme.colors.outlineVariant,
                }]}>
                  <MaterialCommunityIcons name="dots-horizontal" size={16} color={isArchived ? '#D97706' : theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              }
            >
              {isArchived ? (
                <Menu.Item title="Unarchive Project" leadingIcon="archive-arrow-up-outline"
                  onPress={() => { setMenuOpen(false); onArchive('active'); }}
                  titleStyle={{ color: '#0369A1', fontWeight: '600' }} />
              ) : (
                <>
                  <Menu.Item title="Open Project" leadingIcon="arrow-right-circle-outline"
                    onPress={() => { setMenuOpen(false); onPress(); }} />
                  <Divider />
                  <Menu.Item title="Archive Project" leadingIcon="archive-outline"
                    onPress={() => { setMenuOpen(false); onArchive('archived'); }}
                    titleStyle={{ color: '#B45309' }} />
                </>
              )}
            </Menu>
          )}
        </View>
      </View>
    </View>
  );
};

/* ─── Project Row (List view) ─── */
const ProjectRow = ({ project, onPress, onArchive, canManage, theme }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isDark = theme.dark;
  const isArchived = project.status === 'archived';
  const accent = isArchived ? '#9CA3AF' : (project.color || colors.primary);
  const leadInitials = getInitials(project.lead);

  return (
    <TouchableOpacity
      onPress={isArchived ? undefined : onPress}
      activeOpacity={isArchived ? 1 : 0.82}
      style={[styles.row, {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.outlineVariant,
        borderLeftColor: accent,
        opacity: isArchived ? 0.78 : 1,
      }]}
    >
      {/* Key badge */}
      <View style={[styles.rowKeyBadge, { backgroundColor: accent + '18' }]}>
        <Text style={[styles.rowKeyText, { color: accent }]}>{project.key?.substring(0, 2) || 'P'}</Text>
      </View>

      {/* Name + desc */}
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <Text style={[styles.rowName, { color: isArchived ? theme.colors.onSurfaceVariant : theme.colors.onSurface }]} numberOfLines={1}>
            {project.name}
          </Text>
          {project.type && (
            <View style={{ backgroundColor: accent + '15', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: accent + '30' }}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: accent, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {project.type}
              </Text>
            </View>
          )}
          {project.activeSprint && !isArchived && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#22C55E' }} />
              <Text style={{ fontSize: 10, fontWeight: '600', color: '#16A34A' }}>Active Sprint</Text>
            </View>
          )}
          {isArchived && (
            <View style={{ backgroundColor: '#FEF3C7', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#FDE68A' }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: '#D97706', textTransform: 'uppercase' }}>Archived</Text>
            </View>
          )}
        </View>
        {!!project.description && (
          <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, lineHeight: 15 }} numberOfLines={1}>
            {project.description}
          </Text>
        )}
      </View>

      {/* Stats — fixed width matches header */}
      <View style={{ width: 110, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="ticket-outline" size={12} color={theme.colors.onSurfaceVariant} />
          <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>{project.issueCount || 0}</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="account-group-outline" size={12} color={theme.colors.onSurfaceVariant} />
          <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>{project.memberCount || 0}</Text>
        </View>
      </View>

      {/* Lead — fixed width matches header, badge centred */}
      <View style={{ width: 36, alignItems: 'center' }}>
        {leadInitials ? (
          <View style={[styles.leadBadge, { backgroundColor: accent }]}>
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#fff' }}>{leadInitials}</Text>
          </View>
        ) : null}
      </View>

      {/* Date — fixed width matches header */}
      <Text style={[styles.rowDate, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
        {project.updatedAt ? formatDate(project.updatedAt) : formatDate(project.createdAt)}
      </Text>

      {/* Actions — fixed width matches header */}
      <View style={{ width: 70, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
        {!isArchived && (
          <TouchableOpacity onPress={onPress} style={[styles.footerArrowBtn, { backgroundColor: accent + '15' }]}>
            <MaterialCommunityIcons name="arrow-right" size={13} color={accent} />
          </TouchableOpacity>
        )}
        {canManage && (
          <Menu visible={menuOpen} onDismiss={() => setMenuOpen(false)}
            anchor={
              <TouchableOpacity onPress={() => setMenuOpen(true)} style={[styles.footerMenuBtn, {
                backgroundColor: isArchived ? '#FEF3C7' : theme.colors.surfaceVariant,
                borderColor: isArchived ? '#FDE68A' : theme.colors.outlineVariant,
              }]}>
                <MaterialCommunityIcons name="dots-horizontal" size={15} color={isArchived ? '#D97706' : theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            }
          >
            {isArchived ? (
              <Menu.Item title="Unarchive Project" leadingIcon="archive-arrow-up-outline"
                onPress={() => { setMenuOpen(false); onArchive('active'); }} titleStyle={{ color: '#0369A1', fontWeight: '600' }} />
            ) : (
              <>
                <Menu.Item title="Open Project" leadingIcon="arrow-right-circle-outline" onPress={() => { setMenuOpen(false); onPress(); }} />
                <Divider />
                <Menu.Item title="Archive Project" leadingIcon="archive-outline"
                  onPress={() => { setMenuOpen(false); onArchive('archived'); }} titleStyle={{ color: '#B45309' }} />
              </>
            )}
          </Menu>
        )}
      </View>
    </TouchableOpacity>
  );
};

const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'scrum', label: 'Scrum' },
  { id: 'kanban', label: 'Kanban' },
];

/* ─── Main screen ─── */
const ProjectsScreen = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const canCreate = ['super_admin', 'org_admin', 'project_manager'].includes(user?.role);
  const canManage = ['super_admin', 'org_admin'].includes(user?.role);

  const [search, setSearch] = useState('');
  const [hideArchived, setHideArchived] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState(PROJECT_TEMPLATES[0]);
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0]);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');
  const [viewMode, setViewMode] = useState('grid');
  const [filterType, setFilterType] = useState('all');

  const queryParams = { search, status: hideArchived ? 'active' : 'all' };

  const isDark = theme.dark;
  const { data, isLoading, refetch } = useGetProjectsQuery(queryParams);
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();
  const [updateProject] = useUpdateProjectMutation();

  const projects = data?.data?.data || [];

  const activeCount = useMemo(() => projects.filter(p => p.status !== 'archived').length, [projects]);
  const archivedCount = useMemo(() => projects.filter(p => p.status === 'archived').length, [projects]);

  const filteredProjects = useMemo(() => {
    if (filterType === 'all') return projects;
    return projects.filter(p => p.type === filterType);
  }, [projects, filterType]);

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

  const handleCreateProject = async (values, { resetForm, setErrors }) => {
    try {
      await createProject({ ...values, color: selectedColor, type: selectedTemplate.type }).unwrap();
      setShowCreate(false);
      setCreateStep(1);
      setSelectedTemplate(PROJECT_TEMPLATES[0]);
      resetForm();
      refetch();
    } catch (err) {
      const msg = err?.data?.message || 'Failed to create project';
      setToastType('error');
      setToast(msg);
      // Highlight the key field for duplicate-key errors
      if (/key/i.test(msg)) {
        setErrors({ key: msg });
      }
    }
  };

  const handleOpenCreate = () => {
    setCreateStep(1);
    setSelectedTemplate(PROJECT_TEMPLATES[0]);
    setShowCreate(true);
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
              {activeCount} active · {archivedCount} archived
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
              onPress={() => setHideArchived(v => !v)}
              style={[styles.archiveToggle, {
                backgroundColor: hideArchived ? '#FEF3C7' : theme.colors.background,
                borderColor: hideArchived ? '#D97706' : theme.colors.outlineVariant,
              }]}
            >
              <MaterialCommunityIcons
                name={hideArchived ? 'archive-off-outline' : 'archive-outline'}
                size={15}
                color={hideArchived ? '#D97706' : theme.colors.onSurfaceVariant}
              />
              <Text style={[styles.archiveToggleText, { color: hideArchived ? '#D97706' : theme.colors.onSurfaceVariant }]}>
                {hideArchived ? 'Archived hidden' : 'Hide archived'}
              </Text>
            </TouchableOpacity>
          )}
          {canCreate && (
            <Button
              mode="contained"
              icon="plus"
              onPress={handleOpenCreate}
              style={styles.createBtn}
              labelStyle={styles.createBtnLabel}
            >
              Create Project
            </Button>
          )}
        </View>
      </View>

      {/* Filter + view bar */}
      <View style={[styles.filterBar, { backgroundColor: isDark ? theme.colors.surface : theme.colors.background, borderBottomColor: theme.colors.outlineVariant }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {TYPE_FILTERS.map(f => {
            const active = filterType === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setFilterType(f.id)}
                style={[styles.filterPill, {
                  backgroundColor: active ? colors.brand.navy : 'transparent',
                  borderColor: active ? colors.brand.navy : theme.colors.outlineVariant,
                }]}
              >
                <Text style={[styles.filterPillText, { color: active ? '#fff' : theme.colors.onSurfaceVariant }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.viewToggle, { borderColor: theme.colors.outlineVariant }]}>
          {[
            { mode: 'grid', icon: 'view-grid-outline' },
            { mode: 'list', icon: 'view-list-outline' },
          ].map(({ mode, icon }) => (
            <TouchableOpacity
              key={mode}
              onPress={() => setViewMode(mode)}
              style={[styles.viewModeBtn, { backgroundColor: viewMode === mode ? colors.brand.navy : 'transparent' }]}
            >
              <MaterialCommunityIcons
                name={icon}
                size={16}
                color={viewMode === mode ? '#fff' : theme.colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, viewMode === 'list' && styles.scrollContentList]}>
        {filteredProjects.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.brand.skyLight }]}>
              <MaterialCommunityIcons name="folder-open-outline" size={36} color={colors.brand.navy} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
              {search ? 'No projects found' : filterType !== 'all' ? `No ${filterType} projects` : 'No projects yet'}
            </Text>
            <Text style={[styles.emptySub, { color: theme.colors.onSurfaceVariant }]}>
              {search
                ? 'Try a different search term'
                : filterType !== 'all'
                ? 'Switch to "All" to see other project types'
                : 'Create your first project to get started'}
            </Text>
            {!search && filterType === 'all' && canCreate && (
              <Button mode="contained" icon="plus" onPress={handleOpenCreate} style={{ marginTop: 20, borderRadius: 8 }}>
                Create Project
              </Button>
            )}
          </View>
        ) : viewMode === 'grid' ? (
          <View style={styles.cardGrid}>
            {filteredProjects.map((project) => (
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
        ) : (
          <View style={styles.rowList}>
            <View style={[styles.rowListHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
              <View style={{ width: 46 }} />
              <Text style={[styles.rowListHeaderText, { flex: 1, color: theme.colors.onSurfaceVariant }]}>Project</Text>
              <Text style={[styles.rowListHeaderText, { width: 110, color: theme.colors.onSurfaceVariant }]}>Stats</Text>
              <Text style={[styles.rowListHeaderText, { width: 36, textAlign: 'center', color: theme.colors.onSurfaceVariant }]}>Lead</Text>
              <Text style={[styles.rowListHeaderText, { width: 96, textAlign: 'right', color: theme.colors.onSurfaceVariant }]}>Updated</Text>
              <View style={{ width: 70 }} />
            </View>
            {filteredProjects.map((project) => (
              <ProjectRow
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
        <Dialog visible={showCreate} onDismiss={() => { setShowCreate(false); setCreateStep(1); }} style={styles.dialog}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 4, gap: 8 }}>
            {[1, 2].map(s => (
              <React.Fragment key={s}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11,
                    backgroundColor: createStep >= s ? (theme.colors.primary) : (isDark ? '#2D3F55' : '#E2E8F0'),
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Text style={{ color: createStep >= s ? '#fff' : theme.colors.onSurfaceVariant, fontSize: 11, fontWeight: '800' }}>{s}</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: createStep === s ? theme.colors.onSurface : theme.colors.onSurfaceVariant }}>
                    {s === 1 ? 'Template' : 'Details'}
                  </Text>
                </View>
                {s < 2 && <View style={{ flex: 1, height: 1, backgroundColor: createStep > s ? theme.colors.primary : (isDark ? '#2D3F55' : '#E2E8F0') }} />}
              </React.Fragment>
            ))}
          </View>

          <Dialog.Title style={styles.dialogTitle}>
            {createStep === 1 ? 'Choose a template' : 'Project details'}
          </Dialog.Title>

          {createStep === 1 ? (
            <>
              <Dialog.ScrollArea style={{ paddingHorizontal: 0, maxHeight: 420 }}>
                <ScrollView style={{ paddingHorizontal: 24 }}>
                  <View style={{ gap: 10, paddingBottom: 16 }}>
                    {PROJECT_TEMPLATES.map(tpl => {
                      const active = selectedTemplate.id === tpl.id;
                      return (
                        <TouchableOpacity
                          key={tpl.id}
                          onPress={() => setSelectedTemplate(tpl)}
                          style={{
                            borderWidth: active ? 2 : 1,
                            borderColor: active ? tpl.color : theme.colors.outlineVariant,
                            borderRadius: 12,
                            padding: 16,
                            backgroundColor: active ? tpl.color + '0D' : (isDark ? '#101B2F' : theme.colors.surface),
                            flexDirection: 'row', gap: 14, alignItems: 'flex-start',
                          }}
                        >
                          <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: tpl.color + '18', borderWidth: 1, borderColor: tpl.color + '40', justifyContent: 'center', alignItems: 'center', marginTop: 2 }}>
                            <MaterialCommunityIcons name={tpl.icon} size={22} color={tpl.color} />
                          </View>
                          <View style={{ flex: 1, gap: 3 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={{ fontSize: 15, fontWeight: '700', color: active ? tpl.color : theme.colors.onSurface }}>{tpl.name}</Text>
                              <View style={{ backgroundColor: tpl.color + '18', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: tpl.color, textTransform: 'uppercase', letterSpacing: 0.4 }}>{tpl.type}</Text>
                              </View>
                            </View>
                            <Text style={{ fontSize: 13, color: theme.colors.onSurface, lineHeight: 18 }}>{tpl.description}</Text>
                            <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, marginTop: 2 }}>{tpl.hint}</Text>
                          </View>
                          {active && <MaterialCommunityIcons name="check-circle" size={20} color={tpl.color} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </Dialog.ScrollArea>
              <Dialog.Actions>
                <Button onPress={() => { setShowCreate(false); setCreateStep(1); }}>Cancel</Button>
                <Button mode="contained" onPress={() => setCreateStep(2)} icon="arrow-right">Next</Button>
              </Dialog.Actions>
            </>
          ) : (
            <Dialog.ScrollArea style={{ paddingHorizontal: 0 }}>
              <ScrollView style={{ paddingHorizontal: 24 }}>
                <Formik
                  initialValues={{ name: '', key: '', description: selectedTemplate.defaultDesc || '' }}
                  validationSchema={createSchema}
                  onSubmit={handleCreateProject}
                >
                  {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue, setErrors }) => (
                    <View style={styles.dialogForm}>
                      <TouchableOpacity
                        onPress={() => setCreateStep(1)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: selectedTemplate.color + '12', borderWidth: 1, borderColor: selectedTemplate.color + '40', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start', marginBottom: 4 }}
                      >
                        <MaterialCommunityIcons name={selectedTemplate.icon} size={15} color={selectedTemplate.color} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: selectedTemplate.color }}>{selectedTemplate.name}</Text>
                        <MaterialCommunityIcons name="pencil-outline" size={12} color={selectedTemplate.color} />
                      </TouchableOpacity>
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
                        onChangeText={(text) => { handleChange('key')(text.toUpperCase()); if (errors.key) setErrors({ key: undefined }); }}
                        onBlur={handleBlur('key')}
                        mode="outlined"
                        autoCapitalize="characters"
                        maxLength={6}
                        error={touched.key && !!errors.key}
                        style={{ marginTop: 12 }}
                      />
                      {(touched.key || errors.key) && errors.key && <HelperText type="error">{errors.key}</HelperText>}

                      <TextInput
                        label="Description"
                        value={values.description}
                        onChangeText={handleChange('description')}
                        mode="outlined"
                        multiline
                        numberOfLines={3}
                        style={{ marginTop: 12 }}
                      />

                      <View style={[styles.colorSection, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC', borderColor: theme.colors.outlineVariant }]}>
                        <View style={styles.colorSectionHeader}>
                          <View style={styles.colorSectionLabelRow}>
                            <MaterialCommunityIcons name="palette-outline" size={15} color={selectedColor} />
                            <Text style={[styles.colorLabel, { color: theme.colors.onSurface, margin: 0 }]}>Project Colour</Text>
                          </View>
                          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}>Sets the card banner colour</Text>
                        </View>

                        <View style={[styles.colorPreviewCard, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
                          <View style={[styles.colorPreviewBanner, { backgroundColor: selectedColor }]}>
                            <View style={styles.colorPreviewBadge}>
                              <Text style={styles.colorPreviewBadgeText}>{(values.key || 'PR').substring(0, 2)}</Text>
                            </View>
                            <View style={styles.colorPreviewSprintPill}>
                              <View style={styles.colorPreviewSprintDot} />
                              <Text style={styles.colorPreviewSprintText}>Active Sprint</Text>
                            </View>
                          </View>
                          <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                            <Text style={{ fontWeight: '700', fontSize: 13, color: theme.colors.onSurface }} numberOfLines={1}>
                              {values.name || 'Project Name'}
                            </Text>
                            <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                              {values.key || 'KEY'} · {selectedTemplate.type} · 0 issues
                            </Text>
                          </View>
                        </View>

                        <View style={styles.colorPicker}>
                          {PROJECT_COLORS.map((color) => {
                            const selected = selectedColor === color;
                            return (
                              <TouchableOpacity
                                key={color}
                                onPress={() => setSelectedColor(color)}
                                style={[styles.colorSwatch, {
                                  backgroundColor: color,
                                  boxShadow: selected ? `0 0 0 2.5px #fff, 0 0 0 4.5px ${color}` : 'none',
                                  transform: selected ? [{ scale: 1.12 }] : [{ scale: 1 }],
                                }]}
                              >
                                {selected && <MaterialCommunityIcons name="check" size={15} color="#fff" />}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      <View style={styles.dialogActions}>
                        <Button mode="outlined" icon="arrow-left" onPress={() => setCreateStep(1)} style={{ flex: 1 }}>Back</Button>
                        <Button mode="contained" onPress={handleSubmit} loading={isCreating} disabled={isCreating} style={{ flex: 1 }}>
                          Create
                        </Button>
                      </View>
                    </View>
                  )}
                </Formik>
              </ScrollView>
            </Dialog.ScrollArea>
          )}
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
  pageTitle: { fontSize: 20, fontWeight: '800', letterSpacing: 0 },
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

  /* Filter bar */
  filterBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 28, paddingVertical: 9,
    borderBottomWidth: 1,
  },
  filterPill: {
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  filterPillText: { fontSize: 12, fontWeight: '600' },
  viewToggle: {
    flexDirection: 'row', borderWidth: 1, borderRadius: 8, overflow: 'hidden',
  },
  viewModeBtn: {
    width: 34, height: 30,
    justifyContent: 'center', alignItems: 'center',
  },

  /* Grid */
  scroll: { flex: 1 },
  scrollContent: { padding: 28, paddingTop: 24 },
  scrollContentList: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 28 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },

  /* Card */
  card: {
    width: 300, borderRadius: 12, borderWidth: 1,
    overflow: 'hidden',
    cursor: 'pointer',
    boxShadow: '0px 2px 12px rgba(6,43,111,0.07)',
  },
  cardBanner: {
    height: 108,
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
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  activeSprintDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  activeSprintLabel: { color: '#fff', fontSize: 10, fontWeight: '700' },

  cardBody: { padding: 16, gap: 0 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  cardName: { fontSize: 14, fontWeight: '700', flex: 1, letterSpacing: 0 },
  keyChip: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
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
  footerMenuBtn: {
    width: 28, height: 28, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
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

  /* Archived ribbon */
  archivedRibbon: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
  },
  archivedRibbonText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },

  /* List view */
  rowList: { gap: 6 },
  rowListHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1,
    marginBottom: 4,
  },
  rowListHeaderText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 10, borderWidth: 1, borderLeftWidth: 4,
    cursor: 'pointer',
    boxShadow: '0px 1px 4px rgba(6,43,111,0.04)',
  },
  rowKeyBadge: {
    width: 46, height: 34, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  rowKeyText: { fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
  rowName: { fontSize: 14, fontWeight: '700' },
  rowDate: { fontSize: 11, width: 96, textAlign: 'right' },
  leadBadge: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  leadBadgePlaceholder: { width: 28 },

  /* Dialog */
  dialog: { maxWidth: 520, alignSelf: 'center', width: '100%', borderRadius: 12 },
  dialogTitle: { fontWeight: '800', fontSize: 17 },
  dialogForm: { gap: 2, paddingBottom: 8 },
  dialogActions: { flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 4 },

  /* Color section */
  colorSection: { marginTop: 16, borderRadius: 10, borderWidth: 1, padding: 14, gap: 12 },
  colorSectionHeader: { gap: 2 },
  colorSectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  colorLabel: { fontSize: 13, fontWeight: '700' },
  colorPreviewCard: { borderRadius: 8, borderWidth: 1, overflow: 'hidden' },
  colorPreviewBanner: { height: 68, justifyContent: 'flex-end', padding: 10, position: 'relative' },
  colorPreviewBadge: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  colorPreviewBadgeText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  colorPreviewSprintPill: {
    position: 'absolute', top: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  colorPreviewSprintDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#4ADE80' },
  colorPreviewSprintText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  colorPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
});

export default ProjectsScreen;
