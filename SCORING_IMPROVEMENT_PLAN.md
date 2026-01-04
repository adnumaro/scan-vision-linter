# Scoring System Improvement Plan

## Executive Summary

The current scoring system has limitations that cause false positives (poorly structured documents getting high scores). This plan proposes incremental improvements to make the analysis more accurate and useful.

**Example problem:** An API documentation with unformatted code, inline JSON, and plain text gets a score of 100 because it has many links and headings.

---

## Phase 1: Generic Anti-Pattern Detection

**Impact: High | Effort: Low | Priority: Critical**

### 1.1 Detect unformatted code in text

Patterns to detect in paragraphs that are **NOT** inside `<code>` or `<pre>`:

```typescript
// src/content/analysis/antiPatterns.ts (new file)

export const UNFORMATTED_CODE_PATTERNS = [
  // Terminal commands
  { pattern: /\bcurl\s+-[A-Z]/i, type: 'command', description: 'curl command' },
  { pattern: /\bwget\s+/i, type: 'command', description: 'wget command' },
  { pattern: /\bnpm\s+(install|run|start)/i, type: 'command', description: 'npm command' },
  { pattern: /\bgit\s+(clone|pull|push|commit)/i, type: 'command', description: 'git command' },

  // JSON/Objects
  { pattern: /\{"\w+":\s*["{\[\d]/, type: 'json', description: 'JSON object' },
  { pattern: /\["\w+",\s*"/, type: 'json', description: 'JSON array' },

  // HTTP/API
  { pattern: /Bearer\s+[a-zA-Z0-9._-]{20,}/, type: 'token', description: 'Bearer token' },
  { pattern: /^[A-Z][a-z]+-[A-Z][a-z]+(-[A-Z][a-z]+)?:\s/m, type: 'header', description: 'HTTP header' },
  { pattern: /https?:\/\/[^\s]+\/[^\s]{20,}/, type: 'url', description: 'Long API URL' },

  // Code constructs
  { pattern: /\w+\([^)]*\)\s*{/, type: 'code', description: 'Function definition' },
  { pattern: /=>\s*{/, type: 'code', description: 'Arrow function' },
  { pattern: /\bconst\s+\w+\s*=/, type: 'code', description: 'Variable declaration' },
] as const

export interface AntiPatternMatch {
  pattern: string
  type: string
  description: string
  element: Element
  textSnippet: string
}
```

### 1.2 Detection function

```typescript
// src/content/analysis/antiPatterns.ts

export function detectUnformattedCode(contentArea: Element): AntiPatternMatch[] {
  const matches: AntiPatternMatch[] = []
  const paragraphs = contentArea.querySelectorAll('p')

  for (const p of paragraphs) {
    // Ignore text inside <code>, <pre>, <kbd>
    const textWithoutCode = getTextWithoutCodeElements(p)

    for (const { pattern, type, description } of UNFORMATTED_CODE_PATTERNS) {
      if (pattern.test(textWithoutCode)) {
        matches.push({
          pattern: pattern.source,
          type,
          description,
          element: p,
          textSnippet: textWithoutCode.slice(0, 100),
        })
        break // One match per paragraph is enough
      }
    }
  }

  return matches
}

function getTextWithoutCodeElements(element: Element): string {
  const clone = element.cloneNode(true) as Element
  clone.querySelectorAll('code, pre, kbd, samp').forEach(el => el.remove())
  return clone.textContent || ''
}
```

### 1.3 Integration in scoring

```typescript
// Modify src/content/index.ts - analyzeScannability() function

// BEFORE (current):
// score = ratioScore - problemPenalty + headingBonus + imageBonus

// AFTER (proposed):
const unformattedCodeMatches = detectUnformattedCode(mainContent)
const unformattedCodePenalty = Math.min(25, unformattedCodeMatches.length * 5)

score = Math.round(
  Math.max(0, Math.min(100,
    ratioScore
    - problemPenalty
    - unformattedCodePenalty  // NEW
    + headingBonus
    + imageBonus
  ))
)
```

### 1.4 Update AnalyticsData

```typescript
// src/types/messages.ts

export interface AnalyticsData {
  score: number
  totalTextBlocks: number
  totalAnchors: number
  problemBlocks: number
  unformattedCodeBlocks: number  // NEW
  anchorsBreakdown: {
    headings: number
    emphasis: number
    code: number
    links: number
    images: number
    lists: number
  }
  // NEW: Detected issues detail
  issues?: {
    type: 'unformatted-code' | 'dense-paragraph' | 'missing-structure'
    description: string
    count: number
  }[]
}
```

