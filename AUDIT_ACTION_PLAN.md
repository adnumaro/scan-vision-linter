# Plan de Acción - Auditoría ScanVision Linter

> Generado: 2026-01-04
> Total de issues: 27
> Estimación: 15-20 tareas discretas

---

## Fase 1: Bugs Críticos (Prioridad ALTA)

### 1.1 Fix FoldLineMode.update() crash
**Archivo:** `src/modes/implementations/fold-line-mode.ts:91-95`

**Problema:** El método `update()` llama a `this.activate({} as ModeContext)` con un contexto vacío, lo que causa que `contentArea` sea `undefined` y crashee al intentar posicionar elementos.

**Solución:**
```typescript
update(config: ModeConfig): void {
  this.config = {
    ...this.config,
    ...config,
    settings: {
      ...this.config.settings,
      ...(config.settings as FoldLineConfig['settings']),
    },
  }

  if (this.active && this.contentArea) {
    // Solo actualizar estilos, no recrear
    this.updateElementStyles()
    this.positionElements()
  }
}

private updateElementStyles(): void {
  const { color, showLabel, labelText } = this.config.settings

  if (this.lineElement) {
    this.lineElement.style.borderTopColor = color
  }

  if (this.labelElement && showLabel) {
    this.labelElement.textContent = labelText
    this.labelElement.style.backgroundColor = color
  }
}
```

---

### 1.2 Añadir 'toggle-mode' a MessageAction type
**Archivo:** `src/types/messages.ts:46`

**Problema:** El type `MessageAction` no incluye `'toggle-mode'` pero se usa en el content script.

**Solución:**
```typescript
export type MessageAction = 'toggle-scan' | 'get-state' | 'update-config' | 'analyze' | 'toggle-mode'
```

**También actualizar `Message` interface:**
```typescript
export interface Message {
  action: MessageAction
  config?: ScanConfig
  preset?: PlatformPreset
  modeId?: string      // Añadir
  enabled?: boolean    // Añadir
}
```

---

### 1.3 Consolidar interfaces duplicadas
**Archivos afectados:**
- `src/types/messages.ts` (fuente de verdad)
- `src/presets/platforms.ts` (eliminar duplicados)
- `src/content/index.ts` (eliminar duplicados)

**Paso 1:** Mantener interfaces solo en `messages.ts`:
```typescript
// src/types/messages.ts - FUENTE ÚNICA
export interface PlatformStyleOverrides {
  navigationSelectors?: string[]
  additionalCSS?: string
}

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
}
```

**Paso 2:** En `platforms.ts`, importar en lugar de definir:
```typescript
// src/presets/platforms.ts
import type { PlatformPreset } from '../types/messages'

// Eliminar las interfaces PlatformStyleOverrides y PlatformPreset locales

export const PRESETS: PlatformPreset[] = [
  // ... presets
]
```

**Paso 3:** En `content/index.ts`, importar tipos:
```typescript
// src/content/index.ts
import type { AnalyticsData, PlatformPreset, ScanConfig } from '../types/messages'
import { DEFAULT_CONFIG } from '../types/messages'

// Eliminar las interfaces locales (líneas 27-68)
// Mantener solo:
type MessageAction = 'toggle-scan' | 'get-state' | 'update-config' | 'analyze' | 'toggle-mode'

interface Message {
  action: MessageAction
  config?: ScanConfig
  preset?: PlatformPreset
  modeId?: string
  enabled?: boolean
}

interface Response {
  isScanning: boolean
  config?: ScanConfig
  analytics?: AnalyticsData
  activeModes?: string[]
}
```

---

## Fase 2: Bugs de Severidad MEDIA

### 2.1 Calcular lineHeight dinámicamente
**Archivos:** `src/content/index.ts:155-156`, `src/modes/implementations/scan-mode.ts:242-243`

**Problema:** `lineHeight = 24` está hardcodeado.

