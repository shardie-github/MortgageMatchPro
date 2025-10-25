/**
 * Confidence Indicator Component
 * v1.2.0 - Displays confidence levels and explanation factors
 */

import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'react-native-linear-gradient'
import Icon from 'react-native-vector-icons/MaterialIcons'

interface ConfidenceIndicatorProps {
  confidence: number // 0-1
  factors?: string[]
  showExplanation?: boolean
  onExplanationPress?: () => void
  size?: 'small' | 'medium' | 'large'
  style?: any
}

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  confidence,
  factors = [],
  showExplanation = true,
  onExplanationPress,
  size = 'medium',
  style
}) => {
  const percentage = Math.round(confidence * 100)
  const confidenceLevel = getConfidenceLevel(confidence)
  const confidenceColor = getConfidenceColor(confidence)

  const sizeStyles = {
    small: {
      container: styles.smallContainer,
      bar: styles.smallBar,
      text: styles.smallText,
      icon: 16
    },
    medium: {
      container: styles.mediumContainer,
      bar: styles.mediumBar,
      text: styles.mediumText,
      icon: 20
    },
    large: {
      container: styles.largeContainer,
      bar: styles.largeBar,
      text: styles.largeText,
      icon: 24
    }
  }

  const currentSize = sizeStyles[size]

  return (
    <View style={[currentSize.container, style]}>
      <View style={styles.header}>
        <Text style={[currentSize.text, styles.label]}>Confidence</Text>
        <Text style={[currentSize.text, styles.percentage]}>{percentage}%</Text>
      </View>
      
      <View style={styles.barContainer}>
        <View style={[styles.barBackground, currentSize.bar]}>
          <LinearGradient
            colors={[confidenceColor.start, confidenceColor.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.barFill,
              currentSize.bar,
              { width: `${percentage}%` }
            ]}
          />
        </View>
        <Text style={[currentSize.text, styles.levelText]}>{confidenceLevel}</Text>
      </View>

      {factors.length > 0 && (
        <View style={styles.factorsContainer}>
          <Text style={[currentSize.text, styles.factorsLabel]}>Key Factors:</Text>
          <View style={styles.factorsList}>
            {factors.slice(0, 3).map((factor, index) => (
              <View key={index} style={styles.factorItem}>
                <Icon name="check-circle" size={currentSize.icon} color="#4CAF50" />
                <Text style={[currentSize.text, styles.factorText]}>{formatFactor(factor)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {showExplanation && onExplanationPress && (
        <TouchableOpacity 
          style={styles.explanationButton}
          onPress={onExplanationPress}
        >
          <Icon name="info" size={currentSize.icon} color="#2196F3" />
          <Text style={[currentSize.text, styles.explanationText]}>Why this result?</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

interface ExplanationModalProps {
  visible: boolean
  onClose: () => void
  reasoning: string
  factors: string[]
  confidence: number
  alternativeApproaches?: string[]
}

export const ExplanationModal: React.FC<ExplanationModalProps> = ({
  visible,
  onClose,
  reasoning,
  factors,
  confidence,
  alternativeApproaches = []
}) => {
  if (!visible) return null

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Why This Result?</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reasoning</Text>
            <Text style={styles.sectionText}>{reasoning}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Factors</Text>
            {factors.map((factor, index) => (
              <View key={index} style={styles.factorRow}>
                <Icon name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.factorText}>{formatFactor(factor)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Confidence Level</Text>
            <ConfidenceIndicator
              confidence={confidence}
              size="medium"
              showExplanation={false}
            />
          </View>

          {alternativeApproaches.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Alternative Approaches</Text>
              {alternativeApproaches.map((approach, index) => (
                <View key={index} style={styles.alternativeRow}>
                  <Icon name="lightbulb-outline" size={20} color="#FF9800" />
                  <Text style={styles.alternativeText}>{approach}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  )
}

interface CompareLendersButtonProps {
  onPress: () => void
  lenderCount: number
  style?: any
}

export const CompareLendersButton: React.FC<CompareLendersButtonProps> = ({
  onPress,
  lenderCount,
  style
}) => {
  return (
    <TouchableOpacity style={[styles.compareButton, style]} onPress={onPress}>
      <Icon name="compare-arrows" size={20} color="#2196F3" />
      <Text style={styles.compareButtonText}>
        Compare Top {lenderCount} Lenders
      </Text>
    </TouchableOpacity>
  )
}

interface DisclaimerSectionProps {
  expanded: boolean
  onToggle: () => void
  content: string
  style?: any
}

export const DisclaimerSection: React.FC<DisclaimerSectionProps> = ({
  expanded,
  onToggle,
  content,
  style
}) => {
  return (
    <View style={[styles.disclaimerContainer, style]}>
      <TouchableOpacity style={styles.disclaimerHeader} onPress={onToggle}>
        <Text style={styles.disclaimerTitle}>Important Disclaimers</Text>
        <Icon 
          name={expanded ? "expand-less" : "expand-more"} 
          size={24} 
          color="#666" 
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.disclaimerContent}>
          <Text style={styles.disclaimerText}>{content}</Text>
        </View>
      )}
    </View>
  )
}

// Helper functions
function getConfidenceLevel(confidence: number): string {
  if (confidence >= 0.9) return 'Very High'
  if (confidence >= 0.8) return 'High'
  if (confidence >= 0.7) return 'Good'
  if (confidence >= 0.6) return 'Moderate'
  if (confidence >= 0.5) return 'Low'
  return 'Very Low'
}

function getConfidenceColor(confidence: number): { start: string; end: string } {
  if (confidence >= 0.8) return { start: '#4CAF50', end: '#8BC34A' }
  if (confidence >= 0.6) return { start: '#FF9800', end: '#FFC107' }
  return { start: '#F44336', end: '#FF5722' }
}

function formatFactor(factor: string): string {
  return factor
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
}

// Styles
const styles = StyleSheet.create({
  // Confidence Indicator
  smallContainer: {
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  mediumContainer: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  largeContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontWeight: '600',
    color: '#333',
  },
  percentage: {
    fontWeight: '700',
    color: '#2196F3',
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  barBackground: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginRight: 8,
  },
  smallBar: {
    height: 6,
  },
  mediumBar: {
    height: 8,
  },
  largeBar: {
    height: 10,
  },
  barFill: {
    borderRadius: 4,
  },
  levelText: {
    fontWeight: '500',
    color: '#666',
    minWidth: 80,
  },
  factorsContainer: {
    marginBottom: 8,
  },
  factorsLabel: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  factorsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  factorText: {
    marginLeft: 4,
    color: '#666',
  },
  explanationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  explanationText: {
    marginLeft: 4,
    color: '#2196F3',
    fontWeight: '500',
  },

  // Explanation Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  alternativeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  alternativeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },

  // Compare Lenders Button
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  compareButtonText: {
    marginLeft: 8,
    color: '#2196F3',
    fontWeight: '600',
  },

  // Disclaimer Section
  disclaimerContainer: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  disclaimerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
  },
  disclaimerContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#E65100',
    lineHeight: 16,
  },
})

export default ConfidenceIndicator