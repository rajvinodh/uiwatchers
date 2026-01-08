/**
 * Configuration module for UI Watchers Plugin
 */

/**
 * Plugin configuration interface
 */
export interface PluginConfig {
  maxWatchers?: number;
  maxDurationMs?: number;
}

/**
 * Default configuration values
 */
export const DefaultPluginConfig: Required<PluginConfig> = {
  maxWatchers: 5,
  maxDurationMs: 60000,
};
