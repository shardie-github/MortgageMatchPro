/**
 * Event Bus System v1.4.0
 * Lightweight event-driven architecture for domain decoupling
 */

export interface Event {
  id: string;
  type: string;
  version: string;
  timestamp: string;
  source: string;
  data: any;
  metadata?: {
    correlationId?: string;
    causationId?: string;
    userId?: string;
    tenantId?: string;
    [key: string]: any;
  };
}

export interface EventHandler<T = any> {
  (event: Event & { data: T }): Promise<void> | void;
}

export interface EventSubscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  priority: number;
  retryCount: number;
  maxRetries: number;
  isActive: boolean;
}

export interface EventBusConfig {
  maxRetries: number;
  retryDelay: number;
  maxQueueSize: number;
  enablePersistence: boolean;
  enableMetrics: boolean;
}

class EventBus {
  private subscriptions = new Map<string, EventSubscription[]>();
  private eventQueue: Event[] = [];
  private isProcessing = false;
  private config: EventBusConfig;
  private metrics = {
    eventsPublished: 0,
    eventsProcessed: 0,
    eventsFailed: 0,
    subscriptionsActive: 0,
  };

  constructor(config: Partial<EventBusConfig> = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      maxQueueSize: 10000,
      enablePersistence: false,
      enableMetrics: true,
      ...config,
    };
  }

  // Subscribe to an event type
  subscribe<T = any>(
    eventType: string,
    handler: EventHandler<T>,
    options: {
      priority?: number;
      maxRetries?: number;
      id?: string;
    } = {}
  ): string {
    const subscriptionId = options.id || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      eventType,
      handler,
      priority: options.priority || 0,
      retryCount: 0,
      maxRetries: options.maxRetries || this.config.maxRetries,
      isActive: true,
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    this.subscriptions.get(eventType)!.push(subscription);
    this.metrics.subscriptionsActive++;

    console.log(`[EventBus] Subscribed to ${eventType} with ID: ${subscriptionId}`);
    return subscriptionId;
  }

  // Unsubscribe from an event type
  unsubscribe(subscriptionId: string): boolean {
    for (const [eventType, subscriptions] of this.subscriptions) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        this.metrics.subscriptionsActive--;
        console.log(`[EventBus] Unsubscribed ${subscriptionId} from ${eventType}`);
        return true;
      }
    }
    return false;
  }

  // Publish an event
  async publish(eventType: string, data: any, metadata?: Event['metadata']): Promise<void> {
    const event: Event = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      version: '1.0',
      timestamp: new Date().toISOString(),
      source: 'event-bus',
      data,
      metadata,
    };

    // Add to queue
    this.eventQueue.push(event);
    this.metrics.eventsPublished++;

    // Check queue size
    if (this.eventQueue.length > this.config.maxQueueSize) {
      console.warn(`[EventBus] Queue size exceeded ${this.config.maxQueueSize}, dropping oldest events`);
      this.eventQueue = this.eventQueue.slice(-this.config.maxQueueSize);
    }

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processEvents();
    }

    console.log(`[EventBus] Published event ${eventType} with ID: ${event.id}`);
  }

  // Process events from the queue
  private async processEvents(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (!event) break;

      await this.processEvent(event);
    }

    this.isProcessing = false;
  }

  // Process a single event
  private async processEvent(event: Event): Promise<void> {
    const subscriptions = this.subscriptions.get(event.type) || [];
    
    if (subscriptions.length === 0) {
      console.warn(`[EventBus] No subscribers for event type: ${event.type}`);
      return;
    }

    // Sort by priority (higher priority first)
    const sortedSubscriptions = subscriptions
      .filter(sub => sub.isActive)
      .sort((a, b) => b.priority - a.priority);

    // Process each subscription
    for (const subscription of sortedSubscriptions) {
      try {
        await subscription.handler(event);
        this.metrics.eventsProcessed++;
        console.log(`[EventBus] Successfully processed event ${event.id} with subscription ${subscription.id}`);
      } catch (error) {
        console.error(`[EventBus] Error processing event ${event.id} with subscription ${subscription.id}:`, error);
        
        // Handle retries
        subscription.retryCount++;
        if (subscription.retryCount <= subscription.maxRetries) {
          console.log(`[EventBus] Retrying event ${event.id} with subscription ${subscription.id} (attempt ${subscription.retryCount})`);
          
          // Add back to queue with delay
          setTimeout(() => {
            this.eventQueue.unshift(event);
            if (!this.isProcessing) {
              this.processEvents();
            }
          }, this.config.retryDelay * subscription.retryCount);
        } else {
          console.error(`[EventBus] Max retries exceeded for event ${event.id} with subscription ${subscription.id}`);
          this.metrics.eventsFailed++;
          subscription.isActive = false;
        }
      }
    }
  }

  // Get event bus metrics
  getMetrics() {
    return {
      ...this.metrics,
      queueSize: this.eventQueue.length,
      subscriptionsByType: Object.fromEntries(
        Array.from(this.subscriptions.entries()).map(([type, subs]) => [
          type,
          subs.filter(sub => sub.isActive).length
        ])
      ),
    };
  }

  // Get active subscriptions
  getSubscriptions(): EventSubscription[] {
    const allSubscriptions: EventSubscription[] = [];
    for (const subscriptions of this.subscriptions.values()) {
      allSubscriptions.push(...subscriptions.filter(sub => sub.isActive));
    }
    return allSubscriptions;
  }

  // Clear all subscriptions
  clearSubscriptions(): void {
    this.subscriptions.clear();
    this.metrics.subscriptionsActive = 0;
    console.log('[EventBus] Cleared all subscriptions');
  }

  // Clear event queue
  clearQueue(): void {
    this.eventQueue = [];
    console.log('[EventBus] Cleared event queue');
  }

  // Get queue status
  getQueueStatus() {
    return {
      size: this.eventQueue.length,
      isProcessing: this.isProcessing,
      oldestEvent: this.eventQueue[0]?.timestamp,
      newestEvent: this.eventQueue[this.eventQueue.length - 1]?.timestamp,
    };
  }
}

// Export singleton instance
export const eventBus = new EventBus();

// Export types and convenience functions
export { EventBus, EventHandler, EventSubscription, EventBusConfig };

// Convenience functions
export const subscribe = <T = any>(
  eventType: string,
  handler: EventHandler<T>,
  options?: Parameters<typeof eventBus.subscribe>[2]
) => {
  return eventBus.subscribe(eventType, handler, options);
};

export const publish = (
  eventType: string,
  data: any,
  metadata?: Event['metadata']
) => {
  return eventBus.publish(eventType, data, metadata);
};

export const unsubscribe = (subscriptionId: string) => {
  return eventBus.unsubscribe(subscriptionId);
};

export const getEventMetrics = () => {
  return eventBus.getMetrics();
};

export const getEventSubscriptions = () => {
  return eventBus.getSubscriptions();
};
