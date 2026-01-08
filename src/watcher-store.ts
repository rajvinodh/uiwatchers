/**
 * WatcherStore - In-memory storage for registered UI watchers
 */

import type { WatcherState, UIWatcher } from './types.js';

/**
 * Maximum number of watchers allowed per session
 */
const MAX_WATCHERS = 5;

/**
 * WatcherStore manages the lifecycle and state of all registered UI watchers
 */
export class WatcherStore {
  /** Internal storage for watchers (keyed by watcher name) */
  private watchers: Map<string, WatcherState>;

  /** Global enable/disable flag for watcher checking */
  private enabled: boolean;

  constructor() {
    this.watchers = new Map();
    this.enabled = true;
  }

  /**
   * Add a new watcher to the store
   * @param watcher - Watcher registration parameters
   * @returns The created watcher state
   * @throws Error if validation fails
   */
  add(watcher: UIWatcher): WatcherState {
    // Check for duplicate name
    if (this.watchers.has(watcher.name)) {
      throw new Error(`UIWatcher with name '${watcher.name}' already exists`);
    }

    // Check maximum watcher limit (count only non-expired watchers)
    const activeCount = this.getActiveWatchers().length;
    if (activeCount >= MAX_WATCHERS) {
      throw new Error('Maximum 5 UI watchers allowed per session');
    }

    // Create watcher state with computed fields
    const now = Date.now();
    const watcherState: WatcherState = {
      name: watcher.name,
      priority: watcher.priority ?? 0,
      referenceLocator: watcher.referenceLocator,
      actionLocator: watcher.actionLocator,
      duration: watcher.duration,
      stopOnFound: watcher.stopOnFound ?? false,
      cooldownMs: watcher.cooldownMs ?? 0,
      registeredAt: now,
      expiresAt: now + watcher.duration,
      status: 'active',
      triggerCount: 0,
      lastTriggeredAt: null,
    };

    this.watchers.set(watcher.name, watcherState);
    return watcherState;
  }

  /**
   * Remove a watcher by name
   * @param name - Name of the watcher to remove
   * @returns True if watcher was removed, false if not found
   */
  remove(name: string): boolean {
    return this.watchers.delete(name);
  }

  /**
   * Get a watcher by name
   * @param name - Name of the watcher to retrieve
   * @returns The watcher state, or undefined if not found
   */
  get(name: string): WatcherState | undefined {
    return this.watchers.get(name);
  }

  /**
   * Get all watchers (including expired ones)
   * @returns Array of all watchers
   */
  list(): WatcherState[] {
    return Array.from(this.watchers.values());
  }

  /**
   * Get only active (non-expired) watchers
   * Automatically removes expired watchers from storage
   * @returns Array of active watchers
   */
  getActiveWatchers(): WatcherState[] {
    const now = Date.now();
    const activeWatchers: WatcherState[] = [];
    const expiredNames: string[] = [];

    // Identify active and expired watchers
    for (const [name, watcher] of this.watchers.entries()) {
      if (now >= watcher.expiresAt) {
        expiredNames.push(name);
      } else {
        activeWatchers.push(watcher);
      }
    }

    // Remove expired watchers
    for (const name of expiredNames) {
      this.watchers.delete(name);
    }

    return activeWatchers;
  }

  /**
   * Get active watchers sorted by priority (descending) and registration time (FIFO)
   * @returns Array of sorted active watchers
   */
  getSortedWatchers(): WatcherState[] {
    const activeWatchers = this.getActiveWatchers();

    return activeWatchers.sort((a, b) => {
      // Sort by priority descending (higher priority first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      // If priority is the same, sort by registration time ascending (FIFO)
      return a.registeredAt - b.registeredAt;
    });
  }

  /**
   * Clear all watchers from the store
   * @returns Number of watchers removed
   */
  clear(): number {
    const count = this.watchers.size;
    this.watchers.clear();
    return count;
  }

  /**
   * Mark a watcher as inactive (used for stopOnFound)
   * @param name - Name of the watcher to mark inactive
   */
  markInactive(name: string): void {
    const watcher = this.watchers.get(name);
    if (watcher) {
      watcher.status = 'inactive';
    }
  }

  /**
   * Increment the trigger count for a watcher
   * @param name - Name of the watcher
   */
  incrementTriggerCount(name: string): void {
    const watcher = this.watchers.get(name);
    if (watcher) {
      watcher.triggerCount++;
      watcher.lastTriggeredAt = Date.now();
    }
  }

  /**
   * Update the last triggered timestamp for a watcher
   * @param name - Name of the watcher
   */
  updateLastTriggered(name: string): void {
    const watcher = this.watchers.get(name);
    if (watcher) {
      watcher.lastTriggeredAt = Date.now();
    }
  }

  /**
   * Disable watcher checking globally
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Enable watcher checking globally
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Check if watcher checking is enabled
   * @returns True if enabled, false otherwise
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
