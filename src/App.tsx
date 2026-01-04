import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { ModeList } from './components/ModeList'
import { detectPlatform, getPresetById, PRESETS } from './presets/platforms'
import type { AnalyticsData, ScanConfig } from './types/messages'
import { DEFAULT_CONFIG } from './types/messages'
import { getConfig, resetConfig, saveConfig } from './utils/storage'

function App() {
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<ScanConfig>(DEFAULT_CONFIG)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [detectedPresetId, setDetectedPresetId] = useState<string | null>(null)
  const [activeModes, setActiveModes] = useState<string[]>(['scan'])

  useEffect(() => {
    const init = async () => {
      const savedConfig = await getConfig()
      setConfig(savedConfig)

      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

        if (tab.url) {
          const detected = detectPlatform(tab.url)
          setDetectedPresetId(detected.id)

          // Auto-select detected preset if using default
          if (savedConfig.presetId === 'default' && detected.id !== 'default') {
            const newConfig = { ...savedConfig, presetId: detected.id }
            setConfig(newConfig)
            await saveConfig(newConfig)
          }
        }

        if (tab.id) {
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'get-state' })
          if (response?.isScanning !== undefined) {
            setIsActive(response.isScanning)
          }
          if (response?.activeModes) {
            setActiveModes(response.activeModes)
          }
        }
      } catch {
        // Content script not loaded
      }
    }
    init()
  }, [])

  const sendConfigToTab = useCallback(async (newConfig: ScanConfig) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab.id) {
        const preset = getPresetById(newConfig.presetId)
        await chrome.tabs.sendMessage(tab.id, {
          action: 'update-config',
          config: newConfig,
          preset,
        })
      }
    } catch {
      // Content script not loaded
    }
  }, [])

  const handleConfigChange = useCallback(
    async (key: keyof ScanConfig, value: number | string) => {
      const newConfig = { ...config, [key]: value }
      setConfig(newConfig)
      await saveConfig(newConfig)
      if (isActive) {
        await sendConfigToTab(newConfig)
      }
    },
    [config, isActive, sendConfigToTab],
  )

  const handleReset = useCallback(async () => {
    const defaultConfig = await resetConfig()
    // Keep detected preset if available
    if (detectedPresetId && detectedPresetId !== 'default') {
      defaultConfig.presetId = detectedPresetId
    }
    setConfig(defaultConfig)
    await saveConfig(defaultConfig)
    if (isActive) {
      await sendConfigToTab(defaultConfig)
    }
  }, [isActive, sendConfigToTab, detectedPresetId])

  const handleModeToggle = useCallback(
    async (modeId: string, enabled: boolean) => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (!tab.id) return

        const preset = getPresetById(config.presetId)
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'toggle-mode',
          modeId,
          enabled,
          config,
          preset,
        })

        if (response?.activeModes) {
          setActiveModes(response.activeModes)
          // Update isActive based on scan mode
          setIsActive(response.activeModes.includes('scan'))
          if (response.analytics) {
            setAnalytics(response.analytics)
          }
        }
      } catch {
        setError('Reload the page and try again')
      }
    },
    [config],
  )

  const toggleScan = async () => {
    setError(null)
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      if (!tab.id) {
        setError('No active tab found')
        return
      }

      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
        setError('Cannot scan browser pages')
        return
      }

      const preset = getPresetById(config.presetId)
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'toggle-scan',
        config,
        preset,
      })
      if (response?.isScanning !== undefined) {
        setIsActive(response.isScanning)
        if (response.analytics) {
          setAnalytics(response.analytics)
        } else {
          setAnalytics(null)
        }
      }
    } catch {
      setError('Reload the page and try again')
    }
  }

  const getScoreClass = (score: number): string => {
    if (score >= 70) return 'score--good'
    if (score >= 40) return 'score--medium'
    return 'score--poor'
  }

  const getScoreLabel = (score: number): string => {
    if (score >= 70) return 'Good scannability'
    if (score >= 40) return 'Needs improvement'
    return 'Poor scannability'
  }

  const currentPreset = getPresetById(config.presetId)
  const isAutoDetected = detectedPresetId === config.presetId && detectedPresetId !== 'default'
  const buttonClass = `scan-button ${isActive ? 'scan-button--active' : 'scan-button--inactive'}`

  return (
    <div className="popup">
      <h3 className="popup-title">ScanVision Linter</h3>

      <button type="button" onClick={toggleScan} className={buttonClass}>
        {isActive ? 'Scan Active' : 'Start Scan'}
      </button>

      {error && <div className="error-message">{error}</div>}

      {/* Analytics Section */}
      {isActive && analytics && (
        <div className="analytics">
          <div className="analytics-header">
            <span className="analytics-title">Analysis</span>
          </div>

          <div className="score-container">
            <div className={`score-value ${getScoreClass(analytics.score)}`}>{analytics.score}</div>
            <div className="score-label">{getScoreLabel(analytics.score)}</div>
          </div>

          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{analytics.totalAnchors}</div>
              <div className="stat-label">Anchors</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{analytics.totalTextBlocks}</div>
              <div className="stat-label">Text Blocks</div>
            </div>
          </div>

          {analytics.problemBlocks > 0 ? (
            <div className="problem-alert">
              <span className="problem-icon">⚠️</span>
              <span>
                {analytics.problemBlocks} block{analytics.problemBlocks > 1 ? 's' : ''} without
                visual anchors
              </span>
            </div>
          ) : (
            <div className="problem-alert problem-alert--none">
              <span className="problem-icon">✓</span>
              <span>No problematic blocks found</span>
            </div>
          )}

          <div className="breakdown">
            <div className="breakdown-title">Anchors Breakdown</div>
            <div className="breakdown-grid">
              <div className="breakdown-item">
                <span className="breakdown-value">{analytics.anchorsBreakdown.headings}</span>
                <span className="breakdown-label">Headings</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-value">{analytics.anchorsBreakdown.emphasis}</span>
                <span className="breakdown-label">Emphasis</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-value">{analytics.anchorsBreakdown.code}</span>
                <span className="breakdown-label">Code</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-value">{analytics.anchorsBreakdown.links}</span>
                <span className="breakdown-label">Links</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-value">{analytics.anchorsBreakdown.images}</span>
                <span className="breakdown-label">Images</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-value">{analytics.anchorsBreakdown.lists}</span>
                <span className="breakdown-label">Lists</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preset Selector */}
      <div className="preset-section">
        <div className="preset-label">
          <span>Platform Preset</span>
          {isAutoDetected && <span className="preset-auto">Auto-detected</span>}
        </div>
        <select
          className="preset-select"
          value={config.presetId}
          onChange={(e) => handleConfigChange('presetId', e.target.value)}
          aria-label="Platform Preset"
        >
          {PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
        <div className="preset-description">{currentPreset.description}</div>
      </div>

      {/* Controls */}
      <div className="controls">
        <div className="control-group">
          <div className="control-label">
            <span>Text Visibility</span>
            <span className="control-value">{Math.round(config.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            className="slider"
            min="0.1"
            max="0.5"
            step="0.05"
            value={config.opacity}
            onChange={(e) => handleConfigChange('opacity', parseFloat(e.target.value))}
            aria-label="Text Visibility"
          />
        </div>

        <div className="control-group">
          <div className="control-label">
            <span>Blur Amount</span>
            <span className="control-value">{config.blur}px</span>
          </div>
          <input
            type="range"
            className="slider"
            min="0"
            max="2"
            step="0.25"
            value={config.blur}
            onChange={(e) => handleConfigChange('blur', parseFloat(e.target.value))}
            aria-label="Blur Amount"
          />
        </div>

        <button type="button" onClick={handleReset} className="reset-button">
          Reset to Defaults
        </button>
      </div>

      {/* Visualization Modes */}
      <div className="modes-section">
        <div className="modes-header">
          <span className="modes-title">Visualization Modes</span>
        </div>
        <ModeList activeModes={activeModes} onToggle={handleModeToggle} />
      </div>
    </div>
  )
}

export default App
