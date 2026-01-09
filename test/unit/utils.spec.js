import { describe, it } from 'mocha';
import { expect } from 'chai';
import { extractElementId, W3C_ELEMENT_KEY } from '../../lib/utils.js';

describe('Utils', function () {
  describe('W3C_ELEMENT_KEY', function () {
    it('should be the correct W3C WebDriver element identifier', function () {
      expect(W3C_ELEMENT_KEY).to.equal('element-6066-11e4-a52e-4f735466cecf');
    });
  });

  describe('extractElementId', function () {
    describe('W3C format', function () {
      it('should extract element ID from W3C format', function () {
        const element = { [W3C_ELEMENT_KEY]: 'abc123' };
        expect(extractElementId(element)).to.equal('abc123');
      });

      it('should handle W3C format with additional properties', function () {
        const element = { [W3C_ELEMENT_KEY]: 'xyz789', someOther: 'prop' };
        expect(extractElementId(element)).to.equal('xyz789');
      });
    });

    describe('JSONWP format', function () {
      it('should extract element ID from JSONWP format', function () {
        const element = { ELEMENT: 'def456' };
        expect(extractElementId(element)).to.equal('def456');
      });

      it('should handle JSONWP format with additional properties', function () {
        const element = { ELEMENT: 'ghi012', someOther: 'prop' };
        expect(extractElementId(element)).to.equal('ghi012');
      });
    });

    describe('both formats present', function () {
      it('should prefer W3C format when both are present', function () {
        const element = { [W3C_ELEMENT_KEY]: 'w3c-id', ELEMENT: 'jsonwp-id' };
        expect(extractElementId(element)).to.equal('w3c-id');
      });
    });

    describe('direct string ID', function () {
      it('should return string ID directly', function () {
        expect(extractElementId('direct-string-id')).to.equal('direct-string-id');
      });

      it('should handle empty string', function () {
        expect(extractElementId('')).to.be.undefined;
      });
    });

    describe('null and undefined', function () {
      it('should return undefined for null', function () {
        expect(extractElementId(null)).to.be.undefined;
      });

      it('should return undefined for undefined', function () {
        expect(extractElementId(undefined)).to.be.undefined;
      });
    });

    describe('invalid inputs', function () {
      it('should return undefined for empty object', function () {
        expect(extractElementId({})).to.be.undefined;
      });

      it('should return undefined for object without element keys', function () {
        const element = { foo: 'bar', baz: 'qux' };
        expect(extractElementId(element)).to.be.undefined;
      });

      it('should return undefined for object with empty W3C value', function () {
        const element = { [W3C_ELEMENT_KEY]: '' };
        expect(extractElementId(element)).to.be.undefined;
      });

      it('should return undefined for object with empty JSONWP value', function () {
        const element = { ELEMENT: '' };
        expect(extractElementId(element)).to.be.undefined;
      });
    });
  });
});
