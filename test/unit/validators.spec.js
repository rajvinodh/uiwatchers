import { describe, it } from 'mocha';
import { expect } from 'chai';
import { validateWatcherParams, validateLocator } from '../../lib/validators.js';

describe('Validators', function () {
  describe('validateLocator', function () {
    it('should pass for valid locator', function () {
      const validLocator = { using: 'id', value: 'com.app:id/button' };
      expect(() => validateLocator(validLocator, 'testLocator')).to.not.throw();
    });

    it('should throw error if locator is null', function () {
      expect(() => validateLocator(null, 'testLocator')).to.throw('testLocator is required');
    });

    it('should throw error if locator is undefined', function () {
      expect(() => validateLocator(undefined, 'testLocator')).to.throw('testLocator is required');
    });

    it('should throw error if locator is not an object', function () {
      expect(() => validateLocator('invalid', 'testLocator')).to.throw('testLocator is required');
    });

    it('should throw error if using field is missing', function () {
      const locator = { value: 'test' };
      expect(() => validateLocator(locator, 'testLocator')).to.throw(
        "'using' is mandatory for testLocator"
      );
    });

    it('should throw error if value field is missing', function () {
      const locator = { using: 'id' };
      expect(() => validateLocator(locator, 'testLocator')).to.throw(
        "'value' is mandatory for testLocator"
      );
    });

    it('should throw error if using is not a string', function () {
      const locator = { using: 123, value: 'test' };
      expect(() => validateLocator(locator, 'testLocator')).to.throw(
        "'using' must be string for testLocator"
      );
    });

    it('should throw error if value is not a string', function () {
      const locator = { using: 'id', value: 123 };
      expect(() => validateLocator(locator, 'testLocator')).to.throw(
        "'value' must be string for testLocator"
      );
    });

    it('should throw error for invalid locator strategy', function () {
      const locator = { using: 'invalid-strategy', value: 'test' };
      expect(() => validateLocator(locator, 'testLocator')).to.throw(
        'Invalid locator strategy for testLocator'
      );
    });

    it('should accept all valid locator strategies', function () {
      const strategies = [
        'id',
        'accessibility id',
        'class name',
        'xpath',
        'name',
        '-android uiautomator',
        '-ios predicate string',
        '-ios class chain',
        'css selector',
      ];

      strategies.forEach((strategy) => {
        const locator = { using: strategy, value: 'test' };
        expect(() => validateLocator(locator, 'testLocator')).to.not.throw();
      });
    });

    it('should be case-insensitive for locator strategies', function () {
      const locator = { using: 'ID', value: 'test' };
      expect(() => validateLocator(locator, 'testLocator')).to.not.throw();
    });
  });

  describe('validateWatcherParams', function () {
    const validParams = {
      name: 'test-watcher',
      referenceLocator: { using: 'id', value: 'popup' },
      actionLocator: { using: 'id', value: 'close' },
      duration: 30000,
    };

    it('should pass for valid watcher params', function () {
      expect(() => validateWatcherParams(validParams)).to.not.throw();
    });

    it('should throw error if params is null', function () {
      expect(() => validateWatcherParams(null)).to.throw('Invalid watcher parameters');
    });

    it('should throw error if params is undefined', function () {
      expect(() => validateWatcherParams(undefined)).to.throw('Invalid watcher parameters');
    });

    it('should throw error if name is missing', function () {
      const params = { ...validParams };
      delete params.name;
      expect(() => validateWatcherParams(params)).to.throw('UIWatcher name is required');
    });

    it('should throw error if name is empty string', function () {
      const params = { ...validParams, name: '' };
      expect(() => validateWatcherParams(params)).to.throw('UIWatcher name is required');
    });

    it('should throw error if name is whitespace only', function () {
      const params = { ...validParams, name: '   ' };
      expect(() => validateWatcherParams(params)).to.throw('UIWatcher name is empty');
    });

    it('should throw error if referenceLocator is missing', function () {
      const params = { ...validParams };
      delete params.referenceLocator;
      expect(() => validateWatcherParams(params)).to.throw(
        'UIWatcher referenceLocator is required'
      );
    });

    it('should throw error if actionLocator is missing', function () {
      const params = { ...validParams };
      delete params.actionLocator;
      expect(() => validateWatcherParams(params)).to.throw('UIWatcher actionLocator is required');
    });

    it('should throw error if duration is missing', function () {
      const params = { ...validParams };
      delete params.duration;
      expect(() => validateWatcherParams(params)).to.throw('UIWatcher duration is required');
    });

    it('should throw error if duration is 0', function () {
      const params = { ...validParams, duration: 0 };
      expect(() => validateWatcherParams(params)).to.throw(
        'UIWatcher duration must be a positive number'
      );
    });

    it('should throw error if duration is negative', function () {
      const params = { ...validParams, duration: -1000 };
      expect(() => validateWatcherParams(params)).to.throw(
        'UIWatcher duration must be a positive number'
      );
    });

    it('should throw error if duration > 60000', function () {
      const params = { ...validParams, duration: 60001 };
      expect(() => validateWatcherParams(params)).to.throw(
        'UIWatcher duration must be ≤ 60 seconds'
      );
    });

    it('should accept duration = 60000', function () {
      const params = { ...validParams, duration: 60000 };
      expect(() => validateWatcherParams(params)).to.not.throw();
    });

    it('should throw error if priority is not a number', function () {
      const params = { ...validParams, priority: 'high' };
      expect(() => validateWatcherParams(params)).to.throw('UIWatcher priority must be a number');
    });

    it('should accept negative priority values', function () {
      const params = { ...validParams, priority: -10 };
      expect(() => validateWatcherParams(params)).to.not.throw();
    });

    it('should throw error if stopOnFound is not a boolean', function () {
      const params = { ...validParams, stopOnFound: 'true' };
      expect(() => validateWatcherParams(params)).to.throw(
        'UIWatcher stopOnFound must be a boolean'
      );
    });

    it('should accept stopOnFound as true or false', function () {
      const params1 = { ...validParams, stopOnFound: true };
      const params2 = { ...validParams, stopOnFound: false };
      expect(() => validateWatcherParams(params1)).to.not.throw();
      expect(() => validateWatcherParams(params2)).to.not.throw();
    });

    it('should throw error if cooldownMs is not a number', function () {
      const params = { ...validParams, cooldownMs: '5000' };
      expect(() => validateWatcherParams(params)).to.throw('UIWatcher cooldownMs must be a number');
    });

    it('should throw error if cooldownMs is negative', function () {
      const params = { ...validParams, cooldownMs: -100 };
      expect(() => validateWatcherParams(params)).to.throw('UIWatcher cooldownMs must be ≥ 0');
    });

    it('should accept cooldownMs = 0', function () {
      const params = { ...validParams, cooldownMs: 0 };
      expect(() => validateWatcherParams(params)).to.not.throw();
    });

    it('should accept all valid optional parameters', function () {
      const params = {
        ...validParams,
        priority: 10,
        stopOnFound: true,
        cooldownMs: 5000,
      };
      expect(() => validateWatcherParams(params)).to.not.throw();
    });
  });
});
