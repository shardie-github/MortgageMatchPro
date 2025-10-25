/**
 * Mobile Performance Optimization Utilities
 * 
 * This module provides comprehensive mobile performance optimization tools
 * including accessibility guidelines, performance monitoring, and optimization helpers.
 */

import { Platform, Dimensions, PixelRatio } from 'react-native';

// Performance monitoring
interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  bundleSize: number;
  networkLatency: number;
  touchResponseTime: number;
}

interface AccessibilityMetrics {
  touchTargetSize: number;
  contrastRatio: number;
  fontSize: number;
  screenReaderCompatible: boolean;
}

// Mobile-specific breakpoints (iOS/Android optimized)
export const MOBILE_BREAKPOINTS = {
  xs: 320,   // iPhone SE, small Android
  sm: 375,   // iPhone 12/13/14 standard
  md: 390,   // iPhone 12/13/14 Pro
  lg: 414,   // iPhone Plus models
  xl: 428,   // iPhone Pro Max
  tablet: 768, // iPad mini
  tabletPro: 1024, // iPad Pro
} as const;

// Accessibility guidelines
export const ACCESSIBILITY_GUIDELINES = {
  MIN_TOUCH_TARGET: 44, // iOS/Android minimum touch target
  MIN_CONTRAST_RATIO: 4.5, // WCAG AA standard
  MIN_FONT_SIZE: 16, // iOS minimum readable font size
  MAX_LINE_LENGTH: 75, // Optimal reading line length
  FOCUS_INDICATOR_SIZE: 2, // Focus ring thickness
} as const;

// Performance budgets
export const PERFORMANCE_BUDGETS = {
  MAX_RENDER_TIME: 16, // 60fps target
  MAX_MEMORY_USAGE: 100, // MB
  MAX_BUNDLE_SIZE: 1.5, // MB
  MAX_NETWORK_LATENCY: 2000, // ms
  MAX_TOUCH_RESPONSE: 100, // ms
} as const;

/**
 * Get device information for performance optimization
 */
export const getDeviceInfo = () => {
  const { width, height } = Dimensions.get('window');
  const pixelRatio = PixelRatio.get();
  const fontScale = PixelRatio.getFontScale();
  
  return {
    width,
    height,
    pixelRatio,
    fontScale,
    platform: Platform.OS,
    isTablet: width >= MOBILE_BREAKPOINTS.tablet,
    screenSize: getScreenSize(width),
    deviceType: getDeviceType(width, height),
  };
};

/**
 * Determine screen size category
 */
