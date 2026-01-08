import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import { WatcherStore } from '../../lib/watcher-store.js';

describe('WatcherStore', function () {
  let store;

  const createValidWatcher = (name = 'test-watcher', overrides = {}) => ({
    name,
    referenceLocator: { using: 'id', value: 'popup' },
    actionLocator: { using: 'id', value: 'close' },
    duration: 30000,
    ...overrides,
  });

  beforeEach(function () {
    // Use default config values (same as schema defaults)
    store = new WatcherStore({ maxWatchers: 5, maxDurationMs: 60000 });
  });

  describe('add', function () {
    it('should add a new watcher successfully', function () {
      const watcher = createValidWatcher();
      const result = store.add(watcher);

      expect(result).to.have.property('name', 'test-watcher');
      expect(result).to.have.property('priority', 0);
      expect(result).to.have.property('status', 'active');
      expect(result).to.have.property('triggerCount', 0);
      expect(result.lastTriggeredAt).to.be.null;
    });

    it('should set priority to 0 if not provided', function () {
      const watcher = createValidWatcher();
      const result = store.add(watcher);

      expect(result.priority).to.equal(0);
    });

    it('should use provided priority value', function () {
      const watcher = createValidWatcher('test', { priority: 10 });
      const result = store.add(watcher);

      expect(result.priority).to.equal(10);
    });

    it('should set stopOnFound to false if not provided', function () {
      const watcher = createValidWatcher();
      const result = store.add(watcher);

      expect(result.stopOnFound).to.equal(false);
    });

    it('should use provided stopOnFound value', function () {
      const watcher = createValidWatcher('test', { stopOnFound: true });
      const result = store.add(watcher);

      expect(result.stopOnFound).to.equal(true);
    });

    it('should set cooldownMs to 0 if not provided', function () {
      const watcher = createValidWatcher();
      const result = store.add(watcher);

      expect(result.cooldownMs).to.equal(0);
    });

    it('should use provided cooldownMs value', function () {
      const watcher = createValidWatcher('test', { cooldownMs: 5000 });
      const result = store.add(watcher);

      expect(result.cooldownMs).to.equal(5000);
    });

    it('should calculate expiresAt correctly', function () {
      const before = Date.now();
      const watcher = createValidWatcher('test', { duration: 10000 });
      const result = store.add(watcher);
      const after = Date.now();

      expect(result.expiresAt).to.be.at.least(before + 10000);
      expect(result.expiresAt).to.be.at.most(after + 10000);
    });

    it('should throw error for duplicate watcher name', function () {
      const watcher1 = createValidWatcher('duplicate');
      const watcher2 = createValidWatcher('duplicate');

      store.add(watcher1);
      expect(() => store.add(watcher2)).to.throw("UIWatcher with name 'duplicate' already exists");
    });

    it('should throw error when adding 6th watcher', function () {
      // Add 5 watchers
      for (let i = 1; i <= 5; i++) {
        store.add(createValidWatcher(`watcher-${i}`));
      }

      // Try to add 6th watcher
      expect(() => store.add(createValidWatcher('watcher-6'))).to.throw(
        'Maximum 5 UI watchers allowed per session'
      );
    });

    it('should allow adding watcher if one has expired', function () {
      // Add 5 watchers with very short duration
      for (let i = 1; i <= 5; i++) {
        store.add(createValidWatcher(`watcher-${i}`, { duration: 1 }));
      }

      // Wait for expiry
      return new Promise((resolve) => {
        setTimeout(() => {
          // Now we should be able to add a new watcher
          expect(() => store.add(createValidWatcher('watcher-6'))).to.not.throw();
          resolve();
        }, 10);
      });
    });
  });

  describe('remove', function () {
    it('should remove existing watcher', function () {
      const watcher = createValidWatcher('to-remove');
      store.add(watcher);

      const result = store.remove('to-remove');
      expect(result).to.be.true;
      expect(store.get('to-remove')).to.be.undefined;
    });

    it('should return false when removing non-existent watcher', function () {
      const result = store.remove('non-existent');
      expect(result).to.be.false;
    });
  });

  describe('get', function () {
    it('should retrieve existing watcher', function () {
      const watcher = createValidWatcher('retrieve-me');
      store.add(watcher);

      const result = store.get('retrieve-me');
      expect(result).to.have.property('name', 'retrieve-me');
    });

    it('should return undefined for non-existent watcher', function () {
      const result = store.get('non-existent');
      expect(result).to.be.undefined;
    });
  });

  describe('list', function () {
    it('should return empty array when no watchers', function () {
      const result = store.list();
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return all watchers', function () {
      store.add(createValidWatcher('watcher-1'));
      store.add(createValidWatcher('watcher-2'));
      store.add(createValidWatcher('watcher-3'));

      const result = store.list();
      expect(result).to.have.lengthOf(3);
    });

    it('should include expired watchers', function () {
      store.add(createValidWatcher('expired', { duration: 1 }));

      return new Promise((resolve) => {
        setTimeout(() => {
          const result = store.list();
          expect(result).to.have.lengthOf(1);
          resolve();
        }, 10);
      });
    });
  });

  describe('getActiveWatchers', function () {
    it('should return empty array when no watchers', function () {
      const result = store.getActiveWatchers();
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return only non-expired watchers', function () {
      store.add(createValidWatcher('active-1', { duration: 60000 }));
      store.add(createValidWatcher('expired-1', { duration: 1 }));

      return new Promise((resolve) => {
        setTimeout(() => {
          const result = store.getActiveWatchers();
          expect(result).to.have.lengthOf(1);
          expect(result[0].name).to.equal('active-1');
          resolve();
        }, 10);
      });
    });

    it('should remove expired watchers from storage', function () {
      store.add(createValidWatcher('expired', { duration: 1 }));

      return new Promise((resolve) => {
        setTimeout(() => {
          store.getActiveWatchers();
          expect(store.get('expired')).to.be.undefined;
          resolve();
        }, 10);
      });
    });

    it('should include inactive watchers if not expired', function () {
      store.add(createValidWatcher('inactive', { duration: 60000 }));
      store.markInactive('inactive');

      const result = store.getActiveWatchers();
      expect(result).to.have.lengthOf(1);
      expect(result[0].status).to.equal('inactive');
    });
  });

  describe('getSortedWatchers', function () {
    it('should sort by priority descending', function () {
      store.add(createValidWatcher('low', { priority: 1 }));
      store.add(createValidWatcher('high', { priority: 10 }));
      store.add(createValidWatcher('medium', { priority: 5 }));

      const result = store.getSortedWatchers();
      expect(result[0].name).to.equal('high');
      expect(result[1].name).to.equal('medium');
      expect(result[2].name).to.equal('low');
    });

    it('should use FIFO for same priority', function () {
      store.add(createValidWatcher('first', { priority: 10 }));
      store.add(createValidWatcher('second', { priority: 10 }));
      store.add(createValidWatcher('third', { priority: 10 }));

      const result = store.getSortedWatchers();
      expect(result[0].name).to.equal('first');
      expect(result[1].name).to.equal('second');
      expect(result[2].name).to.equal('third');
    });

    it('should filter out expired watchers', function () {
      store.add(createValidWatcher('active', { priority: 10, duration: 60000 }));
      store.add(createValidWatcher('expired', { priority: 20, duration: 1 }));

      return new Promise((resolve) => {
        setTimeout(() => {
          const result = store.getSortedWatchers();
          expect(result).to.have.lengthOf(1);
          expect(result[0].name).to.equal('active');
          resolve();
        }, 10);
      });
    });
  });

  describe('clear', function () {
    it('should remove all watchers and return count', function () {
      store.add(createValidWatcher('watcher-1'));
      store.add(createValidWatcher('watcher-2'));
      store.add(createValidWatcher('watcher-3'));

      const count = store.clear();
      expect(count).to.equal(3);
      expect(store.list()).to.be.empty;
    });

    it('should return 0 when clearing empty store', function () {
      const count = store.clear();
      expect(count).to.equal(0);
    });
  });

  describe('markInactive', function () {
    it('should mark watcher as inactive', function () {
      store.add(createValidWatcher('test'));
      store.markInactive('test');

      const result = store.get('test');
      expect(result.status).to.equal('inactive');
    });

    it('should do nothing for non-existent watcher', function () {
      expect(() => store.markInactive('non-existent')).to.not.throw();
    });
  });

  describe('incrementTriggerCount', function () {
    it('should increment trigger count', function () {
      store.add(createValidWatcher('test'));

      store.incrementTriggerCount('test');
      expect(store.get('test').triggerCount).to.equal(1);

      store.incrementTriggerCount('test');
      expect(store.get('test').triggerCount).to.equal(2);
    });

    it('should update lastTriggeredAt timestamp', function () {
      store.add(createValidWatcher('test'));
      const before = Date.now();

      store.incrementTriggerCount('test');

      const result = store.get('test');
      expect(result.lastTriggeredAt).to.be.at.least(before);
      expect(result.lastTriggeredAt).to.be.at.most(Date.now());
    });

    it('should do nothing for non-existent watcher', function () {
      expect(() => store.incrementTriggerCount('non-existent')).to.not.throw();
    });
  });

  describe('updateLastTriggered', function () {
    it('should update lastTriggeredAt timestamp', function () {
      store.add(createValidWatcher('test'));
      const before = Date.now();

      store.updateLastTriggered('test');

      const result = store.get('test');
      expect(result.lastTriggeredAt).to.be.at.least(before);
      expect(result.lastTriggeredAt).to.be.at.most(Date.now());
    });

    it('should do nothing for non-existent watcher', function () {
      expect(() => store.updateLastTriggered('non-existent')).to.not.throw();
    });
  });

  describe('enable/disable', function () {
    it('should be enabled by default', function () {
      expect(store.isEnabled()).to.be.true;
    });

    it('should disable watcher checking', function () {
      store.disable();
      expect(store.isEnabled()).to.be.false;
    });

    it('should enable watcher checking', function () {
      store.disable();
      store.enable();
      expect(store.isEnabled()).to.be.true;
    });

    it('should toggle enable/disable multiple times', function () {
      expect(store.isEnabled()).to.be.true;

      store.disable();
      expect(store.isEnabled()).to.be.false;

      store.enable();
      expect(store.isEnabled()).to.be.true;

      store.disable();
      expect(store.isEnabled()).to.be.false;
    });
  });

  describe('custom configuration', function () {
    it('should respect custom maxWatchers limit', function () {
      const customConfig = { maxWatchers: 3, maxDurationMs: 60000 };
      const customStore = new WatcherStore(customConfig);

      // Should allow 3 watchers
      customStore.add(createValidWatcher('watcher-1'));
      customStore.add(createValidWatcher('watcher-2'));
      customStore.add(createValidWatcher('watcher-3'));

      // 4th should fail
      expect(() => customStore.add(createValidWatcher('watcher-4'))).to.throw(
        'Maximum 3 UI watchers allowed per session'
      );
    });

    it('should work with increased maxWatchers limit', function () {
      const customConfig = { maxWatchers: 10, maxDurationMs: 60000 };
      const customStore = new WatcherStore(customConfig);

      // Should allow 10 watchers
      for (let i = 1; i <= 10; i++) {
        customStore.add(createValidWatcher(`watcher-${i}`));
      }

      // 11th should fail
      expect(() => customStore.add(createValidWatcher('watcher-11'))).to.throw(
        'Maximum 10 UI watchers allowed per session'
      );
    });

    it('should return config via getConfig()', function () {
      const customConfig = { maxWatchers: 8, maxDurationMs: 120000 };
      const customStore = new WatcherStore(customConfig);

      const config = customStore.getConfig();
      expect(config).to.deep.equal(customConfig);
    });
  });
});
