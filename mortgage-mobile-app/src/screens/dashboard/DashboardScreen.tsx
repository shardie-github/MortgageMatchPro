import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Card, Title, Paragraph, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMortgageStore } from '../../store/mortgageStore';
import { useAuthStore } from '../../store/authStore';

const DashboardScreen = () => {
  const { mortgageData, calculations } = useMortgageStore();
  const { user } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="headlineMedium">Welcome back, {user?.firstName}!</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Here's your mortgage overview
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Current Mortgage</Title>
            <Paragraph>
              Loan Amount: ${mortgageData.loanAmount.toLocaleString()}
            </Paragraph>
            <Paragraph>
              Interest Rate: {mortgageData.interestRate}%
            </Paragraph>
            <Paragraph>
              Monthly Payment: ${calculations?.monthlyPayment.toLocaleString() || '0'}
            </Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Quick Actions</Title>
            <Button mode="contained" style={styles.button}>
              Calculate New Mortgage
            </Button>
            <Button mode="outlined" style={styles.button}>
              View Documents
            </Button>
            <Button mode="outlined" style={styles.button}>
              Find Lenders
            </Button>
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
  button: {
    marginVertical: 4,
  },
});

export default DashboardScreen;