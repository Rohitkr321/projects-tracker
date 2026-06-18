import React, { useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme, FAB, Chip, Searchbar, Button, Menu } from 'react-native-paper';
import { useGetIssuesQuery } from '../../api/issueApi';
import IssueRow from '../../components/issues/IssueRow';
import EmptyState from '../../components/common/EmptyState';
import LoadingScreen from '../../components/common/LoadingScreen';

const BacklogScreen = ({ route, navigation }) => {
  const { projectId } = route.params;
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState(null);
  const [filterPriority, setFilterPriority] = useState(null);

  const { data, isLoading, refetch } = useGetIssuesQuery({
    projectId,
    noSprint: true,
    search,
    type: filterType,
    priority: filterPriority,
    limit: 100,
  });

  const issues = data?.data?.data || [];

  if (isLoading && issues.length === 0) return <LoadingScreen />;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.toolbar}>
        <Searchbar
          placeholder="Search backlog..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchbar}
        />
        <View style={styles.filters}>
          {[['bug', 'Bug'], ['task', 'Task'], ['story', 'Story'], ['epic', 'Epic']].map(([value, label]) => (
            <Chip
              key={value}
              selected={filterType === value}
              onPress={() => setFilterType(filterType === value ? null : value)}
              compact
              style={styles.filterChip}
            >
              {label}
            </Chip>
          ))}
        </View>
      </View>

      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
          Backlog ({issues.length})
        </Text>
        <Button compact onPress={() => navigation.navigate('CreateIssue', { projectId })}>+ Issue</Button>
      </View>

      <FlatList
        data={issues}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <IssueRow
            issue={item}
            onPress={() => navigation.navigate('IssueDetail', { issueId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="inbox" title="Backlog is empty" description="All issues are in sprints or none exist yet" />
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#FFFFFF"
        onPress={() => navigation.navigate('CreateIssue', { projectId })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: { padding: 12, gap: 8 },
  searchbar: { borderRadius: 10 },
  filters: { flexDirection: 'row', gap: 6 },
  filterChip: { borderRadius: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  list: { paddingBottom: 80 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});

export default BacklogScreen;
