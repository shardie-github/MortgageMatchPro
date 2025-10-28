# Deployment Guide - MortgageMatchPro v1.4.0

## Overview

This guide covers deploying MortgageMatchPro in production using Docker containers with multi-service orchestration, load balancing, and monitoring.

## New Reliability & Security Features

This deployment includes comprehensive reliability, security, speed, and cost-efficiency enhancements:

- **Bundle Size Monitoring**: Automated bundle size checks with budgets
- **Secrets Scanning**: Automated detection of leaked secrets
- **Database Performance**: Query performance monitoring and optimization
- **RLS Security**: Row-level security smoke tests
- **Health Monitoring**: Comprehensive health checks and self-tests
- **Cost Controls**: Automated cost monitoring and alerting
- **Performance Testing**: Load testing with k6 integration

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 8GB+ RAM available
- 50GB+ disk space
- Domain name (optional, for SSL)
- Node.js 18.18.0+ (for local development)
- npm 8.0.0+

## Pre-Deployment Checks

Before deploying, ensure all checks pass:

### 1. Bundle Size Check
```bash
npm run bundle:check
```

### 2. Secrets Scan
```bash
node scripts/secrets-scan.mjs
```

### 3. Database Performance Check
```bash
node scripts/db-slowquery-check.mjs
```

### 4. RLS Security Test
```bash
npx ts-node scripts/rls-smoke.ts
```

### 5. Health Check
```bash
node scripts/healthcheck.js http://localhost:3000
```

### 6. Cost Guard
```bash
node scripts/cost-guard.mjs
```

## Bypassing Budgets (Emergency Only)

In exceptional circumstances, budgets can be bypassed with approval:

### 1. Bundle Size Budget Bypass
- Add `bypass-bundle-budget` label to PR
- Get approval from performance team
- Document justification in PR description

### 2. Performance Budget Bypass
- Add `bypass-perf-budget` label to PR
- Get approval from performance team
- Document justification in PR description

### 3. Security Check Bypass
- Add `bypass-security-check` label to PR
- Get approval from security team
- Document justification in PR description

**Note**: Bypassing budgets should be rare and well-justified. Consider alternative solutions first.

## Environment Setup

### 1. Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Database
POSTGRES_DB=mortgagematch
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
DATABASE_URL=postgresql://postgres:your_secure_password@postgres:5432/mortgagematch

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Stripe
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# Monitoring
GRAFANA_PASSWORD=your_grafana_password

# Optional: External Redis (if not using containerized Redis)
REDIS_URL=redis://redis:6379
```

### 2. SSL Certificates (Optional)

If using HTTPS, place your SSL certificates in:
```
nginx/ssl/cert.pem
nginx/ssl/key.pem
```

## Deployment Steps

### 1. Clone and Prepare

```bash
git clone <repository-url>
cd mortgagematch-pro
cp .env.example .env.production
# Edit .env.production with your values
```

### 2. Build and Start Services

```bash
# Build all services
docker-compose -f docker-compose.prod.yml build

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check service status
docker-compose -f docker-compose.prod.yml ps
```

### 3. Verify Deployment

```bash
# Check API health
curl http://localhost:3000/api/health

# Check load balancer
curl http://localhost/health

# Check monitoring
curl http://localhost:9090  # Prometheus
curl http://localhost:3001  # Grafana
```

## Service Architecture

### Core Services

1. **API Service** (`api`)
   - Main Next.js application
   - Port: 3000
   - Resources: 2 CPU, 2GB RAM

2. **Worker Service** (`worker`)
   - Background job processing
   - Replicas: 2
   - Resources: 1 CPU, 1GB RAM each

3. **Database** (`postgres`)
   - PostgreSQL 15
   - Port: 5432
   - Resources: 1 CPU, 1GB RAM

4. **Cache** (`redis`)
   - Redis 7 for caching
   - Port: 6379
   - Resources: 0.5 CPU, 512MB RAM

5. **Load Balancer** (`nginx`)
   - Nginx with rate limiting
   - Ports: 80, 443
   - Resources: 0.5 CPU, 256MB RAM

### Monitoring Services

1. **Prometheus** (`monitoring`)
   - Metrics collection
   - Port: 9090

2. **Grafana** (`grafana`)
   - Dashboards and visualization
   - Port: 3001
   - Default login: admin/admin

3. **Loki** (`loki`)
   - Log aggregation
   - Port: 3100

## Scaling Configuration

### Horizontal Scaling

To scale API services:

```bash
# Scale API to 3 replicas
docker-compose -f docker-compose.prod.yml up -d --scale api=3

