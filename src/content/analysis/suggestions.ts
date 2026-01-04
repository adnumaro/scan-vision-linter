/**
 * Platform-specific suggestions engine
 * Suggestions are informative only - they do NOT affect the score
 */

import type { PlatformSuggestion, TriggeredSuggestion } from '../../types/messages'

// Re-export for convenience
export type { PlatformSuggestion, TriggeredSuggestion } from '../../types/messages'

/**
 * Result of evaluating a suggestion (internal)
 */
interface SuggestionEvalResult extends TriggeredSuggestion {
  triggered: boolean
}

/**
 * Evaluates a single suggestion against the content area
 */
function evaluateSuggestion(
  suggestion: PlatformSuggestion,
  contentArea: Element,
): SuggestionEvalResult {
  const { id, name, description, missingSelector, presentSelector, validate } = suggestion

  let triggered = false

  // Check missingSelector - triggers if element is NOT found
  if (missingSelector) {
    try {
      const found = contentArea.querySelector(missingSelector)
      if (!found) {
        triggered = true
      }
    } catch {
      // Invalid selector, skip
    }
  }

  // Check presentSelector - triggers if element IS found (anti-pattern)
  if (presentSelector && !triggered) {
    try {
      const found = contentArea.querySelector(presentSelector)
      if (found) {
        triggered = true
      }
    } catch {
      // Invalid selector, skip
    }
  }

  // Run custom validation if provided and selectors didn't determine result
  if (validate && !triggered) {
    try {
      triggered = validate(contentArea)
    } catch {
      // Validation error, don't trigger
    }
  }

  return { id, name, description, triggered }
}

/**
 * Evaluates all suggestions for a platform against the content area
 * Returns only triggered suggestions
 */
export function evaluatePlatformSuggestions(
  suggestions: PlatformSuggestion[],
  contentArea: Element,
): TriggeredSuggestion[] {
  const results: TriggeredSuggestion[] = []

  for (const suggestion of suggestions) {
    const result = evaluateSuggestion(suggestion, contentArea)
    if (result.triggered) {
      // Only return the fields needed for display (not the triggered boolean)
      results.push({
        id: result.id,
        name: result.name,
        description: result.description,
      })
    }
  }

  return results
}
