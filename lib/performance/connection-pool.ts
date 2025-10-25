/**
 * Connection Pool Management System v1.4.0
 * Efficient connection pooling with monitoring and optimization
 */

import { trackConnectionPool, ConnectionPoolMetrics } from './profiling-suite';

export interface PoolConfig {
  minConnections: number;
  maxConnections: number;
  acquireTimeout: number; // milliseconds
  idleTimeout: number; // milliseconds
  maxLifetime: number; // milliseconds
  enableMetrics: boolean;
}

export interface Connection {
  id: string;
  createdAt: number;
  lastUsed: number;
  isActive: boolean;
  isIdle: boolean;
  metadata?: any;
}

export interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageWaitTime: number;
  averageConnectionTime: number;
  poolEfficiency: number;
}

class ConnectionPool {
  private config: PoolConfig;
  private connections = new Map<string, Connection>();
  private waitingQueue: Array<{
    resolve: (connection: Connection) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  private stats: PoolStats;
  private cleanupTimer?: NodeJS.Timeout;
  private connectionIdCounter = 0;

  constructor(config: Partial<PoolConfig> = {}) {
    this.config = {
      minConnections: 2,
      maxConnections: 10,
      acquireTimeout: 30000, // 30 seconds
      idleTimeout: 300000, // 5 minutes
      maxLifetime: 3600000, // 1 hour
      enableMetrics: true,
      ...config,
    };

    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageWaitTime: 0,
      averageConnectionTime: 0,
      poolEfficiency: 0,
    };

    this.initializePool();
    this.startCleanupTimer();
  }

  // Acquire a connection from the pool
  async acquire(): Promise<Connection> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      // Try to get an idle connection
      const idleConnection = this.getIdleConnection();
      if (idleConnection) {
        this.activateConnection(idleConnection);
        this.stats.successfulRequests++;
        this.updateStats();
        this.trackPoolMetrics();
        return idleConnection;
      }

      // Try to create a new connection if under max limit
      if (this.connections.size < this.config.maxConnections) {
        const newConnection = await this.createConnection();
        this.activateConnection(newConnection);
        this.stats.successfulRequests++;
        this.updateStats();
        this.trackPoolMetrics();
        return newConnection;
      }

