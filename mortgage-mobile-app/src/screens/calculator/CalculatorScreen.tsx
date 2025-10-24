import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput, Button, Card, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMortgageStore } from '../../store/mortgageStore';

const CalculatorScreen = () => {
  const { mortgageData, setMortgageData, calculateMortgage, calculations } = useMortgageStore();

  const handleCalculate = () => {
    calculateMortgage();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="headlineMedium">Mortgage Calculator</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Calculate your monthly mortgage payment
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Property Information</Title>
            <TextInput
              label="Property Value"
              value={mortgageData.propertyValue.toString()}
              onChangeText={(text) => setMortgageData({ propertyValue: Number(text) })}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              label="Down Payment"
              value={mortgageData.downPayment.toString()}
              onChangeText={(text) => setMortgageData({ downPayment: Number(text) })}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              label="Interest Rate (%)"
              value={mortgageData.interestRate.toString()}
              onChangeText={(text) => setMortgageData({ interestRate: Number(text) })}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              label="Loan Term (years)"
              value={mortgageData.loanTerm.toString()}
              onChangeText={(text) => setMortgageData({ loanTerm: Number(text) })}
              keyboardType="numeric"
              style={styles.input}
            />
            <Button mode="contained" onPress={handleCalculate} style={styles.button}>
              Calculate
            </Button>
          </Card.Content>
        </Card>

        {calculations && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>Calculation Results</Title>
              <Text variant="bodyLarge" style={styles.result}>
                Monthly Payment: ${calculations.monthlyPayment.toLocaleString()}
              </Text>
              <Text variant="bodyMedium" style={styles.result}>
                Total Interest: ${calculations.totalInterest.toLocaleString()}
              </Text>
              <Text variant="bodyMedium" style={styles.result}>
                Total Payment: ${calculations.totalPayment.toLocaleString()}
              </Text>
            </Card.Content>
          </Card>
        )}
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
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  result: {
    marginBottom: 8,
  },
});

export default CalculatorScreen;