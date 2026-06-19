import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useGlobalSearchQuery } from '../../api/searchApi';

const NAVY = '#0F2557';

const PRIORITY_COLOR = { highest: '#DC2626', high: '#F97316', medium: '#F59E0B', low: '#22C55E', lowest: '#94A3B8' };
const TYPE_ICON = { bug: 'bug', story: 'book-open', task: 'checkbox-marked-circle-outline', epic: 'lightning-bolt', subtask: 'subdirectory-arrow-right' };

const QUICK_ACTIONS = [
  { id: 'dash',    label: 'Go to Dashboard',   icon: 'view-dashboard-outline',  screen: 'Dashboard' },
  { id: 'proj',    label: 'Go to Projects',     icon: 'folder-multiple-outline', screen: 'Projects' },
  { id: 'team',    label: 'Go to Team',         icon: 'account-group-outline',   screen: 'Team' },
  { id: 'notifs',  label: 'Go to Notifications',icon: 'bell-outline',            screen: 'Notifications' },
  { id: 'profile', label: 'Go to Profile',      icon: 'account-circle-outline',  screen: 'Profile' },
];

export default function CommandPalette({ visible, onClose }) {
  const theme     = useTheme();
  const navigation = useNavigation();
  const [query, setQuery]     = useState('');
  const [active, setActive]   = useState(0);
  const inputRef  = useRef(null);
  const scrollRef = useRef(null);

  const debouncedQ = useDebounce(query, 220);
  const { data: searchData, isFetching } = useGlobalSearchQuery(
    { q: debouncedQ },
    { skip: debouncedQ.length < 2 }
  );

  const issues   = searchData?.data?.issues   || searchData?.issues   || [];
  const projects = searchData?.data?.projects  || searchData?.projects  || [];
  const users    = searchData?.data?.users     || searchData?.users     || [];

  /* Build flat result list for keyboard nav */
  const results = [
    ...(!query ? QUICK_ACTIONS.map(a => ({ ...a, _kind: 'action' })) : []),
    ...issues.map(i   => ({ ...i, _kind: 'issue' })),
    ...projects.map(p => ({ ...p, _kind: 'project' })),
    ...users.map(u    => ({ ...u, _kind: 'user' })),
    ...(query && !issues.length && !projects.length && !users.length && !isFetching ? [{ _kind: 'empty' }] : []),
  ];

  useEffect(() => { if (visible) { setQuery(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 50); } }, [visible]);

  const handleSelect = useCallback((item) => {
    onClose();
    // CommandPalette is rendered outside the Drawer, so navigation here is Stack-level.
    // All Drawer screens must be addressed via the nested path: navigate('Main', { screen })
    if (item._kind === 'action') {
      navigation.navigate('Main', { screen: item.screen });
      return;
    }
    if (item._kind === 'issue') {
      navigation.navigate('Main', { screen: 'ProjectStack', params: { screen: 'IssueDetail', params: { issueId: item.id } } });
      return;
    }
    if (item._kind === 'project') {
      navigation.navigate('Main', { screen: 'ProjectStack', params: { screen: 'ProjectDetail', params: { projectId: item.id } } });
      return;
    }
    if (item._kind === 'user') {
      navigation.navigate('Main', { screen: 'Team' });
      return;
    }
  }, [navigation, onClose]);

  /* Global keyboard handler */
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(v => Math.min(v + 1, results.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(v => Math.max(v - 1, 0)); }
      if (e.key === 'Enter') {
        const item = results[active];
        if (item && item._kind !== 'empty') handleSelect(item);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, results, active, handleSelect, onClose]);

  useEffect(() => { setActive(0); }, [query]);

  const bg     = theme.colors.surface;
  const border = theme.colors.outlineVariant;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.centerer} pointerEvents="box-none">
          <TouchableOpacity activeOpacity={1} style={[styles.palette, { backgroundColor: bg, borderColor: border }]}>

            {/* ── Search input ── */}
            <View style={[styles.inputRow, { borderBottomColor: border }]}>
              <MaterialCommunityIcons name={isFetching ? 'loading' : 'magnify'} size={20} color={theme.colors.onSurfaceVariant} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search issues, projects, people…"
                style={{
                  flex: 1, border: 'none', outline: 'none', fontSize: 16,
                  background: 'transparent', color: theme.colors.onSurface,
                  fontFamily: 'inherit', marginLeft: 10,
                }}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              )}
              <View style={[styles.escBadge, { borderColor: border }]}>
                <Text style={{ fontSize: 10, color: theme.colors.onSurfaceVariant }}>ESC</Text>
              </View>
            </View>

            {/* ── Results ── */}
            <ScrollView ref={scrollRef} style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">

              {/* Quick Actions (when no query) */}
              {!query && (
                <View>
                  <SectionLabel label="Quick Actions" theme={theme} />
                  {QUICK_ACTIONS.map((a, i) => (
                    <ResultRow
                      key={a.id}
                      active={active === i}
                      onPress={() => handleSelect({ ...a, _kind: 'action' })}
                      onHover={() => setActive(i)}
                      theme={theme}
                    >
                      <View style={[styles.typeIcon, { backgroundColor: NAVY + '18' }]}>
                        <MaterialCommunityIcons name={a.icon} size={15} color={NAVY} />
                      </View>
                      <Text style={[styles.resultTitle, { color: theme.colors.onSurface }]}>{a.label}</Text>
                    </ResultRow>
                  ))}
                </View>
              )}

              {/* Issues */}
              {issues.length > 0 && (
                <View>
                  <SectionLabel label="Issues" theme={theme} />
                  {issues.map((issue, i) => {
                    const idx = (query ? 0 : QUICK_ACTIONS.length) + i;
                    return (
                      <ResultRow
                        key={issue.id}
                        active={active === idx}
                        onPress={() => handleSelect({ ...issue, _kind: 'issue' })}
                        onHover={() => setActive(idx)}
                        theme={theme}
                      >
                        <View style={[styles.typeIcon, { backgroundColor: PRIORITY_COLOR[issue.priority] + '22' }]}>
                          <MaterialCommunityIcons
                            name={TYPE_ICON[issue.type] || 'checkbox-marked-circle-outline'}
                            size={14}
                            color={PRIORITY_COLOR[issue.priority] || '#64748B'}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.resultTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>{issue.title}</Text>
                          <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>{issue.key}</Text>
                        </View>
                        <View style={[styles.typePill, { backgroundColor: PRIORITY_COLOR[issue.priority] + '20' }]}>
                          <Text style={{ fontSize: 10, color: PRIORITY_COLOR[issue.priority], fontWeight: '700', textTransform: 'capitalize' }}>
                            {issue.priority}
                          </Text>
                        </View>
                      </ResultRow>
                    );
                  })}
                </View>
              )}

              {/* Projects */}
              {projects.length > 0 && (
                <View>
                  <SectionLabel label="Projects" theme={theme} />
                  {projects.map((proj, i) => {
                    const idx = (query ? 0 : QUICK_ACTIONS.length) + issues.length + i;
                    return (
                      <ResultRow
                        key={proj.id}
                        active={active === idx}
                        onPress={() => handleSelect({ ...proj, _kind: 'project' })}
                        onHover={() => setActive(idx)}
                        theme={theme}
                      >
                        <View style={[styles.typeIcon, { backgroundColor: NAVY + '18' }]}>
                          <MaterialCommunityIcons name="folder-outline" size={14} color={NAVY} />
                        </View>
                        <Text style={[styles.resultTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>{proj.name}</Text>
                        <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>{proj.key}</Text>
                      </ResultRow>
                    );
                  })}
                </View>
              )}

              {/* People */}
              {users.length > 0 && (
                <View>
                  <SectionLabel label="People" theme={theme} />
                  {users.map((user, i) => {
                    const idx = (query ? 0 : QUICK_ACTIONS.length) + issues.length + projects.length + i;
                    return (
                      <ResultRow
                        key={user.id}
                        active={active === idx}
                        onPress={() => handleSelect({ ...user, _kind: 'user' })}
                        onHover={() => setActive(idx)}
                        theme={theme}
                      >
                        <View style={[styles.typeIcon, { backgroundColor: '#6366F1' + '22' }]}>
                          <MaterialCommunityIcons name="account-outline" size={14} color="#6366F1" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.resultTitle, { color: theme.colors.onSurface }]}>
                            {user.firstName} {user.lastName}
                          </Text>
                          <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>{user.email}</Text>
                        </View>
                      </ResultRow>
                    );
                  })}
                </View>
              )}

              {/* Empty */}
              {query.length >= 2 && !isFetching && !issues.length && !projects.length && !users.length && (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="magnify-close" size={32} color={theme.colors.onSurfaceVariant} />
                  <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>No results for "{query}"</Text>
                </View>
              )}

            </ScrollView>

            {/* ── Footer hint ── */}
            <View style={[styles.footer, { borderTopColor: border }]}>
              <HintKey label="↑↓" desc="navigate" />
              <HintKey label="↵" desc="select" />
              <HintKey label="ESC" desc="close" />
            </View>

          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