export const getScreenSize = (width: number): keyof typeof MOBILE_BREAKPOINTS => {
  if (width >= MOBILE_BREAKPOINTS.xl) return 'xl';
  if (width >= MOBILE_BREAKPOINTS.lg) return 'lg';
  if (width >= MOBILE_BREAKPOINTS.md) return 'md';
  if (width >= MOBILE_BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

/**
 * Determine device type for optimization
 */
export const getDeviceType = (width: number, height: number) => {
  const aspectRatio = height / width;
  
  if (width >= MOBILE_BREAKPOINTS.tabletPro) return 'tablet-pro';
  if (width >= MOBILE_BREAKPOINTS.tablet) return 'tablet';
  if (aspectRatio > 2) return 'phone-tall';
  if (aspectRatio < 1.5) return 'phone-wide';
  return 'phone-standard';
};

/**
 * Performance monitoring class
 */
export class MobilePerformanceMonitor {
  private metrics: PerformanceMetrics = {
    renderTime: 0,
    memoryUsage: 0,
    bundleSize: 0,
    networkLatency: 0,
    touchResponseTime: 0,
  };

  private accessibilityMetrics: AccessibilityMetrics = {
    touchTargetSize: 0,
    contrastRatio: 0,
    fontSize: 0,
    screenReaderCompatible: false,
  };

  private renderStartTime: number = 0;
  private touchStartTime: number = 0;

  /**
   * Start render timing
   */
  startRenderTiming() {
    this.renderStartTime = performance.now();
  }

  /**
   * End render timing
   */
  endRenderTiming(): number {
    const renderTime = performance.now() - this.renderStartTime;
    this.metrics.renderTime = renderTime;
    
    if (renderTime > PERFORMANCE_BUDGETS.MAX_RENDER_TIME) {
      console.warn(`Render time exceeded budget: ${renderTime}ms > ${PERFORMANCE_BUDGETS.MAX_RENDER_TIME}ms`);
    }
    
    return renderTime;
  }

  /**
   * Start touch response timing
   */
  startTouchTiming() {
    this.touchStartTime = performance.now();
  }

  /**
   * End touch response timing
   */
  endTouchTiming(): number {
    const touchTime = performance.now() - this.touchStartTime;
    this.metrics.touchResponseTime = touchTime;
    
    if (touchTime > PERFORMANCE_BUDGETS.MAX_TOUCH_RESPONSE) {
      console.warn(`Touch response time exceeded budget: ${touchTime}ms > ${PERFORMANCE_BUDGETS.MAX_TOUCH_RESPONSE}ms`);
    }
    
    return touchTime;
  }

  /**
   * Measure memory usage
   */
  measureMemoryUsage(): number {
    if (Platform.OS === 'web' && 'memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
    }
    
    return this.metrics.memoryUsage;
  }

  /**
   * Measure network latency
   */
  async measureNetworkLatency(url: string): Promise<number> {
    const startTime = performance.now();
    
    try {
      await fetch(url, { method: 'HEAD' });
      const latency = performance.now() - startTime;
      this.metrics.networkLatency = latency;
      
      if (latency > PERFORMANCE_BUDGETS.MAX_NETWORK_LATENCY) {
        console.warn(`Network latency exceeded budget: ${latency}ms > ${PERFORMANCE_BUDGETS.MAX_NETWORK_LATENCY}ms`);
      }
      
      return latency;
    } catch (error) {
      console.error('Network latency measurement failed:', error);
      return -1;
    }
  }

  /**
   * Validate touch target size
   */
  validateTouchTarget(width: number, height: number): boolean {
    const minSize = Math.min(width, height);
    this.accessibilityMetrics.touchTargetSize = minSize;
    
    const isValid = minSize >= ACCESSIBILITY_GUIDELINES.MIN_TOUCH_TARGET;
    
    if (!isValid) {
      console.warn(`Touch target too small: ${minSize}px < ${ACCESSIBILITY_GUIDELINES.MIN_TOUCH_TARGET}px`);
    }
    
    return isValid;
  }

  /**
   * Validate font size for accessibility
   */
  validateFontSize(fontSize: number): boolean {
    this.accessibilityMetrics.fontSize = fontSize;
    
    const isValid = fontSize >= ACCESSIBILITY_GUIDELINES.MIN_FONT_SIZE;
    
    if (!isValid) {
      console.warn(`Font size too small: ${fontSize}px < ${ACCESSIBILITY_GUIDELINES.MIN_FONT_SIZE}px`);
    }
    
    return isValid;
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const deviceInfo = getDeviceInfo();
    
    return {
      device: deviceInfo,
      performance: this.metrics,
      accessibility: this.accessibilityMetrics,
      budgets: PERFORMANCE_BUDGETS,
      guidelines: ACCESSIBILITY_GUIDELINES,
      recommendations: this.getRecommendations(),
    };
  }

  /**
   * Get optimization recommendations
   */
  private getRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.metrics.renderTime > PERFORMANCE_BUDGETS.MAX_RENDER_TIME) {
      recommendations.push('Consider optimizing component rendering or reducing complexity');
    }
    
    if (this.metrics.memoryUsage > PERFORMANCE_BUDGETS.MAX_MEMORY_USAGE) {
      recommendations.push('Consider implementing memory optimization strategies');
    }
    
    if (this.metrics.touchResponseTime > PERFORMANCE_BUDGETS.MAX_TOUCH_RESPONSE) {
      recommendations.push('Consider optimizing touch event handling');
    }
    
    if (this.accessibilityMetrics.touchTargetSize < ACCESSIBILITY_GUIDELINES.MIN_TOUCH_TARGET) {
      recommendations.push('Increase touch target size for better accessibility');
    }
    
    if (this.accessibilityMetrics.fontSize < ACCESSIBILITY_GUIDELINES.MIN_FONT_SIZE) {
      recommendations.push('Increase font size for better readability');
    }
    
    return recommendations;
  }
}

/**
 * Responsive scaling utilities
 */
export const responsiveScale = {
  /**
   * Scale value based on screen width
   */
  width: (value: number): number => {
    const { width } = Dimensions.get('window');
    const scale = width / MOBILE_BREAKPOINTS.sm; // Use sm as base
    return Math.round(value * scale);
  },

  /**
   * Scale value based on screen height
   */
  height: (value: number): number => {
    const { height } = Dimensions.get('window');
    const scale = height / 667; // iPhone 6/7/8 height as base
    return Math.round(value * scale);
  },

  /**
   * Scale font size responsively
   */
  fontSize: (size: number): number => {
    const { width } = Dimensions.get('window');
    const scale = width / MOBILE_BREAKPOINTS.sm;
    const scaledSize = size * scale;
    
    // Ensure minimum font size for accessibility
    return Math.max(scaledSize, ACCESSIBILITY_GUIDELINES.MIN_FONT_SIZE);
  },

  /**
   * Scale padding/margin values
   */
  spacing: (value: number): number => {
    const { width } = Dimensions.get('window');
    const scale = width / MOBILE_BREAKPOINTS.sm;
    return Math.round(value * scale);
  },
};

