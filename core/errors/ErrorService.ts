/**
 * Centralized Error Service
 * Provides consistent error handling, logging, and recovery across the application
 */

import { z } from 'zod';

// Error code schema
export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'AUTHENTICATION_ERROR',
  'AUTHORIZATION_ERROR',
  'NOT_FOUND',
  'RATE_LIMIT_EXCEEDED',
  'INTERNAL_ERROR',
  'EXTERNAL_SERVICE_ERROR',
  'DATABASE_ERROR',
  'NETWORK_ERROR',
  'TIMEOUT_ERROR',
  'CONFIGURATION_ERROR',
  'BUSINESS_LOGIC_ERROR'
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

// Error severity schema
export const ErrorSeveritySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
]);

export type ErrorSeverity = z.infer<typeof ErrorSeveritySchema>;

// Error context schema
export const ErrorContextSchema = z.object({
  userId: z.string().optional(),
  tenantId: z.string().optional(),
  requestId: z.string().optional(),
  sessionId: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  endpoint: z.string().optional(),
  method: z.string().optional(),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional()
});

export type ErrorContext = z.infer<typeof ErrorContextSchema>;

// Application error schema
export const AppErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  severity: ErrorSeveritySchema,
  context: ErrorContextSchema,
  originalError: z.any().optional(),
  stack: z.string().optional(),
  retryable: z.boolean().default(false),
  retryAfter: z.number().optional(), // seconds
  errorId: z.string(),
  timestamp: z.date()
});

export type AppError = z.infer<typeof AppErrorSchema>;

// Error recovery action schema
export const ErrorRecoveryActionSchema = z.object({
  action: z.enum(['RETRY', 'FALLBACK', 'CIRCUIT_BREAK', 'ALERT', 'LOG']),
  delay: z.number().optional(), // milliseconds
  maxAttempts: z.number().optional(),
  fallbackValue: z.any().optional(),
  alertLevel: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional()
});

export type ErrorRecoveryAction = z.infer<typeof ErrorRecoveryActionSchema>;

export class ErrorService {
  private errorHandlers: Map<ErrorCode, (error: AppError) => ErrorRecoveryAction[]> = new Map();
  private errorLogger: (error: AppError) => Promise<void>;
  private errorMetrics: Map<ErrorCode, number> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor() {
    this.errorLogger = this.defaultErrorLogger;
    this.initializeErrorHandlers();
  }

  /**
   * Create a standardized application error
   */
  createError(
    code: ErrorCode,
    message: string,
    severity: ErrorSeverity = 'MEDIUM',
    context: Partial<ErrorContext> = {},
    originalError?: any,
    retryable: boolean = false
  ): AppError {
    const errorId = this.generateErrorId();
    const timestamp = new Date();
    
    const appError: AppError = {
      code,
      message,
      severity,
      context: {
        ...context,
        timestamp
      },
      originalError,
      stack: originalError?.stack,
      retryable,
      errorId,
      timestamp
    };

    // Log the error
    this.logError(appError);
    
    // Update metrics
    this.updateErrorMetrics(code);
    
    return appError;
  }

  /**
   * Handle an error with recovery actions
   */
  async handleError(error: AppError): Promise<ErrorRecoveryAction[]> {
    const handlers = this.errorHandlers.get(error.code) || [];
    const actions: ErrorRecoveryAction[] = [];
    
    for (const handler of handlers) {
      const handlerActions = handler(error);
      actions.push(...handlerActions);
    }
    
    // Execute recovery actions
    for (const action of actions) {
      await this.executeRecoveryAction(action, error);
    }
    
    return actions;
  }