/* ─── Sub-components ─── */
const SectionLabel = ({ label, theme }) => (
  <View style={styles.sectionLabel}>
    <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.8 }}>
      {label}
    </Text>
  </View>
);

const ResultRow = ({ children, active, onPress, onHover, theme }) => (
  <TouchableOpacity
    onPress={onPress}
    onMouseEnter={onHover}
    style={[styles.resultRow, active && { backgroundColor: theme.colors.primaryContainer + '60' }]}
  >
    {children}
  </TouchableOpacity>
);

const HintKey = ({ label, desc }) => (
  <View style={styles.hintItem}>
    <View style={styles.hintKey}><Text style={styles.hintKeyText}>{label}</Text></View>
    <Text style={styles.hintDesc}>{desc}</Text>
  </View>
);

/* ─── Debounce hook ─── */
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-start', alignItems: 'center' },
  centerer: { width: '100%', alignItems: 'center', paddingTop: 80 },
  palette: {
    width: '100%', maxWidth: 600,
    borderRadius: 16, borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(0,0,0,0.28)',
  },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  escBadge: {
    borderWidth: 1, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2, marginLeft: 8,
  },

  sectionLabel: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },

  resultRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 12,
    cursor: 'pointer',
  },
  typeIcon: { width: 28, height: 28, borderRadius: 7, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  resultTitle: { fontSize: 14, fontWeight: '500' },
  typePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

  emptyState: { alignItems: 'center', paddingVertical: 32 },

  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1,
  },
  hintItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  hintKey: { backgroundColor: 'rgba(0,0,0,0.07)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  hintKeyText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  hintDesc: { fontSize: 11, color: '#94A3B8' },
});
