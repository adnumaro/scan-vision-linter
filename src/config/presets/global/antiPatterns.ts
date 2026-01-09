/**
 * Global anti-patterns for detecting unformatted code
 * These patterns apply to all platforms
 */

import type { AntiPattern } from '../../types'

export const GLOBAL_ANTI_PATTERNS: AntiPattern[] = [
  // Terminal commands
  {
    pattern: /\bcurl\s+-[A-Z]/i,
    type: 'command',
    description: 'curl command',
  },
  {
    pattern: /\bwget\s+https?:/i,
    type: 'command',
    description: 'wget command',
  },
  {
    pattern: /\bnpm\s+(install|run|start|test|build)\b/i,
    type: 'command',
    description: 'npm command',
  },
  {
    pattern: /\byarn\s+(add|install|run)\b/i,
    type: 'command',
    description: 'yarn command',
  },
  {
    pattern: /\bgit\s+(clone|pull|push|commit|checkout|merge)\b/i,
    type: 'command',
    description: 'git command',
  },
  {
    pattern: /\bdocker\s+(run|build|pull|push)\b/i,
    type: 'command',
    description: 'docker command',
  },

  // JSON/Objects (not inside code blocks)
  {
    pattern: /\{"\w+":\s*["{[\d]/,
    type: 'json',
    description: 'JSON object',
  },
  {
    pattern: /\[\s*\{"\w+"/,
    type: 'json',
    description: 'JSON array',
  },

  // HTTP/API patterns
  {
    pattern: /Bearer\s+[a-zA-Z0-9._-]{20,}/,
    type: 'token',
    description: 'Bearer token',
  },
  {
    pattern: /[A-Z][a-z]+-[A-Z][a-z]+(-[A-Z][a-z]+)?:\s+\S/,
    type: 'header',
    description: 'HTTP header',
  },

  // Code constructs
  {
    pattern: /\bfunction\s+\w+\s*\(/,
    type: 'code',
    description: 'Function definition',
  },
  {
    pattern: /\bconst\s+\w+\s*=\s*[[{(]/,
    type: 'code',
    description: 'Variable declaration',
  },
  {
    pattern: /=>\s*\{/,
    type: 'code',
    description: 'Arrow function',
  },
  {
    pattern: /\bimport\s+.*\s+from\s+['"]/,
    type: 'code',
    description: 'Import statement',
  },
  {
    pattern: /\bexport\s+(default\s+)?(function|class|const)/,
    type: 'code',
    description: 'Export statement',
  },
]
