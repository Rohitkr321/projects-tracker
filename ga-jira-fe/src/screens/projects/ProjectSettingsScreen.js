import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, useTheme, Card, List, Divider, Button, Dialog, Portal, TextInput } from 'react-native-paper';
import { useGetProjectQuery, useGetProjectMembersQuery, useAddProjectMemberMutation, useRemoveProjectMemberMutation } from '../../api/projectApi';

const ProjectSettingsScreen = ({ route, navigation }) => {
  const { projectId } = route.params;
  const theme = useTheme();
  const { data: projectData } = useGetProjectQuery(projectId);
  const { data: membersData, refetch: refetchMembers } = useGetProjectMembersQuery(projectId);
  const [addMember] = useAddProjectMemberMutation();
  const [removeMember] = useRemoveProjectMemberMutation();
  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const project = projectData?.data;
  const members = membersData?.data || [];

  const handleAddMember = async () => {
    if (!inviteEmail) return;
    try {
      await addMember({ projectId, email: inviteEmail, role: 'developer' }).unwrap();
      setInviteDialog(false);
      setInviteEmail('');
      refetchMembers();
    } catch (err) {
      Alert.alert('Error', err?.data?.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = (userId, name) => {
    Alert.alert('Remove Member', `Remove ${name} from this project?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await removeMember({ projectId, userId });
        refetchMembers();
      }},
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 8, color: theme.colors.onSurface }}>Project Info</Text>
          {project && (
            <>
              <List.Item title="Name" description={project.name} titleStyle={{ color: theme.colors.onSurfaceVariant }} descriptionStyle={{ color: theme.colors.onSurface }} />
              <Divider />
              <List.Item title="Key" description={project.key} titleStyle={{ color: theme.colors.onSurfaceVariant }} descriptionStyle={{ color: theme.colors.onSurface }} />
              <Divider />
              <List.Item title="Type" description={project.type} titleStyle={{ color: theme.colors.onSurfaceVariant }} descriptionStyle={{ color: theme.colors.onSurface }} />
            </>
          )}
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>Members ({members.length})</Text>
            <Button compact mode="contained" onPress={() => setInviteDialog(true)}>Invite</Button>
          </View>
          {members.map((m) => (
            <React.Fragment key={m.id || m.userId}>
              <List.Item
                title={`${m.user?.firstName} ${m.user?.lastName}`}
                description={`${m.user?.email} · ${m.role?.replace('_', ' ')}`}
                titleStyle={{ color: theme.colors.onSurface }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                right={() => (
                  <Button compact onPress={() => handleRemoveMember(m.userId, `${m.user?.firstName} ${m.user?.lastName}`)}>
                    Remove
                  </Button>
                )}
              />
              <Divider />
            </React.Fragment>
          ))}
        </Card.Content>
      </Card>

      <Portal>
        <Dialog visible={inviteDialog} onDismiss={() => setInviteDialog(false)}>
          <Dialog.Title>Invite Member</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Email address"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setInviteDialog(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleAddMember}>Invite</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { margin: 16, borderRadius: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
});

export default ProjectSettingsScreen;
