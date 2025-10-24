import React, { useState } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Text, Card, Button, useTheme } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { mortgageService } from '../../services/mortgageService';
import { AffordabilityInput, AffordabilityResult } from '../../types';
import { spacing } from '../../constants/theme';
import { AffordabilityInputForm } from '../../components/calculator/AffordabilityInputForm';
import { MortgageProductSelector } from '../../components/calculator/MortgageProductSelector';
import { AffordabilityResultsCard } from '../../components/calculator/AffordabilityResultsCard';
import { RecommendationsCard } from '../../components/calculator/RecommendationsCard';
import { ResponsiveLayout } from '../../components/layout/ResponsiveLayout';
import { ResponsiveText } from '../../components/ui/ResponsiveText';
import { ResponsiveButton } from '../../components/ui/ResponsiveButton';

export const CalculatorScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const [affordabilityResult, setAffordabilityResult] = useState<AffordabilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('conventional');

  const handleCalculate = async (input: AffordabilityInput) => {
    try {
      setLoading(true);
      const result = await mortgageService.calculateAffordability(input);
      setAffordabilityResult(result);
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId);
  };

  return (
    <ResponsiveLayout
      backgroundColor={theme.colors.background}
      scrollable={true}
      keyboardAvoiding={true}
      safeArea={true}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <ResponsiveText 
            variant="h1" 
            style={[styles.title, { color: theme.colors.onBackground }]}
          >
            Mortgage Calculator
          </ResponsiveText>
          <ResponsiveText 
            variant="body" 
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            Calculate your affordability and explore mortgage options
          </ResponsiveText>
        </View>

        {/* Mortgage Product Selection */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <ResponsiveText 
              variant="h3" 
              style={[styles.cardTitle, { color: theme.colors.onSurface }]}
            >
              Select Mortgage Product
            </ResponsiveText>
            <MortgageProductSelector
              selectedProduct={selectedProduct}
              onProductSelect={handleProductSelect}
            />
          </Card.Content>
        </Card>

        {/* Affordability Calculator */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <ResponsiveText 
              variant="h3" 
              style={[styles.cardTitle, { color: theme.colors.onSurface }]}
            >
              Affordability Calculator
            </ResponsiveText>
            <AffordabilityInputForm
              onCalculate={handleCalculate}
              loading={loading}
              selectedProduct={selectedProduct}
            />
          </Card.Content>
        </Card>

        {/* Results */}
        {affordabilityResult && (
          <>
            <AffordabilityResultsCard result={affordabilityResult} />
            <RecommendationsCard result={affordabilityResult} />
          </>
        )}

        {/* Action Buttons */}
        {affordabilityResult && (
          <View style={styles.actionButtons}>
            <ResponsiveButton
              title="View Current Rates"
              onPress={() => {/* Navigate to rates */}}
              variant="primary"
              style={styles.actionButton}
            />
            <ResponsiveButton
              title="Compare Scenarios"
              onPress={() => {/* Navigate to scenarios */}}
              variant="outline"
              style={styles.actionButton}
            />
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </View>
    </ResponsiveLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
  },
  card: {
    margin: spacing.lg,
    marginTop: 0,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  actionButtons: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  actionButton: {
    marginBottom: spacing.sm,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  bottomSpacing: {
    height: 20,
  },
});