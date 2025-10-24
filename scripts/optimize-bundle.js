#!/usr/bin/env node

/**
 * Bundle optimization script for MortgageMatch Pro
 * Analyzes and optimizes the React Native bundle for better performance
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  targetBundleSize: 1.5 * 1024 * 1024, // 1.5MB in bytes
  warningBundleSize: 1.2 * 1024 * 1024, // 1.2MB warning threshold
  maxBundleSize: 2.0 * 1024 * 1024, // 2.0MB maximum
  platforms: ['android', 'ios'],
  outputDir: './bundle-analysis',
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

// Bundle analysis functions
const analyzeBundleSize = (platform) => {
  try {
    logSection(`Analyzing ${platform} bundle`);
    
    // Build the bundle
    const buildCommand = `npx react-native bundle --platform ${platform} --dev false --entry-file index.js --bundle-output ${CONFIG.outputDir}/${platform}-bundle.js --assets-dest ${CONFIG.outputDir}/${platform}-assets`;
    
    log(`Building ${platform} bundle...`, 'blue');
    execSync(buildCommand, { stdio: 'pipe' });
    
    // Get bundle size
    const bundlePath = path.join(CONFIG.outputDir, `${platform}-bundle.js`);
    const stats = fs.statSync(bundlePath);
    const bundleSize = stats.size;
    
    log(`Bundle size: ${formatBytes(bundleSize)}`, bundleSize > CONFIG.targetBundleSize ? 'red' : 'green');
    
    // Check against thresholds
    if (bundleSize > CONFIG.maxBundleSize) {
      log(`❌ Bundle size exceeds maximum allowed size (${formatBytes(CONFIG.maxBundleSize)})`, 'red');
      return { size: bundleSize, status: 'critical' };
    } else if (bundleSize > CONFIG.targetBundleSize) {
      log(`⚠️  Bundle size exceeds target size (${formatBytes(CONFIG.targetBundleSize)})`, 'yellow');
      return { size: bundleSize, status: 'warning' };
    } else {
      log(`✅ Bundle size is within target`, 'green');
      return { size: bundleSize, status: 'good' };
    }
  } catch (error) {
    log(`❌ Error analyzing ${platform} bundle: ${error.message}`, 'red');
    return { size: 0, status: 'error' };
  }
};

const analyzeDependencies = () => {
  logSection('Analyzing Dependencies');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    log(`Total dependencies: ${Object.keys(dependencies).length}`, 'blue');
    
    // Check for large dependencies
    const largeDependencies = [];
    const suspiciousDependencies = [
      'lodash', 'moment', 'jquery', 'bootstrap', 'material-ui',
      'antd', 'semantic-ui', 'react-native-vector-icons'
    ];
    
    Object.keys(dependencies).forEach(dep => {
      if (suspiciousDependencies.some(suspicious => dep.includes(suspicious))) {
        largeDependencies.push(dep);
      }
    });
    
    if (largeDependencies.length > 0) {
      log(`⚠️  Potentially large dependencies found:`, 'yellow');
      largeDependencies.forEach(dep => {
        log(`  - ${dep}`, 'yellow');
      });
    } else {
      log(`✅ No obviously large dependencies found`, 'green');
    }
    
    return largeDependencies;
  } catch (error) {
    log(`❌ Error analyzing dependencies: ${error.message}`, 'red');
    return [];
  }
};

const generateOptimizationReport = (results) => {
  logSection('Generating Optimization Report');
  
  const report = {
    timestamp: new Date().toISOString(),
    targetBundleSize: CONFIG.targetBundleSize,
    results: results,
    recommendations: []
  };
  
  // Generate recommendations based on results
  results.forEach(result => {
    if (result.status === 'critical' || result.status === 'warning') {
      report.recommendations.push({
        type: 'bundle_size',
        platform: result.platform,
        currentSize: result.size,
        targetSize: CONFIG.targetBundleSize,
        priority: result.status === 'critical' ? 'high' : 'medium',
        suggestions: [
          'Enable code splitting and lazy loading',
          'Remove unused dependencies',
          'Optimize images and assets',
          'Use tree shaking for better dead code elimination',
          'Consider using smaller alternative libraries'
        ]
      });
    }
  });
  
  // Add general recommendations
  report.recommendations.push({
    type: 'general',
    priority: 'medium',
    suggestions: [
      'Enable Hermes for better JavaScript performance',
      'Use React.memo() for component memoization',
      'Implement proper image optimization',
      'Use FlatList instead of ScrollView for large lists',
      'Enable Flipper for debugging in development'
    ]
  });
  
  // Save report
  const reportPath = path.join(CONFIG.outputDir, 'optimization-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  log(`Optimization report saved to: ${reportPath}`, 'green');
  
  // Display recommendations
  logSection('Optimization Recommendations');
  report.recommendations.forEach((rec, index) => {
    log(`${index + 1}. ${rec.type.toUpperCase()} (${rec.priority} priority)`, 'cyan');
    rec.suggestions.forEach(suggestion => {
      log(`   - ${suggestion}`, 'white');
    });
  });
  
  return report;
};

const createOptimizedMetroConfig = () => {
  logSection('Creating Optimized Metro Config');
  
  const metroConfig = `const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Optimized Metro configuration for better performance
 * Generated by bundle optimization script
 */
