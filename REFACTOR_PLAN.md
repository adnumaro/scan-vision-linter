# Plan de Refactorización - ScanVision Linter

## Estado Actual de los Modos

| Modo | Patrón Actual | Estado |
|------|---------------|--------|
| **scan** | Overlays con `backdrop-filter` | OK - Patrón objetivo |
| **first-5s** | CSS injection con `!important` | Necesita refactor |
| **f-pattern** | Overlay divs con zonas | OK |
| **e-pattern** | Overlay divs con zonas | OK |
| **heat-zones** | Overlay div con gradiente | OK |
| **fold-line** | Overlay div para línea | OK |

## Dead Code Confirmado (knip)

```
- createHotspotOverlays  (scan-overlays.ts:392)
- createProblemOverlays  (scan-overlays.ts:457)
- HotspotCategory type   (scan-overlays.ts:18)
```

---

## FASE 1: Alta Prioridad - Bugs y Riesgos

### 1.1 Memory Leak en Viewport Listeners
**Archivos:** `f-pattern-mode.ts`, `e-pattern-mode.ts`, `heat-zones-mode.ts`, `fold-line-mode.ts`

**Problema:** Si `activate()` se llama dos veces sin `deactivate()`, se acumulan listeners.

**Solución:**
```typescript
activate(context: ModeContext): void {
  if (this.active) return

  // Limpiar listener anterior si existe
  this.cleanup?.()

  // ... resto del código
  this.cleanup = onViewportChange(() => { ... })
}
```

**Archivos a modificar:** 4 archivos

---

### 1.2 Duplicación de DEFAULT_PRESET
**Archivos:** `content/index.ts:62-72`, `presets/platforms.ts:3-14`

**Problema:** El preset "default" está definido en dos lugares.

**Solución:**
1. Eliminar `DEFAULT_PRESET` de `content/index.ts`
2. Importar desde `platforms.ts`:
```typescript
import { PRESETS } from '../presets/platforms'
const DEFAULT_PRESET = PRESETS[0]
```

**Archivos a modificar:** 1 archivo

---

### 1.3 Race Condition en Cache
**Archivo:** `content/index.ts:365-368`

**Problema:** Cache se invalida después de comparar preset.

**Solución:**
```typescript
if (message.preset) {
  const presetChanged = message.preset.id !== currentPreset.id
  currentPreset = message.preset  // Actualizar ANTES
  if (presetChanged) {
    invalidateCache()
  }
}
```

**Archivos a modificar:** 1 archivo

---

### 1.4 XSS Potencial en Tooltips
**Archivo:** `scan-overlays.ts:614`

**Problema:** Usa `innerHTML` con `${description}`.

**Solución:**
```typescript
const emoji = document.createElement('span')
emoji.textContent = '⚠️'
titleDiv.appendChild(emoji)
titleDiv.appendChild(document.createTextNode(' ' + description))
```

**Archivos a modificar:** 1 archivo

---

## FASE 2: Eliminar Dead Code

### 2.1 Limpiar scan-overlays.ts
**Archivo:** `src/modes/utils/scan-overlays.ts`

**Eliminar:**
- `export type HotspotCategory` (línea 18-26)
- `function getHotspotColor()` (línea 90-109)
- `function createHotspotOverlay()` (línea 114-131)
- `export function createHotspotOverlays()` (línea 392-452)
- `export function createProblemOverlays()` (línea 457-471)
- Código relacionado con `hotspot` en `updateOverlayPositions()` y `TrackedElement`

**Mantener:**
- `createUnformattedCodeOverlays()` (usa `createProblemOverlay` internamente)

**Archivos a modificar:** 1 archivo

---

## FASE 3: Refactorizar first-5s-mode

### 3.1 Migrar de CSS Injection a Overlays
**Archivo:** `src/modes/implementations/first-5s-mode.ts`

**Problema:** Usa `injectStylesheet()` con CSS `!important` que modifica la página.

**Solución:** Usar el mismo patrón de overlays que scan-mode:
1. Crear dim overlays para párrafos (más intenso que scan)
2. Highlights para headings, bold, imágenes
3. Sin modificar estilos de la página

**Nuevo enfoque:**
```typescript
activate(context: ModeContext): void {
  // 1. Dim overlays para TODO el contenido (blur alto)
  // 2. Highlights para elementos visibles (headings, bold, images)
  // Similar a scan-mode pero con blur más intenso
}
```

