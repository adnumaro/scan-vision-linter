# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ScanVision Linter Pro is a Chrome extension (Manifest V3) for visual "scannability" auditing of technical documentation. It acts as an "X-ray layer" over any documentation page (Notion, GitHub, ReadMe.io, Confluence, etc.), letting technical writers see what users perceive in their first 3-5 seconds of pattern scanning.

**Problem it solves:** Users don't read documentation—they scan it looking for quick solutions. Critical information gets buried in dense paragraphs, excessive emphasis dilutes hierarchy, and plain text blocks lack visual anchors.

**Target users:** Technical Writers, UX Writers, Product Managers, Developers.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR (load dist/ in Chrome as unpacked extension)
npm run build     # TypeScript check + Vite production build
npm run lint      # Run Biome linter on all files
npm run preview   # Preview production build
npm run depcruise # Generate dependency graph (outputs .dot and .svg)
```

## Architecture

```
src/
├── main.tsx                    # React entry point (popup UI)
├── App.tsx                     # Main popup component with all controls
├── App.css                     # Popup styles
├── index.css                   # Base reset styles
├── types/
│   └── messages.ts             # Shared TypeScript interfaces
├── utils/
│   └── storage.ts              # Chrome storage helpers
├── presets/
│   └── platforms.ts            # Platform presets (GitHub, Notion, etc.)
├── components/
│   ├── ModeList.tsx            # Mode grouping by category
│   └── ModeToggle.tsx          # Individual mode toggle UI
├── content/
│   ├── index.ts                # Content script - mode management & analytics
│   └── analysis/               # Content analysis modules
│       ├── antiPatterns.ts     # Unformatted code detection
│       ├── suggestions.ts      # Platform-specific suggestions
│       └── weights.ts          # Weighted anchor calculation
└── modes/                      # Modular visualization system
    ├── types.ts                # VisualizationMode interface, ModeContext
    ├── registry.ts             # Singleton mode registry
    ├── manager.ts              # Mode lifecycle coordinator
    ├── index.ts                # Public API exports
    ├── implementations/        # 6 visualization modes
    │   ├── scan-mode.ts        # Core: dims text, highlights anchors
    │   ├── f-pattern-mode.ts   # F-shaped reading pattern overlay
    │   ├── e-pattern-mode.ts   # E-shaped reading pattern overlay
    │   ├── fold-line-mode.ts   # "Above the fold" indicator line
    │   ├── heat-zones-mode.ts  # Attention gradient overlay
    │   └── first-5s-mode.ts    # Quick scan simulation
    └── utils/
        ├── colors.ts           # Color utilities & heat map gradients
        ├── config.ts           # Config cloning utilities
        ├── dom.ts              # DOM utilities, paragraph analysis, exclusions
        ├── overlay.ts          # DOM overlay creation helpers
        ├── security.ts         # CSS/selector sanitization
        ├── styles.ts           # Style injection utilities
        └── viewport.ts         # Viewport & fold line calculations

manifest.json                   # Chrome extension manifest (MV3)
vite.config.ts                  # Vite + CRXJS plugin config
biome.json                      # Biome linter configuration
```

## Key Features

### 1. Visualization Modes (6 modes)

| Mode           | Category   | Description                                                                               |
|----------------|------------|-------------------------------------------------------------------------------------------|
| **Scan**       | Simulation | Core mode: dims text with `color-mix()`, highlights anchors (headings, code, links, etc.) |
| **First 5s**   | Simulation | Shows only what users perceive in first 5 seconds (blur + word limit)                     |
| **F-Pattern**  | Overlay    | F-shaped reading pattern overlay with 3 attention zones                                   |
| **E-Pattern**  | Overlay    | E-shaped pattern overlay with 4 zones (more detailed than F)                              |
| **Heat Zones** | Overlay    | Attention gradient overlay (green→red radial gradient)                                    |
| **Fold Line**  | Indicator  | Shows "above the fold" viewport boundary                                                  |

**Mode incompatibilities:**
- Scan ↔ First 5s (both are text simulations)
- F-Pattern ↔ E-Pattern (both are pattern overlays)

### 2. Scannability Analytics
- Calculates score (0-100) based on weighted anchor/text ratio
- Detects problematic blocks (>5 lines without visual anchors) - red dashed outline
- Detects unformatted code in plain text (commands, JSON, etc.) - orange dashed outline
- Shows breakdown by anchor type in popup
- Color legend explaining outline meanings
- Platform-specific suggestions (informative, don't affect score)

### 3. Platform Presets
- Auto-detects platform from URL on every popup open
- Supported: GitHub, Notion, Confluence, MDN, and more
- Each preset defines: content area, platform-specific hot spots, elements to ignore
- User can manually override preset selection

### 4. Confluence-Specific Exclusions
Elements excluded from analysis and styling (comments, reactions):
- `[data-testid="object-comment-wrapper"]`
- `[data-testid="footer-reply-container"]`
- `[data-testid="reactions-container"]`
- `[data-testid="render-reactions"]`
- `.ak-renderer-wrapper.is-comment`
- `[class*="pm-breakout-resize-handle"]` (resize handles)
- `[class*="_tip"]` (Atlassian internal classes)

These exclusions are defined in 3 places (keep in sync):
- `scan-mode.ts` - CSS exclusions
- `dom.ts` - JS analysis exclusions
- `antiPatterns.ts` - JS detection exclusions

### 5. Customization
- Text visibility slider (10%-50%)
- Blur amount slider (0-2px)
- Settings persist in `chrome.storage.local`

## Mode System Architecture

```
┌─────────────────────────────────────────────────────────┐
│  POPUP UI (React)                                       │
│  App.tsx → ModeList.tsx → ModeToggle.tsx                │
└─────────────┬───────────────────────────────────────────┘
              │ Chrome Message API
              ↓