**Solución:** Crear utility function:
```typescript
// src/modes/utils/dom.ts (nuevo archivo)

/**
 * Gets the computed line height of an element in pixels
 */
export function getLineHeight(element: Element): number {
  const computed = window.getComputedStyle(element)
  const lineHeight = computed.lineHeight

  if (lineHeight === 'normal') {
    // 'normal' is typically 1.2 * font-size
    const fontSize = parseFloat(computed.fontSize)
    return fontSize * 1.2
  }

  return parseFloat(lineHeight)
}

/**
 * Estimates the number of lines in an element
 */
export function estimateLines(element: Element): number {
  const lineHeight = getLineHeight(element)
  if (lineHeight <= 0) return 1

  // Use clientHeight to exclude borders/padding issues
  const height = element.clientHeight
  return Math.max(1, Math.round(height / lineHeight))
}
```

**Actualizar usos:**
```typescript
// content/index.ts
import { estimateLines } from '../modes/utils/dom'

paragraphs.forEach((p) => {
  const hasAnchor = p.querySelector('strong, b, mark, code, a, img') !== null
  const lines = estimateLines(p)

  if (!hasAnchor && lines > maxLinesWithoutAnchor) {
    problemBlocks++
  }
})
```

---

### 2.2 Añadir debouncing a viewport listeners
**Archivo:** `src/modes/utils/viewport.ts:58-68`

**Solución:**
```typescript
/**
 * Simple debounce function
 */
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Subscribes to viewport changes with debouncing
 */
export function onViewportChange(
  callback: () => void,
  options: { debounceMs?: number } = {}
): () => void {
  const { debounceMs = 16 } = options // ~60fps default

  const debouncedCallback = debounceMs > 0 ? debounce(callback, debounceMs) : callback

  const handleResize = () => debouncedCallback()
  const handleScroll = () => debouncedCallback()

  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleScroll, { passive: true })

  return () => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('scroll', handleScroll)
  }
}
```

---

### 2.3 Fix race condition en activeModes
**Archivo:** `src/App.tsx`

**Problema:** El estado `activeModes` puede desincronizarse si el usuario recarga la página.

**Solución:** Añadir listener para cuando el popup se abre:
```typescript
useEffect(() => {
  const detectAndUpdateState = async () => {
    // ... código existente
  }

  // Initial detection
  detectAndUpdateState()

  // Listen for tab changes
  const handleTabActivated = () => detectAndUpdateState()
  const handleTabUpdated = (_tabId: number, changeInfo: { url?: string; status?: string }) => {
    if (changeInfo.url || changeInfo.status === 'complete') {
      detectAndUpdateState()
    }
  }

  // Añadir: Detectar cuando la ventana gana foco (popup reabierto)
  const handleFocus = () => detectAndUpdateState()
  window.addEventListener('focus', handleFocus)

  chrome.tabs.onActivated.addListener(handleTabActivated)
  chrome.tabs.onUpdated.addListener(handleTabUpdated)

  return () => {
    window.removeEventListener('focus', handleFocus)
    chrome.tabs.onActivated.removeListener(handleTabActivated)
    chrome.tabs.onUpdated.removeListener(handleTabUpdated)
  }
}, [])
```

---

### 2.4 Validar type casting en config updates
**Archivos:** Múltiples modos

**Solución:** Crear type guard:
```typescript
// src/modes/utils/config.ts (nuevo archivo)

import type { ModeConfig } from '../types'

/**
 * Safely merges mode config with type validation
 */
export function mergeConfig<T extends ModeConfig>(
  current: T,
  update: Partial<ModeConfig>
): T {
  return {
    ...current,
    ...update,
    settings: {
      ...current.settings,
      ...(update.settings && typeof update.settings === 'object' ? update.settings : {}),
    },
  } as T
}

/**
 * Validates that a value is a valid settings object
 */
export function isValidSettings(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
```

---

### 2.5 Loggear errores en storage
**Archivo:** `src/utils/storage.ts`

