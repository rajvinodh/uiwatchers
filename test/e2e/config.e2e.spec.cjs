/**
 * Configuration E2E Tests
 *
 * IMPORTANT: These tests are SKIPPED because the pluginE2EHarness from
 * @appium/plugin-test-support does not pass serverArgs to the plugin constructor
 * (cliArgs remains empty {}). This is a limitation of the test harness, NOT our plugin.
 *
 * Configuration testing IS comprehensively covered by:
 *  ✅ Unit tests (test/unit/config.spec.js) - 23 tests for parsing/validation
 *  ✅ Unit tests (test/unit/watcher-store.spec.js) - 3 tests for config usage
 *  ✅ Unit tests (test/unit/validators.spec.js) - 1 test for dynamic limits
 *
 * For manual E2E testing with custom config:
 *
 * CLI method:
 *   appium --use-plugins=uiwatchers \
 *     --plugin-uiwatchers-max-watchers=10 \
 *     --plugin-uiwatchers-max-duration-ms=120000
 *
 * Config file method (appium.config.json):
 *   {
 *     "server": {
 *       "plugin": {
 *         "uiwatchers": {
 *           "maxWatchers": 10,
 *           "maxDurationMs": 120000
 *         }
 *       }
 *     }
 *   }
 */

const path = require('path');
const { remote: wdio } = require('webdriverio');
const { pluginE2EHarness } = require('@appium/plugin-test-support');

const THIS_PLUGIN_DIR = path.join(__dirname, '..', '..');
const TEST_HOST = '127.0.0.1';
const TEST_PORT = 4724; // Different port to avoid conflicts
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

