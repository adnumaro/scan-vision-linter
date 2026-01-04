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
 */
const DANGEROUS_CSS_PATTERNS = [
  /expression\s*\(/gi, // IE expression()
  /javascript\s*:/gi, // javascript: URLs
  /behavior\s*:/gi, // IE behavior
  /@import/gi, // External imports
  /url\s*\(\s*['"]?data:/gi, // data: URLs
]

/**
 * Characters that should not appear in CSS selectors
 * These could be used to break out of selector context and inject arbitrary CSS
 */
const DANGEROUS_SELECTOR_CHARS = /[{};<>]/

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

  for (const pattern of DANGEROUS_CSS_PATTERNS) {
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
  return !DANGEROUS_CSS_PATTERNS.some((pattern) => pattern.test(css))
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