---

## Phase 2: Differentiated Anchor Weights

**Impact: Medium | Effort: Low | Priority: High**

### 2.1 Weight system

Not all anchors contribute equally to scannability:

```typescript
// src/content/analysis/weights.ts (new file)

export const ANCHOR_WEIGHTS = {
  // Structure (high value)
  heading: 1.0,
  codeBlock: 1.0,      // <pre>, code blocks
  image: 0.9,

  // Emphasis (medium value)
  emphasis: 0.7,       // <strong>, <b>, <mark>
  inlineCode: 0.6,     // <code> inline
  list: 0.5,           // <ul>, <ol>

  // Links (low value - can be in dense text)
  linkStandalone: 0.6, // Link that is the only content of a paragraph
  linkInline: 0.3,     // Link inside text
} as const

export function calculateWeightedAnchorScore(anchors: AnchorBreakdown): number {
  // ... implementation
}
```

### 2.2 Distinguish standalone vs inline links

```typescript
function isStandaloneLink(link: Element): boolean {
  const parent = link.parentElement
  if (!parent) return false

  // The link is the only significant content of the paragraph
  const parentText = parent.textContent?.trim() || ''
  const linkText = link.textContent?.trim() || ''

  return parentText === linkText || parentText.length < linkText.length + 10
}
```

### 2.3 New ratioScore calculation

```typescript
// BEFORE:
const anchorRatio = totalAnchors / totalTextBlocks
const ratioScore = Math.min(70, (anchorRatio / idealRatio) * 70)

// AFTER:
const weightedAnchors = calculateWeightedAnchors(allAnchors)
const anchorRatio = weightedAnchors / totalTextBlocks
const ratioScore = Math.min(70, (anchorRatio / idealRatio) * 70)
```

---

## Phase 3: Platform-Specific Analysis

**Impact: Medium | Effort: Medium | Priority: Medium**

### 3.1 Extend PlatformPreset

```typescript
// src/types/messages.ts

export interface PlatformPreset {
  id: string
  name: string
  description: string
  domains: string[]
  selectors: {
    contentArea: string
    hotSpots: string[]
    ignoreElements: string[]
  }
  styles?: PlatformStyleOverrides

  // NEW: Platform-specific analysis configuration
  analysis?: {
    // Additional unformatted code patterns
    additionalCodePatterns?: RegExp[]

    // Elements that suggest improvement (don't penalize, just inform)
    suggestions?: PlatformSuggestion[]

    // Custom weight for certain elements
    anchorWeightOverrides?: Partial<typeof ANCHOR_WEIGHTS>
  }
}

export interface PlatformSuggestion {
  id: string
  name: string
  description: string
  // Selector that, if NOT present, triggers the suggestion
  missingSelector?: string
  // Selector that, if present, triggers the suggestion (anti-pattern)
  presentSelector?: string
  // Custom validation function (optional)
  validate?: (contentArea: Element) => boolean
}
```

### 3.2 Suggestions for Confluence

```typescript
// src/presets/platforms.ts - Extension for Confluence

{
  id: 'confluence',
  name: 'Confluence',
  // ... existing selectors ...
  analysis: {
    suggestions: [
      {
        id: 'page-icon',
        name: 'Page Icon',
        description: 'Consider adding a page icon for visual recognition',
        missingSelector: '[data-testid="title-wrapper"] img, [data-testid="title-wrapper"] svg',
      },
      {
        id: 'info-panel',
        name: 'Info Panels',
        description: 'Use Info Panels to highlight important notes and warnings',
        // Only suggest if there's text that looks like a warning/note without panel
        validate: (content) => {
          const text = content.textContent || ''
          const hasWarningText = /\b(note|warning|important|caution)\b:/i.test(text)
          const hasInfoPanel = content.querySelector('.confluence-information-macro') !== null
          return hasWarningText && !hasInfoPanel
        },
      },
      {
        id: 'expand-sections',
        name: 'Expandable Sections',
        description: 'Long documents benefit from expandable sections',
        validate: (content) => {
          const paragraphs = content.querySelectorAll('p')
          const hasExpand = content.querySelector('.expand-control') !== null
          return paragraphs.length > 20 && !hasExpand
        },
      },
    ],
  },
}
```

### 3.3 Suggestions for Notion

