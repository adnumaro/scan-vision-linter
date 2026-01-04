# ScanVision Linter

Chrome extension for visual scannability auditing of technical documentation. Analyzes web pages to identify how well content supports quick visual scanning patterns.

## Features

- **Scannability Analysis**: Evaluates headings, lists, code blocks, links, and visual anchors
- **Platform Presets**: Auto-detects Confluence, GitHub, Notion, Google Docs with optimized settings
- **Visualization Modes**:
  - **F-Pattern**: Shows natural F-shaped reading pattern overlay
  - **E-Pattern**: Shows E-shaped reading pattern (3 horizontal bars)
  - **Heat Zones**: Attention gradient visualization (green = high, red = low)
  - **Fold Line**: Above-the-fold indicator
  - **First 5 Seconds**: Quick scan simulation
- **Content-Aware Overlays**: Patterns are scoped to main content area, excluding navigation and sidebars

## Tech Stack

- React 19 + TypeScript
- Vite with CRXJS plugin for Chrome extension bundling
- Biome for linting and formatting
- dependency-cruiser for static analysis

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix lint issues
npm run lint:fix

# Check dependencies
npm run depcruise
```

## Installation

1. Build the extension: `npm run build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist` folder

## Project Structure

```
src/
├── components/       # React UI components
├── content/          # Content script (injected into pages)
├── modes/            # Visualization mode implementations
│   ├── implementations/
│   │   ├── scan-mode.ts
│   │   ├── f-pattern-mode.ts
│   │   ├── e-pattern-mode.ts
│   │   ├── heat-zones-mode.ts
│   │   ├── fold-line-mode.ts
│   │   └── first-5s-mode.ts
│   ├── utils/        # Overlay, viewport, color utilities
│   ├── manager.ts    # Mode orchestration
│   └── registry.ts   # Mode registration
├── presets/          # Platform-specific configurations
├── types/            # TypeScript type definitions
└── utils/            # General utilities
```

## License

MIT
