import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ROLE_LABELS } from '../../constants';

const NAVY = '#0F2557';

/* Numeric access level per role — higher = more permissions */
const ROLE_LEVEL = {
  viewer: 1, reporter: 2, developer: 3, team_lead: 4,
  project_manager: 5, org_admin: 6, super_admin: 7,
};
const ROLE_COLOR = {
  super_admin: '#7C3AED', org_admin: '#DB2777', project_manager: '#0369A1',
  team_lead: '#0891B2', developer: '#0D9488', reporter: '#15803D', viewer: '#92400E',
};
const LEVEL_LABEL = {
  1: 'All roles', 2: 'Reporter+', 3: 'Developer+',
  4: 'Team Lead+', 5: 'Project Manager+', 6: 'Org Admin+', 7: 'Super Admin only',
};

/* ─── Feature definitions ─── */
const FEATURES = [
  {
    key: 'dashboard',
    icon: 'view-dashboard-outline',
    color: '#0369A1',
    title: 'Dashboard',
    desc: 'Your personal overview of active work, recent activity, and key project metrics.',
    minLevel: 1,
    capabilities: [
      { text: 'View issues assigned to you',              minLevel: 1 },
      { text: 'See recent project activity feed',         minLevel: 1 },
      { text: 'Quick-navigate to any project',            minLevel: 1 },
      { text: 'View unread notification count',           minLevel: 1 },
      { text: 'Overview of team workload stats',          minLevel: 4 },
    ],
  },
  {
    key: 'issues',
    icon: 'ticket-outline',
    color: '#0D9488',
    title: 'Issues',
    desc: 'Track bugs, features, stories, and tasks across all your projects.',
    minLevel: 1,
    capabilities: [
      { text: 'View issues and full details',             minLevel: 1 },
      { text: 'Add comments on any issue',                minLevel: 1 },
      { text: 'Create new issues',                        minLevel: 2 },
      { text: 'Edit issue details, type, and priority',  minLevel: 3 },
      { text: 'Change issue workflow status',             minLevel: 3 },
      { text: 'Upload attachments (images & files)',      minLevel: 3 },
      { text: 'Log time spent on an issue',              minLevel: 3 },
      { text: 'Link issues (blocks, relates to)',         minLevel: 3 },
      { text: 'Add watchers to issues',                   minLevel: 3 },
      { text: 'Assign issues to team members',            minLevel: 4 },
      { text: 'Create sub-tasks under an issue',          minLevel: 4 },
      { text: 'Delete issues permanently',                minLevel: 5 },
    ],
  },
  {
    key: 'attachments',
    icon: 'paperclip',
    color: '#F59E0B',
    title: 'Attachments & Files',
    desc: 'Attach images, documents, and links directly to any issue for full context.',
    minLevel: 3,
    capabilities: [
      { text: 'Upload images (auto-compressed)',          minLevel: 3 },
      { text: 'Upload files: PDF, Word, Excel, PPT, CSV, ZIP', minLevel: 3 },
      { text: 'Add URL links with custom labels',         minLevel: 3 },
      { text: 'Download any attachment',                  minLevel: 1 },
      { text: 'Delete your own attachments',              minLevel: 3 },
      { text: 'Files stored securely on AWS S3',          minLevel: 1 },
    ],
  },
  {
    key: 'projects',
    icon: 'folder-open-outline',
    color: '#7C3AED',
    title: 'Projects',
    desc: 'Manage your project portfolio with Kanban boards, backlogs, sprints, and epics.',
    minLevel: 1,
    capabilities: [
      { text: 'View projects you are a member of',        minLevel: 1 },
      { text: 'Drag issues between Kanban board columns', minLevel: 3 },
      { text: 'View project backlog',                     minLevel: 1 },
      { text: 'Manage sprints and sprint goals',          minLevel: 4 },
      { text: 'Plan and groom the backlog',               minLevel: 4 },
      { text: 'Create and manage epics',                  minLevel: 4 },
      { text: 'Add milestones and releases',              minLevel: 5 },
      { text: 'Configure project settings & workflows',   minLevel: 5 },
      { text: 'Create new projects',                      minLevel: 5 },
      { text: 'Archive or delete projects',               minLevel: 6 },
    ],
  },
  {
    key: 'sprints',
    icon: 'lightning-bolt-outline',
    color: '#EF4444',
    title: 'Sprints & Kanban',
    desc: 'Run agile sprints, track velocity, and visualize work on the Kanban board.',
    minLevel: 1,
    capabilities: [
      { text: 'View active sprint board',                 minLevel: 1 },
      { text: 'Move issues between columns (drag & drop)',minLevel: 3 },
      { text: 'Create new sprints',                       minLevel: 4 },
      { text: 'Add issues to a sprint from backlog',      minLevel: 4 },
      { text: 'Start and complete a sprint',              minLevel: 4 },
      { text: 'Move unfinished issues to next sprint',    minLevel: 4 },
      { text: 'View sprint burndown chart',               minLevel: 4 },
    ],
  },
  {
    key: 'team',
    icon: 'account-group-outline',
    color: '#DB2777',
    title: 'Team Management',
    desc: 'Oversee your organization members, roles, workloads, and project assignments.',
    minLevel: 4,
    capabilities: [
      { text: 'View all team members and their roles',    minLevel: 4 },
      { text: 'View member workload (open/done issues)',  minLevel: 4 },
      { text: 'Assign members to projects with a role',  minLevel: 5 },
      { text: 'Change a member\'s organization role',    minLevel: 6 },
      { text: 'Deactivate (block) member accounts',      minLevel: 6 },
      { text: 'Reactivate suspended accounts',           minLevel: 6 },
    ],
  },
  {
    key: 'invite',
    icon: 'email-plus-outline',
    color: '#10B981',
    title: 'Member Invitations',
    desc: 'Invite colleagues to join your organization using single-use invite tokens.',
    minLevel: 5,
    capabilities: [
      { text: 'Generate single-use invite tokens',        minLevel: 5 },
      { text: 'Lock an invite to a specific email',       minLevel: 5 },
      { text: 'View all active pending invites',          minLevel: 5 },
      { text: 'Revoke invites before they are used',      minLevel: 5 },
      { text: 'Tokens expire automatically in 72 hours',  minLevel: 5 },
      { text: 'Invite for any role up to your own level', minLevel: 6 },
    ],
  },
  {
    key: 'notifications',
    icon: 'bell-ring-outline',
    color: '#6366F1',
    title: 'Notifications',
    desc: 'Stay up to date with real-time in-app and email notifications for all activity.',
    minLevel: 1,
    capabilities: [
      { text: 'In-app notifications for issue updates',   minLevel: 1 },
      { text: 'Notified when assigned to an issue',       minLevel: 1 },
      { text: 'Notified when someone comments on your issue', minLevel: 1 },
      { text: 'Email alerts for critical events',         minLevel: 1 },
      { text: 'Mark notifications as read',               minLevel: 1 },
      { text: 'Toggle in-app notifications in Profile → Account', minLevel: 1 },
    ],
  },
  {
    key: 'search',
    icon: 'magnify',
    color: '#0891B2',
    title: 'Search & Command Palette',
    desc: 'Instantly find anything — issues, projects, screens — with the global command palette.',
    minLevel: 1,
    capabilities: [
      { text: 'Open with Cmd+K (Mac) or Ctrl+K (Windows)', minLevel: 1 },
      { text: 'Search issues by title or issue key',      minLevel: 1 },
      { text: 'Jump to any project or screen instantly',  minLevel: 1 },
      { text: 'Results filtered by your access level',    minLevel: 1 },
    ],
  },
  {
    key: 'profile',
    icon: 'account-cog-outline',
    color: '#92400E',
    title: 'Profile & Settings',
    desc: 'Manage your personal information, password, and notification preferences.',
    minLevel: 1,
    capabilities: [
      { text: 'Update display name and timezone',         minLevel: 1 },
      { text: 'Toggle in-app notification preferences',   minLevel: 1 },
      { text: 'Change your password',                     minLevel: 1 },
      { text: 'View and manage active sessions',          minLevel: 1 },
      { text: 'Access this User Manual',                  minLevel: 1 },
    ],
  },
];

