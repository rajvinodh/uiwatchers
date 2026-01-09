/**
 * Core watcher checking algorithm
 */

/* global setTimeout */

import { logger } from '@appium/support';
import type { WatcherStore } from './watcher-store.js';

const log = logger.getLogger('AppiumUIWatchers');

/**
 * Check all active watchers and execute actions for matching elements
 * @param driver - Appium driver instance
 * @param store - Watcher store instance
 * @returns true if at least one watcher was successfully triggered, false otherwise
 */
export async function checkWatchers(driver: any, store: WatcherStore): Promise<boolean> {
  // Track if any watcher was triggered
  let watcherTriggered = false;

  // Check if watchers are globally disabled
  if (!store.isEnabled()) {
    log.debug('[UIWatchers] Watcher checking is disabled, skipping');
    return false;
  }

  // Get active, sorted watchers (by priority desc, then FIFO)
  const watchers = store.getSortedWatchers();

  // Early return if no active watchers
  if (watchers.length === 0) {
    log.debug('[UIWatchers] No active watchers to check');
    return false;
  }

  log.debug(`[UIWatchers] Checking ${watchers.length} active watchers`);

  // Check each watcher in priority order
  for (const watcher of watchers) {
    // Skip inactive watchers (marked inactive by stopOnFound)
    if (watcher.status === 'inactive') {
      log.debug(`[UIWatchers] Skipping inactive watcher '${watcher.name}'`);
      continue;
    }

    log.debug(`[UIWatchers] Checking watcher '${watcher.name}' (priority=${watcher.priority})`);

    try {
      // Try to find the reference element
      try {
        await driver.findElement(watcher.referenceLocator.using, watcher.referenceLocator.value);
      } catch {
        // Reference element not found - continue to next watcher
        log.debug(`[UIWatchers] Watcher '${watcher.name}': Reference element not found`);
        continue;
      }

      // Reference element found
      log.debug(`[UIWatchers] Watcher '${watcher.name}': Reference element found`);

      // Try to find and click the action element
      try {
        const actionElement = await driver.findElement(
          watcher.actionLocator.using,
          watcher.actionLocator.value
        );

        // Click the action element
        await driver.click(actionElement.ELEMENT || actionElement);

        // Action click succeeded
        log.info(`[UIWatchers] UIWatcher '${watcher.name}' triggered successfully`);
        watcherTriggered = true;

        // Update trigger statistics
        store.incrementTriggerCount(watcher.name);

        // Mark as inactive if stopOnFound is true
        if (watcher.stopOnFound) {
          store.markInactive(watcher.name);
          log.debug(`[UIWatchers] Watcher '${watcher.name}' marked inactive (stopOnFound=true)`);
        }

        // Execute cooldown wait if configured
        if (watcher.cooldownMs > 0) {
          log.debug(
            `[UIWatchers] Watcher '${watcher.name}': Executing cooldown wait (${watcher.cooldownMs}ms)`
          );
          await new Promise((resolve) => setTimeout(resolve, watcher.cooldownMs));
          log.debug(`[UIWatchers] Watcher '${watcher.name}': Cooldown complete`);
        }
      } catch (clickError: any) {
        // Action click failed
        log.warn(
          `[UIWatchers] UIWatcher '${watcher.name}' action click failed: ${clickError.message}`
        );
        // Continue to next watcher (don't execute cooldown or mark inactive)
        continue;
      }
    } catch (error: any) {
      // Unexpected error during watcher checking
      log.error(
        `[UIWatchers] Unexpected error checking watcher '${watcher.name}': ${error.message}`
      );
      // Continue to next watcher
      continue;
    }
  }

  log.debug(`[UIWatchers] Watcher checking complete (triggered=${watcherTriggered})`);
  return watcherTriggered;
}
