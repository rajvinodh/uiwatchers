/**
 * Type definitions for Appium UI Watchers Plugin
 */

/**
 * Appium locator strategy definition
 * Represents a standard Appium element locator
 */
export interface Locator {
  /** Locator strategy (e.g., 'id', 'xpath', 'accessibility id') */
  using: string;
  /** Locator value/selector */
  value: string;
}

/**
 * UI Watcher registration parameters
 * These are the parameters passed when registering a new watcher
 */
export interface UIWatcher {
  /** Unique identifier for the watcher */
  name: string;

  /**
   * Priority level for watcher execution (higher values checked first)
   * @default 0
   */
  priority?: number;

  /** Locator for the element to watch for (e.g., popup, banner) */
  referenceLocator: Locator;

  /** Locator for the element to click when reference is found */
  actionLocator: Locator;

  /**
   * Time in milliseconds before watcher auto-expires from registration time
   * Must be ≤ 60000ms (1 minute)
   */
  duration: number;

  /**
   * If true, deactivate watcher after first successful trigger
   * @default false
   */
  stopOnFound?: boolean;

  /**
   * Cooldown period in milliseconds after successful action click
   * Watcher skipped during cooldown. Ignored if stopOnFound=true
   * @default 0
   */
  cooldownMs?: number;
}

/**
 * Internal watcher state representation
 * Used for managing watcher lifecycle and tracking trigger information
 */
export interface WatcherState {
  /** Unique identifier for the watcher */
  name: string;

  /** Priority level for watcher execution */
  priority: number;

  /** Locator for the element to watch for */
  referenceLocator: Locator;

  /** Locator for the element to click when reference is found */
  actionLocator: Locator;

  /** Duration in milliseconds before auto-expiry */
  duration: number;

  /** If true, deactivate after first trigger */
  stopOnFound: boolean;

  /** Cooldown period in milliseconds */
  cooldownMs: number;

  /** Timestamp when watcher was registered (milliseconds since epoch) */
  registeredAt: number;

  /** Timestamp when watcher expires (milliseconds since epoch) */
  expiresAt: number;

  /** Current watcher status */
  status: 'active' | 'inactive';

  /** Number of times watcher has been triggered */
  triggerCount: number;

  /** Timestamp of last trigger (null if never triggered) */
  lastTriggeredAt: number | null;
}

/**
 * Result returned by registerUIWatcher command
 */
export interface RegisterWatcherResult {
  /** Operation success status */
  success: boolean;

  /** Watcher information after registration */
  watcher: {
    name: string;
    priority: number;
    registeredAt: number;
    expiresAt: number;
    status: 'active' | 'inactive';
  };
}

/**
 * Result returned by unregisterUIWatcher command
 */
export interface UnregisterWatcherResult {
  /** Operation success status */
  success: boolean;

  /** Name of the removed watcher */
  removed: string;
}

/**
 * Result returned by clearAllUIWatchers command
 */
export interface ClearAllWatchersResult {
  /** Operation success status */
  success: boolean;

  /** Number of watchers removed */
  removedCount: number;
}

/**
 * Result returned by listUIWatchers command
 */
export interface ListWatchersResult {
  /** Operation success status */
  success: boolean;

  /** List of all active watchers with their state */
  watchers: WatcherState[];

  /** Total count of watchers */
  totalCount: number;
}

/**
 * Result returned by disableUIWatchers/enableUIWatchers commands
 */
export interface ToggleWatchersResult {
  /** Operation success status */
  success: boolean;

  /** Status message */
  message: string;
}

// ============================================================================
// Element Reference Caching Types (for StaleElement recovery)
// ============================================================================

/**
 * Cached reference for element from findElement
 */
export interface CachedElementRef {
  /** Locator strategy used to find the element */
  using: string;

  /** Locator value used to find the element */
  value: string;

  /** Source operation that found this element */
  source: 'findElement';

  /** Timestamp when this reference was cached */
  createdAt: number;
}

/**
 * Cached reference for element from findElements
 * Includes the index position in the result array
 */
export interface CachedElementsRef {
  /** Locator strategy used to find the elements */
  using: string;

  /** Locator value used to find the elements */
  value: string;

  /** Index position of this element in the findElements result array */
  index: number;

  /** Source operation that found this element */
  source: 'findElements';

  /** Timestamp when this reference was cached */
  createdAt: number;
}

/**
 * Union type for cached element references
 */
export type CachedRef = CachedElementRef | CachedElementsRef;
