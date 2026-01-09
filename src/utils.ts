/**
 * Utility functions for UI Watchers Plugin
 */

/**
 * W3C WebDriver Element Identifier key
 * This is the standard key used in W3C WebDriver protocol to identify elements
 */
export const W3C_ELEMENT_KEY = 'element-6066-11e4-a52e-4f735466cecf';

/**
 * Element object type that supports both W3C and JSONWP formats
 */
export interface ElementObject {
  ELEMENT?: string;
  [W3C_ELEMENT_KEY]?: string;
}

/**
 * Extract element ID from element object
 * Handles W3C format, JSONWP format, and direct string IDs
 *
 * @param element - Element object or string ID
 * @returns The element ID string, or undefined if not found
 */
export function extractElementId(
  element: ElementObject | string | null | undefined
): string | undefined {
  if (!element) return undefined;

  // Direct string ID
  if (typeof element === 'string') {
    return element;
  }

  // W3C format
  if (element[W3C_ELEMENT_KEY]) {
    return element[W3C_ELEMENT_KEY];
  }

  // JSONWP format
  if (element.ELEMENT) {
    return element.ELEMENT;
  }

  return undefined;
}