const config = {
  resolver: {
    // Enable tree shaking
    unstable_enablePackageExports: true,
    // Optimize asset resolution
    assetExts: ['bin', 'txt', 'jpg', 'png', 'json', 'svg', 'ttf', 'otf', 'woff', 'woff2'],
    sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json'],
  },
  transformer: {
    // Enable minification
    minifierConfig: {
      keep_fnames: true,
      mangle: {
        keep_fnames: true,
      },
    },
    // Enable hermes for better performance
    hermesParser: true,
    // Optimize for mobile
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  serializer: {
    // Optimize bundle splitting
    createModuleIdFactory: function () {
      return function (path) {
        return path.replace(__dirname, '').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
      };
    },
    // Filter out unnecessary modules
    processModuleFilter: (module) => {
      return !module.path.includes('node_modules/react-native/Libraries/NewAppScreen');
    },
  },
  // Performance optimizations
  maxWorkers: Math.max(1, require('os').cpus().length - 1),
  resetCache: false,
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
`;

  const configPath = 'metro.config.optimized.js';
  fs.writeFileSync(configPath, metroConfig);
  log(`Optimized Metro config created: ${configPath}`, 'green');
};

// Main execution
const main = async () => {
  log(`${colors.bold}${colors.magenta}🚀 MortgageMatch Pro Bundle Optimization${colors.reset}\n`);
  
  // Create output directory
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  const results = [];
  
  // Analyze dependencies
  const largeDeps = analyzeDependencies();
  
  // Analyze bundles for each platform
  for (const platform of CONFIG.platforms) {
    const result = analyzeBundleSize(platform);
    results.push({ ...result, platform });
  }
  
  // Generate optimization report
  const report = generateOptimizationReport(results);
  
  // Create optimized metro config
  createOptimizedMetroConfig();
  
  // Summary
  logSection('Optimization Summary');
  const totalSize = results.reduce((sum, result) => sum + result.size, 0);
  const avgSize = totalSize / results.length;
  
  log(`Average bundle size: ${formatBytes(avgSize)}`, avgSize > CONFIG.targetBundleSize ? 'red' : 'green');
  log(`Target bundle size: ${formatBytes(CONFIG.targetBundleSize)}`, 'blue');
  log(`Large dependencies found: ${largeDeps.length}`, largeDeps.length > 0 ? 'yellow' : 'green');
  log(`Recommendations generated: ${report.recommendations.length}`, 'blue');
  
  // Final status
  const hasIssues = results.some(result => result.status === 'critical' || result.status === 'warning');
  if (hasIssues) {
    log(`\n${colors.yellow}⚠️  Bundle optimization needed. Check the recommendations above.${colors.reset}`);
  } else {
    log(`\n${colors.green}✅ Bundle is optimized and within target size!${colors.reset}`);
  }
  
  log(`\n${colors.cyan}Bundle analysis complete. Check ${CONFIG.outputDir} for detailed reports.${colors.reset}`);
};

// Run the script
if (require.main === module) {
  main().catch(error => {
    log(`❌ Script failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { analyzeBundleSize, analyzeDependencies, generateOptimizationReport };