/**
 * Platform suggestions evaluation logic
 */

import type { PlatformSuggestion } from '../types'
import type { TriggeredSuggestion } from './types'

/**
 * Evaluates all suggestions for a platform against the content area
 */
export function evaluatePlatformSuggestions(
  suggestions: PlatformSuggestion[],
  contentArea: Element,
): TriggeredSuggestion[] {
  const results: TriggeredSuggestion[] = []

  for (const suggestion of suggestions) {
    const { id, name, description, missingSelector, presentSelector, validate } = suggestion
    let triggered = false

    // Check missingSelector - triggers if element is NOT found
    if (missingSelector) {
      try {
        if (!contentArea.querySelector(missingSelector)) triggered = true
      } catch {
        // Invalid selector
      }
    }

    // Check presentSelector - triggers if element IS found (anti-pattern)
    if (presentSelector && !triggered) {
      try {
        if (contentArea.querySelector(presentSelector)) triggered = true
      } catch {
        // Invalid selector
      }
    }

    // Run custom validation
    if (validate && !triggered) {
      try {
        triggered = validate(contentArea)
      } catch {
        // Validation error
      }
    }

    if (triggered) {
      results.push({ id, name, description })
    }
  }

  return results
}
