/**
 * AI Prompt Edge Cases Tests
 * Tests for AI intelligence refinement including prompt edge cases, model routing, and explainability
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EnhancedPromptTemplates } from '@core/ai/EnhancedPromptTemplates';
import { ModelRoutingService } from '@core/ai/ModelRoutingService';
import { ExplainabilityService } from '@core/ai/ExplainabilityService';

// Mock OpenAI client
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
};

jest.mock('openai', () => ({
  OpenAI: jest.fn(() => mockOpenAI)
}));

describe('AI Prompt Edge Cases', () => {
  let promptTemplates: EnhancedPromptTemplates;
  let modelRouting: ModelRoutingService;
  let explainability: ExplainabilityService;

  beforeEach(() => {
    promptTemplates = new EnhancedPromptTemplates();
    modelRouting = new ModelRoutingService();
    explainability = new ExplainabilityService();
    jest.clearAllMocks();
  });

  describe('Missing Data Handling', () => {
    it('should handle missing income data', async () => {
      const incompleteContext = {
        userProfile: {
          // Missing income
          creditScore: 750,
          employmentStatus: 'employed'
        }
      };

      const result = await promptTemplates.generatePrompt('affordability', incompleteContext);
      
      expect(result).toContain('income information is not available');
      expect(result).toContain('alternative approaches');
    });

    it('should handle missing credit score', async () => {
      const incompleteContext = {
        userProfile: {
          income: 75000,
          // Missing creditScore
          employmentStatus: 'employed'
        }
      };

      const result = await promptTemplates.generatePrompt('rate_analysis', incompleteContext);
      
      expect(result).toContain('credit score is not available');
      expect(result).toContain('estimated range');
    });

    it('should handle completely empty context', async () => {
      const emptyContext = {};

      const result = await promptTemplates.generatePrompt('scenario_comparison', emptyContext);
      
      expect(result).toContain('insufficient information');
      expect(result).toContain('general guidance');
    });
  });

  describe('Ambiguous Input Handling', () => {
    it('should handle conflicting user data', async () => {
      const conflictingContext = {
        userProfile: {
          income: 75000,
          creditScore: 850, // Very high
          employmentStatus: 'unemployed' // Conflicting
        }
      };

      const result = await promptTemplates.generatePrompt('affordability', conflictingContext);
      
      expect(result).toContain('conflicting information');
      expect(result).toContain('clarification needed');
    });

    it('should handle unrealistic values', async () => {
      const unrealisticContext = {
        userProfile: {
          income: 1000000, // Unrealistically high
          creditScore: 300, // Unrealistically low
          employmentStatus: 'employed'
        }
      };

      const result = await promptTemplates.generatePrompt('rate_analysis', unrealisticContext);
      
      expect(result).toContain('unusual values');
      expect(result).toContain('verification recommended');
    });
  });

  describe('API Error Handling', () => {
    it('should handle OpenAI API errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const context = {
        userProfile: {
          income: 75000,
          creditScore: 750,
          employmentStatus: 'employed'
        }
      };

      await expect(modelRouting.routeRequest('test prompt', context, {}))
        .rejects.toThrow('API Error');
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      
      mockOpenAI.chat.completions.create.mockRejectedValue(rateLimitError);

      const context = {
        userProfile: {
          income: 75000,
          creditScore: 750,
          employmentStatus: 'employed'
        }
      };

      await expect(modelRouting.routeRequest('test prompt', context, {}))
        .rejects.toThrow('Rate limit exceeded');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      
      mockOpenAI.chat.completions.create.mockRejectedValue(timeoutError);

      const context = {
        userProfile: {
          income: 75000,
          creditScore: 750,
          employmentStatus: 'employed'
        }
      };

      await expect(modelRouting.routeRequest('test prompt', context, { timeout: 1000 }))
        .rejects.toThrow('Request timeout');
    });
  });

  describe('Token Overflow Handling', () => {
    it('should handle token overflow gracefully', async () => {
      const largeContext = {
        userProfile: {
          income: 75000,
          creditScore: 750,
          employmentStatus: 'employed',
          // Add large amounts of data to exceed token limit
          additionalData: 'x'.repeat(100000)
        }
      };

      const result = await promptTemplates.generatePrompt('affordability', largeContext);
      
      expect(result).toContain('context truncated');
      expect(result.length).toBeLessThan(50000); // Reasonable length
    });

    it('should prioritize important information when truncating', async () => {
      const contextWithPriority = {
        userProfile: {
          income: 75000,
          creditScore: 750,
          employmentStatus: 'employed',
          // Important data
          priorityInfo: 'critical information',
          // Less important data
          verboseData: 'x'.repeat(50000)
        }
      };

      const result = await promptTemplates.generatePrompt('affordability', contextWithPriority);
      
      expect(result).toContain('critical information');
      expect(result).not.toContain('x'.repeat(1000)); // Verbose data should be truncated
    });
  });

  describe('Budget Constraints', () => {
    it('should handle budget constraints', async () => {
      const context = {
        userProfile: {
          income: 75000,
          creditScore: 750,
          employmentStatus: 'employed'
        },
        budget: {
          maxMonthlyPayment: 2000,
          maxDownPayment: 50000
        }
      };

      const result = await promptTemplates.generatePrompt('affordability', context);
      
      expect(result).toContain('budget constraints');
      expect(result).toContain('2000');
      expect(result).toContain('50000');
    });

    it('should handle unrealistic budget constraints', async () => {
      const context = {
        userProfile: {
          income: 75000,
          creditScore: 750,
          employmentStatus: 'employed'
        },
        budget: {
          maxMonthlyPayment: 100, // Unrealistically low
          maxDownPayment: 1000000 // Unrealistically high
        }
      };

      const result = await promptTemplates.generatePrompt('affordability', context);
      
      expect(result).toContain('unrealistic budget');
      expect(result).toContain('adjustment recommended');
    });
  });

  describe('Incomplete User Context', () => {
    it('should handle partial user profiles', async () => {
      const partialContext = {
        userProfile: {
          income: 75000
          // Missing other required fields
        }
      };

      const result = await promptTemplates.generatePrompt('rate_analysis', partialContext);
      
      expect(result).toContain('incomplete profile');
      expect(result).toContain('additional information needed');
    });

    it('should provide fallback recommendations', async () => {
      const minimalContext = {
        userProfile: {
          // Only basic info
        }
      };

      const result = await promptTemplates.generatePrompt('scenario_comparison', minimalContext);
      
      expect(result).toContain('general recommendations');
      expect(result).toContain('contact a mortgage professional');
    });
  });

  describe('System Errors', () => {
    it('should handle system errors gracefully', async () => {
      const systemError = new Error('System error');
      systemError.name = 'SystemError';
      
      mockOpenAI.chat.completions.create.mockRejectedValue(systemError);

      const context = {
        userProfile: {
          income: 75000,
          creditScore: 750,
          employmentStatus: 'employed'
        }
      };

      await expect(modelRouting.routeRequest('test prompt', context, {}))
        .rejects.toThrow('System error');
    });

    it('should provide fallback responses for system errors', async () => {
      const context = {
        userProfile: {
          income: 75000,
          creditScore: 750,
          employmentStatus: 'employed'
        }
      };

      // Mock system error
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('System error'));

      const result = await explainability.explainMatch(
        { recommendation: 'test' },
        context,
        {},
        { fallback: true }
      );
      
      expect(result).toContain('fallback');
      expect(result).toContain('system temporarily unavailable');
    });
  });

  describe('Template Validation', () => {
    it('should validate template completeness', () => {
      const template = {
        id: 'test',
        name: 'Test Template',
        basePrompt: 'Test prompt with {variable}',
        variables: ['variable'],
        edgeCaseHandling: ['missing_data', 'invalid_input']
      };

      const isValid = promptTemplates.validateTemplate(template);
      expect(isValid).toBe(true);
    });

    it('should reject incomplete templates', () => {
      const incompleteTemplate = {
        id: 'test',
        name: 'Test Template',
        basePrompt: 'Test prompt with {variable}',
        variables: ['variable', 'missing_variable'], // Missing variable in prompt
        edgeCaseHandling: []
      };

      const isValid = promptTemplates.validateTemplate(incompleteTemplate);
      expect(isValid).toBe(false);
    });
  });

  describe('Confidence Calibration', () => {
    it('should calibrate confidence scores', async () => {
      const context = {
        userProfile: {
          income: 75000,
          creditScore: 750,
          employmentStatus: 'employed'
        }
      };

      const response = {
        content: 'Test response',
        tokens: 100
      };

      const confidence = await modelRouting.calculateConfidence(response, context);
      
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should adjust confidence based on data quality', async () => {
      const highQualityContext = {
        userProfile: {
          income: 75000,
          creditScore: 750,
          employmentStatus: 'employed',
          employmentHistory: '5 years',
          debtToIncomeRatio: 0.3
        }
      };

      const lowQualityContext = {
        userProfile: {
          income: 75000
          // Missing other fields
        }
      };

      const response = { content: 'Test response', tokens: 100 };

      const highConfidence = await modelRouting.calculateConfidence(response, highQualityContext);
      const lowConfidence = await modelRouting.calculateConfidence(response, lowQualityContext);

      expect(highConfidence).toBeGreaterThan(lowConfidence);
    });
  });

  describe('Response Caching', () => {
    it('should cache responses appropriately', async () => {
      const context = {
        userProfile: {
          income: 75000,
          creditScore: 750,
          employmentStatus: 'employed'
        }
      };

      const mockResponse = {
        content: 'Test response',
        tokens: 100,
        model: 'gpt-4'
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      // First call
      const result1 = await modelRouting.routeRequest('test prompt', context, {});
      
      // Second call should use cache
      const result2 = await modelRouting.routeRequest('test prompt', context, {});
      
      expect(result1).toEqual(result2);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it('should not cache responses with different contexts', async () => {
      const context1 = {
        userProfile: {
          income: 75000,
          creditScore: 750,
          employmentStatus: 'employed'
        }
      };

      const context2 = {
        userProfile: {
          income: 80000, // Different income
          creditScore: 750,
          employmentStatus: 'employed'
        }
      };

      const mockResponse = {
        content: 'Test response',
        tokens: 100,
        model: 'gpt-4'
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await modelRouting.routeRequest('test prompt', context1, {});
      await modelRouting.routeRequest('test prompt', context2, {});
      
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
    });
  });
});