/* ─── Keyboard shortcuts ─── */
const SHORTCUTS = [
  { keys: ['Cmd', 'K'],   winKeys: ['Ctrl', 'K'],   desc: 'Open Command Palette / Global Search' },
  { keys: ['Esc'],        winKeys: ['Esc'],          desc: 'Close any open dialog or panel' },
];

/* ─── FAQ definitions ─── */
const FAQS = [
  {
    q: 'How do I change my password?',
    a: 'Go to Profile (left sidebar) → Security tab → Change Password section. Enter your current password, new password, confirm it, and click Update Password.',
    minLevel: 1,
    icon: 'lock-reset',
  },
  {
    q: 'How do I create an issue?',
    a: 'Navigate to a project → open the Board or Backlog → click the "+ Create Issue" button. Fill in the title, type (Bug, Feature, Story, Task), priority, and assignee, then click Create.',
    minLevel: 2,
    icon: 'ticket-plus-outline',
  },
  {
    q: 'How do I change an issue\'s status?',
    a: 'Open an issue → click the current status badge near the top of the detail panel → select the new status from the workflow dropdown. Only valid transitions are shown.',
    minLevel: 1,
    icon: 'swap-horizontal',
  },
  {
    q: 'How do I upload files or images to an issue?',
    a: 'Open an issue → scroll to the Attachments section → click the image button to upload a photo (auto-compressed), or the file button for PDFs, Word, Excel, PPT, CSV, or ZIP files. Files are stored on AWS S3 and links expire after 1 hour for security.',
    minLevel: 3,
    icon: 'paperclip',
  },
  {
    q: 'How do I log time on an issue?',
    a: 'Open an issue → find the Time Log section on the right panel → click the "+" button → enter hours spent and an optional note. Logged time is visible to everyone on the issue.',
    minLevel: 3,
    icon: 'clock-plus-outline',
  },
  {
    q: 'What is the difference between Board and Backlog?',
    a: 'Board shows the current active sprint issues arranged in Kanban columns (To Do, In Progress, Done) — great for day-to-day work. Backlog shows all unscheduled issues waiting to be planned into a sprint, useful for grooming and sprint planning.',
    minLevel: 1,
    icon: 'view-column-outline',
  },
  {
    q: 'How do I use the search / command palette?',
    a: 'Press Cmd+K on Mac or Ctrl+K on Windows from anywhere in the app. Start typing to search issues by title or issue key, or navigate directly to any screen. Results are shown instantly as you type.',
    minLevel: 1,
    icon: 'magnify',
  },
  {
    q: 'Why can\'t I see the Team page?',
    a: 'The Team page is only visible to Team Lead, Project Manager, Org Admin, and Super Admin roles. If you believe you need access, contact your organization administrator to have your role updated.',
    minLevel: 1,
    icon: 'account-group-outline',
  },
  {
    q: 'Can I change my own role?',
    a: 'No. Roles are assigned and managed by Org Admins and Super Admins only. Contact your administrator to request a role change.',
    minLevel: 1,
    icon: 'shield-account-outline',
  },
  {
    q: 'How do I start a sprint?',
    a: 'Go to a project → Backlog or Sprints → select a planned sprint → click "Start Sprint". Set the start and end dates, optionally add a sprint goal, and confirm.',
    minLevel: 4,
    icon: 'lightning-bolt-outline',
  },
  {
    q: 'How do I add issues to a sprint?',
    a: 'In the Backlog view, drag issues from the backlog section into the desired sprint, or open an issue and use the Sprint field to select a sprint directly.',
    minLevel: 4,
    icon: 'playlist-plus',
  },
  {
    q: 'How do I invite a new team member?',
    a: 'Go to Profile → Invite Members tab → choose a role for the invitee → optionally enter their email → click Generate. Share the generated token. Tokens expire in 72 hours and can only be used once.',
    minLevel: 5,
    icon: 'email-plus-outline',
  },
  {
    q: 'How do I deactivate a team member?',
    a: 'Go to Team → click on the member\'s card to open their details panel → scroll to the bottom → click "Deactivate Account". They are immediately signed out and blocked from logging in. You can reactivate them anytime.',
    minLevel: 6,
    icon: 'account-cancel-outline',
  },
  {
    q: 'What happens to a deactivated member\'s data?',
    a: 'Their issues, comments, attachments, and activity history remain fully intact. Only their ability to log in is blocked. Reactivating restores full access immediately.',
    minLevel: 6,
    icon: 'database-outline',
  },
  {
    q: 'How do I configure project workflows?',
    a: 'Go to a project → Project Settings → Workflow section. Here you can add, rename, reorder, and remove workflow statuses. Changes apply immediately to all issues in that project.',
    minLevel: 5,
    icon: 'cog-outline',
  },
];

