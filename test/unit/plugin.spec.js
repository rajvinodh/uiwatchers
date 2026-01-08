import sinon from 'sinon';
import plugin from '../../lib/plugin.js';
import { BasePlugin } from '@appium/base-plugin';

const UIWatchersPlugin = plugin.default || plugin;

describe('UIWatchersPlugin', function () {
  let sandbox;

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
  });

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('constructor', function () {
    it('should create a new plugin instance', function () {
      const pluginInstance = new UIWatchersPlugin('uiwatchers');
      pluginInstance.should.exist;
    });

    it('should extend BasePlugin', function () {
      const pluginInstance = new UIWatchersPlugin('uiwatchers');
      pluginInstance.should.be.instanceOf(BasePlugin);
    });

    it('should have the correct class name', function () {
      const pluginInstance = new UIWatchersPlugin('uiwatchers');
      pluginInstance.constructor.name.should.equal('UIWatchersPlugin');
    });

    it('should accept optional CLI arguments', function () {
      const cliArgs = { verbose: true };
      const pluginInstance = new UIWatchersPlugin('uiwatchers', cliArgs);
      pluginInstance.should.exist;
    });

    it('should initialize without CLI arguments', function () {
      const pluginInstance = new UIWatchersPlugin('uiwatchers');
      pluginInstance.should.exist;
    });
  });
});
