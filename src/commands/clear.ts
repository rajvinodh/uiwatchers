/**
 * clearAllUIWatchers command implementation
 */

import { logger } from '@appium/support';
import type { WatcherStore } from '../watcher-store.js';
import type { ClearAllWatchersResult } from '../types.js';

const log = logger.getLogger('AppiumUIWatchers');

/**
 * Clear all UI watchers from the session
 * @param store - Watcher store instance
 * @returns Clear result with count of removed watchers
 */
export async function clearAllUIWatchers(store: WatcherStore): Promise<ClearAllWatchersResult> {
  // Get count before clearing
  const count = store.clear();

  // Log successful clear
  log.info(`[UIWatchers] All UI watchers cleared (removed ${count} watchers)`);

  // Return success response
  return {
    success: true,
    removedCount: count,
  };
}
