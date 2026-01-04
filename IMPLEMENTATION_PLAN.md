# Implementation Plan

## Status Overview

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | MVP Stabilization |
| Phase 2 | ✅ Complete | Customization & Control |
| Phase 3 | ✅ Complete | Scannability Analytics |
| Phase 4A | ✅ Complete | Platform Presets |
| Phase 5 | ✅ Complete | Visualization Modes (F/E Pattern, Heat Zones, Fold Line, First 5s) |
| Phase 6 | ⏳ Future | Custom Selectors & Export/Import |

---

## Phase 1: MVP Stabilization ✅

### 1.1 Clean Up Boilerplate
- [x] Remove unused Vite template CSS from `index.css` and `App.css`
- [x] Create proper popup styles

### 1.2 Add Visual State Feedback
- [x] Track scan state in popup (sync with content script)
- [x] Show active/inactive indicator (button color change + text)

### 1.3 Improve CSS Selectors
- [x] Use `color-mix()` instead of `opacity` to avoid affecting children
- [x] Add support for `<pre>`, `<kbd>`, `<samp>` blocks
- [x] Add `<mark>`, `<em>` to hot spots
- [x] Handle emoji and SVG icons (`[role="img"]`, `[data-emoji-id]`)
- [x] Add common documentation classes (`.warning`, `.tip`, `.info`, `.caution`, `.callout`, `.admonition`)

### 1.4 Error Handling
- [x] Add try/catch to messaging in `App.tsx`
- [x] Handle case when content script isn't loaded (chrome:// pages, etc.)
- [x] Show user-friendly error messages

---

## Phase 2: Customization & Control ✅

### 2.1 Intensity Controls
- [x] Add opacity slider (10% - 50% range)
- [x] Add blur slider (0px - 2px range)
- [x] Store preferences in `chrome.storage.local`
- [x] Send config to content script on change (real-time updates)

### 2.2 Popup UI Improvements
- [x] Better layout with labeled sliders
- [x] Reset to defaults button
- [x] Value display next to sliders

### 2.3 Container Selector (Future)
- [ ] Click-to-select mode for main content area
- [ ] Store selector per domain
- [ ] Ignore nav/footer automatically

---

## Phase 3: Scannability Analytics ✅

### 3.1 Score Calculation
- [x] Count visual anchors vs plain text ratio
- [x] Calculate "Scannability Score" (0-100)
- [x] Display score in popup with color coding (green/yellow/red)

**Score Formula:**
- Base: anchor/paragraph ratio (up to 70 pts)
- Penalty: problem blocks (up to -30 pts)
- Bonus: headings (up to +15 pts)
- Bonus: images (up to +15 pts)

### 3.2 Problem Detection
- [x] Detect text blocks > 5 lines without anchors
- [x] Highlight problematic sections with red dashed outline
- [x] Show count of issues in popup

### 3.3 Analytics Display
- [x] Stats grid (total anchors, text blocks)
- [x] Problem alert with icon
- [x] Anchors breakdown by type (headings, emphasis, code, links, images, lists)

---

## Phase 4A: Platform Presets ✅

### 4.1 Preset Definitions
- [x] Default (generic)
- [x] GitHub (github.com, gist.github.com)
- [x] Notion (notion.so, notion.site)
- [x] Confluence (atlassian.net, confluence.com)
- [x] MDN Web Docs (developer.mozilla.org)
- [x] ReadMe.io (readme.io, readme.com)
- [x] GitBook (gitbook.io, gitbook.com)
- [x] Docusaurus (structure-based detection)

### 4.2 Preset Features
- [x] Auto-detect platform based on URL
- [x] Preset selector dropdown in popup
- [x] "Auto-detected" badge when matched
- [x] Platform-specific CSS selectors for hot spots
- [x] Platform-specific ignore elements (sidebars, etc.)

---

## Phase 5: Visualization Modes (Next)

> **Architecture Document:** See `VISUALIZATION_MODES_ARCHITECTURE.md` for detailed design.

### 5.1 Foundation ✅
- [x] Create `src/modes/types.ts` - Interfaces (VisualizationMode, ModeContext, ModeConfig)
- [x] Create `src/modes/utils/overlay.ts` - Overlay creation/removal utilities
- [x] Create `src/modes/utils/styles.ts` - Style injection utilities
- [x] Create `src/modes/utils/viewport.ts` - Viewport/fold line calculations
- [x] Create `src/modes/utils/colors.ts` - Color utilities for heat zones
- [x] Create `src/modes/registry.ts` - Mode registration system
- [x] Create `src/modes/manager.ts` - Mode coordination and lifecycle
- [x] Create `src/modes/index.ts` - Public API exports
- [x] Install `lucide-react` for icons