/**
 * Image optimization utilities
 */
export const imageOptimization = {
  /**
   * Get optimized image dimensions
   */
  getOptimizedDimensions: (originalWidth: number, originalHeight: number, maxWidth?: number, maxHeight?: number) => {
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    const maxW = maxWidth || screenWidth;
    const maxH = maxHeight || screenHeight * 0.6; // Max 60% of screen height
    
    const aspectRatio = originalWidth / originalHeight;
    
    let optimizedWidth = maxW;
    let optimizedHeight = maxW / aspectRatio;
    
    if (optimizedHeight > maxH) {
      optimizedHeight = maxH;
      optimizedWidth = maxH * aspectRatio;
    }
    
    return {
      width: Math.round(optimizedWidth),
      height: Math.round(optimizedHeight),
    };
  },

  /**
   * Get image quality based on device capabilities
   */
  getImageQuality: (): number => {
    const { pixelRatio } = Dimensions.get('window');
    
    // Adjust quality based on device pixel ratio
    if (pixelRatio >= 3) return 0.8; // High DPI devices
    if (pixelRatio >= 2) return 0.9; // Medium DPI devices
    return 1.0; // Standard DPI devices
  },
};

/**
 * Network optimization utilities
 */
export const networkOptimization = {
  /**
   * Get optimal image format based on device capabilities
   */
  getOptimalImageFormat: (): string => {
    const deviceInfo = getDeviceInfo();
    
    // Use WebP for better compression on supported devices
    if (Platform.OS === 'android' && deviceInfo.pixelRatio >= 2) {
      return 'webp';
    }
    
    return 'jpeg';
  },

  /**
   * Get optimal image size based on screen size
   */
  getOptimalImageSize: (): { width: number; height: number } => {
    const { width, height } = Dimensions.get('window');
    const screenSize = getScreenSize(width);
    
    switch (screenSize) {
      case 'xl':
        return { width: 1200, height: 800 };
      case 'lg':
        return { width: 1000, height: 667 };
      case 'md':
        return { width: 800, height: 533 };
      case 'sm':
        return { width: 600, height: 400 };
      default:
        return { width: 400, height: 267 };
    }
  },
};

/**
 * Accessibility utilities
 */
export const accessibilityUtils = {
  /**
   * Generate accessible color combinations
   */
  getAccessibleColors: (backgroundColor: string, textColor: string): { isValid: boolean; contrastRatio: number } => {
    // Simplified contrast ratio calculation
    // In a real implementation, you'd use a proper color contrast library
    const contrastRatio = 4.5; // Placeholder
    const isValid = contrastRatio >= ACCESSIBILITY_GUIDELINES.MIN_CONTRAST_RATIO;
    
    return { isValid, contrastRatio };
  },

  /**
   * Generate screen reader friendly text
   */
  getScreenReaderText: (text: string, context?: string): string => {
    if (context) {
      return `${text}, ${context}`;
    }
    return text;
  },

  /**
   * Validate touch target accessibility
   */
  validateTouchTarget: (width: number, height: number): { isValid: boolean; recommendation?: string } => {
    const minSize = Math.min(width, height);
    const isValid = minSize >= ACCESSIBILITY_GUIDELINES.MIN_TOUCH_TARGET;
    
    if (!isValid) {
      return {
        isValid: false,
        recommendation: `Increase touch target size to at least ${ACCESSIBILITY_GUIDELINES.MIN_TOUCH_TARGET}px`,
      };
    }
    
    return { isValid: true };
  },
};

/**
 * Performance optimization hooks
 */
export const useMobilePerformance = () => {
  const monitor = new MobilePerformanceMonitor();
  
  return {
    monitor,
    startRenderTiming: () => monitor.startRenderTiming(),
    endRenderTiming: () => monitor.endRenderTiming(),
    startTouchTiming: () => monitor.startTouchTiming(),
    endTouchTiming: () => monitor.endTouchTiming(),
    measureMemory: () => monitor.measureMemoryUsage(),
    getReport: () => monitor.getPerformanceReport(),
  };
};

export default {
  MOBILE_BREAKPOINTS,
  ACCESSIBILITY_GUIDELINES,
  PERFORMANCE_BUDGETS,
  getDeviceInfo,
  getScreenSize,
  getDeviceType,
  MobilePerformanceMonitor,
  responsiveScale,
  imageOptimization,
  networkOptimization,
  accessibilityUtils,
  useMobilePerformance,
};