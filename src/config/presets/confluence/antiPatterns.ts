/**
 * Confluence-specific anti-patterns
 * These patterns detect Confluence-specific code and formatting issues
 */

import type { AntiPattern } from '../../types'

export const CONFLUENCE_ANTI_PATTERNS: AntiPattern[] = [
  // @mentions that aren't properly linked
  {
    pattern: /@[a-zA-Z][a-zA-Z0-9._-]+(?!\])/,
    type: 'mention',
    description: 'Unlinked @mention',
  },
  // Jira issue keys not linked (e.g., PROJ-123)
  {
    pattern: /\b[A-Z]{2,10}-\d{1,6}\b(?![^[]*\])/,
    type: 'jira-key',
    description: 'Unlinked Jira issue key',
  },
]