### 5.2 Refactor Existing Scan Mode ✅
- [x] Extract current scan logic into `src/modes/implementations/scan-mode.ts`
- [x] Implement `VisualizationMode` interface
- [x] Update `content/index.ts` to use ModeManager
- [x] Verify backward compatibility

### 5.3 Fold Line Mode (Simplest) ✅
- [x] Create `src/modes/implementations/fold-line-mode.ts`
- [x] Horizontal line at viewport height
- [x] Label "Above the fold"
- [x] Update on resize
- [x] Register in content script

### 5.4 F-Pattern Mode ✅
- [x] Create `src/modes/implementations/f-pattern-mode.ts`
- [x] Div overlay with 3 zones (top bar, middle bar, left column)
- [x] Configurable opacity and color
- [x] Mark as incompatible with E-pattern

### 5.5 E-Pattern Mode ✅
- [x] Create `src/modes/implementations/e-pattern-mode.ts`
- [x] Similar to F-pattern with extra middle bar (3 horizontal bars)
- [x] Mark as incompatible with F-pattern

### 5.6 Heat Zones Mode ✅
- [x] Create `src/modes/implementations/heat-zones-mode.ts`
- [x] Radial gradient overlay (top-left green → bottom-right red)
- [x] Configurable intensity
- [x] Uses pointer-events: none and mix-blend-mode: multiply

### 5.7 First 5 Seconds Mode ✅
- [x] Create `src/modes/implementations/first-5s-mode.ts`
- [x] Show only: headings, first line of paragraphs, images, emphasis
- [x] Heavily dims everything else
- [x] Incompatible with scan mode

### 5.8 Popup UI Integration ✅
- [x] Create `src/components/ModeToggle.tsx` - Individual mode toggle with switch
- [x] Create `src/components/ModeList.tsx` - List of toggles grouped by category
- [x] Add modes section to App.tsx
- [x] Handle incompatibility warnings (disable conflicting modes)
- [x] Add CSS styles for mode toggles
- [x] Add 'toggle-mode' message handler in content script

---

## Phase 6: Advanced Configuration (Future)

### 6.1 Custom Selectors
- [ ] UI to add/remove custom hot spot selectors
- [ ] UI to add/remove custom ignore selectors
- [ ] Store per-domain configurations

### 6.2 Export/Import
- [ ] Export configuration to JSON
- [ ] Import configuration from JSON
- [ ] Share presets between users

---

## Current File Structure

```
src/
├── main.tsx                    # React entry point
├── App.tsx                     # Main popup component
├── App.css                     # Popup styles (controls, analytics, presets, modes)
├── index.css                   # Base reset styles
├── types/
│   └── messages.ts             # ScanConfig, AnalyticsData, Message types
├── utils/
│   └── storage.ts              # getConfig, saveConfig, resetConfig
├── presets/
│   └── platforms.ts            # PRESETS array, detectPlatform, getPresetById
├── components/
│   ├── ModeToggle.tsx          # Individual mode toggle component
│   └── ModeList.tsx            # Mode list with categories
├── modes/
│   ├── index.ts                # Public API exports
│   ├── types.ts                # Mode interfaces
│   ├── registry.ts             # Mode registration system
│   ├── manager.ts              # Mode coordination
│   ├── utils/
│   │   ├── overlay.ts          # Overlay utilities
│   │   ├── styles.ts           # Style injection
│   │   ├── viewport.ts         # Viewport calculations
│   │   └── colors.ts           # Color utilities
│   └── implementations/
│       ├── scan-mode.ts        # Core scan visualization
│       ├── fold-line-mode.ts   # Above the fold indicator
│       ├── f-pattern-mode.ts   # F-pattern overlay
│       ├── e-pattern-mode.ts   # E-pattern overlay
│       ├── heat-zones-mode.ts  # Attention gradient
│       └── first-5s-mode.ts    # Quick scan simulation
└── content/
    └── index.ts                # Content script using ModeManager

manifest.json                   # Permissions: activeTab, storage
vite.config.ts                  # Vite + CRXJS
tsconfig.json                   # Project references
tsconfig.app.json               # App config with Chrome types
tsconfig.node.json              # Node config for Vite
```

---

## Future Ideas

- **Keyboard shortcut** to toggle scan mode (Alt+S or similar)
- **Badge icon** showing score on extension icon
- **History tracking** - score changes over time for a page
- **Report generation** - export analysis as PDF/Markdown
- **Team features** - shared presets, consistent standards
- **Browser support** - Firefox, Edge versions
- **Accessibility audit** - contrast ratios, font sizes
- **Reading time estimate** - based on content length and complexity
- **Compare mode** - side-by-side before/after scan view