/* ─── Feature Card component ─── */
const FeatureCard = ({ feature, userLevel, theme, searchQuery }) => {
  const [expanded, setExpanded] = useState(false);
  const hasAccess = userLevel >= feature.minLevel;
  const border = theme.colors.outlineVariant;

  const visibleCapabilities = feature.capabilities.filter(c =>
    !searchQuery || c.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[
      styles.featureCard,
      {
        backgroundColor: theme.colors.surface,
        borderColor: hasAccess ? feature.color + '25' : border,
        borderLeftColor: hasAccess ? feature.color : border,
        opacity: hasAccess ? 1 : 0.7,
      },
    ]}>
      {/* Card header */}
      <TouchableOpacity
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.85}
        style={styles.featureCardHeader}
      >
        <View style={[styles.featureIcon, { backgroundColor: feature.color + '14' }]}>
          <MaterialCommunityIcons name={feature.icon} size={20} color={feature.color} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={[styles.featureTitle, { color: theme.colors.onSurface }]}>{feature.title}</Text>
            {!hasAccess && (
              <View style={[styles.lockBadge, { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }]}>
                <MaterialCommunityIcons name="lock-outline" size={10} color="#6B7280" />
                <Text style={{ fontSize: 9, color: '#6B7280', fontWeight: '700' }}>
                  {LEVEL_LABEL[feature.minLevel]}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.featureDesc, { color: theme.colors.onSurfaceVariant }]} numberOfLines={expanded ? undefined : 2}>
            {feature.desc}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18} color={theme.colors.onSurfaceVariant}
        />
      </TouchableOpacity>

      {/* Capabilities list */}
      {expanded && (
        <View style={[styles.capsList, { borderTopColor: border }]}>
          {visibleCapabilities.map((cap, i) => {
            const canUse = userLevel >= cap.minLevel;
            return (
              <View key={i} style={styles.capRow}>
                <MaterialCommunityIcons
                  name={canUse ? 'check-circle' : 'lock-outline'}
                  size={14}
                  color={canUse ? '#10B981' : '#9CA3AF'}
                />
                <Text style={[styles.capText, { color: canUse ? theme.colors.onSurface : '#9CA3AF' }]}>
                  {cap.text}
                </Text>
                {!canUse && (
                  <Text style={styles.capRequires}>{LEVEL_LABEL[cap.minLevel]}</Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

/* ─── FAQ Item component ─── */
const FaqItem = ({ faq, userLevel, theme }) => {
  const [open, setOpen] = useState(false);
  const isAdminOnly = faq.minLevel >= 5;

  return (
    <View style={[styles.faqItem, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
      <TouchableOpacity
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.85}
        style={styles.faqHeader}
      >
        <View style={[styles.faqIconWrap, { backgroundColor: NAVY + '0E' }]}>
          <MaterialCommunityIcons name={faq.icon} size={15} color={NAVY} />
        </View>
        <Text style={[styles.faqQ, { color: theme.colors.onSurface, flex: 1 }]}>{faq.q}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {isAdminOnly && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeTxt}>{LEVEL_LABEL[faq.minLevel]}</Text>
            </View>
          )}
          <MaterialCommunityIcons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={16} color={theme.colors.onSurfaceVariant}
          />
        </View>
      </TouchableOpacity>
      {open && (
        <View style={[styles.faqBody, { borderTopColor: theme.colors.outlineVariant }]}>
          <Text style={[styles.faqA, { color: theme.colors.onSurface }]}>{faq.a}</Text>
        </View>
      )}
    </View>
  );
};

/* ═══════════════════════════════════════════
   Main UserManualSection
═══════════════════════════════════════════ */
export default function UserManualSection({ user }) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('features'); // 'features' | 'faq' | 'shortcuts'

  const userLevel = ROLE_LEVEL[user?.role] || 1;
  const rc = ROLE_COLOR[user?.role] || '#6B7280';
  const q = search.toLowerCase();

  const filteredFeatures = useMemo(() =>
    FEATURES.filter(f =>
      !q ||
      f.title.toLowerCase().includes(q) ||
      f.desc.toLowerCase().includes(q) ||
      f.capabilities.some(c => c.text.toLowerCase().includes(q))
    ),
    [q]
  );

  const filteredFaqs = useMemo(() =>
    FAQS.filter(f => !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)),
    [q]
  );

  const surf   = theme.colors.surface;
  const border = theme.colors.outlineVariant;

  const tabs = [
    { key: 'features',  label: 'Features',   icon: 'view-grid-outline' },
    { key: 'faq',       label: 'FAQ',         icon: 'help-circle-outline' },
    { key: 'shortcuts', label: 'Shortcuts',   icon: 'keyboard-outline' },
  ];

  return (
    <View style={{ flex: 1 }}>

      {/* ── Role awareness banner ── */}
      <View style={[styles.roleBanner, { backgroundColor: rc + '0E', borderColor: rc + '30' }]}>
        <View style={[styles.roleBannerIcon, { backgroundColor: rc + '18' }]}>
          <MaterialCommunityIcons name="shield-account-outline" size={20} color={rc} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.roleBannerTitle, { color: rc }]}>
            Your role: {ROLE_LABELS[user?.role] || user?.role}
          </Text>
          <Text style={[styles.roleBannerSub, { color: theme.colors.onSurfaceVariant }]}>
            {userLevel >= 6
              ? 'You have full administrative access — all features are available to you.'
              : userLevel >= 5
              ? 'You can manage projects, invite members, and oversee team work.'
              : userLevel >= 4
              ? 'You can manage sprints, plan work, and view the team page.'
              : userLevel >= 3
              ? 'You can create issues, upload files, log time, and manage your work.'
              : userLevel >= 2
              ? 'You can view and create issues, and add comments.'
              : 'You have read-only access. You can view issues and add comments.'}
          </Text>
        </View>
        <View style={[styles.levelBadge, { backgroundColor: rc }]}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>
            Level {userLevel}
          </Text>
        </View>
      </View>

      {/* ── Search bar ── */}
      <View style={[styles.searchWrap, { backgroundColor: surf, borderColor: border }]}>
        <MaterialCommunityIcons name="magnify" size={16} color={theme.colors.onSurfaceVariant} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search features, capabilities, or FAQ..."
          placeholderTextColor={theme.colors.onSurfaceVariant}
          style={[styles.searchInput, { color: theme.colors.onSurface, outlineStyle: 'none' }]}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialCommunityIcons name="close-circle" size={14} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Tab switcher ── */}
      {!search && (
        <View style={[styles.tabRow, { borderBottomColor: border }]}>
          {tabs.map(t => {
            const active = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setActiveTab(t.key)}
                style={[styles.tab, active && { borderBottomColor: NAVY }]}
              >
                <MaterialCommunityIcons name={t.icon} size={15} color={active ? NAVY : theme.colors.onSurfaceVariant} />
                <Text style={[styles.tabLabel, { color: active ? NAVY : theme.colors.onSurfaceVariant }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── FEATURES tab ── */}
      {(search || activeTab === 'features') && (
        <>
          {!search && (
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, { backgroundColor: NAVY }]} />
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>All Features</Text>
              <Text style={[styles.sectionSub, { color: theme.colors.onSurfaceVariant }]}>
                {FEATURES.filter(f => userLevel >= f.minLevel).length} of {FEATURES.length} available to your role
              </Text>
            </View>
          )}
          {filteredFeatures.map(f => (
            <FeatureCard
              key={f.key}
              feature={f}
              userLevel={userLevel}
              theme={theme}
              searchQuery={q}
            />
          ))}
          {filteredFeatures.length === 0 && (
            <View style={styles.emptySearch}>
              <MaterialCommunityIcons name="magnify-remove-outline" size={32} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.emptyTxt, { color: theme.colors.onSurfaceVariant }]}>No features match "{search}"</Text>
            </View>
          )}
        </>
      )}

      {/* ── FAQ tab ── */}
      {(search || activeTab === 'faq') && (
        <>
          {!search && (
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, { backgroundColor: '#6366F1' }]} />
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Frequently Asked Questions</Text>
              <Text style={[styles.sectionSub, { color: theme.colors.onSurfaceVariant }]}>
                {FAQS.length} questions answered
              </Text>
            </View>
          )}
          {filteredFaqs.map((f, i) => (
            <FaqItem key={i} faq={f} userLevel={userLevel} theme={theme} />
          ))}
          {filteredFaqs.length === 0 && (
            <View style={styles.emptySearch}>
              <MaterialCommunityIcons name="help-circle-outline" size={32} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.emptyTxt, { color: theme.colors.onSurfaceVariant }]}>No FAQ matches "{search}"</Text>
            </View>
          )}
        </>
      )}

      {/* ── SHORTCUTS tab ── */}
      {!search && activeTab === 'shortcuts' && (
        <>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccent, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Keyboard Shortcuts</Text>
            <Text style={[styles.sectionSub, { color: theme.colors.onSurfaceVariant }]}>Available in the web app</Text>
          </View>

          {/* Platform note */}
          <View style={[styles.platformNote, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <MaterialCommunityIcons name="information-outline" size={14} color="#1D4ED8" />
            <Text style={{ fontSize: 12, color: '#1D4ED8', flex: 1 }}>
              On Mac use <Text style={{ fontWeight: '800' }}>Cmd (⌘)</Text>. On Windows/Linux use <Text style={{ fontWeight: '800' }}>Ctrl</Text>.
            </Text>
          </View>

          <View style={[styles.shortcutsCard, { backgroundColor: surf, borderColor: border }]}>
            {/* Header */}
            <View style={[styles.shortcutsHead, { backgroundColor: NAVY }]}>
              <Text style={[styles.shortcutsColH, { flex: 1 }]}>Mac</Text>
              <Text style={[styles.shortcutsColH, { flex: 1 }]}>Windows / Linux</Text>
              <Text style={[styles.shortcutsColH, { flex: 2 }]}>Action</Text>
            </View>
            {SHORTCUTS.map((s, i) => (
              <View
                key={i}
                style={[styles.shortcutRow, {
                  backgroundColor: i % 2 === 0 ? surf : theme.colors.background,
                  borderBottomColor: border,
                }]}
              >
                <View style={[styles.shortcutKeyGroup, { flex: 1 }]}>
                  {s.keys.map((k, j) => (
                    <React.Fragment key={j}>
                      <View style={[styles.kbdKey, { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }]}>
                        <Text style={styles.kbdKeyTxt}>{k}</Text>
                      </View>
                      {j < s.keys.length - 1 && <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, fontWeight: '700' }}>+</Text>}
                    </React.Fragment>
                  ))}
                </View>
                <View style={[styles.shortcutKeyGroup, { flex: 1 }]}>
                  {s.winKeys.map((k, j) => (
                    <React.Fragment key={j}>
                      <View style={[styles.kbdKey, { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }]}>
                        <Text style={styles.kbdKeyTxt}>{k}</Text>
                      </View>
                      {j < s.winKeys.length - 1 && <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, fontWeight: '700' }}>+</Text>}
                    </React.Fragment>
                  ))}
                </View>
                <Text style={[{ flex: 2, fontSize: 13, color: theme.colors.onSurface }]}>{s.desc}</Text>
              </View>
            ))}
          </View>

          {/* Additional tips */}
          <View style={[styles.tipsCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#D97706" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400E' }}>Pro Tips</Text>
            </View>
            {[
              'Use the Command Palette to jump to any project or issue without navigating the sidebar.',
              'Press Esc to close any open dialog, dropdown, or side panel quickly.',
              'Click on a member card in the Team page to open their detail panel and workload stats.',
              'Drag issues between Kanban columns on the Board to update their status instantly.',
              'Attachments are displayed with signed URLs that expire after 1 hour for security — refresh the page if links stop working.',
            ].map((tip, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <Text style={{ color: '#D97706', fontSize: 12, fontWeight: '800', marginTop: 1 }}>{i + 1}.</Text>
                <Text style={{ fontSize: 12, color: '#78350F', flex: 1 }}>{tip}</Text>
              </View>
            ))}
          </View>

          {/* Role comparison table */}
          <View style={[styles.shortcutsCard, { backgroundColor: surf, borderColor: border, marginTop: 24 }]}>
            <View style={[styles.shortcutsHead, { backgroundColor: NAVY }]}>
              <Text style={[styles.shortcutsColH, { flex: 2 }]}>Feature</Text>
              {['Viewer', 'Reporter', 'Dev', 'Lead', 'PM', 'Admin'].map(r => (
                <Text key={r} style={[styles.shortcutsColH, { flex: 1, textAlign: 'center' }]}>{r}</Text>
              ))}
            </View>
            {[
              { label: 'View issues',        levels: [1,1,1,1,1,1] },
              { label: 'Create issues',      levels: [0,1,1,1,1,1] },
              { label: 'Upload files',       levels: [0,0,1,1,1,1] },
              { label: 'Log time',           levels: [0,0,1,1,1,1] },
              { label: 'Manage sprints',     levels: [0,0,0,1,1,1] },
              { label: 'View team page',     levels: [0,0,0,1,1,1] },
              { label: 'Project settings',   levels: [0,0,0,0,1,1] },
              { label: 'Invite members',     levels: [0,0,0,0,1,1] },
              { label: 'Manage roles',       levels: [0,0,0,0,0,1] },
              { label: 'Deactivate users',   levels: [0,0,0,0,0,1] },
            ].map((row, i) => (
              <View
                key={i}
                style={[styles.shortcutRow, {
                  backgroundColor: i % 2 === 0 ? surf : theme.colors.background,
                  borderBottomColor: border,
                }]}
              >
                <Text style={{ flex: 2, fontSize: 12, color: theme.colors.onSurface, fontWeight: '500' }}>
                  {row.label}
                </Text>
                {row.levels.map((has, j) => (
                  <View key={j} style={{ flex: 1, alignItems: 'center' }}>
                    <MaterialCommunityIcons
                      name={has ? 'check-circle' : 'minus-circle-outline'}
                      size={15}
                      color={has ? '#10B981' : '#D1D5DB'}
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>
        </>
      )}

      {/* bottom spacer */}
      <View style={{ height: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  /* Role banner */
  roleBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 20,
  },
  roleBannerIcon: {
    width: 38, height: 38, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  roleBannerTitle: { fontSize: 13, fontWeight: '800' },
  roleBannerSub:   { fontSize: 12, marginTop: 3, lineHeight: 18 },
  levelBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
    alignSelf: 'flex-start',
  },

  /* Search */
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, height: 40, marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 13, borderWidth: 0, backgroundColor: 'transparent', height: '100%' },

  /* Tabs */
  tabRow: {
    flexDirection: 'row', borderBottomWidth: 1, marginBottom: 20,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 2,
    borderBottomColor: 'transparent', cursor: 'pointer',
  },
  tabLabel: { fontSize: 13, fontWeight: '600' },

  /* Section heading */
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  sectionAccent: { width: 4, height: 18, borderRadius: 2 },
  sectionTitle:  { fontSize: 15, fontWeight: '800' },
  sectionSub:    { fontSize: 12, flex: 1, textAlign: 'right' },

  /* Feature card */
  featureCard: {
    borderRadius: 12, borderWidth: 1, borderLeftWidth: 4,
    marginBottom: 12, overflow: 'hidden',
  },
  featureCardHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 16, gap: 0, cursor: 'pointer',
  },
  featureIcon: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  featureTitle: { fontSize: 14, fontWeight: '800' },
  featureDesc:  { fontSize: 12, marginTop: 3, lineHeight: 17 },
  lockBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1,
  },

  capsList: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  capRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  capText: { flex: 1, fontSize: 12, lineHeight: 18 },
  capRequires: {
    fontSize: 10, color: '#9CA3AF',
    backgroundColor: '#F3F4F6', paddingHorizontal: 5,
    paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start',
  },

  /* FAQ */
  faqItem: {
    borderRadius: 10, borderWidth: 1,
    marginBottom: 8, overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, cursor: 'pointer',
  },
  faqIconWrap: {
    width: 30, height: 30, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  faqQ:    { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  faqBody: { paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  faqA:    { fontSize: 13, lineHeight: 20 },
  adminBadge: {
    backgroundColor: '#FEF3C7', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  adminBadgeTxt: { fontSize: 9, fontWeight: '700', color: '#92400E' },

  /* Shortcuts */
  platformNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 16,
  },
  shortcutsCard: {
    borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 20,
  },
  shortcutsHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  shortcutsColH: {
    fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  shortcutRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  shortcutKeyGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kbdKey: {
    borderWidth: 1, borderRadius: 5,
    paddingHorizontal: 7, paddingVertical: 3,
    borderBottomWidth: 2,
  },
  kbdKeyTxt: { fontSize: 11, fontWeight: '700', color: '#374151', fontFamily: 'monospace' },

  /* Tips card */
  tipsCard: {
    borderRadius: 12, borderWidth: 1,
    padding: 16, marginBottom: 8,
  },

  /* Empty state */
  emptySearch: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTxt: { fontSize: 13 },
});
