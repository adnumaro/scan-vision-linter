/**
 * Anti-pattern detection for scannability analysis
 * Detects code and technical content that should be properly formatted
 */

import {
  createUnformattedCodeOverlays,
  type UnformattedCodeInfo,
} from '../../modes/utils/scan-overlays'

/**
 * Patterns that indicate unformatted code in plain text
 */
const UNFORMATTED_CODE_PATTERNS = [
  // Terminal commands
  { pattern: /\bcurl\s+-[A-Z]/i, type: 'command', description: 'curl command' },
  { pattern: /\bwget\s+https?:/i, type: 'command', description: 'wget command' },
  {
    pattern: /\bnpm\s+(install|run|start|test|build)\b/i,
    type: 'command',
    description: 'npm command',
  },
  { pattern: /\byarn\s+(add|install|run)\b/i, type: 'command', description: 'yarn command' },
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
  { pattern: /\{"\w+":\s*["{[\d]/, type: 'json', description: 'JSON object' },
  { pattern: /\[\s*\{"\w+"/, type: 'json', description: 'JSON array' },

  // HTTP/API patterns
  { pattern: /Bearer\s+[a-zA-Z0-9._-]{20,}/, type: 'token', description: 'Bearer token' },
  {
    pattern: /[A-Z][a-z]+-[A-Z][a-z]+(-[A-Z][a-z]+)?:\s+\S/,
    type: 'header',
    description: 'HTTP header',
  },

  // Code constructs
  { pattern: /\bfunction\s+\w+\s*\(/, type: 'code', description: 'Function definition' },
  { pattern: /\bconst\s+\w+\s*=\s*[[{(]/, type: 'code', description: 'Variable declaration' },
  { pattern: /=>\s*\{/, type: 'code', description: 'Arrow function' },
  { pattern: /\bimport\s+.*\s+from\s+['"]/, type: 'code', description: 'Import statement' },
  {
    pattern: /\bexport\s+(default\s+)?(function|class|const)/,
    type: 'code',
    description: 'Export statement',
  },
] as const

type AntiPatternType = (typeof UNFORMATTED_CODE_PATTERNS)[number]['type']

/**
 * Result of an anti-pattern match
 */
export interface AntiPatternMatch {
  type: AntiPatternType
  description: string
  element: Element
  textSnippet: string
}

/**
 * Selectors for code block elements across platforms
 * Used to skip detection inside already-formatted code
 */
const CODE_BLOCK_SELECTORS = [
  // Standard
  'pre',
  'code',
  'kbd',
  'samp',
  '.highlight',
  '.code-block',
  // Confluence (ProseMirror/CodeMirror)
  '.cm-editor',
  '.cm-content',
  '.fabric-editor-breakout-mark',
  '[data-prosemirror-node-name="codeBlock"]',
  '[data-prosemirror-content-type="node"]',
  // Notion
  '[class*="notion-code"]',
  // GitHub
  '.blob-code',
  // Generic
  '[data-language]',
].join(', ')

/**
 * Extracts text content from an element, excluding code elements
 */
function getTextWithoutCodeElements(element: Element): string {
  const clone = element.cloneNode(true) as Element
  // Remove all code-related elements
  clone.querySelectorAll(CODE_BLOCK_SELECTORS).forEach((el) => {
    el.remove()
  })
  return clone.textContent || ''
}

/**
 * Detects unformatted code patterns in text blocks
 * @param contentArea - The content area to analyze
 * @param textBlockSelector - CSS selector for text blocks (defaults to 'p')
 * @param ignoreSelector - CSS selector for elements to ignore (from preset)
 * @returns Array of detected anti-pattern matches
 */
export function detectUnformattedCode(
  contentArea: Element,
  textBlockSelector = 'p',
  ignoreSelector = '',
): AntiPatternMatch[] {
  const matches: AntiPatternMatch[] = []
  const textBlocks = contentArea.querySelectorAll(textBlockSelector)

  for (const block of textBlocks) {
    // Skip if block is inside a code block
    if (block.closest(CODE_BLOCK_SELECTORS)) {
      continue
    }

    // Skip if block contains a code block (wrapper element)
    if (block.querySelector(CODE_BLOCK_SELECTORS)) {
      continue
    }

    // Skip if block or ancestors have code-editor-like classes/attributes
    // This catches editors we don't know about (CodeMirror, Monaco, etc.)
    const blockClasses = block.className || ''
    const hasEditorClass = /\b(cm-|monaco-|ace-|code|editor|highlight)\b/i.test(blockClasses)
    if (hasEditorClass) {
      continue
    }

    // Check if any ancestor has code-editor-like patterns
    // Note: We don't exclude contenteditable because Notion and other platforms use it for the entire page
    const ancestorWithCodeEditor = block.closest(
      '[class*="cm-"], [class*="monaco-"], [class*="ace-"], [class*="code-block"]',
    )
    if (ancestorWithCodeEditor) {
      continue
    }

    // Skip blocks inside ignored elements (from preset)
    if (ignoreSelector && block.closest(ignoreSelector)) {
      continue
    }

    const textWithoutCode = getTextWithoutCodeElements(block)

    // Skip very short blocks
    if (textWithoutCode.length < 10) {
      continue
    }

    for (const { pattern, type, description } of UNFORMATTED_CODE_PATTERNS) {
      if (pattern.test(textWithoutCode)) {
        matches.push({
          type,
          description,
          element: block,
          textSnippet: textWithoutCode.slice(0, 100),
        })
        break // One match per block is enough
      }
    }
  }

  return matches
}

/**
 * Marks paragraphs that contain unformatted code using the unified overlay system
 * @param matches - Array of anti-pattern matches
 */
export function markUnformattedCodeBlocks(matches: AntiPatternMatch[]): void {
  // Convert to the unified overlay format
  const overlayInfos: UnformattedCodeInfo[] = matches.map(({ element, type, description }) => ({
    element,
    type,
    description,
  }))

  // Use the unified overlay system
  createUnformattedCodeOverlays(overlayInfos)
}

/**
 * Removes unformatted code marker overlays
 * Note: This is now handled by removeAllScanOverlays() in scan-overlays.ts
 * This function is kept for backward compatibility but does nothing
 * since overlays are cleaned up by the unified system
 */
export function clearUnformattedCodeMarkers(): void {
  // Cleanup is now handled by removeAllScanOverlays() in scan-overlays.ts
  // This function is kept for API compatibility
}
