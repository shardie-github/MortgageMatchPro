/**
 * Test Setup Configuration
 * Global test setup and configuration
 */

import '@testing-library/jest-dom';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-supabase-anon-key';
process.env.SUPABASE_SERVICE_KEY = 'test-supabase-service-key';

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Mock external services
jest.mock('openai', () => ({
  OpenAI: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Mock AI response',
              role: 'assistant'
            }
          }],
          usage: {
            total_tokens: 100,
            prompt_tokens: 50,
            completion_tokens: 50
          }
        })
      }
    }
  }))
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signUp: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null })
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      then: jest.fn().mockResolvedValue({ data: [], error: null })
    }))
  }))
}));

// Global test utilities
global.testUtils = {
  createMockUser: () => ({
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }),
  
  createMockScenario: () => ({
    id: 'test-scenario-id',
    userId: 'test-user-id',
    propertyValue: 500000,
    downPayment: 100000,
    loanAmount: 400000,
    creditScore: 750,
    income: 75000,
    employmentStatus: 'employed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }),
  
  createMockAIResponse: () => ({
    content: 'Mock AI response content',
    confidence: 0.85,
    model: 'gpt-4',
    tokens: 100,
    latency: 1500,
    fallbackUsed: false,
    retryCount: 0
  }),
  
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
};

// Extend Jest matchers
expect.extend({
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid email`,
      pass
    };
  },
  
  toBeValidPhone(received: string) {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    const pass = phoneRegex.test(received) && received.replace(/\D/g, '').length >= 10;
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid phone number`,
      pass
    };
  },
  
  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be within range ${min}-${max}`,
      pass
    };
  }
});

// Declare global types
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidEmail(): R;
      toBeValidPhone(): R;
      toBeWithinRange(min: number, max: number): R;
    }
  }
  
  var testUtils: {
    createMockUser: () => any;
    createMockScenario: () => any;
    createMockAIResponse: () => any;
    waitFor: (ms: number) => Promise<void>;
  };
}