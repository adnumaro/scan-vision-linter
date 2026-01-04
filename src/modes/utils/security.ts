/**
 * Security utilities for CSS sanitization
 */

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
 * Sanitizes CSS to remove potentially dangerous patterns
 * Used for additionalCSS in platform presets
 */
export function sanitizeCSS(css: string | undefined): string {
  if (!css) return ''

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
  return !DANGEROUS_CSS_PATTERNS.some((pattern) => pattern.test(css))
}
