# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ScanVision Linter Pro is a Chrome extension (Manifest V3) for visual "scannability" auditing of technical documentation. It acts as an "X-ray layer" over any documentation page (Notion, GitHub, ReadMe.io, Confluence, etc.), letting technical writers see what users perceive in their first 3-5 seconds of pattern scanning.

**Problem it solves:** Users don't read documentation—they scan it looking for quick solutions. Critical information gets buried in dense paragraphs, excessive emphasis dilutes hierarchy, and plain text blocks lack visual anchors.

**Target users:** Technical Writers, UX Writers, Product Managers, Developers.

## Commands

```bash
npm run dev      # Start Vite dev server with HMR (load dist/ in Chrome as unpacked extension)
npm run build    # TypeScript check + Vite production build
npm run lint     # Run ESLint on all files
npm run preview  # Preview production build
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
└── content/
    └── index.ts                # Content script - CSS injection & analytics

manifest.json                   # Chrome extension manifest (MV3)
vite.config.ts                  # Vite + CRXJS plugin config
```

## Key Features

### 1. Scan Mode
- Dims paragraph text using `color-mix()` (not opacity, to avoid affecting children)
- Highlights "hot spots": headings, emphasis, code, links, images, tables
- Each hot spot type has a distinct visual indicator (outlines, backgrounds)

### 2. Scannability Analytics
- Calculates score (0-100) based on anchor/text ratio
- Detects problematic blocks (>5 lines without visual anchors)
- Shows breakdown by anchor type in popup

### 3. Platform Presets
- Auto-detects platform from URL (GitHub, Notion, Confluence, MDN, etc.)
- Each preset defines: content area, platform-specific hot spots, elements to ignore
- User can manually override preset selection

### 4. Customization
- Text visibility slider (10%-50%)
- Blur amount slider (0-2px)
- Settings persist in `chrome.storage.local`

## Message Flow

```
Popup (App.tsx)                    Content Script (content/index.ts)
      │                                      │
      │─── toggle-scan + config + preset ───>│
      │<── isScanning + analytics ──────────│
      │                                      │
      │─── update-config + preset ─────────>│
      │<── isScanning ─────────────────────│
      │                                      │
      │─── get-state ─────────────────────>│
      │<── isScanning + config ────────────│
```

## Development Setup

1. `npm install`
2. `npm run dev`
3. In Chrome: `chrome://extensions/` → Enable Developer mode → Load unpacked → Select `dist/`
4. Extension auto-reloads on file changes (CRXJS HMR)

## Adding a New Platform Preset

Edit `src/presets/platforms.ts`:

```typescript
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

## TypeScript Configuration

Uses project references with separate configs:
- `tsconfig.app.json` - Application code, includes Chrome types (`@types/chrome`)
- `tsconfig.node.json` - Vite config, includes Node types

**Important:** Use `import type` for type-only imports due to `verbatimModuleSyntax`.

## Documentation

| File | Description |
|------|-------------|
| `PROJECT.md` | Project vision, problem statement, roadmap |
| `IMPLEMENTATION_PLAN.md` | Detailed task breakdown by phase |
| `VISUALIZATION_MODES_ARCHITECTURE.md` | Architecture for modular visualization modes system |

## Privacy

Purely client-side extension. No data collection, no external server communication. Safe for use on private/internal documentation.
