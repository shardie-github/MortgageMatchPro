import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Card, Title, Switch, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const SettingsScreen = () => {
  const [notifications, setNotifications] = React.useState(true);
  const [biometric, setBiometric] = React.useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="headlineMedium">Settings</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Customize your app experience
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Notifications</Title>
            <List.Item
              title="Push Notifications"
              description="Receive updates about your mortgage"
              right={() => (
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                />
              )}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Security</Title>
            <List.Item
              title="Biometric Login"
              description="Use fingerprint or face ID to sign in"
              right={() => (
                <Switch
                  value={biometric}
                  onValueChange={setBiometric}
                />
              )}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>About</Title>
            <List.Item
              title="Version"
              description="1.0.0"
            />
            <List.Item
              title="Terms of Service"
              right={() => <List.Icon icon="chevron-right" />}
            />
            <List.Item
              title="Privacy Policy"
              right={() => <List.Icon icon="chevron-right" />}
            />
          </Card.Content>
        </Card>
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
});

export default SettingsScreen;