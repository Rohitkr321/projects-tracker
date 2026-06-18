import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, useTheme, Card, Chip, FAB, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetEpicsQuery } from '../../api/projectApi';
import { formatDate } from '../../utils/dateUtils';
import EmptyState from '../../components/common/EmptyState';
import LoadingScreen from '../../components/common/LoadingScreen';

const EpicsScreen = ({ route, navigation }) => {
  const { projectId } = route.params;
  const theme = useTheme();
  const { data, isLoading, refetch } = useGetEpicsQuery(projectId);
  const epics = data?.data || [];

  if (isLoading) return <LoadingScreen />;

  const renderEpic = ({ item: epic }) => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} onPress={() => navigation.navigate('IssueList', { epicId: epic.id, title: epic.name })}>
      <Card.Content>
        <View style={styles.epicHeader}>
          <View style={[styles.epicColorBar, { backgroundColor: epic.color || '#6366F1' }]} />
          <View style={styles.epicInfo}>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>{epic.name}</Text>
            {epic.owner && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Owner: {epic.owner.firstName} {epic.owner.lastName}
              </Text>
            )}
            <View style={styles.dates}>
              {epic.startDate && <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{formatDate(epic.startDate)}</Text>}
              {epic.startDate && epic.endDate && <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}> → </Text>}
              {epic.endDate && <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{formatDate(epic.endDate)}</Text>}
            </View>
          </View>
          {epic.status && (
            <Chip compact style={{ backgroundColor: epic.color + '20' }}>
              <Text style={{ color: epic.color, fontSize: 11 }}>{epic.status.name}</Text>
            </Chip>
          )}
        </View>
        <View style={styles.progressRow}>
          <ProgressBar progress={(epic.progress || 0) / 100} color={epic.color || '#6366F1'} style={styles.progressBar} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8 }}>{epic.progress || 0}%</Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={epics}
        keyExtractor={(item) => item.id}
        renderItem={renderEpic}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="lightning-bolt" title="No epics yet" description="Epics help you organize large pieces of work" />}
      />
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#FFFFFF"
        onPress={() => {}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { margin: 12, borderRadius: 12, marginBottom: 0, marginTop: 12 },
  epicHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  epicColorBar: { width: 4, borderRadius: 2, alignSelf: 'stretch' },
  epicInfo: { flex: 1 },
  dates: { flexDirection: 'row', marginTop: 4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  progressBar: { flex: 1, borderRadius: 4, height: 6 },
  list: { paddingBottom: 80 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});

export default EpicsScreen;
