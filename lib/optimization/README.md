# Optimization System

This directory contains the optimization system for the application, including cost optimization, performance monitoring, resource management, and distributed rate limiting.

## Components

### 1. Cost Optimizer (`cost-optimizer.ts`)

The `CostOptimizer` class provides comprehensive cost optimization strategies:

- **Caching**: Intelligent caching with TTL, LRU eviction, and compression
- **Batching**: Automatic batching of similar requests to reduce API calls
- **Compression**: Response compression to reduce data transfer costs
- **Deduplication**: Prevents duplicate requests
- **Prioritization**: Request prioritization based on cost and importance
- **Throttling**: Request throttling to control costs
- **Resource Pooling**: Efficient resource utilization

#### Usage

```typescript
import { CostOptimizer } from './cost-optimizer'
import { ApiService } from '../api/api-service'

const apiService = new ApiService({ baseURL: 'https://api.example.com' })
const costOptimizer = new CostOptimizer(apiService)

// Make optimized request
const result = await costOptimizer.optimizedRequest(
  'GET',
  '/users',
  { userId: 123 },
  { useCache: true, useBatch: true }
)

// Get cost metrics
const metrics = costOptimizer.getMetrics()
console.log('Total cost:', metrics.totalCost)
console.log('Savings:', metrics.optimizationSavings)
```

### 2. Performance Monitor (`performance-monitor.ts`)

The `PerformanceMonitor` class tracks and analyzes performance metrics:

- **Request Duration**: Tracks response times
- **Memory Usage**: Monitors heap and external memory
- **CPU Usage**: Tracks CPU utilization
- **Request/Response Sizes**: Monitors data transfer
- **Error Rates**: Tracks failure rates
- **Threshold Violations**: Alerts on performance issues

#### Usage

```typescript
import { PerformanceMonitor } from './performance-monitor'

const monitor = new PerformanceMonitor({
  maxDuration: 5000, // 5 seconds
  maxMemoryUsage: 100 * 1024 * 1024, // 100 MB
  maxCpuUsage: 80, // 80%
  maxRequestSize: 10 * 1024 * 1024, // 10 MB
  maxResponseSize: 10 * 1024 * 1024 // 10 MB
})

// Start monitoring
monitor.startMonitoring()

// Record metric
monitor.recordMetric({
  endpoint: '/api/users',
  method: 'GET',
  duration: 1500,
  requestSize: 1024,
  responseSize: 2048,
  statusCode: 200
})

// Get statistics
const stats = monitor.getStatistics()
console.log('Average duration:', stats.averageDuration)
console.log('Error rate:', stats.errorRate)
```

### 3. Resource Manager (`resource-manager.ts`)

The `ResourceManager` class manages system resources:

- **Resource Types**: CPU, Memory, Network, Disk, Database, Cache
- **Allocation**: Dynamic resource allocation and deallocation
- **Monitoring**: Real-time resource usage tracking
- **Dependencies**: Resource dependency management
- **Cost Tracking**: Resource cost calculation
- **Recommendations**: Automated optimization suggestions

#### Usage

```typescript
import { ResourceManager, ResourceType } from './resource-manager'

const resourceManager = new ResourceManager()

// Start monitoring
resourceManager.startMonitoring()

// Allocate resources
const allocationId = resourceManager.allocateResources(
  ResourceType.MEMORY,
  1024 * 1024, // 1 MB
  5, // priority
  60000 // 1 minute duration
)

// Release resources
resourceManager.releaseResources(allocationId)

// Get usage
const usage = resourceManager.getUsage(ResourceType.MEMORY)
console.log('Memory usage:', usage.percentage)
```

### 4. Distributed Rate Limiter (`../rate-limiting/distributed-rate-limiter.ts`)

The `DistributedRateLimiter` class provides distributed rate limiting:

- **Algorithms**: Fixed Window, Sliding Window, Token Bucket, Leaky Bucket
- **Redis Integration**: Distributed rate limiting across instances
- **Middleware**: Easy integration with API routes
- **Statistics**: Rate limit statistics and monitoring
- **Configuration**: Flexible rate limit configurations

#### Usage

```typescript
import { DistributedRateLimiter } from '../rate-limiting/distributed-rate-limiter'

const rateLimiter = new DistributedRateLimiter({
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'password',
    db: 0
  },
  defaultConfig: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    algorithm: 'sliding-window'
  }
})

// Check rate limit
const result = await rateLimiter.checkLimit('user123', '/api/users')
if (!result.allowed) {
  throw new Error('Rate limit exceeded')
}
```