# Scale workers to 5 replicas
docker-compose -f docker-compose.prod.yml up -d --scale worker=5
```

### Vertical Scaling

Edit `docker-compose.prod.yml` to adjust resource limits:

```yaml
deploy:
  resources:
    limits:
      cpus: '4.0'      # Increase CPU
      memory: 4G       # Increase memory
    reservations:
      cpus: '1.0'
      memory: 1G
```

## Performance Testing

### Load Testing

```bash
# Run performance benchmark
npm run performance:benchmark

# Custom load test
CONCURRENCY=1000 DURATION=300000 npm run performance:benchmark
```

### Monitoring Performance

1. **Grafana Dashboards**
   - Access: http://localhost:3001
   - Login: admin/your_password
   - View system metrics and performance

2. **Prometheus Metrics**
   - Access: http://localhost:9090
   - Query performance metrics

3. **API Performance Report**
   - Access: http://localhost:3000/api/performance/report
   - JSON performance summary

## Health Checks

### Service Health

```bash
# Check all services
docker-compose -f docker-compose.prod.yml ps

# Check specific service logs
docker-compose -f docker-compose.prod.yml logs api
docker-compose -f docker-compose.prod.yml logs worker
```

### Application Health

```bash
# API health endpoint
curl http://localhost:3000/api/health

# Load balancer health
curl http://localhost/health

# Database connectivity
docker-compose -f docker-compose.prod.yml exec postgres pg_isready
```

## Maintenance

### Updates

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Backups

```bash
# Database backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres mortgagematch > backup.sql

# Redis backup
docker-compose -f docker-compose.prod.yml exec redis redis-cli BGSAVE
```

### Logs

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f nginx
```

## Troubleshooting

### Common Issues

1. **Service Won't Start**
   ```bash
   # Check logs
   docker-compose -f docker-compose.prod.yml logs service_name
   
   # Check resource usage
   docker stats
   ```

2. **Database Connection Issues**
   ```bash
   # Check database status
   docker-compose -f docker-compose.prod.yml exec postgres pg_isready
   
   # Check environment variables
   docker-compose -f docker-compose.prod.yml exec api env | grep DATABASE
   ```

3. **High Memory Usage**
   ```bash
   # Check memory usage
   docker stats
   
   # Restart services
   docker-compose -f docker-compose.prod.yml restart
   ```

### Performance Issues

1. **Slow Response Times**
   - Check Prometheus metrics
   - Review Nginx logs
   - Scale API services

2. **High Error Rates**
   - Check application logs
   - Review database performance
   - Verify external service connectivity

## Security Considerations

### Network Security

- All services run on internal Docker network
- Only Nginx exposed to external traffic
- Rate limiting configured on API endpoints

### Data Security

- Database password required
- SSL/TLS encryption for HTTPS
- Security headers configured in Nginx

### Access Control

- Grafana password protected
- Database access restricted to containers
- No external database access by default

## Monitoring and Alerting

### Key Metrics

1. **Application Metrics**
   - Response time (P95, P99)
   - Error rate
   - Throughput (requests/second)

2. **Infrastructure Metrics**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network I/O

3. **Business Metrics**
   - Active users
   - API usage
   - Error patterns

### Alerting Rules

Configure alerts for:
- High error rates (>5%)
- Slow response times (P95 > 2s)
- High memory usage (>80%)
- Service downtime

## Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed (if using HTTPS)
- [ ] Database initialized
- [ ] All services healthy
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Log rotation configured
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Performance testing completed

## Support

For deployment issues:
1. Check service logs
2. Review monitoring dashboards
3. Consult this guide
4. Contact development team

## Version History

- v1.4.0: Initial production deployment configuration
- Multi-container orchestration
- Load balancing and monitoring
- Performance optimization
