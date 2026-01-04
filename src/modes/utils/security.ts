/**
 * Security utilities for CSS sanitization
 */

/**
 * Maximum allowed CSS length to prevent ReDoS attacks
 */
const MAX_CSS_LENGTH = 50000

/**
 * Maximum allowed selector length
 */
const MAX_SELECTOR_LENGTH = 500

/**
 * Patterns that could be used for CSS-based attacks
 * - expression() - IE-specific JavaScript execution
 * - javascript: - JavaScript URL protocol
 * - behavior: - IE behavior extension
 * - @import - External stylesheet imports (could load malicious CSS)
 * - data: URLs - Could be abused for attacks in some contexts
 *
 * NOTE: These are pattern strings, not RegExp objects with global flag.
 * This avoids issues with lastIndex state when reusing regex objects.
 * The actual RegExp is created fresh for each check in the helper functions below.
 */
const DANGEROUS_CSS_PATTERN_SOURCES = [
  { source: 'expression\\s*\\(', flags: 'i' }, // IE expression()
  { source: 'javascript\\s*:', flags: 'i' }, // javascript: URLs
  { source: 'behavior\\s*:', flags: 'i' }, // IE behavior
  { source: '@import', flags: 'i' }, // External imports
  { source: 'url\\s*\\(\\s*[\'"]?data:', flags: 'i' }, // data: URLs
] as const

/**
 * Creates a fresh RegExp from pattern definition
 * This avoids lastIndex issues with reused global regex objects
 */
function createPattern(pattern: (typeof DANGEROUS_CSS_PATTERN_SOURCES)[number]): RegExp {
  return new RegExp(pattern.source, `${pattern.flags}g`)
}

/**
 * Characters that should not appear in CSS selectors
 * These could be used to break out of selector context and inject arbitrary CSS
 * Note: '>' is allowed as it's a valid CSS child combinator
 */
const DANGEROUS_SELECTOR_CHARS = /[{};<]/

/**
 * Sanitizes CSS to remove potentially dangerous patterns
 * Used for additionalCSS in platform presets
 */
export function sanitizeCSS(css: string | undefined): string {
  if (!css) return ''

  // Limit length to prevent ReDoS
  if (css.length > MAX_CSS_LENGTH) {
    console.warn('[ScanVision] CSS exceeds maximum length, truncating')
    css = css.slice(0, MAX_CSS_LENGTH)
  }

  let sanitized = css

  // Create fresh regex for each pattern to avoid lastIndex issues
  for (const patternDef of DANGEROUS_CSS_PATTERN_SOURCES) {
    const pattern = createPattern(patternDef)
    sanitized = sanitized.replace(pattern, '/* blocked */')
  }

  return sanitized
}

/**
 * Validates that a string contains only safe CSS
 * Returns true if safe, false if dangerous patterns detected
 */
export function isValidCSS(css: string): boolean {
  if (css.length > MAX_CSS_LENGTH) return false
  // Create fresh regex for each check to avoid lastIndex state issues
  return !DANGEROUS_CSS_PATTERN_SOURCES.some((patternDef) => {
    const pattern = createPattern(patternDef)
    return pattern.test(css)
  })
}

/**
 * Validates a CSS selector to ensure it's safe to use
 * Checks for:
 * - Valid selector syntax (can be parsed by browser)
 * - No dangerous characters that could inject CSS
 * - Reasonable length
 *
 * @returns true if selector is safe, false otherwise
 */
export function isValidSelector(selector: string): boolean {
  // Empty or whitespace-only selectors are invalid
  if (!selector || !selector.trim()) {
    return false
  }

  // Check length
  if (selector.length > MAX_SELECTOR_LENGTH) {
    return false
  }

  // Check for dangerous characters that could break out of selector context
  if (DANGEROUS_SELECTOR_CHARS.test(selector)) {
    return false
  }

  // Try to parse the selector - browser will throw if invalid
  try {
    document.querySelector(selector)
    return true
  } catch {
    return false
  }
}

/**
 * Sanitizes a CSS selector by validating it
 * Returns the selector if valid, empty string if invalid
 */
export function sanitizeSelector(selector: string): string {
  return isValidSelector(selector) ? selector.trim() : ''
}

/**
 * Sanitizes an array of CSS selectors
 * Filters out invalid selectors and returns only safe ones
 */
export function sanitizeSelectors(selectors: string[]): string[] {
  return selectors.map((s) => s.trim()).filter(isValidSelector)
}
