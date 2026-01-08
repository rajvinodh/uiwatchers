/**
 * disableUIWatchers and enableUIWatchers command implementations
 */

import { logger } from '@appium/support';
import type { WatcherStore } from '../watcher-store.js';
import type { ToggleWatchersResult } from '../types.js';

const log = logger.getLogger('AppiumUIWatchers');

/**
 * Disable all UI watcher checking
 * @param store - Watcher store instance
 * @returns Disable result
 */
export async function disableUIWatchers(store: WatcherStore): Promise<ToggleWatchersResult> {
  store.disable();

  // Log successful disable
  log.info('[UIWatchers] All UI watchers disabled');

  return {
    success: true,
    message: 'All UI watchers disabled',
  };
}

/**
 * Enable all UI watcher checking
 * @param store - Watcher store instance
 * @returns Enable result
 */
export async function enableUIWatchers(store: WatcherStore): Promise<ToggleWatchersResult> {
  store.enable();

  // Log successful enable
  log.info('[UIWatchers] All UI watchers enabled');

  return {
    success: true,
    message: 'All UI watchers enabled',
  };
}
