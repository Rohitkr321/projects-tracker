import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, useTheme, Searchbar, Chip } from 'react-native-paper';
import { useGetIssuesQuery } from '../../api/issueApi';
import IssueRow from '../../components/issues/IssueRow';
import EmptyState from '../../components/common/EmptyState';
import LoadingScreen from '../../components/common/LoadingScreen';

const IssueListScreen = ({ route, navigation }) => {
  const { projectId, sprintId, epicId, title } = route.params || {};
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState(null);

  const { data, isLoading, refetch } = useGetIssuesQuery({
    projectId, sprintId, epicId, search, priority, limit: 100,
  });
  const issues = data?.data?.data || [];

  if (isLoading && issues.length === 0) return <LoadingScreen />;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.toolbar}>
        <Searchbar placeholder="Search issues..." onChangeText={setSearch} value={search} style={styles.searchbar} />
        <View style={styles.chips}>
          {[['highest', 'Highest'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']].map(([val, label]) => (
            <Chip key={val} selected={priority === val} onPress={() => setPriority(priority === val ? null : val)} compact>{label}</Chip>
          ))}
        </View>
      </View>
      <FlatList
        data={issues}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <IssueRow issue={item} onPress={() => navigation.navigate('IssueDetail', { issueId: item.id })} />
        )}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="ticket-outline" title="No issues found" />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: { padding: 12, gap: 8 },
  searchbar: { borderRadius: 10 },
  chips: { flexDirection: 'row', gap: 6 },
  list: { paddingBottom: 20 },
});

export default IssueListScreen;
