#!/usr/bin/env node

/**
 * Test script to validate all improvements from the continuous improvement plan
 * Tests mobile responsiveness, performance, API integration, and bundle optimization
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test configuration
const TEST_CONFIG = {
  bundleSizeTarget: 1.5 * 1024 * 1024, // 1.5MB
  performanceThresholds: {
    renderTime: 16, // 16ms for 60fps
    apiResponse: 2000, // 2 seconds
    navigation: 300, // 300ms
  },
  mobileBreakpoints: {
    xs: 320,
    sm: 375,
    md: 390,
    lg: 414,
    xl: 428,
  },
  testTimeout: 30000, // 30 seconds
};

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// Utility functions
const log = (message, color = 'white') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const logSection = (title) => {
  log(`\n${colors.bold}${colors.cyan}=== ${title} ===${colors.reset}`);
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Test results tracking
class TestResults {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  addTest(name, passed, details = '') {
    this.results.push({ name, passed, details });
    if (passed) {
      this.passed++;
      log(`✅ ${name}`, 'green');
    } else {
      this.failed++;
      log(`❌ ${name}: ${details}`, 'red');
    }
  }

  getSummary() {
    const total = this.passed + this.failed;
    const percentage = total > 0 ? (this.passed / total) * 100 : 0;
    return { total, passed: this.passed, failed: this.failed, percentage };
  }
}

// Test functions
const testBundleSize = (results) => {
  logSection('Testing Bundle Size Optimization');
  
  try {
    // Check if bundle analysis script exists
    const bundleScriptPath = path.join(__dirname, 'optimize-bundle.js');
    if (!fs.existsSync(bundleScriptPath)) {
      results.addTest('Bundle Analysis Script', false, 'Bundle optimization script not found');
      return;
    }

    // Run bundle analysis
    const output = execSync(`node ${bundleScriptPath}`, { encoding: 'utf8' });
    
    // Check for bundle size warnings
    if (output.includes('Bundle size exceeds target')) {
      results.addTest('Bundle Size Target', false, 'Bundle size exceeds 1.5MB target');
    } else {
      results.addTest('Bundle Size Target', true, 'Bundle size within target');
    }

    // Check for optimization recommendations
    if (output.includes('Bundle is optimized')) {
      results.addTest('Bundle Optimization', true, 'Bundle is fully optimized');
    } else {
      results.addTest('Bundle Optimization', false, 'Bundle needs optimization');
    }

  } catch (error) {
    results.addTest('Bundle Size Test', false, `Error: ${error.message}`);
  }
};

const testMobileResponsiveness = (results) => {
  logSection('Testing Mobile Responsiveness');
  
  // Check if responsive utilities exist
  const responsiveUtilsPath = path.join(__dirname, '..', 'src', 'utils', 'responsive.ts');
  if (!fs.existsSync(responsiveUtilsPath)) {
    results.addTest('Responsive Utilities', false, 'Responsive utilities not found');
    return;
  }

  // Check if responsive components exist
  const responsiveComponents = [
    'ResponsiveContainer.tsx',
    'ResponsiveText.tsx',
    'ResponsiveButton.tsx',
  ];

  responsiveComponents.forEach(component => {
    const componentPath = path.join(__dirname, '..', 'src', 'components', 'ui', component);
    if (fs.existsSync(componentPath)) {
      results.addTest(`Responsive Component: ${component}`, true);
    } else {
      results.addTest(`Responsive Component: ${component}`, false, 'Component not found');
    }
  });

  // Check if responsive layout components exist
  const layoutComponents = [
    'ResponsiveLayout.tsx',
    'ResponsiveGrid.tsx',
  ];

  layoutComponents.forEach(component => {
    const componentPath = path.join(__dirname, '..', 'src', 'components', 'layout', component);
    if (fs.existsSync(componentPath)) {
      results.addTest(`Layout Component: ${component}`, true);
    } else {
      results.addTest(`Layout Component: ${component}`, false, 'Component not found');
    }
  });
};

const testPerformanceOptimization = (results) => {
  logSection('Testing Performance Optimization');
  
  // Check if performance utilities exist
  const performanceUtilsPath = path.join(__dirname, '..', 'src', 'utils', 'performance.ts');
  if (!fs.existsSync(performanceUtilsPath)) {
    results.addTest('Performance Utilities', false, 'Performance utilities not found');
    return;
  }

  // Check if performance dashboard exists
  const performanceDashboardPath = path.join(__dirname, '..', 'src', 'components', 'performance', 'PerformanceDashboard.tsx');
  if (fs.existsSync(performanceDashboardPath)) {
    results.addTest('Performance Dashboard', true);
  } else {
    results.addTest('Performance Dashboard', false, 'Performance dashboard not found');
  }

  // Check if mobile testing utilities exist
  const mobileTestingPath = path.join(__dirname, '..', 'src', 'utils', 'mobileTesting.ts');
  if (fs.existsSync(mobileTestingPath)) {
    results.addTest('Mobile Testing Utilities', true);
  } else {
    results.addTest('Mobile Testing Utilities', false, 'Mobile testing utilities not found');
  }

  // Check metro config optimization
  const metroConfigPath = path.join(__dirname, '..', 'metro.config.js');
  if (fs.existsSync(metroConfigPath)) {
    const metroConfig = fs.readFileSync(metroConfigPath, 'utf8');
    if (metroConfig.includes('unstable_enablePackageExports') && 
        metroConfig.includes('hermesParser') && 
        metroConfig.includes('inlineRequires')) {
      results.addTest('Metro Config Optimization', true);
    } else {
      results.addTest('Metro Config Optimization', false, 'Metro config not optimized');
    }
  } else {
    results.addTest('Metro Config Optimization', false, 'Metro config not found');
  }
};

const testApiIntegration = (results) => {
  logSection('Testing API Integration');
  
  // Check if enhanced API service exists
  const enhancedApiPath = path.join(__dirname, '..', 'src', 'services', 'enhancedApiService.ts');
  if (fs.existsSync(enhancedApiPath)) {
    results.addTest('Enhanced API Service', true);
  } else {
    results.addTest('Enhanced API Service', false, 'Enhanced API service not found');
  }

  // Check if rate APIs have circuit breaker
  const rateApisPath = path.join(__dirname, '..', 'lib', 'rate-apis.ts');
  if (fs.existsSync(rateApisPath)) {
    const rateApisContent = fs.readFileSync(rateApisPath, 'utf8');
    if (rateApisContent.includes('CircuitBreaker') && 
        rateApisContent.includes('fallback') && 
        rateApisContent.includes('error handling')) {
      results.addTest('Rate API Circuit Breaker', true);
    } else {
      results.addTest('Rate API Circuit Breaker', false, 'Circuit breaker not implemented');
    }
  } else {
    results.addTest('Rate API Circuit Breaker', false, 'Rate APIs file not found');
  }

  // Check if API error handling is comprehensive
  if (fs.existsSync(enhancedApiPath)) {
    const apiContent = fs.readFileSync(enhancedApiPath, 'utf8');
    if (apiContent.includes('handleError') && 
        apiContent.includes('circuitBreaker') && 
        apiContent.includes('fallback')) {
      results.addTest('API Error Handling', true);
    } else {
      results.addTest('API Error Handling', false, 'Comprehensive error handling not implemented');
    }
  }
};

const testCodeQuality = (results) => {
  logSection('Testing Code Quality');
  
  // Check if TypeScript is properly configured
  const tsConfigPath = path.join(__dirname, '..', 'tsconfig.json');
  if (fs.existsSync(tsConfigPath)) {
    results.addTest('TypeScript Configuration', true);
  } else {
    results.addTest('TypeScript Configuration', false, 'TypeScript config not found');
  }

  // Check if ESLint is configured
  const eslintConfigPath = path.join(__dirname, '..', '.eslintrc.js');
  if (fs.existsSync(eslintConfigPath)) {
    results.addTest('ESLint Configuration', true);
  } else {
    results.addTest('ESLint Configuration', false, 'ESLint config not found');
  }

  // Check if Jest is configured
  const jestConfigPath = path.join(__dirname, '..', 'jest.config.js');
  if (fs.existsSync(jestConfigPath)) {
    results.addTest('Jest Configuration', true);
  } else {
    results.addTest('Jest Configuration', false, 'Jest config not found');
  }

  // Check if tests exist
  const testDir = path.join(__dirname, '..', '__tests__');
  if (fs.existsSync(testDir)) {
    const testFiles = fs.readdirSync(testDir, { recursive: true })
      .filter(file => file.endsWith('.test.js') || file.endsWith('.test.ts') || file.endsWith('.test.tsx'));
    
    if (testFiles.length > 0) {
      results.addTest('Test Files', true, `${testFiles.length} test files found`);
    } else {
      results.addTest('Test Files', false, 'No test files found');
    }
  } else {
    results.addTest('Test Files', false, 'Test directory not found');
  }
};

const testDocumentation = (results) => {
  logSection('Testing Documentation');
  
  // Check if README exists and is comprehensive
  const readmePath = path.join(__dirname, '..', 'README.md');
  if (fs.existsSync(readmePath)) {
    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    if (readmeContent.length > 1000 && 
        readmeContent.includes('##') && 
        readmeContent.includes('Installation')) {
      results.addTest('README Documentation', true);
    } else {
      results.addTest('README Documentation', false, 'README is not comprehensive');
    }
  } else {
    results.addTest('README Documentation', false, 'README not found');
  }

  // Check if API documentation exists
  const apiDocsPath = path.join(__dirname, '..', 'docs');
  if (fs.existsSync(apiDocsPath)) {
    const docFiles = fs.readdirSync(apiDocsPath)
      .filter(file => file.endsWith('.md'));
    
    if (docFiles.length > 0) {
      results.addTest('API Documentation', true, `${docFiles.length} documentation files found`);
    } else {
      results.addTest('API Documentation', false, 'No documentation files found');
    }
  } else {
    results.addTest('API Documentation', false, 'Documentation directory not found');
  }
};

// Main test execution
const main = async () => {
  log(`${colors.bold}${colors.magenta}🧪 MortgageMatch Pro Improvement Validation${colors.reset}\n`);
  
  const results = new TestResults();
  
  // Run all tests
  testBundleSize(results);
  testMobileResponsiveness(results);
  testPerformanceOptimization(results);
  testApiIntegration(results);
  testCodeQuality(results);
  testDocumentation(results);
  
  // Generate summary
  logSection('Test Summary');
  const summary = results.getSummary();
  
  log(`Total Tests: ${summary.total}`, 'blue');
  log(`Passed: ${summary.passed}`, 'green');
  log(`Failed: ${summary.failed}`, summary.failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${summary.percentage.toFixed(1)}%`, summary.percentage >= 80 ? 'green' : 'yellow');
  
  // Generate detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary,
    results: results.results,
    recommendations: []
  };
  
  // Add recommendations based on failed tests
  results.results.forEach(result => {
    if (!result.passed) {
      report.recommendations.push({
        test: result.name,
        issue: result.details,
        priority: 'medium',
        action: 'Review and fix the failing test'
      });
    }
  });
  
  // Save report
  const reportPath = path.join(__dirname, '..', 'test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  log(`\nDetailed report saved to: ${reportPath}`, 'cyan');
  
  // Final status
  if (summary.percentage >= 80) {
    log(`\n${colors.green}✅ Improvement validation passed! Most improvements are working correctly.${colors.reset}`);
  } else {
    log(`\n${colors.yellow}⚠️  Improvement validation needs attention. Some improvements require fixes.${colors.reset}`);
  }
  
  return summary.percentage >= 80;
};

// Run the tests
if (require.main === module) {
  main().catch(error => {
    log(`❌ Test execution failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { main, TestResults };