```typescript
export async function getConfig(): Promise<ScanConfig> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const stored = result[STORAGE_KEY] as ScanConfig | undefined
    return stored ?? DEFAULT_CONFIG
  } catch (error) {
    console.warn('[ScanVision] Failed to load config from storage:', error)
    return DEFAULT_CONFIG
  }
}

export async function saveConfig(config: ScanConfig): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: config })
  } catch (error) {
    console.error('[ScanVision] Failed to save config:', error)
  }
}
```

---

### 2.6 Centralizar z-index constants
**Nuevo archivo:** `src/modes/utils/constants.ts`

```typescript
/**
 * Z-index layers for overlays
 * All scanvision overlays should use these values
 */
export const Z_INDEX = {
  /** Base overlay layer */
  OVERLAY: 999990,
  /** Indicator layer (fold line, labels) */
  INDICATOR: 999995,
  /** Top-most layer (tooltips, highlights) */
  TOP: 999999,
} as const

export type ZIndexLayer = keyof typeof Z_INDEX
```

**Actualizar usos en:**
- `overlay.ts:6` → `Z_INDEX.TOP`
- `f-pattern-mode.ts:142` → `Z_INDEX.OVERLAY`
- `fold-line-mode.ts:115,129` → `Z_INDEX.INDICATOR`

---

## Fase 3: Mejoras de CSS

### 3.1 Reducir uso de !important
**Archivo:** `src/modes/implementations/scan-mode.ts`

**Estrategia:** Usar CSS layers o selectores más específicos.

```typescript
function createBaseStyles(scope: string, config: ScanModeConfig): string {
  const { opacity, blur } = config.settings

  // Usar :where() para baja especificidad cuando sea posible
  // y reservar !important solo para overrides críticos
  return `
  @layer scanvision {
    /* Dim paragraph text - only within content area */
    ${scope} p:not(.scanvision-preserve) {
      color: color-mix(in srgb, currentColor ${Math.round(opacity * 100)}%, transparent);
      filter: blur(${blur}px);
      transition: color 0.2s ease, filter 0.2s ease;
    }
  }

  /* Problem blocks need !important to override layer */
  ${scope} p.${PROBLEM_CLASS} {
    outline: 2px dashed rgba(239, 68, 68, 0.7) !important;
    outline-offset: 4px;
    background-color: rgba(239, 68, 68, 0.05) !important;
  }`
}
```

> **Nota:** CSS layers tienen buen soporte pero revisar compatibilidad con targets del proyecto.

---

### 3.2 Mejorar selectores de navegación
**Archivo:** `src/modes/implementations/scan-mode.ts:198-207`

**Problema:** Selectores como `[class*="nav"]` son muy amplios.

```typescript
function createNavigationStyles(preset: PlatformPreset): string {
  const navSelectors = preset.styles?.navigationSelectors

  if (navSelectors && navSelectors.length > 0) {
    return `
  /* Platform-specific navigation (${preset.name}) */
  ${navSelectors.join(',\n  ')} {
    opacity: 0.5 !important;
    filter: none !important;
    pointer-events: auto !important;
  }`
  }

  // Selectores más específicos para fallback
  return `
  /* Generic navigation visibility */
  body > nav,
  body > header,
  body > aside,
  [role="navigation"],
  [role="banner"],
  [aria-label*="navigation" i],
  [aria-label*="sidebar" i],
  .site-header,
  .site-nav,
  .site-sidebar,
  #header,
  #nav,
  #sidebar {
    opacity: 0.5 !important;
    filter: none !important;
    pointer-events: auto !important;
  }`
}
```

---

### 3.3 Fix CanvasText compatibility
**Archivo:** `src/modes/implementations/scan-mode.ts:69`

```typescript
// Reemplazar:
color: CanvasText !important;

// Con:
color: inherit !important;
// O usar CSS variable con fallback:
color: var(--scanvision-text-color, inherit) !important;
```

---

## Fase 4: Mejoras de Arquitectura

### 4.1 Obtener metadata de modos del registry
**Archivo:** `src/components/ModeList.tsx`

**Problema:** `MODES` array duplica metadata que ya existe en el registry.

