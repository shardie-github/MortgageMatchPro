import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { MortgageProduct } from '../../types';
import { spacing } from '../../constants/theme';

interface MortgageProductSelectorProps {
  selectedProduct: string;
  onProductSelect: (productId: string) => void;
}

const mortgageProducts: MortgageProduct[] = [
  {
    id: 'conventional',
    name: 'Conventional',
    type: 'conventional',
    description: 'Traditional mortgage with 20% down payment',
    features: ['Lowest rates', 'No PMI with 20% down', 'Flexible terms'],
    requirements: ['20% down payment', 'Good credit score', 'Stable income'],
    benefits: ['Best rates', 'No mortgage insurance', 'Flexible prepayment'],
    risks: ['Higher down payment required', 'Stricter qualification'],
    eligibility: {
      minCreditScore: 620,
      maxLTV: 80,
      maxDTI: 43,
      minDownPayment: 20,
      incomeRequirements: ['W-2 or 1099', 'Bank statements'],
      propertyTypes: ['Single family', 'Condo', 'Townhouse'],
      occupancyTypes: ['Primary residence', 'Second home', 'Investment'],
    },
    rates: [
      { term: 15, rate: 5.25, apr: 5.35, points: 0, fees: 2500, isPromotional: false },
      { term: 30, rate: 5.75, apr: 5.85, points: 0, fees: 2500, isPromotional: false },
    ],
    isActive: true,
    popularity: 95,
  },
  {
    id: 'fha',
    name: 'FHA Loan',
    type: 'fha',
    description: 'Government-backed loan with low down payment',
    features: ['3.5% down payment', 'Lower credit requirements', 'Assumable'],
    requirements: ['3.5% down payment', '580+ credit score', 'MIP required'],
    benefits: ['Low down payment', 'Flexible credit requirements', 'Assumable'],
    risks: ['Mortgage insurance required', 'Property restrictions', 'Loan limits'],
    eligibility: {
      minCreditScore: 580,
      maxLTV: 96.5,
      maxDTI: 43,
      minDownPayment: 3.5,
      incomeRequirements: ['W-2 or 1099', 'Bank statements'],
      propertyTypes: ['Single family', 'Condo', 'Townhouse', 'Multi-family'],
      occupancyTypes: ['Primary residence'],
    },
    rates: [
      { term: 15, rate: 5.5, apr: 5.7, points: 0, fees: 3000, isPromotional: false },
      { term: 30, rate: 6.0, apr: 6.2, points: 0, fees: 3000, isPromotional: false },
    ],
    isActive: true,
    popularity: 80,
  },
  {
    id: 'va',
    name: 'VA Loan',
    type: 'va',
    description: 'Zero down payment for eligible veterans',
    features: ['0% down payment', 'No PMI', 'No prepayment penalty'],
    requirements: ['Military service', 'Certificate of Eligibility', 'Occupancy requirement'],
    benefits: ['No down payment', 'No PMI', 'Competitive rates', 'No prepayment penalty'],
    risks: ['Funding fee required', 'Occupancy restrictions', 'Eligibility requirements'],
    eligibility: {
      minCreditScore: 620,
      maxLTV: 100,
      maxDTI: 41,
      minDownPayment: 0,
      incomeRequirements: ['Military service record', 'Certificate of Eligibility'],
      propertyTypes: ['Single family', 'Condo', 'Townhouse'],
      occupancyTypes: ['Primary residence'],
    },
    rates: [
      { term: 15, rate: 5.0, apr: 5.1, points: 0, fees: 2000, isPromotional: false },
      { term: 30, rate: 5.5, apr: 5.6, points: 0, fees: 2000, isPromotional: false },
    ],
    isActive: true,
    popularity: 70,
  },
  {
    id: 'jumbo',
    name: 'Jumbo Loan',
    type: 'jumbo',
    description: 'High-value loans exceeding conforming limits',
    features: ['Higher loan amounts', 'Competitive rates', 'Flexible terms'],
    requirements: ['Excellent credit', 'High income', 'Low debt-to-income'],
    benefits: ['Higher loan amounts', 'Competitive rates', 'Flexible terms'],
    risks: ['Stricter requirements', 'Higher rates', 'Larger down payment'],
    eligibility: {
      minCreditScore: 700,
      maxLTV: 80,
      maxDTI: 36,
      minDownPayment: 20,
      incomeRequirements: ['High income verification', 'Asset documentation'],
      propertyTypes: ['Single family', 'Condo', 'Townhouse'],
      occupancyTypes: ['Primary residence', 'Second home', 'Investment'],
    },
    rates: [
      { term: 15, rate: 5.75, apr: 5.85, points: 0, fees: 5000, isPromotional: false },
      { term: 30, rate: 6.25, apr: 6.35, points: 0, fees: 5000, isPromotional: false },
    ],
    isActive: true,
    popularity: 60,
  },
];

export const MortgageProductSelector: React.FC<MortgageProductSelectorProps> = ({
  selectedProduct,
  onProductSelect,
}) => {
  const { theme } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.container}>
        {mortgageProducts.map((product) => (
          <Card
            key={product.id}
            style={[
              styles.productCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: selectedProduct === product.id ? theme.colors.primary : theme.colors.outline,
                borderWidth: selectedProduct === product.id ? 2 : 1,
              },
            ]}
            onPress={() => onProductSelect(product.id)}
          >
            <Card.Content style={styles.cardContent}>
              <View style={styles.header}>
                <Text style={[styles.productName, { color: theme.colors.onSurface }]}>
                  {product.name}
                </Text>
                <View style={[styles.popularityBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text style={[styles.popularityText, { color: theme.colors.primary }]}>
                    {product.popularity}% popular
                  </Text>
                </View>
              </View>
              
              <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
                {product.description}
              </Text>

              <View style={styles.features}>
                <Text style={[styles.featuresTitle, { color: theme.colors.onSurface }]}>
                  Key Features:
                </Text>
                {product.features.slice(0, 2).map((feature, index) => (
                  <Text key={index} style={[styles.feature, { color: theme.colors.onSurfaceVariant }]}>
                    • {feature}
                  </Text>
                ))}
              </View>

              <View style={styles.rateInfo}>
                <Text style={[styles.rateLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Starting Rate:
                </Text>
                <Text style={[styles.rate, { color: theme.colors.primary }]}>
                  {product.rates[0].rate}%
                </Text>
              </View>

              <View style={styles.requirements}>
                <Text style={[styles.requirement, { color: theme.colors.onSurfaceVariant }]}>
                  Min Credit: {product.eligibility.minCreditScore}
                </Text>
                <Text style={[styles.requirement, { color: theme.colors.onSurfaceVariant }]}>
                  Down: {product.eligibility.minDownPayment}%
                </Text>
              </View>
            </Card.Content>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  productCard: {
    width: 280,
    marginRight: spacing.sm,
  },
  cardContent: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  popularityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  popularityText: {
    fontSize: 10,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  features: {
    marginBottom: spacing.sm,
  },
  featuresTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  feature: {
    fontSize: 12,
    lineHeight: 16,
  },
  rateInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rateLabel: {
    fontSize: 12,
  },
  rate: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  requirements: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  requirement: {
    fontSize: 11,
  },
});