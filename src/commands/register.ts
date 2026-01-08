/**
 * registerUIWatcher command implementation
 */

import { logger } from '@appium/support';
import type { WatcherStore } from '../watcher-store.js';
import type { UIWatcher, RegisterWatcherResult } from '../types.js';
import { validateWatcherParams } from '../validators.js';

const log = logger.getLogger('AppiumUIWatchers');

/**
 * Register a new UI watcher
 * @param store - Watcher store instance
 * @param params - Watcher registration parameters
 * @returns Registration result
 */
export async function registerUIWatcher(
  store: WatcherStore,
  params: UIWatcher
): Promise<RegisterWatcherResult> {
  // Validate parameters
  validateWatcherParams(params);

  // Add watcher to store (this will throw if validation fails at store level)
  const watcherState = store.add(params);

  // Log successful registration
  log.info(
    `[UIWatchers] UIWatcher '${params.name}' registered (priority=${watcherState.priority}, duration=${params.duration}ms)`
  );

  // Return success response
  return {
    success: true,
    watcher: {
      name: watcherState.name,
      priority: watcherState.priority,
      registeredAt: watcherState.registeredAt,
      expiresAt: watcherState.expiresAt,
      status: watcherState.status,
    },
  };
}