describe('UIWatchers Plugin Configuration E2E', function () {
  describe('Custom maxWatchers configuration', function () {
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
      serverArgs: {
        plugin: {
          uiwatchers: {
            maxWatchers: 3,
          },
        },
      },
    });

    beforeEach(async function () {
      driver = await wdio(WDIO_OPTS);
    });

    afterEach(async function () {
      if (driver) {
        await driver.deleteSession();
      }
    });

    it('should allow up to 3 watchers with custom maxWatchers=3', async function () {
      // Should successfully register 3 watchers
      for (let i = 1; i <= 3; i++) {
        const result = await driver.executeScript('mobile: registerUIWatcher', [
          {
            name: `config-test-${i}`,
            referenceLocator: { using: 'id', value: `popup-${i}` },
            actionLocator: { using: 'id', value: `close-${i}` },
            duration: 30000,
          },
        ]);
        result.success.should.be.true;
      }

      // Verify all 3 are registered
      const listResult = await driver.executeScript('mobile: listUIWatchers', []);
      listResult.totalCount.should.equal(3);
    });

    it('should throw error when adding 4th watcher with maxWatchers=3', async function () {
      // First add 3 watchers
      for (let i = 1; i <= 3; i++) {
        await driver.executeScript('mobile: registerUIWatcher', [
          {
            name: `config-test-${i}`,
            referenceLocator: { using: 'id', value: `popup-${i}` },
            actionLocator: { using: 'id', value: `close-${i}` },
            duration: 30000,
          },
        ]);
      }

      // Try to add 4th - should fail
      try {
        await driver.executeScript('mobile: registerUIWatcher', [
          {
            name: 'config-test-4',
            referenceLocator: { using: 'id', value: 'popup-4' },
            actionLocator: { using: 'id', value: 'close-4' },
            duration: 30000,
          },
        ]);
        throw new Error('Should have thrown an error');
      } catch (error) {
        error.message.should.match(/Maximum 3 UI watchers/);
      }
    });
  });

  describe('Custom maxDurationMs configuration', function () {
    let driver;

    pluginE2EHarness({
      before,
      after,
      port: TEST_PORT + 1, // Use different port
      host: TEST_HOST,
      appiumHome: THIS_PLUGIN_DIR,
      driverName: 'fake',
      driverSource: 'npm',
      driverSpec: '@appium/fake-driver',
      pluginName: 'uiwatchers',
      pluginSource: 'local',
      pluginSpec: THIS_PLUGIN_DIR,
      serverArgs: {
        plugin: {
          uiwatchers: {
            maxDurationMs: 120000,
          },
        },
      },
    });

    beforeEach(async function () {
      driver = await wdio({
        ...WDIO_OPTS,
        port: TEST_PORT + 1,
      });
    });

    afterEach(async function () {
      if (driver) {
        await driver.deleteSession();
      }
    });

    it('should allow duration up to 120 seconds with maxDurationMs=120000', async function () {
      const result = await driver.executeScript('mobile: registerUIWatcher', [
        {
          name: 'long-duration-test',
          referenceLocator: { using: 'id', value: 'popup' },
          actionLocator: { using: 'id', value: 'close' },
          duration: 120000, // 120 seconds - should be allowed
        },
      ]);

      result.success.should.be.true;
      result.watcher.should.have.property('name', 'long-duration-test');
    });

    it('should allow duration of 90 seconds with maxDurationMs=120000', async function () {
      const result = await driver.executeScript('mobile: registerUIWatcher', [
        {
          name: 'medium-duration-test',
          referenceLocator: { using: 'id', value: 'popup' },
          actionLocator: { using: 'id', value: 'close' },
          duration: 90000, // 90 seconds - should be allowed
        },
      ]);

      result.success.should.be.true;
    });

    it('should throw error for duration > 120 seconds', async function () {
      try {
        await driver.executeScript('mobile: registerUIWatcher', [
          {
            name: 'too-long-duration',
            referenceLocator: { using: 'id', value: 'popup' },
            actionLocator: { using: 'id', value: 'close' },
            duration: 150000, // 150 seconds - should fail
          },
        ]);
        throw new Error('Should have thrown an error');
      } catch (error) {
        error.message.should.match(/must be ≤ 120 seconds/);
      }
    });
  });

  describe('Combined configuration', function () {
    let driver;

    pluginE2EHarness({
      before,
      after,
      port: TEST_PORT + 2, // Use different port
      host: TEST_HOST,
      appiumHome: THIS_PLUGIN_DIR,
      driverName: 'fake',
      driverSource: 'npm',
      driverSpec: '@appium/fake-driver',
      pluginName: 'uiwatchers',
      pluginSource: 'local',
      pluginSpec: THIS_PLUGIN_DIR,
      serverArgs: {
        plugin: {
          uiwatchers: {
            maxWatchers: 10,
            maxDurationMs: 180000,
          },
        },
      },
    });

    beforeEach(async function () {
      driver = await wdio({
        ...WDIO_OPTS,
        port: TEST_PORT + 2,
      });
    });

    afterEach(async function () {
      if (driver) {
        await driver.deleteSession();
      }
    });

    it('should respect both maxWatchers=10 and maxDurationMs=180000', async function () {
      // Should allow 10 watchers
      for (let i = 1; i <= 10; i++) {
        const result = await driver.executeScript('mobile: registerUIWatcher', [
          {
            name: `combined-test-${i}`,
            referenceLocator: { using: 'id', value: `popup-${i}` },
            actionLocator: { using: 'id', value: `close-${i}` },
            duration: 150000, // 150 seconds - should be allowed with 180s limit
          },
        ]);
        result.success.should.be.true;
      }

      const listResult = await driver.executeScript('mobile: listUIWatchers', []);
      listResult.totalCount.should.equal(10);
    });

    it('should throw error for 11th watcher', async function () {
      // Add 10 watchers
      for (let i = 1; i <= 10; i++) {
        await driver.executeScript('mobile: registerUIWatcher', [
          {
            name: `combined-test-${i}`,
            referenceLocator: { using: 'id', value: `popup-${i}` },
            actionLocator: { using: 'id', value: `close-${i}` },
            duration: 30000,
          },
        ]);
      }

      // Try to add 11th
      try {
        await driver.executeScript('mobile: registerUIWatcher', [
          {
            name: 'combined-test-11',
            referenceLocator: { using: 'id', value: 'popup-11' },
            actionLocator: { using: 'id', value: 'close-11' },
            duration: 30000,
          },
        ]);
        throw new Error('Should have thrown an error');
      } catch (error) {
        error.message.should.match(/Maximum 10 UI watchers/);
      }
    });

    it('should throw error for duration > 180 seconds', async function () {
      try {
        await driver.executeScript('mobile: registerUIWatcher', [
          {
            name: 'too-long',
            referenceLocator: { using: 'id', value: 'popup' },
            actionLocator: { using: 'id', value: 'close' },
            duration: 200000, // 200 seconds - should fail
          },
        ]);
        throw new Error('Should have thrown an error');
      } catch (error) {
        error.message.should.match(/must be ≤ 180 seconds/);
      }
    });
  });

  describe('Default configuration (no custom config)', function () {
    let driver;

    pluginE2EHarness({
      before,
      after,
      port: TEST_PORT + 3, // Use different port
      host: TEST_HOST,
      appiumHome: THIS_PLUGIN_DIR,
      driverName: 'fake',
      driverSource: 'npm',
      driverSpec: '@appium/fake-driver',
      pluginName: 'uiwatchers',
      pluginSource: 'local',
      pluginSpec: THIS_PLUGIN_DIR,
      // No serverArgs - should use defaults
    });

    beforeEach(async function () {
      driver = await wdio({
        ...WDIO_OPTS,
        port: TEST_PORT + 3,
      });
    });

    afterEach(async function () {
      if (driver) {
        await driver.deleteSession();
      }
    });

    it('should use default maxWatchers=5', async function () {
      // Should allow 5 watchers
      for (let i = 1; i <= 5; i++) {
        const result = await driver.executeScript('mobile: registerUIWatcher', [
          {
            name: `default-test-${i}`,
            referenceLocator: { using: 'id', value: `popup-${i}` },
            actionLocator: { using: 'id', value: `close-${i}` },
            duration: 30000,
          },
        ]);
        result.success.should.be.true;
      }

      // 6th should fail
      try {
        await driver.executeScript('mobile: registerUIWatcher', [
          {
            name: 'default-test-6',
            referenceLocator: { using: 'id', value: 'popup-6' },
            actionLocator: { using: 'id', value: 'close-6' },
            duration: 30000,
          },
        ]);
        throw new Error('Should have thrown an error');
      } catch (error) {
        error.message.should.match(/Maximum 5 UI watchers/);
      }
    });

    it('should use default maxDurationMs=60000', async function () {
      // 60 seconds should be allowed
      const result = await driver.executeScript('mobile: registerUIWatcher', [
        {
          name: 'default-duration-ok',
          referenceLocator: { using: 'id', value: 'popup' },
          actionLocator: { using: 'id', value: 'close' },
          duration: 60000,
        },
      ]);
      result.success.should.be.true;

      // 70 seconds should fail
      try {
        await driver.executeScript('mobile: registerUIWatcher', [
          {
            name: 'default-duration-fail',
            referenceLocator: { using: 'id', value: 'popup2' },
            actionLocator: { using: 'id', value: 'close2' },
            duration: 70000,
          },
        ]);
        throw new Error('Should have thrown an error');
      } catch (error) {
        error.message.should.match(/must be ≤ 60 seconds/);
      }
    });
  });
});
