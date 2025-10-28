/**
 * Feature Flags Client
 * 
 * Provides client-side access to feature flags with caching and fallback support
 */

import { createClient } from '@supabase/supabase-js';

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  environment: string;
}

export interface FeatureFlagsConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  cacheTimeoutMs?: number;
  fallbackFlags?: Record<string, boolean>;
}

class FeatureFlagsClient {
  private supabase: any;
  private cache: Map<string, FeatureFlag> = new Map();
  private lastFetch: number = 0;
  private config: Required<FeatureFlagsConfig>;

  constructor(config: FeatureFlagsConfig) {
    this.config = {
      cacheTimeoutMs: 5 * 60 * 1000, // 5 minutes default
      fallbackFlags: {},
      ...config
    };

    this.supabase = createClient(
      this.config.supabaseUrl,
      this.config.supabaseAnonKey
    );
  }

  /**
   * Get all feature flags with caching
   */
  async getFlags(): Promise<Record<string, boolean>> {
    const now = Date.now();
    
    // Return cached flags if still valid
    if (now - this.lastFetch < this.config.cacheTimeoutMs && this.cache.size > 0) {
      return this.getCachedFlags();
    }

    try {
      // Fetch fresh flags from Supabase
      const { data, error } = await this.supabase.rpc('get_config_flags');
      
      if (error) {
        console.warn('Failed to fetch feature flags:', error);
        return this.getFallbackFlags();
      }

      // Update cache
      this.cache.clear();
      data.forEach((flag: FeatureFlag) => {
        this.cache.set(flag.name, flag);
      });
      
      this.lastFetch = now;
      
      return this.getCachedFlags();
      
    } catch (error) {
      console.warn('Error fetching feature flags:', error);
      return this.getFallbackFlags();
    }
  }

  /**
   * Check if a specific feature flag is enabled
   */
  async isEnabled(flagName: string): Promise<boolean> {
    const flags = await this.getFlags();
    return flags[flagName] || false;
  }

  /**
   * Get cached flags
   */
  private getCachedFlags(): Record<string, boolean> {
    const flags: Record<string, boolean> = {};
    this.cache.forEach((flag, name) => {
      flags[name] = flag.enabled;
    });
    return flags;
  }

  /**
   * Get fallback flags when Supabase is unavailable
   */
  private getFallbackFlags(): Record<string, boolean> {
    return { ...this.config.fallbackFlags };
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
    this.lastFetch = 0;
  }

  /**
   * Get maintenance mode status
   */
  async isMaintenanceMode(): Promise<boolean> {
    return this.isEnabled('maintenance_mode');
  }

  /**
   * Get debug mode status
   */
  async isDebugMode(): Promise<boolean> {
    return this.isEnabled('debug_mode');
  }
}

// Singleton instance
let featureFlagsClient: FeatureFlagsClient | null = null;

/**
 * Initialize feature flags client
 */
export function initializeFeatureFlags(config: FeatureFlagsConfig): FeatureFlagsClient {
  featureFlagsClient = new FeatureFlagsClient(config);
  return featureFlagsClient;
}

/**
 * Get the feature flags client instance
 */
export function getFeatureFlagsClient(): FeatureFlagsClient {
  if (!featureFlagsClient) {
    throw new Error('Feature flags client not initialized. Call initializeFeatureFlags() first.');
  }
  return featureFlagsClient;
}

/**
 * React hook for feature flags
 */
export function useFeatureFlag(flagName: string): boolean {
  const [enabled, setEnabled] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    const checkFlag = async () => {
      try {
        const client = getFeatureFlagsClient();
        const isEnabled = await client.isEnabled(flagName);
        
        if (mounted) {
          setEnabled(isEnabled);
          setLoading(false);
        }
      } catch (error) {
        console.warn(`Failed to check feature flag ${flagName}:`, error);
        if (mounted) {
          setEnabled(false);
          setLoading(false);
        }
      }
    };

    checkFlag();

    return () => {
      mounted = false;
    };
  }, [flagName]);

  return enabled;
}

/**
 * React hook for maintenance mode
 */
export function useMaintenanceMode(): { isMaintenanceMode: boolean; loading: boolean } {
  const [isMaintenanceMode, setIsMaintenanceMode] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    const checkMaintenanceMode = async () => {
      try {
        const client = getFeatureFlagsClient();
        const isEnabled = await client.isMaintenanceMode();
        
        if (mounted) {
          setIsMaintenanceMode(isEnabled);
          setLoading(false);
        }
      } catch (error) {
        console.warn('Failed to check maintenance mode:', error);
        if (mounted) {
          setIsMaintenanceMode(false);
          setLoading(false);
        }
      }
    };

    checkMaintenanceMode();

    return () => {
      mounted = false;
    };
  }, []);

  return { isMaintenanceMode, loading };
}

export default FeatureFlagsClient;
