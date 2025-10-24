import { Dimensions, Platform } from 'react-native';

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();
  private startTimes: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start timing a performance metric
  startTiming(key: string): void {
    this.startTimes.set(key, Date.now());
  }

  // End timing and record the metric
  endTiming(key: string): number {
    const startTime = this.startTimes.get(key);
    if (!startTime) {
      console.warn(`No start time found for metric: ${key}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.metrics.set(key, duration);
    this.startTimes.delete(key);
    
    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${key} took ${duration}ms`);
    }

    return duration;
  }

  // Get a specific metric
  getMetric(key: string): number | undefined {
    return this.metrics.get(key);
  }

  // Get all metrics
  getAllMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  // Clear all metrics
  clearMetrics(): void {
    this.metrics.clear();
    this.startTimes.clear();
  }

  // Log performance summary
  logSummary(): void {
    console.log('Performance Metrics Summary:', this.getAllMetrics());
  }
}

// Bundle size monitoring
export const getBundleSizeInfo = () => {
  const { width, height } = Dimensions.get('window');
  const pixelRatio = Platform.OS === 'ios' ? 2 : 3;
  
  return {
    screenWidth: width,
    screenHeight: height,
    pixelRatio,
    platform: Platform.OS,
    // Estimated bundle size (this would be replaced with actual bundle analysis)
    estimatedBundleSize: '2.1MB', // Current size from retrospective
    targetBundleSize: '1.5MB',
    isOverTarget: true,
  };
};

// Memory usage monitoring (React Native specific)
export const getMemoryInfo = () => {
  if (__DEV__) {
    // In development, we can use performance monitoring
    const memoryInfo = (global as any).performance?.memory;
    if (memoryInfo) {
      return {
        usedJSHeapSize: memoryInfo.usedJSHeapSize,
        totalJSHeapSize: memoryInfo.totalJSHeapSize,
        jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit,
      };
    }
  }
  
  return {
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0,
  };
};

// Performance budgets
export const PERFORMANCE_BUDGETS = {
  // Bundle size limits
  bundleSize: {
    max: 1.5 * 1024 * 1024, // 1.5MB in bytes
    warning: 1.2 * 1024 * 1024, // 1.2MB warning threshold
  },
  
  // Render time limits
  renderTime: {
    max: 16, // 16ms for 60fps
    warning: 12, // 12ms warning threshold
  },
  
  // API response time limits
  apiResponse: {
    max: 2000, // 2 seconds
    warning: 1000, // 1 second warning
  },
  
  // Navigation time limits
  navigation: {
    max: 300, // 300ms
    warning: 200, // 200ms warning
  },
};

// Performance optimization helpers
export const optimizeForPerformance = {
  // Debounce function calls
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle function calls
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  // Memoize expensive calculations
  memoize: <T extends (...args: any[]) => any>(fn: T): T => {
    const cache = new Map();
    return ((...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = fn(...args);
      cache.set(key, result);
      return result;
    }) as T;
  },
};

// Performance monitoring hooks
export const usePerformanceMonitor = () => {
  const monitor = PerformanceMonitor.getInstance();
  
  return {
    startTiming: monitor.startTiming.bind(monitor),
    endTiming: monitor.endTiming.bind(monitor),
    getMetric: monitor.getMetric.bind(monitor),
    getAllMetrics: monitor.getAllMetrics.bind(monitor),
    clearMetrics: monitor.clearMetrics.bind(monitor),
    logSummary: monitor.logSummary.bind(monitor),
  };
};

// Bundle size analyzer (for development)
export const analyzeBundleSize = () => {
  if (__DEV__) {
    const bundleInfo = getBundleSizeInfo();
    console.log('Bundle Size Analysis:', bundleInfo);
    
    if (bundleInfo.isOverTarget) {
      console.warn('Bundle size exceeds target! Consider code splitting or removing unused dependencies.');
    }
  }
};