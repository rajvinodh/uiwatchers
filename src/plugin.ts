import { BasePlugin } from '@appium/base-plugin';
import { logger } from '@appium/support';
import { WatcherStore } from './watcher-store.js';
import { registerUIWatcher } from './commands/register.js';
import { unregisterUIWatcher } from './commands/unregister.js';
import { clearAllUIWatchers } from './commands/clear.js';
import { listUIWatchers } from './commands/list.js';
import { disableUIWatchers, enableUIWatchers } from './commands/toggle.js';
import { checkWatchers } from './watcher-checker.js';

const log = logger.getLogger('AppiumUIWatchers');

/**
 * UIWatchersPlugin - Appium plugin for automatic UI element handling
 *
 * This plugin provides automatic detection and handling of unexpected UI elements
 * (popups, banners, dialogs) during test execution without explicit waits.
 */
class UIWatchersPlugin extends BasePlugin {
  /** Per-session watcher storage (keyed by sessionId) */
  private stores: Map<string, WatcherStore>;

  /**
   * Creates an instance of UIWatchersPlugin
   * @param pluginName - The name of the plugin
   * @param cliArgs - Optional CLI arguments passed to the plugin
   */
  constructor(pluginName: string, cliArgs?: Record<string, unknown>) {
    super(pluginName, cliArgs);
    this.stores = new Map();
    log.info('[UIWatchers] Plugin initialized');
  }

  /**
   * Get or create WatcherStore for a specific session
   * @param driver - The driver instance containing sessionId
   * @returns The WatcherStore for this session
   * @throws Error if no sessionId is available
   */
  private getStore(driver: any): WatcherStore {
    const sessionId = driver.sessionId;
    if (!sessionId) {
      throw new Error('No session ID available');
    }

    if (!this.stores.has(sessionId)) {
      this.stores.set(sessionId, new WatcherStore());
      log.info(`[UIWatchers] Created watcher store for session ${sessionId}`);
    }

    return this.stores.get(sessionId)!;
  }

  /**
   * Override execute command to handle mobile: commands
   */
  async execute(next: () => Promise<any>, driver: any, script: string, args: any[]): Promise<any> {
    const params = args && args.length > 0 ? args[0] : null;
    const store = this.getStore(driver);

    switch (script) {
      case 'mobile: registerUIWatcher':
        return await registerUIWatcher(store, params);
      case 'mobile: unregisterUIWatcher':
        return await unregisterUIWatcher(store, params.name);
      case 'mobile: clearAllUIWatchers':
        return await clearAllUIWatchers(store);
      case 'mobile: listUIWatchers':
        return await listUIWatchers(store);
      case 'mobile: disableUIWatchers':
        return await disableUIWatchers(store);
      case 'mobile: enableUIWatchers':
        return await enableUIWatchers(store);
      default:
        return await next();
    }
  }

  /**
   * Intercept findElement to check watchers on exceptions
   */
  async findElement(next: () => Promise<any>, driver: any, ..._args: any[]): Promise<any> {
    try {
      // Try the original findElement
      return await next();
    } catch (error: any) {
      // Check if this is NoSuchElementException or StaleElementReferenceException
      const errorName = error.name || error.error || '';
      const shouldCheckWatchers =
        errorName.includes('NoSuchElement') ||
        errorName.includes('StaleElementReference') ||
        error.message?.includes('An element could not be located');

      if (shouldCheckWatchers) {
        log.debug('[UIWatchers] findElement failed, checking watchers');

        try {
          const store = this.getStore(driver);
          // Check all watchers
          await checkWatchers(driver, store);

          // Retry findElement once
          log.debug('[UIWatchers] Retrying findElement after watcher checking');
          return await next();
        } catch {
          // If retry also fails, throw the original exception
          log.debug('[UIWatchers] Retry failed, throwing original exception');
          throw error;
        }
      }

      // Not a handled exception type, re-throw
      throw error;
    }
  }

  /**
   * Intercept findElements to check watchers on empty results
   */
  async findElements(next: () => Promise<any>, driver: any, ..._args: any[]): Promise<any> {
    try {
      // Try the original findElements
      const result = await next();

      // Check if result is empty array
      if (Array.isArray(result) && result.length === 0) {
        log.debug('[UIWatchers] findElements returned empty array, checking watchers');

        try {
          const store = this.getStore(driver);
          // Check all watchers
          await checkWatchers(driver, store);

          // Retry findElements once
          log.debug('[UIWatchers] Retrying findElements after watcher checking');
          return await next();
        } catch {
          // If retry fails, return empty array (original result)
          log.debug('[UIWatchers] Retry failed, returning empty array');
          return result;
        }
      }

      // Non-empty result, return it
      return result;
    } catch (error: any) {
      // Exception thrown by findElements
      log.debug('[UIWatchers] findElements threw exception, checking watchers');

      try {
        const store = this.getStore(driver);
        // Check all watchers
        await checkWatchers(driver, store);

        // Retry findElements once
        log.debug('[UIWatchers] Retrying findElements after watcher checking');
        return await next();
      } catch {
        // If retry also fails, throw the original exception
        log.debug('[UIWatchers] Retry failed, throwing original exception');
        throw error;
      }
    }
  }

  /**
   * Cleanup watcher store when session ends normally
   * Appium lifecycle hook called when deleteSession is invoked
   */
  async deleteSession(next: () => Promise<any>, driver: any, ..._args: any[]): Promise<any> {
    const sessionId = driver.sessionId;

    // Call the original deleteSession first
    const result = await next();

    // Clean up our session-specific store
    if (sessionId && this.stores.has(sessionId)) {
      this.stores.delete(sessionId);
      log.info(`[UIWatchers] Cleaned up watcher store for session ${sessionId}`);
    }

    return result;
  }

  /**
   * Cleanup watcher store when session ends unexpectedly (crash, timeout, etc.)
   * Appium lifecycle hook called on unexpected shutdown
   */
  async onUnexpectedShutdown(driver: any, cause: string): Promise<void> {
    const sessionId = driver.sessionId;

    if (sessionId && this.stores.has(sessionId)) {
      this.stores.delete(sessionId);
      log.info(`[UIWatchers] Cleaned up watcher store for session ${sessionId} (cause: ${cause})`);
    }
  }
}

// Export as both default and named export for compatibility
export { UIWatchersPlugin };
export default UIWatchersPlugin;
