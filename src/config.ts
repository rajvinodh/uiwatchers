/**
 * Configuration module for UI Watchers Plugin
 */

/**
 * Plugin configuration interface
 */
export interface PluginConfig {
  /** Maximum number of watchers allowed per session (1-20) */
  maxWatchers?: number;

  /** Maximum duration per watcher in milliseconds (1000-600000) */
  maxDurationMs?: number;

  /** Maximum element references to cache for stale recovery (10-200) */
  maxCacheEntries?: number;

  /** TTL for cached element references in milliseconds (5000-300000) */
  elementTtlMs?: number;
}

/**
 * Default configuration values
 */
export const DefaultPluginConfig: Required<PluginConfig> = {
  maxWatchers: 5,
  maxDurationMs: 60000,
  maxCacheEntries: 50,
  elementTtlMs: 60000,
};
