const path = require('path');
const { remote: wdio } = require('webdriverio');
const { pluginE2EHarness } = require('@appium/plugin-test-support');

const THIS_PLUGIN_DIR = path.join(__dirname, '..', '..');
const TEST_HOST = '127.0.0.1';
const TEST_PORT = 4723;
const TEST_FAKE_APP = path.join(
  THIS_PLUGIN_DIR,
  'node_modules',
  '@appium',
  'fake-driver',
  'test',
  'fixtures',
  'app.xml'
);

const TEST_CAPS = {
  platformName: 'Fake',
  'appium:automationName': 'Fake',
  'appium:deviceName': 'Fake',
  'appium:app': TEST_FAKE_APP,
};

const WDIO_OPTS = {
  hostname: TEST_HOST,
  port: TEST_PORT,
  connectionRetryCount: 0,
  capabilities: TEST_CAPS,
};

describe('UIWatchers Plugin E2E', function () {
  let driver;

  pluginE2EHarness({
    before,
    after,
    port: TEST_PORT,
    host: TEST_HOST,
    appiumHome: THIS_PLUGIN_DIR,
    driverName: 'fake',
    driverSource: 'npm',
    driverSpec: '@appium/fake-driver',
    pluginName: 'uiwatchers',
    pluginSource: 'local',
    pluginSpec: THIS_PLUGIN_DIR,
  });

  beforeEach(async function () {
    driver = await wdio(WDIO_OPTS);
  });

  afterEach(async function () {
    if (driver) {
      await driver.deleteSession();
    }
  });

  describe('Plugin activation', function () {
    it('should start session with plugin active', async function () {
      const session = await driver.getSession();
      session.should.exist;
    });
  });

  describe('mobile: registerUIWatcher', function () {
    it('should register a new watcher successfully', async function () {
      const result = await driver.executeScript('mobile: registerUIWatcher', [
        {
          name: 'test-watcher',
          referenceLocator: { using: 'id', value: 'popup' },
          actionLocator: { using: 'id', value: 'close' },
          duration: 30000,
        },
      ]);

      result.should.have.property('success', true);
      result.should.have.property('watcher');
      result.watcher.should.have.property('name', 'test-watcher');
      result.watcher.should.have.property('priority', 0);
      result.watcher.should.have.property('status', 'active');
    });

    it('should register watcher with optional parameters', async function () {
      const result = await driver.executeScript('mobile: registerUIWatcher', [
        {
          name: 'priority-watcher',
          referenceLocator: { using: 'id', value: 'banner' },
          actionLocator: { using: 'id', value: 'dismiss' },
          duration: 60000,
          priority: 10,
          stopOnFound: true,
          cooldownMs: 5000,
        },
      ]);

      result.should.have.property('success', true);
      result.watcher.should.have.property('priority', 10);
    });

    it('should throw error for duration > 60000', async function () {
      try {
        await driver.executeScript('mobile: registerUIWatcher', [
          {
            name: 'long-duration',
            referenceLocator: { using: 'id', value: 'popup' },
            actionLocator: { using: 'id', value: 'close' },
            duration: 70000,
          },
        ]);
        throw new Error('Should have thrown an error');
      } catch (error) {
        error.message.should.match(/60 seconds/);
      }
    });
  });

  describe('mobile: listUIWatchers', function () {
    beforeEach(async function () {
      // Clear any existing watchers
      await driver.executeScript('mobile: clearAllUIWatchers', []);

      // Register a few watchers
      await driver.executeScript('mobile: registerUIWatcher', [
        {
          name: 'list-test-1',
          referenceLocator: { using: 'id', value: 'popup1' },
          actionLocator: { using: 'id', value: 'close1' },
          duration: 30000,
          priority: 10,
        },
      ]);

      await driver.executeScript('mobile: registerUIWatcher', [
        {
          name: 'list-test-2',
          referenceLocator: { using: 'id', value: 'popup2' },
          actionLocator: { using: 'id', value: 'close2' },
          duration: 30000,
          priority: 5,
        },
      ]);
    });

    it('should list all registered watchers', async function () {
      const result = await driver.executeScript('mobile: listUIWatchers', []);

      result.should.have.property('success', true);
      result.should.have.property('watchers');
      result.should.have.property('totalCount');
      result.watchers.should.be.an('array');
      result.totalCount.should.be.at.least(2);
    });

    it('should include complete watcher state', async function () {
      const result = await driver.executeScript('mobile: listUIWatchers', []);

      const watcher = result.watchers.find((w) => w.name === 'list-test-1');
      watcher.should.exist;
      watcher.should.have.property('name');
      watcher.should.have.property('priority');
      watcher.should.have.property('referenceLocator');
      watcher.should.have.property('actionLocator');
      watcher.should.have.property('status');
      watcher.should.have.property('triggerCount');
    });
  });

  describe('mobile: unregisterUIWatcher', function () {
    beforeEach(async function () {
      await driver.executeScript('mobile: clearAllUIWatchers', []);
      await driver.executeScript('mobile: registerUIWatcher', [
        {
          name: 'to-remove',
          referenceLocator: { using: 'id', value: 'popup' },
          actionLocator: { using: 'id', value: 'close' },
          duration: 30000,
        },
      ]);
    });

    it('should unregister an existing watcher', async function () {
      const result = await driver.executeScript('mobile: unregisterUIWatcher', [
        { name: 'to-remove' },
      ]);

      result.should.have.property('success', true);
      result.should.have.property('removed', 'to-remove');

      // Verify it's actually removed
      const listResult = await driver.executeScript('mobile: listUIWatchers', []);
      const found = listResult.watchers.find((w) => w.name === 'to-remove');
      (found === undefined).should.be.true;
    });

    it('should throw error for non-existent watcher', async function () {
      try {
        await driver.executeScript('mobile: unregisterUIWatcher', [{ name: 'non-existent' }]);
        throw new Error('Should have thrown an error');
      } catch (error) {
        error.message.should.match(/not found/);
      }
    });
  });

  describe('mobile: clearAllUIWatchers', function () {
    beforeEach(async function () {
      await driver.executeScript('mobile: clearAllUIWatchers', []);
      await driver.executeScript('mobile: registerUIWatcher', [
        {
          name: 'clear-test-1',
          referenceLocator: { using: 'id', value: 'popup1' },
          actionLocator: { using: 'id', value: 'close1' },
          duration: 30000,
        },
      ]);

      await driver.executeScript('mobile: registerUIWatcher', [
        {
          name: 'clear-test-2',
          referenceLocator: { using: 'id', value: 'popup2' },
          actionLocator: { using: 'id', value: 'close2' },
          duration: 30000,
        },
      ]);
    });

    it('should clear all watchers', async function () {
      const result = await driver.executeScript('mobile: clearAllUIWatchers', []);

      result.should.have.property('success', true);
      result.should.have.property('removedCount');
      result.removedCount.should.be.at.least(2);

      // Verify all are removed
      const listResult = await driver.executeScript('mobile: listUIWatchers', []);
      listResult.totalCount.should.equal(0);
      listResult.watchers.should.be.empty;
    });
  });

  describe('mobile: disableUIWatchers / enableUIWatchers', function () {
    it('should disable watcher checking', async function () {
      const result = await driver.executeScript('mobile: disableUIWatchers', []);

      result.should.have.property('success', true);
      result.should.have.property('message');
      result.message.should.match(/disabled/);
    });

    it('should enable watcher checking', async function () {
      const result = await driver.executeScript('mobile: enableUIWatchers', []);

      result.should.have.property('success', true);
      result.should.have.property('message');
      result.message.should.match(/enabled/);
    });
  });

  describe('Maximum watcher limit', function () {
    beforeEach(async function () {
      await driver.executeScript('mobile: clearAllUIWatchers', []);
    });

    it('should allow up to 5 watchers', async function () {
      for (let i = 1; i <= 5; i++) {
        const result = await driver.executeScript('mobile: registerUIWatcher', [
          {
            name: `limit-test-${i}`,
            referenceLocator: { using: 'id', value: `popup-${i}` },
            actionLocator: { using: 'id', value: `close-${i}` },
            duration: 30000,
          },
        ]);
        result.success.should.be.true;
      }

      // Verify all 5 are registered
      const listResult = await driver.executeScript('mobile: listUIWatchers', []);
      listResult.totalCount.should.equal(5);
    });

    it('should throw error when adding 6th watcher', async function () {
      // First add 5 watchers
      for (let i = 1; i <= 5; i++) {
        await driver.executeScript('mobile: registerUIWatcher', [
          {
            name: `limit-test-${i}`,
            referenceLocator: { using: 'id', value: `popup-${i}` },
            actionLocator: { using: 'id', value: `close-${i}` },
            duration: 30000,
          },
        ]);
      }

      // Try to add 6th
      try {
        await driver.executeScript('mobile: registerUIWatcher', [
          {
            name: 'limit-test-6',
            referenceLocator: { using: 'id', value: 'popup-6' },
            actionLocator: { using: 'id', value: 'close-6' },
            duration: 30000,
          },
        ]);
        throw new Error('Should have thrown an error');
      } catch (error) {
        error.message.should.match(/Maximum 5/);
      }
    });
  });
});
