/**
 * ModeList - Displays all visualization modes grouped by category
 */

import { getModeById, getModesGroupedByCategory, type ModeInfo } from '../modes/metadata'
import { t } from '../utils/i18n'
import { ModeToggle } from './ModeToggle'

interface ModeListProps {
  activeModes: string[]
  onToggle: (modeId: string, enabled: boolean) => void
}

export function ModeList({ activeModes, onToggle }: ModeListProps) {
  // Get modes grouped by category from centralized metadata
  const modesByCategory = getModesGroupedByCategory()

  // Check if a mode is disabled due to conflicts
  const getDisabledInfo = (mode: ModeInfo): { disabled: boolean; reason?: string } => {
    for (const incompatibleId of mode.incompatibleWith) {
      if (activeModes.includes(incompatibleId)) {
        const conflictingMode = getModeById(incompatibleId)
        return {
          disabled: true,
          reason: t('msgIncompatibleWith', conflictingMode?.name || incompatibleId),
        }
      }
    }
    return { disabled: false }
  }

  return (
    <div className="mode-list">
      {modesByCategory.map(({ category, label, description, modes }) => (
        <div key={category} className="mode-category">
          <div className="mode-category__header">
            <div className="mode-category__label">{label}</div>
            <div className="mode-category__description">{description}</div>
          </div>
          <div className="mode-category__items">
            {modes.map((mode) => {
              const { disabled, reason } = getDisabledInfo(mode)
              return (
                <ModeToggle
                  key={mode.id}
                  id={mode.id}
                  name={mode.name}
                  description={mode.description}
                  useCase={mode.useCase}
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