┌─────────────────────────────────────────────────────────┐
│  CONTENT SCRIPT (content/index.ts)                      │
│  Listens for messages, manages ModeManager              │
└─────────────┬───────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────┐
│  MODE SYSTEM                                            │
│  ├─ Registry: Stores all registered modes (singleton)   │
│  ├─ Manager: Coordinates activation/deactivation        │
│  └─ 6 Mode Implementations (each exports singleton)     │
└─────────────────────────────────────────────────────────┘
```

**Key patterns:**
- **Registry Pattern** - Central mode registration, easy to add new modes
- **Result Pattern** - `{ success: true, value } | { success: false, error }`
- **Singleton Instances** - Each mode exports a singleton for stateful tracking
- **ModeContext** - Runtime data (contentArea, viewport, preset) passed to modes

## Message Flow

```
Popup (App.tsx)                    Content Script (content/index.ts)
      │                                           │
      │─── toggle-scan + config + preset ────────>│
      │<── isScanning + activeModes + analytics ──│
      │                                           │
      │─── toggle-mode + modeId ─────────────────>│
      │<── isScanning + activeModes ──────────────│
      │                                           │
      │─── update-config + preset ───────────────>│
      │<── isScanning ────────────────────────────│
      │                                           │
      │─── get-state ────────────────────────────>│
      │<── isScanning + config + activeModes ─────│
```

**Message actions:** `toggle-scan`, `toggle-mode`, `update-config`, `get-state`, `analyze`

## Development Setup

1. `npm install`
2. `npm run dev`
3. In Chrome: `chrome://extensions/` → Enable Developer mode → Load unpacked → Select `dist/`
4. Extension auto-reloads on file changes (CRXJS HMR)

## Adding a New Platform Preset

Edit `src/presets/platforms.ts`:

```json lines
{
  id: 'my-platform',
  name: 'My Platform',
  description: 'Optimized for My Platform docs',
  domains: ['myplatform.com', 'docs.myplatform.io'],
  selectors: {
    contentArea: '.main-content, article',
    hotSpots: ['.custom-callout', '.special-note'],
    ignoreElements: ['.sidebar', '.footer'],
  },
}
```

## Adding a New Visualization Mode

1. Create implementation in `src/modes/implementations/my-mode.ts`:

```typescript
import type { VisualizationMode, ModeContext, ModeConfig } from '../types';

class MyMode implements VisualizationMode {
  readonly id = 'my-mode';
  readonly name = 'My Mode';
  readonly description = 'What this mode does';
  readonly icon = 'Eye';  // lucide-react icon name
  readonly category = 'overlay';  // 'overlay' | 'indicator' | 'simulation'
  readonly incompatibleWith = ['other-mode'];  // IDs of conflicting modes

  private active = false;

  activate(context: ModeContext, config: ModeConfig): void {
    // Add overlays, inject styles, etc.
    this.active = true;
  }

  deactivate(): void {
    // Clean up overlays, remove styles
    this.active = false;
  }

  isActive(): boolean { return this.active; }
  getConfig(): ModeConfig { return {}; }
}

export const myMode = new MyMode();  // Export singleton
```

2. Register in `src/modes/registry.ts`:

```typescript
import { myMode } from './implementations/my-mode';
// Add to register() calls at bottom of file
register(myMode);
```

3. The mode will automatically appear in the popup UI grouped by category.

## TypeScript & Linting

**TypeScript** uses project references:
- `tsconfig.app.json` - Application code, includes Chrome types (`@types/chrome`)
- `tsconfig.node.json` - Vite config, includes Node types
- Use `import type` for type-only imports due to `verbatimModuleSyntax`

**Biome** (replaces ESLint/Prettier):
- Config in `biome.json`
- Run `npm run lint` for linting
- Fast, single-tool solution for linting and formatting

## Documentation

| File                     | Description                                |
|--------------------------|--------------------------------------------|
| `PROJECT.md`             | Project vision, problem statement, roadmap |
| `IMPLEMENTATION_PLAN.md` | Detailed task breakdown by phase           |

## Privacy

Purely client-side extension. No data collection, no external server communication. Safe for use on private/internal documentation.
