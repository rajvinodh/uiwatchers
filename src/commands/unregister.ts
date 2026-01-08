/**
 * unregisterUIWatcher command implementation
 */

import { logger } from '@appium/support';
import type { WatcherStore } from '../watcher-store.js';
import type { UnregisterWatcherResult } from '../types.js';

const log = logger.getLogger('AppiumUIWatchers');

/**
 * Unregister a specific UI watcher by name
 * @param store - Watcher store instance
 * @param name - Name of the watcher to remove
 * @returns Unregistration result
 */
export async function unregisterUIWatcher(
  store: WatcherStore,
  name: string
): Promise<UnregisterWatcherResult> {
  // Validate name parameter
  if (!name || typeof name !== 'string') {
    throw new Error('UIWatcher name is required');
  }

  // Check if watcher exists
  const watcher = store.get(name);
  if (!watcher) {
    throw new Error(`UIWatcher '${name}' not found`);
  }

  // Remove watcher from store
  store.remove(name);

  // Log successful removal
  log.info(`[UIWatchers] UIWatcher '${name}' unregistered`);

  // Return success response
  return {
    success: true,
    removed: name,
  };
}