**Solución:** Exportar metadata desde cada modo y crear un hook:

```typescript
// src/modes/index.ts - añadir export
export interface ModeMetadata {
  id: string
  name: string
  description: string
  icon: LucideIcon
  category: ModeCategory
  incompatibleWith: string[]
}

export function getModeMetadata(): ModeMetadata[] {
  return registry.getAll().map(mode => ({
    id: mode.id,
    name: mode.name,
    description: mode.description,
    icon: mode.icon,
    category: mode.category,
    incompatibleWith: mode.incompatibleWith,
  }))
}
```

```typescript
// src/components/ModeList.tsx
import { getModeMetadata, type ModeCategory } from '../modes'

// Reemplazar MODES hardcodeado con:
const MODES = getModeMetadata()
```

> **Nota:** Esto requiere que el popup importe el registry, lo cual podría tener implicaciones de bundle size. Evaluar si es mejor mantener metadata duplicada por simplicidad.

---

### 4.2 Añadir domains a preset Docusaurus
**Archivo:** `src/presets/platforms.ts:184`

```typescript
{
  id: 'docusaurus',
  name: 'Docusaurus',
  description: 'Optimized for Docusaurus sites',
  domains: [
    'docusaurus.io',
    // Docusaurus sites conocidos
    'reactnative.dev',
    'redux.js.org',
    'jestjs.io',
    'prettier.io',
  ],
  // O añadir detección por estructura:
  // Esto requeriría cambiar detectPlatform() para analizar el DOM
}
```

**Alternativa:** Detección por estructura DOM (más robusto):
```typescript
export function detectPlatform(url: string): PlatformPreset {
  try {
    const hostname = new URL(url).hostname

    for (const preset of PRESETS) {
      if (preset.domains.some((domain) => hostname.includes(domain))) {
        return preset
      }
    }
  } catch {
    // Invalid URL
  }

  return PRESETS[0]
}

// Nueva función para detección por DOM (llamar desde content script)
export function detectPlatformByDOM(): string {
  // Detectar Docusaurus
  if (document.querySelector('[data-theme]') &&
      document.querySelector('.navbar--fixed-top')) {
    return 'docusaurus'
  }

  // Más detecciones...
  return 'default'
}
```

---

### 4.3 Optimizar analytics con caching
**Archivo:** `src/content/index.ts`

```typescript
let analyticsCache: {
  data: AnalyticsData | null
  timestamp: number
  contentHash: string
} = { data: null, timestamp: 0, contentHash: '' }

const CACHE_TTL = 1000 // 1 segundo

function getContentHash(): string {
  const content = getContentArea()
  return `${content.childElementCount}-${content.textContent?.length || 0}`
}

function analyzeScannability(forceRefresh = false): AnalyticsData {
  const now = Date.now()
  const currentHash = getContentHash()

  // Return cached if valid
  if (!forceRefresh &&
      analyticsCache.data &&
      now - analyticsCache.timestamp < CACHE_TTL &&
      analyticsCache.contentHash === currentHash) {
    return analyticsCache.data
  }

  // Recalculate
  const data = calculateAnalytics()
  analyticsCache = { data, timestamp: now, contentHash: currentHash }
  return data
}

function calculateAnalytics(): AnalyticsData {
  // ... lógica existente de analyzeScannability
}
```

---

### 4.4 Combinar querySelectorAll calls
**Archivo:** `src/content/index.ts:135-146`

```typescript
function analyzeScannability(): AnalyticsData {
  const mainContent = getContentArea()

  // Una sola query combinada
  const allElements = mainContent.querySelectorAll(
    'h1, h2, h3, h4, h5, h6, strong, b, mark, code, pre, kbd, a[href], img, svg, picture, video, ul, ol'
  )

  const breakdown = {
    headings: 0,
    emphasis: 0,
    code: 0,
    links: 0,
    images: 0,
    lists: 0,
  }

  for (const el of allElements) {
    const tag = el.tagName.toLowerCase()

    if (/^h[1-6]$/.test(tag)) breakdown.headings++
    else if (['strong', 'b', 'mark'].includes(tag)) breakdown.emphasis++
    else if (['code', 'pre', 'kbd'].includes(tag)) breakdown.code++
    else if (tag === 'a') breakdown.links++
    else if (['img', 'svg', 'picture', 'video'].includes(tag)) breakdown.images++
    else if (['ul', 'ol'].includes(tag)) breakdown.lists++
  }

  // ... resto del cálculo
}
```

