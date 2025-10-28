/**
 * AI Domain Event Schemas v1.4.0
 * Type-safe event contracts for AI-related events
 */

export interface AIScoringRequestedEvent {
  requestId: string;
  userId: string;
  tenantId: string;
  mortgageData: {
    propertyValue: number;
    downPayment: number;
    loanAmount: number;
    creditScore: number;
    income: number;
    employmentType: string;
    propertyType: string;
    location: string;
  };
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
}

export interface AIScoringCompletedEvent {
  requestId: string;
  userId: string;
  tenantId: string;
  scoringResult: {
    score: number;
    confidence: number;
    factors: {
      creditworthiness: number;
      affordability: number;
      risk: number;
      marketConditions: number;
    };
    recommendations: string[];
    alternativeOptions: Array<{
      type: string;
      description: string;
      score: number;
    }>;
  };
  processingTime: number;
  modelVersion: string;
  timestamp: string;
}

export interface AIScoringFailedEvent {
  requestId: string;
  userId: string;
  tenantId: string;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  retryCount: number;
  timestamp: string;
}

export interface AIModelUpdatedEvent {
  modelId: string;
  version: string;
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  trainingData: {
    samples: number;
    lastUpdated: string;
  };
  deploymentStatus: 'staging' | 'production';
  timestamp: string;
}

export interface AICostThresholdExceededEvent {
  tenantId: string;
  currentUsage: number;
  threshold: number;
  period: 'daily' | 'monthly';
  recommendations: string[];
  timestamp: string;
}

export interface AIExplainabilityRequestedEvent {
  requestId: string;
  userId: string;
  tenantId: string;
  scoringId: string;
  explanationType: 'detailed' | 'summary' | 'visual';
  timestamp: string;
}

export interface AIExplainabilityGeneratedEvent {
  requestId: string;
  userId: string;
  tenantId: string;
  scoringId: string;
  explanation: {
    type: 'detailed' | 'summary' | 'visual';
    content: any;
    confidence: number;
    factors: Array<{
      name: string;
      impact: number;
      description: string;
    }>;
  };
  processingTime: number;
  timestamp: string;
}

// Event type constants
export const AI_EVENT_TYPES = {
  SCORING_REQUESTED: 'ai.scoring.requested',
  SCORING_COMPLETED: 'ai.scoring.completed',
  SCORING_FAILED: 'ai.scoring.failed',
  MODEL_UPDATED: 'ai.model.updated',
  COST_THRESHOLD_EXCEEDED: 'ai.cost.threshold_exceeded',
  EXPLAINABILITY_REQUESTED: 'ai.explainability.requested',
  EXPLAINABILITY_GENERATED: 'ai.explainability.generated',
} as const;

export type AIEventType = typeof AI_EVENT_TYPES[keyof typeof AI_EVENT_TYPES];
