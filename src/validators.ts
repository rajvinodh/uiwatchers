/**
 * Validation functions for UI Watcher registration parameters
 */

/**
 * Maximum allowed duration for a watcher (60 seconds)
 */
const MAX_DURATION_MS = 60000;

/**
 * Valid Appium locator strategies
 */
const VALID_LOCATOR_STRATEGIES = [
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

/**
 * Validates a locator object
 * @param locator - The locator to validate
 * @param fieldName - Name of the field for error messages
 * @throws Error if locator is invalid
 */
export function validateLocator(locator: any, fieldName: string): void {
  // Check if locator exists
  if (!locator || typeof locator !== 'object') {
    throw new Error(`${fieldName} is required`);
  }

  // Check if 'using' field exists and is a string
  if (!locator.using) {
    throw new Error(`'using' is mandatory for ${fieldName}`);
  }

  if (typeof locator.using !== 'string') {
    throw new Error(`'using' must be string for ${fieldName} `);
  }

  // Check if 'value' field exists and is a string
  if (!locator.value) {
    throw new Error(`'value' is mandatory for ${fieldName}`);
  }

  if (typeof locator.value !== 'string') {
    throw new Error(`'value' must be string for ${fieldName} `);
  }

  // Validate locator strategy (case-insensitive)
  const strategy = locator.using.toLowerCase();
  if (!VALID_LOCATOR_STRATEGIES.includes(strategy)) {
    throw new Error(`Invalid locator strategy for ${fieldName}`);
  }
}

/**
 * Validates all watcher registration parameters
 * @param params - Watcher registration parameters
 * @throws Error if any validation rule fails
 */
export function validateWatcherParams(params: any): void {
  // Check if params exists
  if (!params || typeof params !== 'object') {
    throw new Error('Invalid watcher parameters');
  }

  // Validate required field: name
  if (!params.name) {
    throw new Error('UIWatcher name is required');
  }

  if (typeof params.name !== 'string') {
    throw new Error('UIWatcher name must be string type');
  }

  if (params.name.trim() === '') {
    throw new Error('UIWatcher name is empty');
  }

  // Validate required field: referenceLocator
  if (!params.referenceLocator) {
    throw new Error('UIWatcher referenceLocator is required');
  }
  validateLocator(params.referenceLocator, 'referenceLocator');

  // Validate required field: actionLocator
  if (!params.actionLocator) {
    throw new Error('UIWatcher actionLocator is required');
  }
  validateLocator(params.actionLocator, 'actionLocator');

  // Validate required field: duration
  if (params.duration === undefined || params.duration === null) {
    throw new Error('UIWatcher duration is required');
  }

  if (typeof params.duration !== 'number' || params.duration <= 0) {
    throw new Error('UIWatcher duration must be a positive number');
  }

  if (params.duration > MAX_DURATION_MS) {
    throw new Error('UIWatcher duration must be ≤ 60 seconds');
  }

  // Validate optional field: priority (if provided)
  if (params.priority !== undefined && params.priority !== null) {
    if (typeof params.priority !== 'number') {
      throw new Error('UIWatcher priority must be a number');
    }
  }

  // Validate optional field: stopOnFound (if provided)
  if (params.stopOnFound !== undefined && params.stopOnFound !== null) {
    if (typeof params.stopOnFound !== 'boolean') {
      throw new Error('UIWatcher stopOnFound must be a boolean');
    }
  }

  // Validate optional field: cooldownMs (if provided)
  if (params.cooldownMs !== undefined && params.cooldownMs !== null) {
    if (typeof params.cooldownMs !== 'number') {
      throw new Error('UIWatcher cooldownMs must be a number');
    }

    if (params.cooldownMs < 0) {
      throw new Error('UIWatcher cooldownMs must be ≥ 0');
    }
  }
}