```typescript
{
  id: 'notion',
  name: 'Notion',
  // ... existing selectors ...
  analysis: {
    suggestions: [
      {
        id: 'page-icon',
        name: 'Page Icon',
        description: 'Add an icon to make the page easily identifiable',
        missingSelector: '.notion-page-block .notion-emoji, .notion-page-block img[src*="icon"]',
      },
      {
        id: 'cover-image',
        name: 'Cover Image',
        description: 'A cover image makes the page more visually engaging',
        missingSelector: '.notion-page-cover',
      },
      {
        id: 'callouts',
        name: 'Callout Blocks',
        description: 'Use callouts to highlight important information',
        validate: (content) => {
          const text = content.textContent || ''
          const hasImportantText = /\b(important|note|tip|warning)\b/i.test(text)
          const hasCallout = content.querySelector('[class*="notion-callout"]') !== null
          return hasImportantText && !hasCallout
        },
      },
      {
        id: 'toggles',
        name: 'Toggle Blocks',
        description: 'Long lists could be organized with toggles',
        validate: (content) => {
          const lists = content.querySelectorAll('ul, ol')
          const longLists = Array.from(lists).filter(l => l.children.length > 8)
          const hasToggles = content.querySelector('[class*="notion-toggle"]') !== null
          return longLists.length > 0 && !hasToggles
        },
      },
    ],
  },
}
```

---

## Phase 4: UI for Problems and Suggestions

**Impact: High | Effort: Medium | Priority: Medium**

### 4.1 Update analytics response

```typescript
// Extended AnalyticsData
export interface AnalyticsData {
  score: number
  // ... existing fields ...

  // NEW: Detected problems (affect score)
  problems: {
    id: string
    type: 'unformatted-code' | 'dense-paragraph' | 'no-structure'
    severity: 'high' | 'medium' | 'low'
    description: string
    count: number
    penalty: number
  }[]

  // NEW: Suggestions (don't affect score, just inform)
  suggestions: {
    id: string
    name: string
    description: string
    platform: string
  }[]
}
```

### 4.2 UI Mockup

```
┌─────────────────────────────────────────┐
│  Scannability Score          [72/100]   │
├─────────────────────────────────────────┤
│  ⚠️ Problems Found (3)                  │
│  ├─ 5× Unformatted code blocks    -25   │
│  ├─ 2× Dense paragraphs           -8    │
│  └─ Missing visual anchors        -5    │
├─────────────────────────────────────────┤
│  💡 Suggestions for Confluence          │
│  ├─ Add page icon                       │
│  ├─ Use Info Panels for warnings        │
│  └─ Consider expandable sections        │
├─────────────────────────────────────────┤
│  📊 Anchors Breakdown                   │
│  ├─ Headings: 8                         │
│  ├─ Code blocks: 0 ⚠️                   │
│  ├─ Emphasis: 2                         │
│  ├─ Links: 15                           │
│  └─ Images: 0                           │
└─────────────────────────────────────────┘
```

---

## File Changes Summary

### New Files

| File                                   | Description                |
|----------------------------------------|----------------------------|
| `src/content/analysis/antiPatterns.ts` | Unformatted code detection |
| `src/content/analysis/weights.ts`      | Anchor weight system       |
| `src/content/analysis/suggestions.ts`  | Suggestions engine         |

### Modified Files

| File                       | Changes                                           |
|----------------------------|---------------------------------------------------|
| `src/types/messages.ts`    | Extend `AnalyticsData`, `PlatformPreset`          |
| `src/content/index.ts`     | Integrate new analysis in `analyzeScannability()` |
| `src/presets/platforms.ts` | Add `analysis` config per platform                |
| `src/App.tsx`              | Display problems and suggestions in UI            |

---

## Suggested Timeline

| Phase | Estimated Time | Dependencies |
|-------|----------------|--------------|
| Phase 1: Anti-patterns | 2-3 hours | None |
| Phase 2: Weights | 1-2 hours | Phase 1 |
| Phase 3: Platforms | 2-3 hours | Phase 1, 2 |
| Phase 4: UI | 2-3 hours | Phase 1, 2, 3 |

**Total estimated: 7-11 hours**

---

## Success Criteria

The example document (`API Documentation V1`) should:

1. **Before:** Score 100 (false positive)
2. **After Phase 1:** Score ~60-70 (penalty for unformatted code)
3. **After Phase 2:** Score ~50-60 (inline links worth less)
4. **After Phase 3:** Score ~50-60 + platform-specific suggestions

---

## Pending Decisions

1. **Should detected problems be shown visually on the page?**
   - Option A: Only in the popup (less intrusive)
   - Option B: Highlight on page like current problem blocks

2. **Should suggestions affect the score?**
   - Option A: No, just informative (recommended)
   - Option B: Yes, but with very low weight (-2 pts max)

3. **Allow user configuration of severity?**
   - Some users may want to disable certain detections
