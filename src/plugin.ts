import { BasePlugin } from '@appium/base-plugin';
import { logger } from '@appium/support';
import { WatcherStore } from './watcher-store.js';
import { ElementReferenceCache } from './element-cache.js';
import { registerUIWatcher } from './commands/register.js';
import { unregisterUIWatcher } from './commands/unregister.js';
import { clearAllUIWatchers } from './commands/clear.js';
import { listUIWatchers } from './commands/list.js';
import { disableUIWatchers, enableUIWatchers } from './commands/toggle.js';
import { checkWatchers } from './watcher-checker.js';
import { DefaultPluginConfig, type PluginConfig } from './config.js';
import { extractElementId } from './utils.js';

const log = logger.getLogger('AppiumUIWatchers');

/**
 * Element action commands to intercept for StaleElement recovery
 * These are Appium command names that operate on elements
 */
const ELEMENT_ACTION_COMMANDS = [
  'click',
  'getText',
  'getAttribute',
  'elementDisplayed',
  'elementEnabled',
  'elementSelected',
  'getName',
  'getLocation',
  'getSize',
  'setValue',
  'setValueImmediate',
  'clear',
  'getElementScreenshot',
  'getElementRect',
];

/**
 * UIWatchersPlugin - Appium plugin for automatic UI element handling
 *
 * This plugin provides automatic detection and handling of unexpected UI elements
 * (popups, banners, dialogs) during test execution without explicit waits.
 */
class UIWatchersPlugin extends BasePlugin {
  /** Per-session watcher storage (keyed by sessionId) */
  private stores: Map<string, WatcherStore>;

  /** Per-session element reference cache (keyed by sessionId) */
  private caches: Map<string, ElementReferenceCache>;

  /** Plugin configuration */
  private config: Required<PluginConfig>;

  /**
   * Creates an instance of UIWatchersPlugin
   * @param pluginName - The name of the plugin
   * @param cliArgs - Optional CLI arguments passed to the plugin
   */
  constructor(pluginName: string, cliArgs?: Record<string, unknown>) {
    super(pluginName, cliArgs);

    this.config = Object.assign({}, DefaultPluginConfig, cliArgs as PluginConfig);

    this.stores = new Map();
    this.caches = new Map();
    log.info('[UIWatchers] Plugin initialized with config:', this.config);
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
      this.stores.set(sessionId, new WatcherStore(this.config));
      log.info(`[UIWatchers] Created watcher store for session ${sessionId}`);
    }