  /**
   * Wrap a function with error handling
   */
  async withErrorHandling<T>(
    fn: () => Promise<T>,
    errorCode: ErrorCode,
    context: Partial<ErrorContext> = {}
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const appError = this.createError(
        errorCode,
        error instanceof Error ? error.message : 'Unknown error',
        'MEDIUM',
        context,
        error,
        true
      );
      
      const actions = await this.handleError(appError);
      
      // If no recovery actions were taken, re-throw the error
      if (actions.length === 0) {
        throw appError;
      }
      
      // If retry action was taken, retry the function
      const retryAction = actions.find(action => action.action === 'RETRY');
      if (retryAction && retryAction.maxAttempts && retryAction.maxAttempts > 0) {
        return await this.retryWithBackoff(fn, retryAction.maxAttempts, retryAction.delay);
      }
      
      // If fallback action was taken, return fallback value
      const fallbackAction = actions.find(action => action.action === 'FALLBACK');
      if (fallbackAction && fallbackAction.fallbackValue !== undefined) {
        return fallbackAction.fallbackValue;
      }
      
      throw appError;
    }
  }

  /**
   * Retry a function with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          throw lastError;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Execute a recovery action
   */
  private async executeRecoveryAction(action: ErrorRecoveryAction, error: AppError): Promise<void> {
    switch (action.action) {
      case 'RETRY':
        // Retry logic is handled in withErrorHandling
        break;
        
      case 'FALLBACK':
        // Fallback logic is handled in withErrorHandling
        break;
        
      case 'CIRCUIT_BREAK':
        const serviceName = error.context.endpoint || 'unknown';
        this.triggerCircuitBreaker(serviceName);
        break;
        
      case 'ALERT':
        await this.sendAlert(action.alertLevel || 'ERROR', error);
        break;
        
      case 'LOG':
        await this.logError(error);
        break;
    }
  }

  /**
   * Initialize error handlers for different error codes
   */
  private initializeErrorHandlers(): void {
    // Validation errors
    this.errorHandlers.set('VALIDATION_ERROR', (error) => [
      { action: 'LOG' },
      { action: 'ALERT', alertLevel: 'WARNING' }
    ]);

    // Authentication errors
    this.errorHandlers.set('AUTHENTICATION_ERROR', (error) => [
      { action: 'LOG' },
      { action: 'ALERT', alertLevel: 'WARNING' }
    ]);

    // Rate limit errors
    this.errorHandlers.set('RATE_LIMIT_EXCEEDED', (error) => [
      { action: 'LOG' },
      { action: 'RETRY', delay: 60000, maxAttempts: 1 } // Retry after 1 minute
    ]);

    // External service errors
    this.errorHandlers.set('EXTERNAL_SERVICE_ERROR', (error) => [
      { action: 'LOG' },
      { action: 'CIRCUIT_BREAK' },
      { action: 'RETRY', delay: 5000, maxAttempts: 3 },
      { action: 'FALLBACK', fallbackValue: null }
    ]);

    // Network errors
    this.errorHandlers.set('NETWORK_ERROR', (error) => [
      { action: 'LOG' },
      { action: 'RETRY', delay: 2000, maxAttempts: 5 }
    ]);

    // Timeout errors
    this.errorHandlers.set('TIMEOUT_ERROR', (error) => [
      { action: 'LOG' },
      { action: 'RETRY', delay: 1000, maxAttempts: 3 }
    ]);

    // Internal errors
    this.errorHandlers.set('INTERNAL_ERROR', (error) => [
      { action: 'LOG' },
      { action: 'ALERT', alertLevel: 'CRITICAL' }
    ]);

    // Database errors
    this.errorHandlers.set('DATABASE_ERROR', (error) => [
      { action: 'LOG' },
      { action: 'ALERT', alertLevel: 'ERROR' },
      { action: 'RETRY', delay: 3000, maxAttempts: 2 }
    ]);
  }

  /**
   * Log an error
   */
  private async logError(error: AppError): Promise<void> {
    await this.errorLogger(error);
  }

  /**
   * Default error logger
   */
  private async defaultErrorLogger(error: AppError): Promise<void> {
    const logEntry = {
      errorId: error.errorId,
      code: error.code,
      message: error.message,
      severity: error.severity,
      context: error.context,
      stack: error.stack,
      timestamp: error.timestamp.toISOString()
    };

    if (error.severity === 'CRITICAL') {
      console.error('🚨 CRITICAL ERROR:', logEntry);
    } else if (error.severity === 'HIGH') {
      console.error('❌ HIGH ERROR:', logEntry);
    } else if (error.severity === 'MEDIUM') {
      console.warn('⚠️  MEDIUM ERROR:', logEntry);
    } else {
      console.log('ℹ️  LOW ERROR:', logEntry);
    }
  }

  /**
   * Send an alert
   */
  private async sendAlert(level: string, error: AppError): Promise<void> {
    // In a real implementation, you would send alerts via email, Slack, etc.
    console.log(`🚨 ALERT [${level}]: ${error.message} (${error.errorId})`);
  }

  /**
   * Trigger a circuit breaker
   */
  private triggerCircuitBreaker(serviceName: string): void {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, new CircuitBreaker());
    }
    
    const circuitBreaker = this.circuitBreakers.get(serviceName)!;
    circuitBreaker.recordFailure();
  }

  /**
   * Check if a service is available (circuit breaker)
   */
  isServiceAvailable(serviceName: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    return circuitBreaker ? circuitBreaker.isAvailable() : true;
  }

  /**
   * Update error metrics
   */
  private updateErrorMetrics(code: ErrorCode): void {
    const current = this.errorMetrics.get(code) || 0;
    this.errorMetrics.set(code, current + 1);
  }

  /**
   * Get error metrics
   */
  getErrorMetrics(): Map<ErrorCode, number> {
    return new Map(this.errorMetrics);
  }

  /**
   * Generate a unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set custom error logger
   */
  setErrorLogger(logger: (error: AppError) => Promise<void>): void {
    this.errorLogger = logger;
  }

  /**
   * Add custom error handler
   */
  addErrorHandler(code: ErrorCode, handler: (error: AppError) => ErrorRecoveryAction[]): void {
    this.errorHandlers.set(code, handler);
  }
}

// Circuit breaker implementation
class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly failureThreshold: number = 5;
  private readonly timeout: number = 60000; // 1 minute

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  isAvailable(): boolean {
    if (this.state === 'CLOSED') {
      return true;
    }
    
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    
    // HALF_OPEN state
    return true;
  }
}

// Singleton instance
export const errorService = new ErrorService();