**Archivos a modificar:** 1 archivo
**Dependencias:** Puede reusar utilidades de `scan-overlays.ts`

---

## FASE 4: Consolidar Patrones Comunes

### 4.1 Extraer Clase Base para Modos con Viewport Tracking
**Nuevo archivo:** `src/modes/utils/base-mode.ts`

Los modos f-pattern, e-pattern, heat-zones, fold-line comparten:
- `cleanup` para viewport listener
- `overlayElement` / `contentArea`
- Patrón `activate/deactivate` idéntico
- Método `update()` con mismo patrón

**Solución:**
```typescript
abstract class ViewportTrackingMode implements VisualizationMode {
  protected cleanup: (() => void) | null = null
  protected overlayElement: HTMLElement | null = null
  protected contentArea: Element | null = null

  activate(context: ModeContext): void {
    if (this.active) return
    this.cleanup?.() // Prevenir memory leak
    this.contentArea = context.contentArea
    this.createOverlay()
    this.cleanup = onViewportChange(() => this.updateOverlay())
    this.active = true
  }

  deactivate(): void { /* común */ }

  protected abstract createOverlay(): void
  protected abstract updateOverlay(): void
}
```

**Archivos a modificar:** 4 modos + 1 nuevo archivo

---

### 4.2 Extraer Constantes Magic Numbers
**Nuevo archivo:** `src/modes/utils/constants.ts` (ya existe, expandir)

**Constantes a extraer:**
```typescript
// De scan-overlays.ts
export const INLINE_ANCHOR_SELECTOR = 'strong, b, mark, em, a'
export const HIGHLIGHT_OFFSET = -4  // px

// De content/index.ts
export const IDEAL_ANCHOR_RATIO = 1.5
export const PROBLEM_BLOCK_PENALTY = 3
export const UNFORMATTED_CODE_PENALTY = 5

// De f-pattern-mode.ts
export const F_PATTERN = {
  topBarHeight: 0.15,
  secondBarHeight: 0.12,
  secondBarTop: 0.22,
  // ...
}
```

**Archivos a modificar:** Múltiples

---

## FASE 5: Mejoras de Arquitectura

### 5.1 Consolidar Estado Global en Content Script
**Archivo:** `content/index.ts`

**Problema:** Variables globales dispersas sin orden claro.

**Solución:** Crear un objeto de estado:
```typescript
interface ContentScriptState {
  config: ScanConfig
  preset: PlatformPreset
  analyticsCache: AnalyticsCache
  manager: ModeManager
}

function initializeState(): ContentScriptState { ... }
```

---

### 5.2 Validación Runtime de Mensajes Chrome
**Archivo:** `content/index.ts`

**Problema:** Mensajes no validados en runtime.

**Solución:** Agregar validación con tipos discriminados:
```typescript
function isValidMessage(msg: unknown): msg is Message {
  return typeof msg === 'object' && msg !== null && 'action' in msg
}
```

---

## Orden de Ejecución

```
FASE 1 (Alta Prioridad)
├── 1.1 Fix memory leak (4 archivos)
├── 1.2 Fix DEFAULT_PRESET duplicado (1 archivo)
├── 1.3 Fix race condition (1 archivo)
└── 1.4 Fix XSS potencial (1 archivo)

FASE 2 (Dead Code)
└── 2.1 Limpiar scan-overlays.ts (1 archivo)

FASE 3 (Refactor first-5s)
└── 3.1 Migrar a overlays (1 archivo)

FASE 4 (Consolidación)
├── 4.1 Crear clase base (5 archivos)
└── 4.2 Extraer constantes (múltiples)

FASE 5 (Arquitectura)
├── 5.1 Consolidar estado global
└── 5.2 Validación de mensajes
```

---

## Estimación de Cambios

| Fase | Archivos | Complejidad |
|------|----------|-------------|
| 1.1 | 4 | Baja |
| 1.2 | 1 | Baja |
| 1.3 | 1 | Baja |
| 1.4 | 1 | Baja |
| 2.1 | 1 | Media |
| 3.1 | 1 | Alta |
| 4.1 | 5 | Alta |
| 4.2 | ~6 | Media |
| 5.1 | 1 | Media |
| 5.2 | 1 | Baja |

**Total:** ~15 archivos a modificar

---

## Verificación Post-Refactor

Después de cada fase:
1. `npm run build` - Sin errores de TypeScript
2. `npm run lint` - Sin errores de linting
3. `npm run knip` - Sin nuevo dead code
4. Test manual en Chrome con Confluence/Notion