    return this.stores.get(sessionId)!;
  }

  /**
   * Get or create ElementReferenceCache for a specific session
   * @param driver - The driver instance containing sessionId
   * @returns The ElementReferenceCache for this session
   * @throws Error if no sessionId is available
   */
  private getCache(driver: any): ElementReferenceCache {
    const sessionId = driver.sessionId;
    if (!sessionId) {
      throw new Error('No session ID available');
    }

    if (!this.caches.has(sessionId)) {
      this.caches.set(sessionId, new ElementReferenceCache(this.config));
      log.info(`[UIWatchers] Created element cache for session ${sessionId}`);
    }

    return this.caches.get(sessionId)!;
  }

  /**
   * Check if error is a StaleElementReferenceException
   */
  private isStaleElementException(error: any): boolean {
    const errorName = error?.name || error?.error || '';
    return (
      errorName.includes('StaleElementReference') ||
      error?.message?.includes('stale element reference') ||
      error?.message?.includes('element is not attached')
    );
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
   * Intercept findElement to check watchers on exceptions and cache on success
   */
  async findElement(next: () => Promise<any>, driver: any, ...args: any[]): Promise<any> {
    const [using, value] = args;

    try {
      // Try the original findElement
      const result = await next();

      // On success, cache the element reference for stale element recovery
      if (result && using && value) {
        const elementId = extractElementId(result);
        if (elementId) {
          const cache = this.getCache(driver);
          cache.cacheElement(elementId, using, value);
        }
      }

      return result;
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
          const result = await next();

          // Cache the successful retry result
          if (result && using && value) {
            const elementId = extractElementId(result);
            if (elementId) {
              const cache = this.getCache(driver);
              cache.cacheElement(elementId, using, value);
            }
          }

          return result;
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
   * Intercept findElements to check watchers on empty results and cache on success
   */
  async findElements(next: () => Promise<any>, driver: any, ...args: any[]): Promise<any> {
    const [using, value] = args;

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
          const retryResult = await next();

          // Cache successful retry results
          if (Array.isArray(retryResult) && retryResult.length > 0 && using && value) {
            const cache = this.getCache(driver);
            cache.cacheElements(retryResult, using, value);
          }

          return retryResult;
        } catch {
          // If retry fails, return empty array (original result)
          log.debug('[UIWatchers] Retry failed, returning empty array');
          return result;
        }
      }

      // Non-empty result, cache all elements and return
      if (Array.isArray(result) && result.length > 0 && using && value) {
        const cache = this.getCache(driver);
        cache.cacheElements(result, using, value);
      }

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
        const result = await next();

        // Cache successful retry results
        if (Array.isArray(result) && result.length > 0 && using && value) {
          const cache = this.getCache(driver);
          cache.cacheElements(result, using, value);
        }

        return result;
      } catch {
        // If retry also fails, throw the original exception
        log.debug('[UIWatchers] Retry failed, throwing original exception');
        throw error;
      }
    }
  }

  /**
   * Handle method intercepts all Appium commands not specifically handled by named methods
   * We use this to intercept element action commands (click, getText, etc.) for StaleElement recovery
   */
  async handle(
    next: () => Promise<any>,
    driver: any,
    cmdName: string,
    ...args: any[]
  ): Promise<any> {
    // Only intercept element action commands
    if (!ELEMENT_ACTION_COMMANDS.includes(cmdName)) {
      return await next();
    }

    // Extract elementId from args (first argument for element commands)
    const elementId = args[0];
    if (!elementId) {
      return await next();
    }

    return this.interceptAction(next, driver, elementId, cmdName, args);
  }

  /**
   * Intercept element action commands for StaleElement recovery
   */
  private async interceptAction(
    next: () => Promise<any>,
    driver: any,
    elementId: string,
    cmdName: string,
    args: any[]
  ): Promise<any> {
    const cache = this.getCache(driver);

    // Check for mapped ID first (from previous recovery)
    const actualId = cache.getMappedId(elementId) || elementId;

    try {
      return await next();
    } catch (error: any) {
      // Only handle StaleElementReferenceException
      if (!this.isStaleElementException(error)) {
        throw error;
      }

      log.debug(`[UIWatchers] StaleElement on ${cmdName}, checking watchers`);

      // Step 1: Check watchers FIRST
      const store = this.getStore(driver);
      const watchersTriggered = await checkWatchers(driver, store);

      // Step 2: If no watchers handled, throw original exception
      if (!watchersTriggered) {
        log.debug('[UIWatchers] No watchers triggered, throwing original exception');
        throw error;
      }

      // Step 3: Lookup cached reference (only if watchers handled something)
      const ref = cache.getRef(actualId);
      if (!ref) {
        log.error(`[UIWatchers] Element reference not found in cache for ${actualId}`);
        throw new Error(
          'Element reference not found in cache. Unable to recover from StaleElementReferenceException.'
        );
      }

      log.debug(
        `[UIWatchers] Attempting to recover element using cached locator (${ref.using}=${ref.value})`
      );

      // Step 4: Re-find element
      let newElement: any;
      if (ref.source === 'findElement') {
        newElement = await driver.findElement(ref.using, ref.value);
      } else {
        // findElements - need to get element at specific index
        const elements = await driver.findElements(ref.using, ref.value);
        if (elements.length <= ref.index) {
          throw new Error(
            `Element at index ${ref.index} not found in findElements result. Expected at least ${ref.index + 1} elements.`
          );
        }
        newElement = elements[ref.index];
      }

      // Step 5: Create mapping with transitive update
      const newId = extractElementId(newElement);
      if (newId) {
        cache.setMapping(elementId, newId);
        log.debug(`[UIWatchers] Created element ID mapping: ${elementId} → ${newId}`);

        // Step 6: Retry action with new element ID
        // Replace elementId in args with newId, then call driver command
        const newArgs = [newId, ...args.slice(1)];
        log.debug(`[UIWatchers] Retrying ${cmdName} with recovered element`);
        return await driver[cmdName](...newArgs);
      }

      // If we couldn't extract newId, throw original error
      throw error;
    }
  }

  /**
   * Cleanup watcher store and element cache when session ends normally
   * Appium lifecycle hook called when deleteSession is invoked
   */
  async deleteSession(next: () => Promise<any>, driver: any, ..._args: any[]): Promise<any> {
    const sessionId = driver.sessionId;

    // Call the original deleteSession first
    const result = await next();

    // Clean up our session-specific store and cache
    if (sessionId) {
      if (this.stores.has(sessionId)) {
        this.stores.delete(sessionId);
        log.info(`[UIWatchers] Cleaned up watcher store for session ${sessionId}`);
      }
      if (this.caches.has(sessionId)) {
        this.caches.get(sessionId)!.clear();
        this.caches.delete(sessionId);
        log.info(`[UIWatchers] Cleaned up element cache for session ${sessionId}`);
      }
    }

    return result;
  }

  /**
   * Cleanup watcher store and element cache when session ends unexpectedly (crash, timeout, etc.)
   * Appium lifecycle hook called on unexpected shutdown
   */
  async onUnexpectedShutdown(driver: any, cause: string): Promise<void> {
    const sessionId = driver.sessionId;

    if (sessionId) {
      if (this.stores.has(sessionId)) {
        this.stores.delete(sessionId);
        log.info(
          `[UIWatchers] Cleaned up watcher store for session ${sessionId} (cause: ${cause})`
        );
      }
      if (this.caches.has(sessionId)) {
        this.caches.get(sessionId)!.clear();
        this.caches.delete(sessionId);
        log.info(
          `[UIWatchers] Cleaned up element cache for session ${sessionId} (cause: ${cause})`
        );
      }
    }
  }
}

// Export as both default and named export for compatibility
export { UIWatchersPlugin };
export default UIWatchersPlugin;
