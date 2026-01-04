# ScanVision Linter

Chrome extension for real-time visual "scannability" auditing of technical documentation.

## Vision

ScanVision Linter is not a text editor or exporter. It's a visual diagnostic tool that acts as an "X-ray layer" over any documentation webpage (Notion, GitHub, ReadMe.io, custom CMS).

Its goal is to let technical writers see what users perceive in their first 3-5 seconds of pattern scanning—hiding informational noise and highlighting visual anchors.

## Problem Statement

Users don't read technical documentation from start to finish—they scan it looking for quick solutions.

| Issue | Description |
|-------|-------------|
| **Blind spots** | Critical information buried in dense paragraphs that the eye ignores |
| **Visual noise** | Excessive bold/highlights that dilute hierarchy |
| **Cognitive fatigue** | Plain text blocks without visual anchors (H1, H2, code blocks) |

## Target Audience

- **Technical Writers** — Validate if guides are easy to follow
- **UX Writers** — Audit information hierarchy
- **Product Managers / Developers** — Ensure "Quick Starts" are actually quick to read

## Core Features (MVP)

| Feature | Description |
|---------|-------------|
| **Scan Mode Toggle** | Switch that applies a global CSS filter to the active page |
| **Opacity/Blur Filter** | Reduces opacity (0.1-0.2) and applies slight blur to "non-essential" elements (standard paragraphs, footers, sidebars) |
| **Hot Spot Highlighting** | Keeps 100% opacity on key elements: headings (`h1`-`h6`), emphasis (`strong`, `b`, `mark`), code (`code`, `pre`), links (`a`), images, tables, alert boxes (`.alert`, `.note`, `.warning`) |

## Tech Stack

| Component | Technology |
|-----------|------------|
| Build | Vite + CRXJS (Hot Module Replacement) |
| Language | TypeScript |
| Popup UI | React |
| Standard | Manifest V3 |
| Injection | Dynamic `<style>` injection via Content Script |

## Roadmap

### Phase 1: MVP Stabilization (Current)
- Configure popup ↔ content script messaging
- Refine CSS selectors to avoid breaking complex site layouts

### Phase 2: Customization & Control
- Intensity slider for transparency/blur adjustment
- Container selector: click to select main content area, ignoring nav menus and footers

### Phase 3: Scannability Analytics (Heuristics)
- Calculate "Scannability Score": algorithm comparing plain text vs visual anchors
- Alert when a plain text block exceeds 5 lines without any anchor

### Phase 4: Advanced Configuration
- Custom CSS selectors (e.g., if company docs use `.box-info` for notes, recognize it as an anchor)

## Privacy

Purely visual and local (client-side). No document data collection, no external server communication. Safe for private/internal company documentation.
