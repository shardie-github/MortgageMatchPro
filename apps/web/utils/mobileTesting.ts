/**
 * Mobile Testing Utilities for MortgageMatch Pro
 * Provides comprehensive testing tools for mobile responsiveness and performance
 */

import { Dimensions, Platform, PixelRatio } from 'react-native';

// Device information
export const getDeviceInfo = () => {
  const { width, height } = Dimensions.get('window');
  const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');
  
  return {
    platform: Platform.OS,
    version: Platform.Version,
    window: { width, height },
    screen: { width: screenWidth, height: screenHeight },
    pixelRatio: PixelRatio.get(),
    fontScale: PixelRatio.getFontScale(),
    isTablet: width >= 768,
    isLandscape: width > height,
  };
};

// Screen size categories
export const getScreenCategory = () => {
  const { width } = Dimensions.get('window');
  
  if (width < 375) return 'xs'; // Small phones
  if (width < 414) return 'sm'; // Regular phones
  if (width < 768) return 'md'; // Large phones
  if (width < 1024) return 'lg'; // Small tablets
  return 'xl'; // Large tablets
};

// Touch target validation
export const validateTouchTargets = (element: any, minSize: number = 44) => {
  const { width, height } = element.getBoundingClientRect();
  const pixelRatio = PixelRatio.get();
  
  const actualWidth = width * pixelRatio;
  const actualHeight = height * pixelRatio;
  
  return {
    isValid: actualWidth >= minSize && actualHeight >= minSize,
    width: actualWidth,
    height: actualHeight,
    minRequired: minSize,
  };
};

// Performance testing utilities
export class PerformanceTester {
  private static instance: PerformanceTester;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceTester {
    if (!PerformanceTester.instance) {
      PerformanceTester.instance = new PerformanceTester();
    }
    return PerformanceTester.instance;
  }

  // Measure render time
  measureRender(componentName: string, renderFn: () => void): number {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    const duration = end - start;

    if (!this.metrics.has(componentName)) {
      this.metrics.set(componentName, []);
    }
    this.metrics.get(componentName)!.push(duration);

    return duration;
  }

  // Measure async operation
  async measureAsync<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await operation();
    const end = performance.now();
    const duration = end - start;

    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, []);
    }
    this.metrics.get(operationName)!.push(duration);

    return result;
  }

  // Get performance statistics
  getStats(operationName: string) {
    const times = this.metrics.get(operationName) || [];
    if (times.length === 0) return null;

    const sorted = [...times].sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);

    return {
      count: times.length,
      average: sum / times.length,
      median: sorted[Math.floor(sorted.length / 2)],
      min: Math.min(...times),
      max: Math.max(...times),
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  // Get all metrics
  getAllMetrics() {
    const result: Record<string, any> = {};
    for (const [key, times] of this.metrics) {
      result[key] = this.getStats(key);
    }
    return result;
  }

  // Clear metrics
  clearMetrics() {
    this.metrics.clear();
  }
}

// Accessibility testing
export const testAccessibility = (element: any) => {
  const issues: string[] = [];

  // Check for proper labels
  if (!element.accessibilityLabel && !element.accessibilityHint) {
    issues.push('Missing accessibility label or hint');
  }

  // Check for proper roles
  if (element.accessibilityRole === 'button' && !element.onPress) {
    issues.push('Button element missing onPress handler');
  }

  // Check for proper states
  if (element.accessibilityState?.disabled && !element.accessibilityHint) {
    issues.push('Disabled element should have accessibility hint');
  }

  return {
    isAccessible: issues.length === 0,
    issues,
  };
};

// Mobile-specific testing scenarios
export const mobileTestScenarios = {
  // Test different screen orientations
  testOrientation: () => {
    const { width, height } = Dimensions.get('window');
    return {
      isLandscape: width > height,
      isPortrait: height > width,
      aspectRatio: width / height,
    };
  },

  // Test different screen densities
  testScreenDensity: () => {
    const pixelRatio = PixelRatio.get();
    const fontScale = PixelRatio.getFontScale();
    
    return {
      pixelRatio,
      fontScale,
      density: pixelRatio >= 3 ? 'high' : pixelRatio >= 2 ? 'medium' : 'low',
    };
  },

  // Test keyboard behavior
  testKeyboardBehavior: (keyboardHeight: number) => {
    const { height } = Dimensions.get('window');
    const availableHeight = height - keyboardHeight;
    
    return {
      keyboardHeight,
      availableHeight,
      isKeyboardVisible: keyboardHeight > 0,
      screenCoverage: (keyboardHeight / height) * 100,
    };
  },

  // Test network conditions
  testNetworkConditions: (connectionType: string, effectiveType: string) => {
    const conditions = {
      'slow-2g': { rtt: 2000, downlink: 0.05 },
      '2g': { rtt: 1000, downlink: 0.25 },
      '3g': { rtt: 500, downlink: 0.5 },
      '4g': { rtt: 200, downlink: 1.5 },
    };

    return {
      connectionType,
      effectiveType,
      conditions: conditions[effectiveType as keyof typeof conditions] || conditions['4g'],
    };
  },
};

// Automated testing helpers
export const createTestSuite = (name: string) => {
  const tests: Array<{ name: string; fn: () => boolean | Promise<boolean> }> = [];
  const results: Array<{ name: string; passed: boolean; error?: string }> = [];

  return {
    addTest: (testName: string, testFn: () => boolean | Promise<boolean>) => {
      tests.push({ name: testName, fn: testFn });
    },

    runTests: async () => {
      console.log(`Running test suite: ${name}`);
      
      for (const test of tests) {
        try {
          const result = await test.fn();
          results.push({ name: test.name, passed: result });
          console.log(`${result ? '✅' : '❌'} ${test.name}`);
        } catch (error) {
          results.push({ 
            name: test.name, 
            passed: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
          console.log(`❌ ${test.name}: ${error}`);
        }
      }

      const passed = results.filter(r => r.passed).length;
      const total = results.length;
      
      console.log(`\nTest suite completed: ${passed}/${total} tests passed`);
      return { results, passed, total };
    },

    getResults: () => results,
  };
};

// Export singleton instances
export const performanceTester = PerformanceTester.getInstance();