import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Card, Title, Button, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const DocumentsScreen = () => {
  const documents = [
    { id: '1', name: 'Income Verification', status: 'uploaded' },
    { id: '2', name: 'Bank Statements', status: 'pending' },
    { id: '3', name: 'Tax Returns', status: 'uploaded' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="headlineMedium">Documents</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Manage your mortgage documents
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Required Documents</Title>
            {documents.map((doc) => (
              <List.Item
                key={doc.id}
                title={doc.name}
                description={doc.status}
                right={() => (
                  <Button mode="outlined" compact>
                    {doc.status === 'uploaded' ? 'View' : 'Upload'}
                  </Button>
                )}
              />
            ))}
          </Card.Content>
        </Card>

        <Button mode="contained" style={styles.button}>
          Upload New Document
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

export default DocumentsScreen;