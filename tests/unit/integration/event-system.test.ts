import { EventBus } from '../../events/event-bus';
import { AI_EVENT_TYPES } from '../../events/schemas/ai-events';
import { BILLING_EVENT_TYPES } from '../../events/schemas/billing-events';
import { initializeAIEventHandlers } from '../../events/handlers/ai-event-handlers';

describe('Event System Integration', () => {
  let eventBus: EventBus;
  let mockPublish: jest.Mock;
  let mockLog: jest.Mock;

  beforeEach(() => {
    eventBus = new EventBus();
    mockPublish = jest.fn();
    mockLog = jest.fn();
    
    // Mock console methods
    global.console = {
      ...console,
      log: mockLog,
      error: mockLog,
      warn: mockLog
    };
  });

  afterEach(() => {
    eventBus.close();
  });

  describe('AI Event Flow', () => {
    it('should process AI scoring request end-to-end', async () => {
      // Initialize handlers
      initializeAIEventHandlers(eventBus);

      // Mock the publish method
      eventBus.publish = mockPublish;

      // Publish AI scoring request
      const scoringRequest = {
        id: 'req-123',
        type: AI_EVENT_TYPES.SCORING_REQUESTED,
        data: {
          userId: 'user-123',
          tenantId: 'tenant-123',
          mortgageData: {
            loanAmount: 500000,
            downPayment: 100000,
            creditScore: 750,
            income: 120000
          }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          correlationId: 'corr-123'
        }
      };

      await eventBus.publish(scoringRequest.type, scoringRequest.data, scoringRequest.metadata);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify AI scoring completed event was published
      expect(mockPublish).toHaveBeenCalledWith(
        AI_EVENT_TYPES.SCORING_COMPLETED,
        expect.objectContaining({
          requestId: 'req-123',
          userId: 'user-123',
          tenantId: 'tenant-123',
          score: expect.any(Number),
          confidence: expect.any(Number)
        }),
        expect.any(Object)
      );

      // Verify usage recorded event was published
      expect(mockPublish).toHaveBeenCalledWith(
        BILLING_EVENT_TYPES.USAGE_RECORDED,
        expect.objectContaining({
          userId: 'user-123',
          tenantId: 'tenant-123',
          service: 'ai_scoring',
          usage: 1,
          cost: expect.any(Number)
        }),
        expect.any(Object)
      );
    });

    it('should handle AI scoring failure', async () => {
      initializeAIEventHandlers(eventBus);
      eventBus.publish = mockPublish;

      // Mock AI scoring to fail
      const originalHandleAIScoringRequested = require('../../events/handlers/ai-event-handlers').handleAIScoringRequested;
      jest.spyOn(require('../../events/handlers/ai-event-handlers'), 'handleAIScoringRequested')
        .mockImplementation(async (event) => {
          // Simulate failure
          await eventBus.publish(AI_EVENT_TYPES.SCORING_FAILED, {
            requestId: event.data.id,
            userId: event.data.userId,
            tenantId: event.data.tenantId,
            error: 'AI service unavailable',
            timestamp: new Date().toISOString()
          }, event.metadata);
        });

      const scoringRequest = {
        id: 'req-456',
        type: AI_EVENT_TYPES.SCORING_REQUESTED,
        data: {
          userId: 'user-456',
          tenantId: 'tenant-456',
          mortgageData: { loanAmount: 300000 }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          correlationId: 'corr-456'
        }
      };

      await eventBus.publish(scoringRequest.type, scoringRequest.data, scoringRequest.metadata);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify failure event was published
      expect(mockPublish).toHaveBeenCalledWith(
        AI_EVENT_TYPES.SCORING_FAILED,
        expect.objectContaining({
          requestId: 'req-456',
          error: 'AI service unavailable'
        }),
        expect.any(Object)
      );
    });
  });

  describe('Event Bus Metrics', () => {
    it('should track event metrics correctly', async () => {
      initializeAIEventHandlers(eventBus);

      // Publish multiple events
      const events = [
        { type: AI_EVENT_TYPES.SCORING_REQUESTED, data: { id: '1' } },
        { type: AI_EVENT_TYPES.SCORING_REQUESTED, data: { id: '2' } },
        { type: AI_EVENT_TYPES.SCORING_REQUESTED, data: { id: '3' } }
      ];

      for (const event of events) {
        await eventBus.publish(event.type, event.data);
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      const metrics = eventBus.getMetrics();
      
      expect(metrics.eventsPublished).toBe(3);
      expect(metrics.eventsProcessed).toBeGreaterThan(0);
      expect(metrics.subscriptionsActive).toBeGreaterThan(0);
    });
  });

  describe('Event Retry Logic', () => {
    it('should retry failed event processing', async () => {
      let attemptCount = 0;
      const maxRetries = 3;

      // Mock handler that fails first few times
      const mockHandler = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve();
      });

      eventBus.subscribe('test.event', mockHandler, { maxRetries });

      // Publish event
      await eventBus.publish('test.event', { test: 'data' });
      await new Promise(resolve => setTimeout(resolve, 500));

      // Should have been called 3 times (initial + 2 retries)
      expect(mockHandler).toHaveBeenCalledTimes(3);
    });
  });

  describe('Event Correlation', () => {
    it('should maintain correlation IDs across event flow', async () => {
      initializeAIEventHandlers(eventBus);
      eventBus.publish = mockPublish;

      const correlationId = 'corr-789';
      const scoringRequest = {
        id: 'req-789',
        type: AI_EVENT_TYPES.SCORING_REQUESTED,
        data: {
          userId: 'user-789',
          tenantId: 'tenant-789',
          mortgageData: { loanAmount: 400000 }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          correlationId
        }
      };

      await eventBus.publish(scoringRequest.type, scoringRequest.data, scoringRequest.metadata);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify all published events have the same correlation ID
      const publishedEvents = mockPublish.mock.calls;
      publishedEvents.forEach(([type, data, metadata]) => {
        expect(metadata.correlationId).toBe(correlationId);
      });
    });
  });

  describe('Event Ordering', () => {
    it('should process events in order', async () => {
      const processedEvents: string[] = [];
      
      const handler1 = jest.fn().mockImplementation(async (event) => {
        processedEvents.push('handler1');
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const handler2 = jest.fn().mockImplementation(async (event) => {
        processedEvents.push('handler2');
      });

      eventBus.subscribe('ordered.event', handler1, { priority: 1 });
      eventBus.subscribe('ordered.event', handler2, { priority: 2 });

      // Publish event
      await eventBus.publish('ordered.event', { test: 'data' });
      await new Promise(resolve => setTimeout(resolve, 100));

      // Handler1 should process first (higher priority)
      expect(processedEvents).toEqual(['handler1', 'handler2']);
    });
  });

  describe('Event Error Handling', () => {
    it('should handle handler errors gracefully', async () => {
      const errorHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
      const successHandler = jest.fn().mockResolvedValue(undefined);

      eventBus.subscribe('error.event', errorHandler);
      eventBus.subscribe('error.event', successHandler);

      // Publish event
      await eventBus.publish('error.event', { test: 'data' });
      await new Promise(resolve => setTimeout(resolve, 100));

      // Both handlers should be called
      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });
  });

  describe('Event Performance', () => {
    it('should handle high event volume', async () => {
      const eventCount = 100;
      const processedEvents: string[] = [];

      const handler = jest.fn().mockImplementation(async (event) => {
        processedEvents.push(event.data.id);
      });

      eventBus.subscribe('volume.event', handler);

      // Publish many events
      const startTime = Date.now();
      for (let i = 0; i < eventCount; i++) {
        await eventBus.publish('volume.event', { id: `event-${i}` });
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));
      const endTime = Date.now();

      // Verify all events were processed
      expect(processedEvents).toHaveLength(eventCount);
      
      // Verify performance (should complete within reasonable time)
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(1000); // 1 second
    });
  });
});
