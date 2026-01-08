/**
 * listUIWatchers command implementation
 */

import type { WatcherStore } from '../watcher-store.js';
import type { ListWatchersResult } from '../types.js';

/**
 * List all active UI watchers with their state
 * @param store - Watcher store instance
 * @returns List of all active watchers
 */
export async function listUIWatchers(store: WatcherStore): Promise<ListWatchersResult> {
  // Get all active watchers (this automatically filters out expired ones)
  const activeWatchers = store.getActiveWatchers();

  // Return success response
  return {
    success: true,
    watchers: activeWatchers,
    totalCount: activeWatchers.length,
  };
}
