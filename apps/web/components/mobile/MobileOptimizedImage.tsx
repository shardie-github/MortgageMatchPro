/**
 * Mobile Optimized Image Component
 * 
 * Provides responsive, accessible, and performance-optimized image rendering
 * with automatic format selection, lazy loading, and accessibility features.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Image,
  ImageProps,
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  AccessibilityInfo,
} from 'react-native';
import { imageOptimization, networkOptimization, accessibilityUtils } from '../utils/mobilePerformance';

interface MobileOptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  alt?: string;
  fallbackSource?: { uri: string } | number;
  showLoadingIndicator?: boolean;
  enableZoom?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  onLoad?: () => void;
  onError?: () => void;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'auto' | 'jpeg' | 'png' | 'webp';
}

export const MobileOptimizedImage: React.FC<MobileOptimizedImageProps> = ({
  source,
  alt,
  fallbackSource,
  showLoadingIndicator = true,
  enableZoom = false,
  accessibilityLabel,
  accessibilityHint,
  onLoad,
  onError,
  maxWidth,
  maxHeight,
  quality,
  format = 'auto',
  style,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const imageRef = useRef<Image>(null);

  // Get optimized dimensions
  const getOptimizedDimensions = useCallback(() => {
    if (typeof source === 'number') {
      // Local image - use original dimensions
      return { width: undefined, height: undefined };
    }

    // Remote image - calculate optimized dimensions
    const optimalSize = networkOptimization.getOptimalImageSize();
    return imageOptimization.getOptimizedDimensions(
      optimalSize.width,
      optimalSize.height,
      maxWidth,
      maxHeight
    );
  }, [source, maxWidth, maxHeight]);

  // Get optimized image URI
  const getOptimizedUri = useCallback((uri: string) => {
    if (format === 'auto') {
      const optimalFormat = networkOptimization.getOptimalImageFormat();
      return `${uri}?format=${optimalFormat}`;
    }
    return `${uri}?format=${format}`;
  }, [format]);

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  // Handle zoom toggle
  const handleZoomToggle = useCallback(() => {
    if (enableZoom) {
      setIsZoomed(!isZoomed);
    }
  }, [enableZoom, isZoomed]);

  // Get accessibility props
  const getAccessibilityProps = useCallback(() => {
    const label = accessibilityLabel || alt || 'Image';
    const hint = accessibilityHint || (enableZoom ? 'Double tap to zoom' : undefined);
    
    return {
      accessible: true,
      accessibilityLabel: accessibilityUtils.getScreenReaderText(label),
      accessibilityHint: hint,
      accessibilityRole: 'image' as const,
    };
  }, [accessibilityLabel, alt, accessibilityHint, enableZoom]);

  // Render loading indicator
  const renderLoadingIndicator = () => {
    if (!showLoadingIndicator || !isLoading) return null;

    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  // Render error state
  const renderErrorState = () => {
    if (!hasError) return null;

    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load image</Text>
        {fallbackSource && (
          <Image
            source={fallbackSource}
            style={[styles.fallbackImage, style]}
            {...getAccessibilityProps()}
          />
        )}
      </View>
    );
  };

  // Get image source
  const getImageSource = () => {
    if (hasError && fallbackSource) {
      return fallbackSource;
    }

    if (typeof source === 'string') {
      return { uri: getOptimizedUri(source) };
    }

    return source;
  };

  // Get image style
  const getImageStyle = () => {
    const dimensions = getOptimizedDimensions();
    const baseStyle = [styles.image, style];
    
    if (isZoomed) {
      baseStyle.push(styles.zoomedImage);
    }
    
    if (dimensions.width) {
      baseStyle.push({ width: dimensions.width });
    }
    
    if (dimensions.height) {
      baseStyle.push({ height: dimensions.height });
    }
    
    return baseStyle;
  };

  // Render image
  const renderImage = () => {
    if (hasError && !fallbackSource) {
      return renderErrorState();
    }

    const imageSource = getImageSource();
    const imageStyle = getImageStyle();
    const accessibilityProps = getAccessibilityProps();

    return (
      <TouchableOpacity
        onPress={handleZoomToggle}
        disabled={!enableZoom}
        activeOpacity={enableZoom ? 0.8 : 1}
        style={styles.imageContainer}
      >
        <Image
          ref={imageRef}
          source={imageSource}
          style={imageStyle}
          onLoad={handleLoad}
          onError={handleError}
          resizeMode="contain"
          {...accessibilityProps}
          {...props}
        />
        {renderLoadingIndicator()}
        {renderErrorState()}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {renderImage()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 'auto',
    minHeight: 100,
  },
  zoomedImage: {
    width: Dimensions.get('window').width * 0.9,
    height: Dimensions.get('window').height * 0.9,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  errorText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  fallbackImage: {
    width: 100,
    height: 100,
    opacity: 0.5,
  },
});

export default MobileOptimizedImage;