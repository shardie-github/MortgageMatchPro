#!/usr/bin/env node

/**
 * Performance Benchmark Script v1.4.0
 * Simulates high-concurrency load testing and performance validation
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  concurrency: parseInt(process.env.CONCURRENCY) || 100,
  duration: parseInt(process.env.DURATION) || 60000, // 1 minute
  endpoints: [
    '/api/health',
    '/api/performance/report',
    '/api/calculate',
    '/api/rates',
    '/api/predictive-insights'
  ],
  successThreshold: 0.95, // 95% success rate
  responseTimeThreshold: 2000, // 2 seconds
};

class PerformanceBenchmark {
  constructor() {
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
      startTime: 0,
      endTime: 0,
      duration: 0,
    };
    this.isRunning = false;
  }

  async run() {
    console.log('🚀 Starting performance benchmark...');
    console.log(`📊 Configuration:`);
    console.log(`   Base URL: ${CONFIG.baseUrl}`);
    console.log(`   Concurrency: ${CONFIG.concurrency}`);
    console.log(`   Duration: ${CONFIG.duration}ms`);
    console.log(`   Endpoints: ${CONFIG.endpoints.length}`);
    console.log('');

    this.isRunning = true;
    this.results.startTime = performance.now();

    // Start concurrent load testing
    const promises = [];
    for (let i = 0; i < CONFIG.concurrency; i++) {
      promises.push(this.runWorker(i));
    }

    // Wait for duration
    await this.sleep(CONFIG.duration);
    this.isRunning = false;

    // Wait for all workers to complete
    await Promise.all(promises);

    this.results.endTime = performance.now();
    this.results.duration = this.results.endTime - this.results.startTime;

    this.generateReport();
  }

  async runWorker(workerId) {
    while (this.isRunning) {
      try {
        const endpoint = this.getRandomEndpoint();
        const startTime = performance.now();
        
        const response = await this.makeRequest(endpoint);
        const responseTime = performance.now() - startTime;

        this.results.totalRequests++;
        this.results.responseTimes.push(responseTime);

        if (response.statusCode >= 200 && response.statusCode < 300) {
          this.results.successfulRequests++;
        } else {
          this.results.failedRequests++;
          this.results.errors.push({
            endpoint,
            statusCode: response.statusCode,
            error: `HTTP ${response.statusCode}`,
            timestamp: new Date().toISOString(),
          });
        }

        // Small delay to prevent overwhelming the server
        await this.sleep(Math.random() * 100);
      } catch (error) {
        this.results.failedRequests++;
        this.results.errors.push({
          endpoint: 'unknown',
          statusCode: 0,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        
        // Wait before retrying
        await this.sleep(1000);
      }
    }
  }

  async makeRequest(endpoint) {
    return new Promise((resolve, reject) => {
      const url = `${CONFIG.baseUrl}${endpoint}`;
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;

      const req = client.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            data: data,
            headers: res.headers,
          });
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  getRandomEndpoint() {
    return CONFIG.endpoints[Math.floor(Math.random() * CONFIG.endpoints.length)];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateReport() {
    const successRate = this.results.totalRequests > 0 
      ? this.results.successfulRequests / this.results.totalRequests 
      : 0;

    const avgResponseTime = this.results.responseTimes.length > 0
      ? this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length
      : 0;

    const p95ResponseTime = this.calculatePercentile(this.results.responseTimes, 0.95);
    const p99ResponseTime = this.calculatePercentile(this.results.responseTimes, 0.99);

    const throughput = this.results.totalRequests / (this.results.duration / 1000);

    const report = {
      summary: {
        totalRequests: this.results.totalRequests,
        successfulRequests: this.results.successfulRequests,
        failedRequests: this.results.failedRequests,
        successRate: Math.round(successRate * 100) / 100,
        averageResponseTime: Math.round(avgResponseTime * 100) / 100,
        p95ResponseTime: Math.round(p95ResponseTime * 100) / 100,
        p99ResponseTime: Math.round(p99ResponseTime * 100) / 100,
        throughput: Math.round(throughput * 100) / 100,
        duration: Math.round(this.results.duration),
      },
      thresholds: {
        successRate: CONFIG.successThreshold,
        responseTime: CONFIG.responseTimeThreshold,
        successRatePassed: successRate >= CONFIG.successThreshold,
        responseTimePassed: p95ResponseTime <= CONFIG.responseTimeThreshold,
      },
      errors: this.results.errors.slice(0, 10), // Top 10 errors
      recommendations: this.generateRecommendations(successRate, p95ResponseTime, throughput),
    };

    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE BENCHMARK RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Requests: ${report.summary.totalRequests}`);
    console.log(`Successful: ${report.summary.successfulRequests}`);
    console.log(`Failed: ${report.summary.failedRequests}`);
    console.log(`Success Rate: ${(report.summary.successRate * 100).toFixed(2)}%`);
    console.log(`Average Response Time: ${report.summary.averageResponseTime}ms`);
    console.log(`P95 Response Time: ${report.summary.p95ResponseTime}ms`);
    console.log(`P99 Response Time: ${report.summary.p99ResponseTime}ms`);
    console.log(`Throughput: ${report.summary.throughput} req/s`);
    console.log(`Duration: ${report.summary.duration}ms`);
    console.log('');
    console.log('🎯 THRESHOLD VALIDATION');
    console.log(`Success Rate: ${report.thresholds.successRatePassed ? '✅ PASS' : '❌ FAIL'} (${(report.summary.successRate * 100).toFixed(2)}% >= ${(CONFIG.successThreshold * 100)}%)`);
    console.log(`Response Time: ${report.thresholds.responseTimePassed ? '✅ PASS' : '❌ FAIL'} (${report.summary.p95ResponseTime}ms <= ${CONFIG.responseTimeThreshold}ms)`);
    console.log('');
    
    if (report.recommendations.length > 0) {
      console.log('💡 RECOMMENDATIONS');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    console.log('='.repeat(60));

    // Overall result
    const overallPassed = report.thresholds.successRatePassed && report.thresholds.responseTimePassed;
    console.log(`\n🏆 OVERALL RESULT: ${overallPassed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!overallPassed) {
      process.exit(1);
    }
  }

  calculatePercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    const sorted = [...sortedArray].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  generateRecommendations(successRate, p95ResponseTime, throughput) {
    const recommendations = [];

    if (successRate < CONFIG.successThreshold) {
      recommendations.push(`Improve reliability: Success rate ${(successRate * 100).toFixed(2)}% is below ${(CONFIG.successThreshold * 100)}% threshold`);
    }

    if (p95ResponseTime > CONFIG.responseTimeThreshold) {
      recommendations.push(`Optimize response times: P95 response time ${p95ResponseTime.toFixed(2)}ms exceeds ${CONFIG.responseTimeThreshold}ms threshold`);
    }

    if (throughput < 10) {
      recommendations.push(`Increase throughput: Current ${throughput.toFixed(2)} req/s is low, consider horizontal scaling`);
    }

    if (this.results.errors.length > this.results.totalRequests * 0.1) {
      recommendations.push(`Reduce error rate: ${this.results.errors.length} errors out of ${this.results.totalRequests} requests`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance meets all thresholds - no immediate optimizations needed');
    }

    return recommendations;
  }
}

// Run benchmark
const benchmark = new PerformanceBenchmark();
benchmark.run().catch(console.error);
