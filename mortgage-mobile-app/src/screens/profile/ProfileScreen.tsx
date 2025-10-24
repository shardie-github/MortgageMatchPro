import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Card, Title, Button, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';

const ProfileScreen = () => {
  const { user, logout } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="headlineMedium">Profile</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Manage your account settings
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Account Information</Title>
            <List.Item
              title="Name"
              description={`${user?.firstName} ${user?.lastName}`}
            />
            <List.Item
              title="Email"
              description={user?.email}
            />
            <List.Item
              title="Role"
              description={user?.role}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Settings</Title>
            <List.Item
              title="Notifications"
              description="Manage your notification preferences"
              right={() => <List.Icon icon="chevron-right" />}
            />
            <List.Item
              title="Privacy"
              description="Control your privacy settings"
              right={() => <List.Icon icon="chevron-right" />}
            />
            <List.Item
              title="Security"
              description="Manage your security settings"
              right={() => <List.Icon icon="chevron-right" />}
            />
          </Card.Content>
        </Card>

        <Button mode="contained" onPress={logout} style={styles.button}>
          Sign Out
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  subtitle: {
    color: '#64748b',
    marginTop: 4,
  },
  card: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
  },
});

export default ProfileScreen;