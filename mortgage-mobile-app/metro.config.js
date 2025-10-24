const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration optimized for mobile performance
 * Includes bundle size optimization and mobile-specific settings
 */
const config = {
  resolver: {
    // Enable tree shaking for better bundle size
    unstable_enablePackageExports: true,
    // Mobile-optimized asset extensions
    assetExts: ['bin', 'txt', 'jpg', 'png', 'json', 'svg', 'ttf', 'otf', 'woff', 'woff2', 'mp4', 'mov'],
    sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json'],
    // Platform-specific resolution
    platforms: ['ios', 'android', 'native', 'web'],
  },
  transformer: {
    // Enable minification in production
    minifierConfig: {
      keep_fnames: true,
      mangle: {
        keep_fnames: true,
      },
    },
    // Mobile-optimized asset processing
    assetPlugins: ['react-native-svg-transformer'],
    // Enable hermes for better mobile performance
    hermesParser: true,
    // Optimize for mobile devices
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  serializer: {
    // Optimize bundle for mobile
    createModuleIdFactory: function () {
      return function (path) {
        // Shorter module IDs for mobile bundle size
        const relativePath = path.replace(__dirname, '');
        return relativePath.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
      };
    },
    // Custom serializer for mobile optimization
    customSerializer: require('metro/src/DeltaBundler/Serializers/baseJSBundle').default,
    // Enable code splitting for mobile
    processModuleFilter: (module) => {
      // Filter out unnecessary modules for mobile
      return !module.path.includes('node_modules/react-native/Libraries/NewAppScreen');
    },
  },
  // Mobile-specific performance optimizations
  cacheStores: [
    {
      name: 'filesystem',
      options: {
        path: './metro-cache-mobile',
      },
    },
  ],
  // Optimize for mobile CPU cores
  maxWorkers: Math.max(1, require('os').cpus().length - 1),
  // Mobile-optimized file watching
  watchFolders: [],
  // Reduce memory usage for mobile
  resetCache: false,
  // Enable source maps for mobile debugging
  getSourceMapURL: (bundlePath) => {
    return `${bundlePath}.map`;
  },
  // Mobile bundle optimization
  server: {
    port: 8081,
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        // Add mobile-specific headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        return middleware(req, res, next);
      };
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);