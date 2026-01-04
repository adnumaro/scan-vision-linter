/**
 * Anti-pattern detection for scannability analysis
 * Detects code and technical content that should be properly formatted
 */

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
 * @returns Array of detected anti-pattern matches
 */
export function detectUnformattedCode(
  contentArea: Element,
  textBlockSelector = 'p',
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

    // Skip blocks inside Confluence comment/reaction containers
    if (block.closest('[data-testid="object-comment-wrapper"], [data-testid="footer-reply-container"], [data-testid="reactions-container"], [data-testid="render-reactions"], .ak-renderer-wrapper.is-comment')) {
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
 * CSS class for marking paragraphs with unformatted code
 */
export const UNFORMATTED_CODE_CLASS = 'scanvision-unformatted-code'

/**
 * Data attribute to link overlay to source element
 */
const OVERLAY_DATA_ATTR = 'data-scanvision-overlay-for'

/**
 * Store references to elements and their overlays for scroll updates
 */
const overlayMap = new Map<Element, HTMLDivElement>()
let scrollHandler: (() => void) | null = null
let styleInjected = false

/**
 * Suggestions for each anti-pattern type
 */
const SUGGESTIONS: Record<string, string> = {
  command: 'Wrap terminal commands in a code block for better readability',
  json: 'Format JSON data in a code block with syntax highlighting',
  token: 'Place tokens and credentials in code blocks to distinguish them from text',
  header: 'Use a code block or table to display HTTP headers clearly',
  code: 'Move code snippets to properly formatted code blocks',
}

/**
 * Injects styles for tooltips (only once)
 */
function injectTooltipStyles(): void {
  if (styleInjected) return

  const style = document.createElement('style')
  style.id = 'scanvision-tooltip-styles'
  style.textContent = `
    .scanvision-info-icon {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 20px;
      height: 20px;
      background: #fb923c;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      pointer-events: auto;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      font-size: 12px;
      font-weight: bold;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .scanvision-info-icon:hover {
      transform: scale(1.1);
      background: #f97316;
    }
    .scanvision-tooltip {
      position: absolute;
      bottom: calc(100% + 8px);
      right: 0;
      background: #1f2937;
      color: white;
      padding: 10px 12px;
      border-radius: 6px;
      font-size: 12px;
      line-height: 1.4;
      width: 260px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      pointer-events: none;
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 0.15s, transform 0.15s;
      z-index: 10001;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .scanvision-info-icon:hover .scanvision-tooltip {
      opacity: 1;
      transform: translateY(0);
    }
    .scanvision-tooltip-title {
      font-weight: 600;
      color: #fb923c;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .scanvision-tooltip-suggestion {
      color: #d1d5db;
    }
  `
  document.head.appendChild(style)
  styleInjected = true
}

/**
 * Updates overlay positions based on current element positions
 */
function updateOverlayPositions(): void {
  for (const [element, overlay] of overlayMap) {
    const rect = element.getBoundingClientRect()
    overlay.style.top = `${rect.top}px`
    overlay.style.left = `${rect.left}px`
    overlay.style.width = `${rect.width}px`
    overlay.style.height = `${rect.height}px`
  }
}

/**
 * Creates an info icon with tooltip for an overlay
 */
function createInfoIcon(type: string, description: string): HTMLDivElement {
  const icon = document.createElement('div')
  icon.className = 'scanvision-info-icon'
  icon.textContent = 'i'

  const tooltip = document.createElement('div')
  tooltip.className = 'scanvision-tooltip'
  tooltip.innerHTML = `
    <div class="scanvision-tooltip-title">
      <span>⚠️</span> ${description}
    </div>
    <div class="scanvision-tooltip-suggestion">
      ${SUGGESTIONS[type] || 'Consider using proper formatting for this content'}
    </div>
  `

  icon.appendChild(tooltip)
  return icon
}

/**
 * Marks paragraphs that contain unformatted code using overlays
 * Uses positioned overlays instead of classes because editors like Notion
 * strip unknown classes from their DOM elements
 * @param matches - Array of anti-pattern matches
 */
export function markUnformattedCodeBlocks(matches: AntiPatternMatch[]): void {
  // Inject tooltip styles
  injectTooltipStyles()

  for (const { element, type, description } of matches) {
    // Skip if overlay already exists for this element
    if (overlayMap.has(element)) {
      continue
    }

    const blockId = element.getAttribute('data-block-id') || `scanvision-${Math.random().toString(36).slice(2, 9)}`

    // Create overlay
    const overlay = document.createElement('div')
    overlay.className = UNFORMATTED_CODE_CLASS
    overlay.setAttribute(OVERLAY_DATA_ATTR, blockId)

    // Position overlay on top of the element
    const rect = element.getBoundingClientRect()
    overlay.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      pointer-events: none;
      z-index: 9999;
      outline: 2px dashed rgba(251, 146, 60, 0.8);
      outline-offset: -2px;
      background-color: rgba(251, 146, 60, 0.08);
      box-sizing: border-box;
    `

    // Add info icon with tooltip
    const infoIcon = createInfoIcon(type, description)
    overlay.appendChild(infoIcon)

    document.body.appendChild(overlay)
    overlayMap.set(element, overlay)
  }

  // Add scroll listener if not already added
  if (!scrollHandler && overlayMap.size > 0) {
    scrollHandler = () => requestAnimationFrame(updateOverlayPositions)
    window.addEventListener('scroll', scrollHandler, true)
    window.addEventListener('resize', scrollHandler)
  }
}

/**
 * Removes unformatted code marker overlays
 */
export function clearUnformattedCodeMarkers(): void {
  // Remove all overlays
  for (const overlay of overlayMap.values()) {
    overlay.remove()
  }
  overlayMap.clear()

  // Remove scroll listener
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler, true)
    window.removeEventListener('resize', scrollHandler)
    scrollHandler = null
  }

  // Remove tooltip styles
  const tooltipStyles = document.getElementById('scanvision-tooltip-styles')
  if (tooltipStyles) {
    tooltipStyles.remove()
    styleInjected = false
  }
}
