import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { WatcherStore } from '../../lib/watcher-store.js';
import { checkWatchers } from '../../lib/watcher-checker.js';

describe('WatcherChecker', function () {
  let store;
  let mockDriver;

  beforeEach(function () {
    store = new WatcherStore();

    // Create mock driver
    mockDriver = {
      findElement: sinon.stub(),
      click: sinon.stub(),
    };
  });

  describe('checkWatchers', function () {
    it('should skip checking when watchers are disabled', async function () {
      store.disable();
      store.add({
        name: 'test',
        referenceLocator: { using: 'id', value: 'popup' },
        actionLocator: { using: 'id', value: 'close' },
        duration: 30000,
      });

      await checkWatchers(mockDriver, store);

      expect(mockDriver.findElement.called).to.be.false;
    });

    it('should skip checking when no active watchers', async function () {
      await checkWatchers(mockDriver, store);

      expect(mockDriver.findElement.called).to.be.false;
    });

    it('should check watchers in priority order', async function () {
      const calls = [];

      store.add({
        name: 'low',
        priority: 1,
        referenceLocator: { using: 'id', value: 'popup1' },
        actionLocator: { using: 'id', value: 'close1' },
        duration: 30000,
      });

      store.add({
        name: 'high',
        priority: 10,
        referenceLocator: { using: 'id', value: 'popup2' },
        actionLocator: { using: 'id', value: 'close2' },
        duration: 30000,
      });

      mockDriver.findElement.callsFake((using, value) => {
        calls.push(value);
        throw new Error('not found');
      });

      await checkWatchers(mockDriver, store);

      // Should check high priority first
      expect(calls[0]).to.equal('popup2');
      expect(calls[1]).to.equal('popup1');
    });

    it('should skip inactive watchers', async function () {
      store.add({
        name: 'test',
        referenceLocator: { using: 'id', value: 'popup' },
        actionLocator: { using: 'id', value: 'close' },
        duration: 30000,
      });

      store.markInactive('test');

      await checkWatchers(mockDriver, store);

      expect(mockDriver.findElement.called).to.be.false;
    });

    it('should continue to next watcher if reference not found', async function () {
      store.add({
        name: 'watcher1',
        referenceLocator: { using: 'id', value: 'popup1' },
        actionLocator: { using: 'id', value: 'close1' },
        duration: 30000,
      });

      store.add({
        name: 'watcher2',
        referenceLocator: { using: 'id', value: 'popup2' },
        actionLocator: { using: 'id', value: 'close2' },
        duration: 30000,
      });

      mockDriver.findElement.throws(new Error('not found'));

      await checkWatchers(mockDriver, store);

      // Should attempt both watchers
      expect(mockDriver.findElement.callCount).to.equal(2);
    });

    it('should click action element when reference found', async function () {
      store.add({
        name: 'test',
        referenceLocator: { using: 'id', value: 'popup' },
        actionLocator: { using: 'id', value: 'close' },
        duration: 30000,
      });

      mockDriver.findElement.resolves({ ELEMENT: 'element-1' });
      mockDriver.click.resolves();

      await checkWatchers(mockDriver, store);

      expect(mockDriver.findElement.callCount).to.equal(2); // reference + action
      expect(mockDriver.click.calledOnce).to.be.true;
    });

    it('should increment trigger count on successful click', async function () {
      store.add({
        name: 'test',
        referenceLocator: { using: 'id', value: 'popup' },
        actionLocator: { using: 'id', value: 'close' },
        duration: 30000,
      });

      mockDriver.findElement.resolves({ ELEMENT: 'element-1' });
      mockDriver.click.resolves();

      await checkWatchers(mockDriver, store);

      const watcher = store.get('test');
      expect(watcher.triggerCount).to.equal(1);
      expect(watcher.lastTriggeredAt).to.be.a('number');
    });

    it('should mark inactive when stopOnFound is true', async function () {
      store.add({
        name: 'test',
        referenceLocator: { using: 'id', value: 'popup' },
        actionLocator: { using: 'id', value: 'close' },
        duration: 30000,
        stopOnFound: true,
      });

      mockDriver.findElement.resolves({ ELEMENT: 'element-1' });
      mockDriver.click.resolves();

      await checkWatchers(mockDriver, store);

      const watcher = store.get('test');
      expect(watcher.status).to.equal('inactive');
    });

    it('should execute cooldown wait when configured', async function () {
      this.timeout(5000);

      store.add({
        name: 'test',
        referenceLocator: { using: 'id', value: 'popup' },
        actionLocator: { using: 'id', value: 'close' },
        duration: 30000,
        cooldownMs: 100,
      });

      mockDriver.findElement.resolves({ ELEMENT: 'element-1' });
      mockDriver.click.resolves();

      const start = Date.now();
      await checkWatchers(mockDriver, store);
      const elapsed = Date.now() - start;

      // Should have waited at least 100ms
      expect(elapsed).to.be.at.least(100);
    });

    it('should continue to next watcher if action click fails', async function () {
      store.add({
        name: 'watcher1',
        referenceLocator: { using: 'id', value: 'popup1' },
        actionLocator: { using: 'id', value: 'close1' },
        duration: 30000,
      });

      store.add({
        name: 'watcher2',
        referenceLocator: { using: 'id', value: 'popup2' },
        actionLocator: { using: 'id', value: 'close2' },
        duration: 30000,
      });

      mockDriver.findElement.resolves({ ELEMENT: 'element-1' });
      mockDriver.click.onFirstCall().rejects(new Error('Click failed'));
      mockDriver.click.onSecondCall().resolves();

      await checkWatchers(mockDriver, store);

      // Should attempt both watchers
      expect(mockDriver.click.callCount).to.equal(2);

      // First watcher should not be counted as triggered
      const watcher1 = store.get('watcher1');
      expect(watcher1.triggerCount).to.equal(0);

      // Second watcher should be counted
      const watcher2 = store.get('watcher2');
      expect(watcher2.triggerCount).to.equal(1);
    });

    it('should not execute cooldown if click fails', async function () {
      store.add({
        name: 'test',
        referenceLocator: { using: 'id', value: 'popup' },
        actionLocator: { using: 'id', value: 'close' },
        duration: 30000,
        cooldownMs: 1000,
      });

      mockDriver.findElement.resolves({ ELEMENT: 'element-1' });
      mockDriver.click.rejects(new Error('Click failed'));

      const start = Date.now();
      await checkWatchers(mockDriver, store);
      const elapsed = Date.now() - start;

      // Should not have waited for cooldown
      expect(elapsed).to.be.below(500);
    });

    it('should handle multiple watchers triggering sequentially', async function () {
      this.timeout(5000);

      store.add({
        name: 'watcher1',
        referenceLocator: { using: 'id', value: 'popup1' },
        actionLocator: { using: 'id', value: 'close1' },
        duration: 30000,
        cooldownMs: 50,
      });

      store.add({
        name: 'watcher2',
        referenceLocator: { using: 'id', value: 'popup2' },
        actionLocator: { using: 'id', value: 'close2' },
        duration: 30000,
        cooldownMs: 50,
      });

      mockDriver.findElement.resolves({ ELEMENT: 'element-1' });
      mockDriver.click.resolves();

      const start = Date.now();
      await checkWatchers(mockDriver, store);
      const elapsed = Date.now() - start;

      // Should have waited for both cooldowns (50ms + 50ms = 100ms minimum)
      expect(elapsed).to.be.at.least(100);

      // Both should be triggered
      expect(store.get('watcher1').triggerCount).to.equal(1);
      expect(store.get('watcher2').triggerCount).to.equal(1);
    });
  });
});