---

## Fase 5: Seguridad (Baja prioridad pero importante)

### 5.1 Sanitizar innerHTML en overlays
**Archivos:** `f-pattern-mode.ts`, `e-pattern-mode.ts`

```typescript
// Opción 1: Usar textContent para labels
private updateOverlay(): void {
  // ...
  const topBar = document.createElement('div')
  topBar.style.cssText = `position: absolute; top: 0; ...`

  if (showLabels) {
    const label = document.createElement('span')
    label.textContent = 'Primary scan zone' // textContent es seguro
    label.style.cssText = `position: absolute; right: 16px; ...`
    topBar.appendChild(label)
  }

  this.overlayElement.appendChild(topBar)
  // Repetir para otros elementos
}

// Opción 2: Escapar si se usa innerHTML
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
```

---

### 5.2 Validar additionalCSS
**Archivo:** `src/modes/implementations/scan-mode.ts:228`

```typescript
function sanitizeCSS(css: string | undefined): string {
  if (!css) return ''

  // Remover potenciales inyecciones peligrosas
  const dangerous = [
    /expression\s*\(/gi,      // IE expression()
    /javascript\s*:/gi,       // javascript: URLs
    /behavior\s*:/gi,         // IE behavior
    /@import/gi,              // External imports
    /url\s*\(\s*['"]?data:/gi // data: URLs (pueden ser abusados)
  ]

  let sanitized = css
  for (const pattern of dangerous) {
    sanitized = sanitized.replace(pattern, '/* blocked */')
  }

  return sanitized
}

// En createStyles:
const sections = [
  // ...
  sanitizeCSS(preset.styles?.additionalCSS),
]
```

---

## Checklist de Implementación

### Fase 1 - Críticos (Día 1)
- [ ] 1.1 Fix FoldLineMode.update()
- [ ] 1.2 Añadir 'toggle-mode' a MessageAction
- [ ] 1.3 Consolidar interfaces duplicadas

### Fase 2 - Media (Día 2-3)
- [ ] 2.1 Calcular lineHeight dinámicamente
- [ ] 2.2 Añadir debouncing a viewport
- [ ] 2.3 Fix race condition activeModes
- [ ] 2.4 Validar type casting
- [ ] 2.5 Loggear errores en storage
- [ ] 2.6 Centralizar z-index

### Fase 3 - CSS (Día 4)
- [ ] 3.1 Reducir !important (evaluar CSS layers)
- [ ] 3.2 Mejorar selectores navegación
- [ ] 3.3 Fix CanvasText compatibility

### Fase 4 - Arquitectura (Día 5)
- [ ] 4.1 Metadata de modos desde registry
- [ ] 4.2 Domains para Docusaurus
- [ ] 4.3 Cache de analytics
- [ ] 4.4 Optimizar querySelectorAll

### Fase 5 - Seguridad (Día 6)
- [ ] 5.1 Sanitizar innerHTML
- [ ] 5.2 Validar additionalCSS

---

## Testing Post-Implementación

1. **Smoke test:** Activar/desactivar cada modo
2. **Regression:** Verificar que presets existentes funcionan
3. **Performance:** Medir tiempo de analyzeScannability en página grande
4. **Edge cases:**
   - Página sin content area
   - Iframe embebido
   - Shadow DOM
   - Página con muchos overlays propios

---

## Notas Finales

- Cada fix debe incluir al menos un test manual
- Commitear cada fase por separado para facilitar rollback
- Documentar breaking changes si los hay (ej. si se cambian types exportados)
