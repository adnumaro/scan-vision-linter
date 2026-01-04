/**
 * ModeList - Displays all visualization modes grouped by category
 */

// Mode metadata for the popup (mirrors content script registry)
import { Flame, LayoutList, LayoutTemplate, Minus, ScanText, Timer } from 'lucide-react'
import type { ModeCategory } from '../modes'
import { ModeToggle } from './ModeToggle'

interface ModeInfo {
  id: string
  name: string
  description: string
  icon: typeof ScanText
  category: ModeCategory
  incompatibleWith: string[]
}

const MODES: ModeInfo[] = [
  {
    id: 'scan',
    name: 'Scan Mode',
    description: 'Dims text and highlights visual anchors',
    icon: ScanText,
    category: 'simulation',
    incompatibleWith: ['first-5s'],
  },
  {
    id: 'first-5s',
    name: 'First 5 Seconds',
    description: 'Shows what users see during quick scanning',
    icon: Timer,
    category: 'simulation',
    incompatibleWith: ['scan'],
  },
  {
    id: 'f-pattern',
    name: 'F-Pattern',
    description: 'Shows F-shaped reading pattern overlay',
    icon: LayoutTemplate,
    category: 'overlay',
    incompatibleWith: ['e-pattern'],
  },
  {
    id: 'e-pattern',
    name: 'E-Pattern',
    description: 'Shows E-shaped reading pattern overlay',
    icon: LayoutList,
    category: 'overlay',
    incompatibleWith: ['f-pattern'],
  },
  {
    id: 'heat-zones',
    name: 'Heat Zones',
    description: 'Shows attention gradient overlay',
    icon: Flame,
    category: 'overlay',
    incompatibleWith: [],
  },
  {
    id: 'fold-line',
    name: 'Fold Line',
    description: 'Shows "above the fold" indicator',
    icon: Minus,
    category: 'indicator',
    incompatibleWith: [],
  },
]

const CATEGORY_LABELS: Record<ModeCategory, string> = {
  simulation: 'Simulations',
  overlay: 'Overlays',
  indicator: 'Indicators',
}

const CATEGORY_ORDER: ModeCategory[] = ['simulation', 'overlay', 'indicator']

interface ModeListProps {
  activeModes: string[]
  onToggle: (modeId: string, enabled: boolean) => void
}

export function ModeList({ activeModes, onToggle }: ModeListProps) {
  // Group modes by category
  const modesByCategory = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    modes: MODES.filter((m) => m.category === category),
  }))

  // Check if a mode is disabled due to conflicts
  const getDisabledInfo = (mode: ModeInfo): { disabled: boolean; reason?: string } => {
    for (const incompatibleId of mode.incompatibleWith) {
      if (activeModes.includes(incompatibleId)) {
        const conflictingMode = MODES.find((m) => m.id === incompatibleId)
        return {
          disabled: true,
          reason: `Incompatible with ${conflictingMode?.name || incompatibleId}`,
        }
      }
    }
    return { disabled: false }
  }

  return (
    <div className="mode-list">
      {modesByCategory.map(({ category, label, modes }) => (
        <div key={category} className="mode-category">
          <div className="mode-category__label">{label}</div>
          <div className="mode-category__items">
            {modes.map((mode) => {
              const { disabled, reason } = getDisabledInfo(mode)
              return (
                <ModeToggle
                  key={mode.id}
                  id={mode.id}
                  name={mode.name}
                  description={mode.description}
                  icon={mode.icon}
                  enabled={activeModes.includes(mode.id)}
                  disabled={disabled}
                  disabledReason={reason}
                  onChange={(enabled) => onToggle(mode.id, enabled)}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
