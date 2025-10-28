# Performance Monitoring and Budgets

This document outlines the performance monitoring strategy, budgets, and how to reproduce performance issues.

## Performance Budgets

### Bundle Size Budgets

| Type | Warning Threshold | Fail Threshold | Notes |
|------|------------------|----------------|-------|
| Client Bundle | 250 KB | 400 KB | Per page |
| Serverless Function | 1.2 MB | 1.5 MB | Per function |
| Edge Function | 1.2 MB | 1.5 MB | Per function |

### API Performance Budgets

| Metric | Warning Threshold | Fail Threshold | Notes |
|--------|------------------|----------------|-------|
| P95 Response Time | 400 ms | 700 ms | Under micro-load |
| P99 Response Time | 600 ms | 1000 ms | Under micro-load |
| Error Rate | 5% | 10% | Under normal load |

### Database Performance Budgets

| Metric | Warning Threshold | Fail Threshold | Notes |
|--------|------------------|----------------|-------|
| Query P95 | 300 ms | 500 ms | Individual queries |
| Query P99 | 500 ms | 1000 ms | Individual queries |
| Connection Pool | 80% | 95% | Utilization |

## Monitoring Tools

### Bundle Analysis

```bash
# Analyze bundle sizes
npm run bundle:analyze

# Check against budgets
npm run bundle:check

# Show budget thresholds
npm run bundle:budget
```

### Database Performance

```bash
# Run database performance tests
node scripts/db-slowquery-check.mjs

# Check database health
curl http://localhost:3000/api/health
```

### Load Testing

```bash
# Run load tests (requires k6)
k6 run --duration 60s --vus 10 scripts/load-test.js

# Run with custom target
k6 run --duration 60s --vus 10 --env BASE_URL=https://your-app.vercel.app scripts/load-test.js
```

## Performance Optimization Guidelines

### Bundle Optimization

1. **Tree Shaking**: Ensure unused code is eliminated
2. **Code Splitting**: Split large bundles into smaller chunks
3. **Dynamic Imports**: Use dynamic imports for heavy libraries
4. **Image Optimization**: Use Next.js Image component with proper formats

### Database Optimization

1. **Indexes**: Ensure proper indexes on frequently queried columns
2. **Query Optimization**: Use efficient queries and avoid N+1 problems
3. **Connection Pooling**: Configure appropriate connection pool sizes
4. **Caching**: Implement caching for frequently accessed data

### API Optimization

1. **Response Caching**: Use appropriate cache headers
2. **Compression**: Enable gzip/brotli compression
3. **CDN**: Use CDN for static assets
4. **Edge Functions**: Use edge functions for simple operations

## Troubleshooting Performance Issues

### Bundle Size Issues

1. **Identify Large Dependencies**:
   ```bash
   npm run bundle:analyze
   ```

2. **Check for Duplicate Dependencies**:
   ```bash
   npm ls --depth=0
   ```

3. **Analyze Bundle Composition**:
   - Look for large vendor chunks
   - Check for unused code
   - Verify tree shaking is working

### Database Performance Issues

1. **Check Slow Queries**:
   ```bash
   node scripts/db-slowquery-check.mjs
   ```

2. **Monitor Connection Pool**:
   - Check connection pool utilization
   - Look for connection leaks
   - Verify timeout settings

3. **Analyze Query Performance**:
   - Use EXPLAIN ANALYZE for slow queries
   - Check for missing indexes
   - Optimize query patterns

### API Performance Issues

1. **Check Response Times**:
   ```bash
   curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health
   ```

2. **Monitor Error Rates**:
   - Check application logs
   - Monitor error tracking (Sentry)
   - Verify error handling

3. **Load Testing**:
   ```bash
   k6 run scripts/load-test.js
   ```

## Performance Monitoring in CI/CD

### Automated Checks

- Bundle size checks run on every PR
- Database performance tests run on every PR
- Load tests run when `perf-check` label is added
- Cost monitoring runs on main branch

### Manual Checks

- Performance profiling for major changes
- Load testing for critical paths
- Database optimization reviews

## Performance Budget Bypass

In exceptional circumstances, budgets can be bypassed with approval:

1. **Create a PR** with detailed justification
2. **Add `bypass-budget` label** to the PR
3. **Get approval** from performance team
4. **Document the decision** in the PR description

## Performance Metrics Dashboard

### Key Metrics to Monitor

1. **Bundle Sizes**: Track bundle size trends over time
2. **API Response Times**: Monitor P95/P99 response times
3. **Database Performance**: Track query performance
4. **Error Rates**: Monitor application error rates
5. **Cost Metrics**: Track infrastructure costs

### Alerting Thresholds

- Bundle size exceeds warning threshold
- API response time exceeds warning threshold
- Database query exceeds warning threshold
- Error rate exceeds 5%
- Cost exceeds daily threshold

## Best Practices

### Development

1. **Profile Before Optimizing**: Use profiling tools to identify bottlenecks
2. **Measure Impact**: Always measure the impact of optimizations
3. **Test Performance**: Include performance tests in your test suite
4. **Monitor Trends**: Track performance metrics over time

### Deployment

1. **Gradual Rollout**: Use feature flags for gradual rollouts
2. **Monitor Closely**: Monitor performance after deployments
3. **Rollback Plan**: Have a rollback plan for performance regressions
4. **Document Changes**: Document performance-related changes

### Maintenance

1. **Regular Reviews**: Conduct regular performance reviews
2. **Update Budgets**: Update budgets based on business requirements
3. **Optimize Continuously**: Continuously optimize based on metrics
4. **Share Knowledge**: Share performance optimization knowledge with the team