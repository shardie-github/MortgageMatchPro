import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '10s', target: 5 },   // Ramp up to 5 users
    { duration: '30s', target: 10 },  // Stay at 10 users
    { duration: '10s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<400'], // 95% of requests must complete below 400ms
    http_req_duration: ['p(99)<700'], // 99% of requests must complete below 700ms
    errors: ['rate<0.1'],             // Error rate must be below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function() {
  // Test 1: Health endpoint
  const healthResponse = http.get(`${BASE_URL}/api/health`);
  check(healthResponse, {
    'health endpoint status is 200': (r) => r.status === 200,
    'health endpoint response time < 200ms': (r) => r.timings.duration < 200,
    'health endpoint returns valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
  });
  errorRate.add(healthResponse.status !== 200);

  sleep(1);

  // Test 2: Selftest endpoint
  const selftestResponse = http.get(`${BASE_URL}/api/selftest`);
  check(selftestResponse, {
    'selftest endpoint status is 200': (r) => r.status === 200,
    'selftest endpoint response time < 500ms': (r) => r.timings.duration < 500,
    'selftest endpoint returns valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
  });
  errorRate.add(selftestResponse.status !== 200);

  sleep(1);

  // Test 3: Main page
  const mainPageResponse = http.get(`${BASE_URL}/`);
  check(mainPageResponse, {
    'main page status is 200': (r) => r.status === 200,
    'main page response time < 300ms': (r) => r.timings.duration < 300,
    'main page contains expected content': (r) => r.body.includes('html'),
  });
  errorRate.add(mainPageResponse.status !== 200);

  sleep(1);

  // Test 4: API endpoint (if available)
  const apiResponse = http.get(`${BASE_URL}/api/performance/report`);
  check(apiResponse, {
    'API endpoint responds': (r) => r.status === 200 || r.status === 404, // 404 is acceptable if endpoint doesn't exist
    'API endpoint response time < 400ms': (r) => r.timings.duration < 400,
  });
  errorRate.add(apiResponse.status >= 500);

  sleep(1);
}

export function handleSummary(data) {
  return {
    'performance-report.json': JSON.stringify(data, null, 2),
  };
}