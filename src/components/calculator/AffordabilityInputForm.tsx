import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { AffordabilityInput } from '../../types';
import { spacing } from '../../constants/theme';

interface AffordabilityInputFormProps {
  onCalculate: (input: AffordabilityInput) => void;
  loading: boolean;
  selectedProduct: string;
}

export const AffordabilityInputForm: React.FC<AffordabilityInputFormProps> = ({
  onCalculate,
  loading,
  selectedProduct,
}) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState<AffordabilityInput>({
    country: 'CA',
    income: 75000,
    debts: 500,
    downPayment: 50000,
    propertyPrice: 500000,
    interestRate: 5.5,
    termYears: 25,
    location: '',
    taxes: 0,
    insurance: 0,
    hoa: 0,
    pmi: 0,
  });

  const handleSubmit = () => {
    onCalculate(formData);
  };

  const updateField = (field: keyof AffordabilityInput, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: formData.country === 'CA' ? 'CAD' : 'USD',
    }).format(value);
  };

  return (
    <View style={styles.container}>
      {/* Country Selection */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.onSurface }]}>
          Country
        </Text>
        <View style={styles.countryButtons}>
          <Button
            mode={formData.country === 'CA' ? 'contained' : 'outlined'}
            onPress={() => updateField('country', 'CA')}
            style={styles.countryButton}
          >
            Canada
          </Button>
          <Button
            mode={formData.country === 'US' ? 'contained' : 'outlined'}
            onPress={() => updateField('country', 'US')}
            style={styles.countryButton}
          >
            United States
          </Button>
        </View>
      </View>

      {/* Location */}
      <TextInput
        label="Location (Province/State)"
        value={formData.location}
        onChangeText={(value) => updateField('location', value)}
        mode="outlined"
        style={styles.input}
        placeholder="e.g., Ontario, California"
      />

      {/* Income */}
      <TextInput
        label="Annual Income"
        value={formData.income.toString()}
        onChangeText={(value) => updateField('income', parseFloat(value) || 0)}
        mode="outlined"
        keyboardType="numeric"
        style={styles.input}
        right={<TextInput.Affix text={formData.country === 'CA' ? 'CAD' : 'USD'} />}
      />

      {/* Debts */}
      <TextInput
        label="Monthly Debt Payments"
        value={formData.debts.toString()}
        onChangeText={(value) => updateField('debts', parseFloat(value) || 0)}
        mode="outlined"
        keyboardType="numeric"
        style={styles.input}
        right={<TextInput.Affix text={formData.country === 'CA' ? 'CAD' : 'USD'} />}
      />

      {/* Down Payment */}
      <TextInput
        label="Down Payment"
        value={formData.downPayment.toString()}
        onChangeText={(value) => updateField('downPayment', parseFloat(value) || 0)}
        mode="outlined"
        keyboardType="numeric"
        style={styles.input}
        right={<TextInput.Affix text={formData.country === 'CA' ? 'CAD' : 'USD'} />}
      />

      {/* Property Price */}
      <TextInput
        label="Property Price"
        value={formData.propertyPrice.toString()}
        onChangeText={(value) => updateField('propertyPrice', parseFloat(value) || 0)}
        mode="outlined"
        keyboardType="numeric"
        style={styles.input}
        right={<TextInput.Affix text={formData.country === 'CA' ? 'CAD' : 'USD'} />}
      />

      {/* Interest Rate */}
      <TextInput
        label="Interest Rate (%)"
        value={formData.interestRate.toString()}
        onChangeText={(value) => updateField('interestRate', parseFloat(value) || 0)}
        mode="outlined"
        keyboardType="numeric"
        style={styles.input}
        right={<TextInput.Affix text="%" />}
      />

      {/* Term Years */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.onSurface }]}>
          Amortization Period
        </Text>
        <View style={styles.termButtons}>
          {[15, 20, 25, 30].map((term) => (
            <Button
              key={term}
              mode={formData.termYears === term ? 'contained' : 'outlined'}
              onPress={() => updateField('termYears', term)}
              style={styles.termButton}
            >
              {term} years
            </Button>
          ))}
        </View>
      </View>

      {/* Additional Costs */}
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        Additional Monthly Costs
      </Text>

      <TextInput
        label="Property Taxes (Monthly)"
        value={formData.taxes?.toString() || '0'}
        onChangeText={(value) => updateField('taxes', parseFloat(value) || 0)}
        mode="outlined"
        keyboardType="numeric"
        style={styles.input}
        right={<TextInput.Affix text={formData.country === 'CA' ? 'CAD' : 'USD'} />}
      />

      <TextInput
        label="Insurance (Monthly)"
        value={formData.insurance?.toString() || '0'}
        onChangeText={(value) => updateField('insurance', parseFloat(value) || 0)}
        mode="outlined"
        keyboardType="numeric"
        style={styles.input}
        right={<TextInput.Affix text={formData.country === 'CA' ? 'CAD' : 'USD'} />}
      />

      <TextInput
        label="HOA/Condo Fees (Monthly)"
        value={formData.hoa?.toString() || '0'}
        onChangeText={(value) => updateField('hoa', parseFloat(value) || 0)}
        mode="outlined"
        keyboardType="numeric"
        style={styles.input}
        right={<TextInput.Affix text={formData.country === 'CA' ? 'CAD' : 'USD'} />}
      />

      {formData.country === 'US' && (
        <TextInput
          label="PMI (Monthly)"
          value={formData.pmi?.toString() || '0'}
          onChangeText={(value) => updateField('pmi', parseFloat(value) || 0)}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
          right={<TextInput.Affix text="USD" />}
        />
      )}

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.calculateButton}
        contentStyle={styles.buttonContent}
      >
        Calculate Affordability
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  countryButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  countryButton: {
    flex: 1,
  },
  termButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  termButton: {
    flex: 1,
    minWidth: '45%',
  },
  input: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  calculateButton: {
    marginTop: spacing.lg,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
});