### 5. Optimization Manager (`optimization-manager.ts`)

The `OptimizationManager` class orchestrates all optimization strategies:

- **Strategy Management**: Configures and manages optimization strategies
- **Automated Optimization**: Runs optimization automatically
- **Results Tracking**: Tracks optimization results and savings
- **Recommendations**: Provides optimization recommendations
- **Statistics**: Comprehensive optimization statistics

#### Usage

```typescript
import { OptimizationManager } from './optimization-manager'

const optimizationManager = new OptimizationManager(
  costOptimizer,
  performanceMonitor,
  resourceManager,
  rateLimiter
)

// Start optimization
optimizationManager.startOptimization(30000) // Every 30 seconds

// Get recommendations
const recommendations = optimizationManager.getRecommendations()
console.log('Optimization recommendations:', recommendations)
```

## API Endpoints

### Rate Limit Test
- **GET** `/api/rate-limit-test` - Test rate limiting functionality

### Cost Optimization Test
- **GET** `/api/cost-optimization-test` - Test cost optimization strategies

### Performance Test
- **GET** `/api/performance-test` - Test performance monitoring
- **Query Parameters**:
  - `duration`: Work duration in milliseconds
  - `memory`: Enable memory-intensive work
  - `cpu`: Enable CPU-intensive work

### Resource Test
- **GET** `/api/resource-test` - Test resource management
- **Query Parameters**:
  - `action`: `status`, `allocate`, `release`, `cleanup`
  - `type`: Resource type for allocation
  - `amount`: Amount to allocate
  - `priority`: Allocation priority
  - `duration`: Allocation duration

### Optimization Test
- **GET** `/api/optimization-test` - Test optimization management
- **Query Parameters**:
  - `action`: `status`, `configure`, `run`, `stop`, `start`
  - `strategy`: Optimization strategy
  - `enabled`: Enable/disable strategy
  - `priority`: Strategy priority
  - `threshold`: Optimization threshold

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0

# API Configuration
API_BASE_URL=https://api.example.com
OPENAI_API_KEY=your_openai_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key
ENCRYPTION_KEY=your_encryption_key
JWT_SECRET=your_jwt_secret
```

### Default Configurations

```typescript
// Cost Optimization
const costConfig = {
  cache: {
    ttl: 300000, // 5 minutes
    maxSize: 1000,
    strategy: 'LRU',
    compressionEnabled: true
  },
  batch: {
    maxBatchSize: 10,
    maxWaitTime: 1000, // 1 second
    enabled: true
  }
}

// Performance Monitoring
const perfConfig = {
  maxDuration: 5000, // 5 seconds
  maxMemoryUsage: 100 * 1024 * 1024, // 100 MB
  maxCpuUsage: 80, // 80%
  maxRequestSize: 10 * 1024 * 1024, // 10 MB
  maxResponseSize: 10 * 1024 * 1024 // 10 MB
}

// Rate Limiting
const rateLimitConfig = {
  windowMs: 60000, // 1 minute
  maxRequests: 100,
  algorithm: 'sliding-window'
}
```

## Best Practices

1. **Start with Monitoring**: Always start by monitoring current performance and costs
2. **Gradual Optimization**: Apply optimizations gradually and measure their impact
3. **Set Thresholds**: Configure appropriate thresholds for alerts and optimizations
4. **Regular Cleanup**: Schedule regular cleanup of expired allocations and cache entries
5. **Resource Dependencies**: Consider resource dependencies when allocating resources
6. **Cost vs Performance**: Balance cost optimization with performance requirements
7. **Testing**: Test optimization strategies in a controlled environment first

## Troubleshooting

### Common Issues

1. **Redis Connection**: Ensure Redis is running and accessible
2. **Memory Leaks**: Monitor memory usage and clean up expired allocations
3. **Rate Limit Exceeded**: Adjust rate limit configurations based on usage patterns
4. **Performance Degradation**: Check for resource contention and optimize accordingly
5. **Cost Spikes**: Monitor cost metrics and apply appropriate optimizations

### Debugging

Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=optimization:*
```

This will provide detailed logs for all optimization components.

## Contributing

When adding new optimization strategies:

1. Implement the strategy in the appropriate component
2. Add configuration options
3. Update the optimization manager
4. Add tests
5. Update documentation

## License

This optimization system is part of the main application and follows the same license terms.