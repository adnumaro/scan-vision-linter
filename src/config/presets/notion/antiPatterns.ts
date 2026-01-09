/**
 * Notion-specific anti-patterns
 * These patterns detect Notion-specific formatting issues
 */

import type { AntiPattern } from '../../types'

export const NOTION_ANTI_PATTERNS: AntiPattern[] = [
  // Notion commands in plain text (user forgot to execute)
  {
    pattern: /\/[a-z]{2,}(?:\s|$)/,
    type: 'command',
    description: 'Notion slash command in plain text',
  },
  // @mentions not properly linked
  {
    pattern: /@[a-zA-Z][a-zA-Z0-9._-]+(?!\])/,
    type: 'mention',
    description: 'Unlinked @mention',
  },
]