      // Wait for a connection to become available
      return new Promise((resolve, reject) => {
        const waitStart = Date.now();
        
        const timeout = setTimeout(() => {
          const index = this.waitingQueue.findIndex(item => item.resolve === resolve);
          if (index !== -1) {
            this.waitingQueue.splice(index, 1);
            this.stats.failedRequests++;
            this.updateStats();
            reject(new Error('Connection acquisition timeout'));
          }
        }, this.config.acquireTimeout);

        this.waitingQueue.push({
          resolve: (connection) => {
            clearTimeout(timeout);
            const waitTime = Date.now() - waitStart;
            this.updateAverageWaitTime(waitTime);
            this.stats.successfulRequests++;
            this.updateStats();
            resolve(connection);
          },
          reject: (error) => {
            clearTimeout(timeout);
            this.stats.failedRequests++;
            this.updateStats();
            reject(error);
          },
          timestamp: Date.now(),
        });

        this.stats.waitingRequests = this.waitingQueue.length;
      });
    } catch (error) {
      this.stats.failedRequests++;
      this.updateStats();
      throw error;
    }
  }

  // Release a connection back to the pool
  async release(connection: Connection): Promise<void> {
    try {
      if (!this.connections.has(connection.id)) {
        throw new Error('Connection not found in pool');
      }

      // Mark as idle
      connection.isActive = false;
      connection.isIdle = true;
      connection.lastUsed = Date.now();

      // Check if there are waiting requests
      if (this.waitingQueue.length > 0) {
        const waitingRequest = this.waitingQueue.shift();
        if (waitingRequest) {
          this.activateConnection(connection);
          waitingRequest.resolve(connection);
          return;
        }
      }

      this.updateStats();
      this.trackPoolMetrics();
    } catch (error) {
      console.error('[ConnectionPool] Error releasing connection:', error);
      throw error;
    }
  }

  // Close a connection and remove from pool
  async close(connection: Connection): Promise<void> {
    try {
      if (this.connections.has(connection.id)) {
        this.connections.delete(connection.id);
        this.stats.totalConnections--;
        this.updateStats();
        this.trackPoolMetrics();
      }
    } catch (error) {
      console.error('[ConnectionPool] Error closing connection:', error);
      throw error;
    }
  }

  // Get pool statistics
  getStats(): PoolStats {
    return { ...this.stats };
  }

  // Get all connections
  getConnections(): Connection[] {
    return Array.from(this.connections.values());
  }

  // Get active connections
  getActiveConnections(): Connection[] {
    return Array.from(this.connections.values()).filter(c => c.isActive);
  }

  // Get idle connections
  getIdleConnections(): Connection[] {
    return Array.from(this.connections.values()).filter(c => c.isIdle);
  }

  // Check if pool is healthy
  isHealthy(): boolean {
    return this.stats.totalConnections >= this.config.minConnections &&
           this.stats.poolEfficiency > 0.5;
  }

  // Force cleanup of expired connections
  async cleanup(): Promise<void> {
    const now = Date.now();
    const expiredConnections: Connection[] = [];

    for (const connection of this.connections.values()) {
      const age = now - connection.createdAt;
      const idleTime = now - connection.lastUsed;

      if (age > this.config.maxLifetime || 
          (connection.isIdle && idleTime > this.config.idleTimeout)) {
        expiredConnections.push(connection);
      }
    }

    for (const connection of expiredConnections) {
      await this.close(connection);
    }

    if (expiredConnections.length > 0) {
      console.log(`[ConnectionPool] Cleaned up ${expiredConnections.length} expired connections`);
    }
  }

  // Private methods
  private async initializePool(): Promise<void> {
    for (let i = 0; i < this.config.minConnections; i++) {
      try {
        const connection = await this.createConnection();
        connection.isIdle = true;
        connection.isActive = false;
      } catch (error) {
        console.error('[ConnectionPool] Error initializing pool:', error);
      }
    }
  }

  private async createConnection(): Promise<Connection> {
    const startTime = Date.now();
    const connectionId = `conn_${++this.connectionIdCounter}_${Date.now()}`;
    
    // Simulate connection creation - replace with actual connection logic
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const connection: Connection = {
      id: connectionId,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      isActive: false,
      isIdle: false,
      metadata: {},
    };

    this.connections.set(connectionId, connection);
    this.stats.totalConnections++;
    
    const connectionTime = Date.now() - startTime;
    this.updateAverageConnectionTime(connectionTime);
    
    return connection;
  }

  private getIdleConnection(): Connection | null {
    for (const connection of this.connections.values()) {
      if (connection.isIdle && !connection.isActive) {
        return connection;
      }
    }
    return null;
  }

  private activateConnection(connection: Connection): void {
    connection.isActive = true;
    connection.isIdle = false;
    connection.lastUsed = Date.now();
  }

  private updateStats(): void {
    const connections = Array.from(this.connections.values());
    this.stats.activeConnections = connections.filter(c => c.isActive).length;
    this.stats.idleConnections = connections.filter(c => c.isIdle).length;
    this.stats.waitingRequests = this.waitingQueue.length;
    
    // Calculate pool efficiency
    const totalConnections = this.stats.totalConnections;
    const activeConnections = this.stats.activeConnections;
    this.stats.poolEfficiency = totalConnections > 0 ? activeConnections / totalConnections : 0;
  }

  private updateAverageWaitTime(waitTime: number): void {
    const totalWaitTime = this.stats.averageWaitTime * (this.stats.successfulRequests - 1) + waitTime;
    this.stats.averageWaitTime = totalWaitTime / this.stats.successfulRequests;
  }

  private updateAverageConnectionTime(connectionTime: number): void {
    const totalConnectionTime = this.stats.averageConnectionTime * (this.stats.totalConnections - 1) + connectionTime;
    this.stats.averageConnectionTime = totalConnectionTime / this.stats.totalConnections;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60000); // Run cleanup every minute
  }

  private trackPoolMetrics(): void {
    if (this.config.enableMetrics) {
      trackConnectionPool({
        poolName: 'default',
        activeConnections: this.stats.activeConnections,
        idleConnections: this.stats.idleConnections,
        totalConnections: this.stats.totalConnections,
        waitingRequests: this.stats.waitingRequests,
        averageWaitTime: this.stats.averageWaitTime,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Cleanup on destroy
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    // Reject all waiting requests
    for (const request of this.waitingQueue) {
      request.reject(new Error('Connection pool destroyed'));
    }
    this.waitingQueue = [];
    
    // Close all connections
    for (const connection of this.connections.values()) {
      this.close(connection);
    }
  }
}

// Export singleton instance
export const connectionPool = new ConnectionPool();

// Export types and convenience functions
export { ConnectionPool, PoolConfig, Connection, PoolStats };

// Convenience functions
export const acquireConnection = (): Promise<Connection> => {
  return connectionPool.acquire();
};

export const releaseConnection = (connection: Connection): Promise<void> => {
  return connectionPool.release(connection);
};

export const closeConnection = (connection: Connection): Promise<void> => {
  return connectionPool.close(connection);
};

export const getPoolStats = (): PoolStats => {
  return connectionPool.getStats();
};

export const isPoolHealthy = (): boolean => {
  return connectionPool.isHealthy();
};
