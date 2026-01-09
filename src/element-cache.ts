/**
 * Element Reference Cache for StaleElement Recovery
 *
 * This module provides caching of element locators to enable automatic recovery
 * from StaleElementReferenceException on element action commands.
 */

import { logger } from '@appium/support';
import type { CachedRef, CachedElementRef, CachedElementsRef } from './types.js';
import type { PluginConfig } from './config.js';
import { extractElementId, type ElementObject } from './utils.js';

const log = logger.getLogger('AppiumUIWatchers');

/**
 * Configuration for ElementReferenceCache
 */
export interface CacheConfig {
  maxCacheEntries: number;
  elementTtlMs: number;
}

/**
 * ElementReferenceCache manages cached element locators for stale element recovery.
 *
 * Features:
 * - Caches element locators on successful findElement/findElements
 * - Provides element ID mapping for recovered elements
 * - Supports transitive mapping updates (abc→efg, efg→hij => abc→hij)
 * - LRU eviction when max entries reached
 * - TTL-based expiry for old entries
 */
export class ElementReferenceCache {
  /** Cache storage: elementId → CachedRef */
  private cache: Map<string, CachedRef>;

  /** Element ID mappings: oldId → newId */
  private idMappings: Map<string, string>;

  /** Reverse index for transitive updates: newId → Set<oldId> */
  private reverseIndex: Map<string, Set<string>>;

  /** LRU order tracking (most recent at end) */
  private accessOrder: string[];

  /** Configuration */
  private config: CacheConfig;

  constructor(config: Required<PluginConfig>) {
    this.cache = new Map();
    this.idMappings = new Map();
    this.reverseIndex = new Map();
    this.accessOrder = [];
    this.config = {
      maxCacheEntries: config.maxCacheEntries,
      elementTtlMs: config.elementTtlMs,
    };
  }

  /**
   * Cache an element reference from findElement
   */
  cacheElement(elementId: string, using: string, value: string): void {
    const ref: CachedElementRef = {
      using,
      value,
      source: 'findElement',
      createdAt: Date.now(),
    };

    this.addToCache(elementId, ref);
    log.debug(`[UIWatchers] Cached element reference: ${elementId} (${using}=${value})`);
  }

  /**
   * Cache element references from findElements
   * Each element is cached with its index position
   */
  cacheElements(elements: ElementObject[], using: string, value: string): void {
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const elementId = extractElementId(element);
      if (!elementId) continue;

      const ref: CachedElementsRef = {
        using,
        value,
        index: i,
        source: 'findElements',
        createdAt: Date.now(),
      };

      this.addToCache(elementId, ref);
    }
    log.debug(
      `[UIWatchers] Cached ${elements.length} element references from findElements (${using}=${value})`
    );
  }

  /**
   * Get cached reference for an element
   * Returns undefined if not found or expired
   */
  getRef(elementId: string): CachedRef | undefined {
    const ref = this.cache.get(elementId);
    if (!ref) return undefined;

    // Check TTL
    if (this.isExpired(ref)) {
      this.removeFromCache(elementId);
      return undefined;
    }

    // Update LRU order
    this.updateAccessOrder(elementId);

    return ref;
  }

  /**
   * Create element ID mapping with transitive update
   *
   * When we map oldId → newId, we also update any existing mappings
   * that point to oldId to instead point to newId.
   *
   * Example:
   *   Existing: abc → efg
   *   New mapping: efg → hij
   *   Result: abc → hij, efg → hij
   */
  setMapping(oldId: string, newId: string): void {
    // Step 1: Find all mappings where value == oldId (using reverse index)
    const pointingToOld = this.reverseIndex.get(oldId);
    if (pointingToOld) {
      // Update all these mappings to point to newId
      for (const sourceId of pointingToOld) {
        this.idMappings.set(sourceId, newId);
        // Update reverse index
        this.addToReverseIndex(sourceId, newId);
      }
      // Remove old reverse index entry
      this.reverseIndex.delete(oldId);
    }

    // Step 2: Add the new mapping
    this.idMappings.set(oldId, newId);
    this.addToReverseIndex(oldId, newId);

    log.debug(`[UIWatchers] Created element ID mapping: ${oldId} → ${newId}`);
  }

  /**
   * Get mapped element ID if exists
   * Returns the new ID if a mapping exists, otherwise returns undefined
   */
  getMappedId(elementId: string): string | undefined {
    return this.idMappings.get(elementId);
  }

  /**
   * Remove expired entries from cache
   */
  cleanup(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [elementId, ref] of this.cache) {
      if (now - ref.createdAt >= this.config.elementTtlMs) {
        toRemove.push(elementId);
      }
    }

    for (const elementId of toRemove) {
      this.removeFromCache(elementId);
    }

    if (toRemove.length > 0) {
      log.debug(`[UIWatchers] Cleaned up ${toRemove.length} expired cache entries`);
    }
  }

  /**
   * Clear all cache entries and mappings
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    this.idMappings.clear();
    this.reverseIndex.clear();
    this.accessOrder = [];
    log.debug(`[UIWatchers] Cleared element cache (${count} entries)`);
  }

  /**
   * Get current cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get current mappings count
   */
  get mappingsCount(): number {
    return this.idMappings.size;
  }

  // ============================================================================
  // Private helper methods
  // ============================================================================

  private addToCache(elementId: string, ref: CachedRef): void {
    // Evict if at capacity
    while (this.cache.size >= this.config.maxCacheEntries) {
      this.evictLRU();
    }

    this.cache.set(elementId, ref);
    this.updateAccessOrder(elementId);
  }

  private removeFromCache(elementId: string): void {
    this.cache.delete(elementId);
    // Remove from access order
    const index = this.accessOrder.indexOf(elementId);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    // Remove least recently used (first in array)
    const lruId = this.accessOrder.shift();
    if (lruId) {
      this.cache.delete(lruId);
      log.debug(`[UIWatchers] Evicted LRU cache entry: ${lruId}`);
    }
  }

  private updateAccessOrder(elementId: string): void {
    // Remove from current position
    const index = this.accessOrder.indexOf(elementId);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
    // Add to end (most recently used)
    this.accessOrder.push(elementId);
  }

  private isExpired(ref: CachedRef): boolean {
    return Date.now() - ref.createdAt >= this.config.elementTtlMs;
  }

  private addToReverseIndex(oldId: string, newId: string): void {
    if (!this.reverseIndex.has(newId)) {
      this.reverseIndex.set(newId, new Set());
    }
    this.reverseIndex.get(newId)!.add(oldId);
  }
}
