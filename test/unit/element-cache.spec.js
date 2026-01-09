import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import { ElementReferenceCache } from '../../lib/element-cache.js';

describe('ElementReferenceCache', function () {
  let cache;

  const defaultConfig = {
    maxWatchers: 5,
    maxDurationMs: 60000,
    maxCacheEntries: 50,
    elementTtlMs: 60000,
  };

  beforeEach(function () {
    cache = new ElementReferenceCache(defaultConfig);
  });

  describe('cacheElement', function () {
    it('should cache element from findElement', function () {
      cache.cacheElement('elem-123', 'id', 'submit-btn');

      const ref = cache.getRef('elem-123');
      expect(ref).to.not.be.undefined;
      expect(ref.using).to.equal('id');
      expect(ref.value).to.equal('submit-btn');
      expect(ref.source).to.equal('findElement');
      expect(ref.createdAt).to.be.a('number');
    });

    it('should increment cache size when adding elements', function () {
      expect(cache.size).to.equal(0);

      cache.cacheElement('elem-1', 'id', 'btn1');
      expect(cache.size).to.equal(1);

      cache.cacheElement('elem-2', 'id', 'btn2');
      expect(cache.size).to.equal(2);
    });
  });

  describe('cacheElements', function () {
    it('should cache elements from findElements with correct indices', function () {
      const elements = [
        { 'element-6066-11e4-a52e-4f735466cecf': 'elem-1' },
        { 'element-6066-11e4-a52e-4f735466cecf': 'elem-2' },
        { 'element-6066-11e4-a52e-4f735466cecf': 'elem-3' },
      ];

      cache.cacheElements(elements, 'css selector', '.item');

      const ref1 = cache.getRef('elem-1');
      expect(ref1.source).to.equal('findElements');
      expect(ref1.index).to.equal(0);

      const ref2 = cache.getRef('elem-2');
      expect(ref2.source).to.equal('findElements');
      expect(ref2.index).to.equal(1);

      const ref3 = cache.getRef('elem-3');
      expect(ref3.source).to.equal('findElements');
      expect(ref3.index).to.equal(2);
    });

    it('should handle JSONWP element format', function () {
      const elements = [{ ELEMENT: 'jsonwp-elem-1' }, { ELEMENT: 'jsonwp-elem-2' }];

      cache.cacheElements(elements, 'xpath', '//div');

      const ref1 = cache.getRef('jsonwp-elem-1');
      expect(ref1).to.not.be.undefined;
      expect(ref1.index).to.equal(0);

      const ref2 = cache.getRef('jsonwp-elem-2');
      expect(ref2).to.not.be.undefined;
      expect(ref2.index).to.equal(1);
    });
  });

  describe('getRef', function () {
    it('should return undefined for non-existent element', function () {
      const ref = cache.getRef('non-existent');
      expect(ref).to.be.undefined;
    });

    it('should return cached reference for existing element', function () {
      cache.cacheElement('elem-123', 'id', 'myBtn');

      const ref = cache.getRef('elem-123');
      expect(ref).to.not.be.undefined;
      expect(ref.using).to.equal('id');
      expect(ref.value).to.equal('myBtn');
    });
  });

  describe('LRU eviction', function () {
    it('should evict oldest entry when max entries reached', function () {
      // Use small cache for testing
      const smallCache = new ElementReferenceCache({
        ...defaultConfig,
        maxCacheEntries: 3,
      });

      smallCache.cacheElement('elem-1', 'id', 'btn1');
      smallCache.cacheElement('elem-2', 'id', 'btn2');
      smallCache.cacheElement('elem-3', 'id', 'btn3');

      expect(smallCache.size).to.equal(3);

      // Adding 4th should evict elem-1 (oldest)
      smallCache.cacheElement('elem-4', 'id', 'btn4');

      expect(smallCache.size).to.equal(3);
      expect(smallCache.getRef('elem-1')).to.be.undefined;
      expect(smallCache.getRef('elem-2')).to.not.be.undefined;
      expect(smallCache.getRef('elem-3')).to.not.be.undefined;
      expect(smallCache.getRef('elem-4')).to.not.be.undefined;
    });

    it('should update LRU order when accessing element', function () {
      const smallCache = new ElementReferenceCache({
        ...defaultConfig,
        maxCacheEntries: 3,
      });

      smallCache.cacheElement('elem-1', 'id', 'btn1');
      smallCache.cacheElement('elem-2', 'id', 'btn2');
      smallCache.cacheElement('elem-3', 'id', 'btn3');

      // Access elem-1 to make it most recently used
      smallCache.getRef('elem-1');

      // Adding elem-4 should evict elem-2 (now the oldest)
      smallCache.cacheElement('elem-4', 'id', 'btn4');

      expect(smallCache.getRef('elem-1')).to.not.be.undefined; // Was accessed, not evicted
      expect(smallCache.getRef('elem-2')).to.be.undefined; // Evicted
      expect(smallCache.getRef('elem-3')).to.not.be.undefined;
      expect(smallCache.getRef('elem-4')).to.not.be.undefined;
    });
  });

  describe('TTL expiry', function () {
    it('should return undefined for expired entries', function () {
      // Use very short TTL for testing
      const shortTtlCache = new ElementReferenceCache({
        ...defaultConfig,
        elementTtlMs: 10, // 10ms TTL
      });

      shortTtlCache.cacheElement('elem-1', 'id', 'btn1');

      // Wait for TTL to expire
      return new Promise((resolve) => {
        setTimeout(() => {
          const ref = shortTtlCache.getRef('elem-1');
          expect(ref).to.be.undefined;
          resolve();
        }, 20);
      });
    });
  });

  describe('setMapping', function () {
    it('should create element ID mapping', function () {
      cache.setMapping('old-id', 'new-id');

      const mapped = cache.getMappedId('old-id');
      expect(mapped).to.equal('new-id');
    });

    it('should return undefined for unmapped ID', function () {
      const mapped = cache.getMappedId('unknown-id');
      expect(mapped).to.be.undefined;
    });

    it('should increment mappings count', function () {
      expect(cache.mappingsCount).to.equal(0);

      cache.setMapping('old-1', 'new-1');
      expect(cache.mappingsCount).to.equal(1);

      cache.setMapping('old-2', 'new-2');
      expect(cache.mappingsCount).to.equal(2);
    });
  });

  describe('transitive mapping update', function () {
    it('should update existing mappings when creating new mapping', function () {
      // Initial mapping: abc → efg
      cache.setMapping('abc', 'efg');
      expect(cache.getMappedId('abc')).to.equal('efg');

      // New mapping: efg → hij
      // Should also update abc → hij
      cache.setMapping('efg', 'hij');

      expect(cache.getMappedId('abc')).to.equal('hij'); // Transitive update
      expect(cache.getMappedId('efg')).to.equal('hij'); // Direct mapping
    });

    it('should handle multiple transitive chains', function () {
      // Create chain: a → b, c → b
      cache.setMapping('a', 'b');
      cache.setMapping('c', 'b');

      expect(cache.getMappedId('a')).to.equal('b');
      expect(cache.getMappedId('c')).to.equal('b');

      // Now b → d should update both a and c
      cache.setMapping('b', 'd');

      expect(cache.getMappedId('a')).to.equal('d');
      expect(cache.getMappedId('c')).to.equal('d');
      expect(cache.getMappedId('b')).to.equal('d');
    });

    it('should handle deep transitive chains', function () {
      // Create chain: x → y → z
      cache.setMapping('x', 'y');
      cache.setMapping('y', 'z');

      expect(cache.getMappedId('x')).to.equal('z');
      expect(cache.getMappedId('y')).to.equal('z');

      // Now z → w should update all
      cache.setMapping('z', 'w');

      expect(cache.getMappedId('x')).to.equal('w');
      expect(cache.getMappedId('y')).to.equal('w');
      expect(cache.getMappedId('z')).to.equal('w');
    });
  });

  describe('cleanup', function () {
    it('should remove expired entries', function () {
      const shortTtlCache = new ElementReferenceCache({
        ...defaultConfig,
        elementTtlMs: 10, // 10ms TTL
      });

      shortTtlCache.cacheElement('elem-1', 'id', 'btn1');

      return new Promise((resolve) => {
        setTimeout(() => {
          shortTtlCache.cleanup();
          expect(shortTtlCache.size).to.equal(0);
          resolve();
        }, 20);
      });
    });
  });

  describe('clear', function () {
    it('should remove all entries', function () {
      cache.cacheElement('elem-1', 'id', 'btn1');
      cache.cacheElement('elem-2', 'id', 'btn2');
      cache.setMapping('old', 'new');

      expect(cache.size).to.equal(2);
      expect(cache.mappingsCount).to.equal(1);

      cache.clear();

      expect(cache.size).to.equal(0);
      expect(cache.mappingsCount).to.equal(0);
    });
  });
});
