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
│   └── messages.ts             # Chrome messaging interfaces
├── utils/
│   ├── storage.ts              # Chrome storage helpers
│   └── i18n.ts                 # Internationalization helper
├── components/
│   ├── ModeList.tsx            # Mode grouping by category
│   └── ModeToggle.tsx          # Individual mode toggle UI
├── config/                     # Configuration layer (no UI dependencies)
│   ├── types.ts                # Shared interfaces (PlatformPreset, AntiPattern, etc.)
│   ├── merge.ts                # Deep merge utility for presets
│   ├── analysis.ts             # Scannability analysis logic
│   └── presets/                # Platform-specific configurations
│       ├── index.ts            # Exports, platform detection, merged presets
│       ├── global/             # Base preset (fallback)
│       ├── confluence/         # Confluence-specific
│       └── notion/             # Notion-specific
├── content/
│   └── index.ts                # Content script - orchestrates modes & analytics
└── modes/                      # Visualization system
    ├── types.ts                # VisualizationMode interface, ModeContext
    ├── registry.ts             # Singleton mode registry
    ├── manager.ts              # Mode lifecycle coordinator
    ├── metadata.ts             # Mode metadata for UI
    ├── index.ts                # Public API exports
    ├── implementations/        # 6 visualization modes
    │   ├── scan-mode.ts        # Core: dims text, highlights anchors
    │   ├── f-pattern-mode.ts   # F-shaped reading pattern overlay
    │   ├── e-pattern-mode.ts   # E-shaped reading pattern overlay
    │   ├── fold-line-mode.ts   # "Above the fold" indicator line
    │   ├── heat-zones-mode.ts  # Attention gradient overlay
    │   └── first-5s-mode.ts    # Quick scan simulation
    └── utils/                  # Mode utilities
        ├── base-mode.ts, colors.ts, config.ts, constants.ts
        ├── dom.ts, overlay.ts, overlay-tracker.ts
        ├── scan-overlays.ts, security.ts, styles.ts, viewport.ts

manifest.json                   # Chrome extension manifest (MV3)
vite.config.ts                  # Vite + CRXJS plugin config
biome.json                      # Biome linter configuration
```

## Preset System

Each platform has its own folder with independent configuration:

| File              | Description                                              |
|-------------------|----------------------------------------------------------|
| `antiPatterns.ts` | Regex patterns to detect unformatted code                |
| `weights.ts`      | Anchor weights for scannability scoring                  |
| `suggestions.ts`  | Platform-specific improvement suggestions (informative)  |
| `preset.ts`       | Selectors (contentArea, codeBlocks, ignoreElements, etc) |

**Merge behavior:** Platform-specific presets are merged with `global`:
- Arrays (antiPatterns, suggestions): concatenated (global + specific)
- Objects (weights, selectors): deep merge (specific overrides global)
- Primitives (id, name): specific wins

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
- Supported: Notion, Confluence (more can be added)
- Each preset defines: content area, code elements, hot spots, elements to ignore
- User can manually override preset selection

### 4. Customization
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
│  CONTENT SCRIPT (content.ts)                            │
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

## Development Setup

1. `npm install`
2. `npm run dev`
3. In Chrome: `chrome://extensions/` → Enable Developer mode → Load unpacked → Select `dist/`
4. Extension auto-reloads on file changes (CRXJS HMR)

## Adding a New Platform Preset

Create folder `src/config/presets/{platform}/` with these files (see `confluence/` or `notion/` as examples):

| File | Purpose |
|------|---------|
| `preset.ts` | ID, name, domains, selectors (contentArea, hotSpots, ignoreElements) |
| `antiPatterns.ts` | Regex patterns for unformatted code detection |
| `weights.ts` | Partial anchor weights (overrides global) |
| `suggestions.ts` | Platform-specific suggestions with validators |
| `index.ts` | Export `PartialPlatformPreset` combining all above |

Then in `src/config/presets/index.ts`:
1. Import and merge with global: `const merged = mergeWithGlobal(globalPreset, newPreset)`
2. Add to `PRESETS` array and `PRESET_MAP`

Finally, add i18n translations to `_locales/{en,es}/messages.json`.

## Adding a New Visualization Mode

1. Create `src/modes/implementations/my-mode.ts` implementing `VisualizationMode` interface
   - Required: `id`, `name`, `description`, `icon` (lucide-react), `category`
   - Optional: `incompatibleWith` array for mutually exclusive modes
   - Methods: `activate(context)`, `deactivate()`, `isActive()`, `getConfig()`
   - Export singleton instance

2. Register in `src/content.ts`: `registry.register(myMode)`

3. Mode appears automatically in popup UI, grouped by category.

See existing modes in `src/modes/implementations/` for patterns.

## TypeScript & Linting

**TypeScript** uses project references:
- `tsconfig.app.json` - Application code, includes Chrome types (`@types/chrome`)
- `tsconfig.node.json` - Vite config, includes Node types
- Use `import type` for type-only imports due to `verbatimModuleSyntax`

**Biome** (replaces ESLint/Prettier):
- Config in `biome.json`
- Run `npm run lint` for linting
- Run `npm run lint -- --write` to auto-fix
- Fast, single-tool solution for linting and formatting

## Dependency Rules

Enforced by `dependency-cruiser` (run `npm run depcruise`):

```
config/   ← Pure configuration (types, analysis, presets) - NO UI deps
   ↑
modes/    ← Visualization (can import config, NEVER vice versa)
   ↑
content/  ← Orchestrator (imports both)
```

**Key rule:** `config/` must NEVER import from `modes/`. Analysis logic lives in `config/analysis.ts` but rendering (overlays) stays in `modes/utils/scan-overlays.ts`.

## Privacy

Purely client-side extension. No data collection, no external server communication. Safe for use on private/internal documentation.
