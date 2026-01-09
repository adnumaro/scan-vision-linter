/**
 * ModeToggle - Individual mode toggle component
 */

import type { LucideIcon } from 'lucide-react'

interface ModeToggleProps {
  id: string
  name: string
  description: string
  useCase?: string
  icon: LucideIcon
  enabled: boolean
  disabled?: boolean
  disabledReason?: string
  onChange: (enabled: boolean) => void
}

export function ModeToggle({
  id,
  name,
  description,
  useCase,
  icon: Icon,
  enabled,
  disabled = false,
  disabledReason,
  onChange,
}: ModeToggleProps) {
  const handleClick = () => {
    if (!disabled) {
      onChange(!enabled)
    }
  }

  return (
    <button
      type="button"
      className={`mode-toggle ${enabled ? 'mode-toggle--active' : ''} ${disabled ? 'mode-toggle--disabled' : ''}`}
      onClick={handleClick}
      title={disabled ? disabledReason : undefined}
      data-mode-id={id}
      disabled={disabled}
      aria-pressed={enabled}
    >
      <div className="mode-toggle__icon">
        <Icon size={16} />
      </div>
      <div className="mode-toggle__content">
        <div className="mode-toggle__header">
          <span className="mode-toggle__name">{name}</span>
          <div className="mode-toggle__switch">
            <div className={`mode-toggle__track ${enabled ? 'mode-toggle__track--on' : ''}`}>
              <div className="mode-toggle__thumb" />
            </div>
          </div>
        </div>
        <div className="mode-toggle__description">{description}</div>
        {useCase && <div className="mode-toggle__usecase">{useCase}</div>}
      </div>
    </button>
  )
}
