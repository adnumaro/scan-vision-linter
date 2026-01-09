import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { ModeList } from './components/ModeList'
import { detectPlatform, getPresetById, PRESETS } from './config/presets'
import type { AnalyticsData, ScanConfig } from './types/messages'
import { DEFAULT_CONFIG } from './types/messages'
import { t } from './utils/i18n'
import {
  clearAnalytics,
  getAnalytics,
  getConfig,
  resetConfig,
  saveAnalytics,
  saveConfig,
} from './utils/storage'

function App() {
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<ScanConfig>(DEFAULT_CONFIG)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [detectedPresetId, setDetectedPresetId] = useState<string | null>(null)
  const [activeModes, setActiveModes] = useState<string[]>(['scan'])
  const [isReanalyzing, setIsReanalyzing] = useState(false)
  // Accordion states
  const [presetExpanded, setPresetExpanded] = useState(true)
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true)
  const [modesExpanded, setModesExpanded] = useState(false)
  const [customizationExpanded, setCustomizationExpanded] = useState(false)

  useEffect(() => {
    const detectAndUpdateState = async () => {
      const savedConfig = await getConfig()

      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

        if (tab.url) {
          const detected = detectPlatform(tab.url)
          setDetectedPresetId(detected.id)

          // Load saved analytics for this specific URL
          const savedAnalytics = await getAnalytics(tab.url)
          if (savedAnalytics) {
            setAnalytics(savedAnalytics)
          } else {
            setAnalytics(null)
          }

          // Always use detected preset for current page
          const newConfig = { ...savedConfig, presetId: detected.id }
          setConfig(newConfig)
        } else {
          setAnalytics(null)
          setConfig(savedConfig)
        }

        if (tab.id) {
          try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'get-state' })
            if (response?.isScanning !== undefined) {
              setIsActive(response.isScanning)
            } else {
              setIsActive(false)
            }
            if (response?.activeModes) {
              setActiveModes(response.activeModes)
            } else {
              setActiveModes(['scan'])
            }
            // Only update analytics if we got fresh data from content script
            if (response?.analytics && tab.url) {
              setAnalytics(response.analytics)
              await saveAnalytics(tab.url, response.analytics)
            }
          } catch {
            // Content script not loaded on this tab
            setIsActive(false)
            setActiveModes(['scan'])
            // Keep saved analytics for this URL, don't clear them
          }
        }
      } catch {
        // No active tab
        setConfig(savedConfig)
      }
    }

    // Initial detection
    detectAndUpdateState()

    // Listen for tab changes
    const handleTabActivated = () => {
      detectAndUpdateState()
    }

    const handleTabUpdated = (_tabId: number, changeInfo: { url?: string; status?: string }) => {
      if (changeInfo.url || changeInfo.status === 'complete') {
        detectAndUpdateState()
      }
    }

    // Re-sync state when popup gains focus (handles page reloads)
    const handleFocus = () => {
      detectAndUpdateState()
    }

    chrome.tabs.onActivated.addListener(handleTabActivated)
    chrome.tabs.onUpdated.addListener(handleTabUpdated)
    window.addEventListener('focus', handleFocus)

    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated)
      chrome.tabs.onUpdated.removeListener(handleTabUpdated)
      window.removeEventListener('focus', handleFocus)
    }
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
    if (detectedPresetId && detectedPresetId !== 'global') {
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
        setError(t('errReloadPage'))
      }
    },
    [config],
  )

  const toggleScan = async () => {
    setError(null)
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      if (!tab.id) {
        setError(t('errNoActiveTab'))
        return
      }

      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
        setError(t('errCannotScanBrowser'))
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
        if (response.analytics && tab.url) {
          setAnalytics(response.analytics)
          await saveAnalytics(tab.url, response.analytics)
        } else if (tab.url) {
          setAnalytics(null)
          await clearAnalytics(tab.url)
        }
      }
    } catch {
      setError(t('errReloadPage'))
    }
  }

  const reAnalyze = async () => {
    setError(null)
    setIsReanalyzing(true)

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      if (!tab.id || !tab.url) {
        setError(t('errNoActiveTab'))
        setIsReanalyzing(false)
        return
      }

      // Clear current analytics and storage for this URL
      setAnalytics(null)
      await clearAnalytics(tab.url)

      // Send message to clear overlays and re-analyze
      const preset = getPresetById(config.presetId)

      // First deactivate to clear overlays, then reactivate
      await chrome.tabs.sendMessage(tab.id, {
        action: 'toggle-scan',
        config,
        preset,
      })

      // Small delay for visual feedback
      await new Promise((resolve) => setTimeout(resolve, 400))

      // Reactivate scan
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'toggle-scan',
        config,
        preset,
      })

      if (response?.analytics) {
        setAnalytics(response.analytics)
        await saveAnalytics(tab.url, response.analytics)
        setIsActive(response.isScanning)
      }
    } catch {
      setError(t('errReloadPage'))
    } finally {
      setIsReanalyzing(false)
    }
  }

  const getScoreClass = (score: number): string => {
    if (score >= 70) return 'score--good'
    if (score >= 40) return 'score--medium'
    return 'score--poor'
  }

  const getScoreLabel = (score: number): string => {
    if (score >= 70) return t('msgGoodScannability')
    if (score >= 40) return t('msgNeedsImprovement')
    return t('msgPoorScannability')
  }

  const formatTimestamp = (timestamp: number | undefined): string => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return t('lblTodayAt', date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const currentPreset = getPresetById(config.presetId)
  const isAutoDetected = detectedPresetId === config.presetId && detectedPresetId !== 'global'
  const buttonClass = `scan-button ${isActive ? 'scan-button--active' : 'scan-button--inactive'}`

  return (
    <div className="popup">
      <h3 className="popup-title">
        <img src="/icon-32.png" alt="" className="popup-icon" />
        {t('extName')}
      </h3>

      <button type="button" onClick={toggleScan} className={buttonClass}>
        {isActive ? t('btnScanActive') : t('btnStartScan')}
      </button>

      {error && <div className="error-message">{error}</div>}

      {/* 1. Preset Selector Section */}
      <div className="section">
        <button
          type="button"
          className="section-header"
          onClick={() => setPresetExpanded(!presetExpanded)}
        >
          {presetExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="section-title">{t('lblPlatformPreset')}</span>
          {isAutoDetected && <span className="preset-auto">{t('lblAutoDetected')}</span>}
        </button>
        {presetExpanded && (
          <div className="section-content">
            <select
              className="preset-select"
              value={config.presetId}
              onChange={(e) => handleConfigChange('presetId', e.target.value)}
              aria-label={t('lblPlatformPreset')}
            >
              {PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <div className="preset-description">{currentPreset.description}</div>
          </div>
        )}
      </div>

      {/* 2. Analytics Section */}
      <div className="section">
        <div className="section-header-with-action">
          <button
            type="button"
            className="section-header"
            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
          >
            {analyticsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span className="section-title">{t('lblAnalysis')}</span>
          </button>
          <button
            type="button"
            className={`reanalyze-button ${isReanalyzing ? 'reanalyze-button--spinning' : ''}`}
            onClick={() => {
              if (!isReanalyzing) reAnalyze()
            }}
            disabled={isReanalyzing}
            title={t('btnReanalyze')}
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {analyticsExpanded && !analytics && (
          <div className="section-content section-content--empty">
            <span className="analytics-empty-text">{t('msgNoAnalysis')}</span>
          </div>
        )}

        {analyticsExpanded && analytics && (
          <div className="section-content">
            <div className="score-container">
              <div className={`score-value ${getScoreClass(analytics.score)}`}>
                {analytics.score}
              </div>
              <div className="score-label">{getScoreLabel(analytics.score)}</div>
              {analytics.timestamp && (
                <div className="score-timestamp">{formatTimestamp(analytics.timestamp)}</div>
              )}
            </div>

            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{analytics.totalAnchors}</div>
                <div className="stat-label">{t('lblAnchors')}</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{analytics.totalTextBlocks}</div>
                <div className="stat-label">{t('lblTextBlocks')}</div>
              </div>
            </div>

            {/* Problems Section */}
            {analytics.problems && analytics.problems.length > 0 ? (
              <div className="problems-section">
                <div className="problems-header">
                  <span className="problems-icon">⚠️</span>
                  <span className="problems-title">
                    {t('lblProblemsCount', analytics.problems.length.toString())}
                  </span>
                </div>
                <ul className="problems-list">
                  {analytics.problems.map((problem) => (
                    <li key={problem.id} className="problem-item">
                      <span className="problem-info">
                        <span className="problem-count">{problem.count}×</span>
                        <span className="problem-desc">{problem.description}</span>
                      </span>
                      <span className="problem-penalty">-{problem.penalty}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="problem-alert problem-alert--none">
                <span className="problem-icon">✓</span>
                <span>{t('msgNoIssues')}</span>
              </div>
            )}

            <div className="breakdown">
              <div className="breakdown-title">{t('lblAnchorsBreakdown')}</div>
              <div className="breakdown-grid">
                <div className="breakdown-item">
                  <span className="breakdown-value">{analytics.anchorsBreakdown.headings}</span>
                  <span className="breakdown-label">{t('lblHeadings')}</span>
                </div>
                <div
                  className={`breakdown-item ${analytics.anchorsBreakdown.emphasis === 0 ? 'breakdown-item--warning' : ''}`}
                >
                  <span className="breakdown-value">
                    {analytics.anchorsBreakdown.emphasis}
                    {analytics.anchorsBreakdown.emphasis === 0 && (
                      <span className="breakdown-warning">⚠️</span>
                    )}
                  </span>
                  <span className="breakdown-label">{t('lblEmphasis')}</span>
                </div>
                <div
                  className={`breakdown-item ${analytics.anchorsBreakdown.code === 0 && analytics.unformattedCodeBlocks > 0 ? 'breakdown-item--warning' : ''}`}
                >
                  <span className="breakdown-value">
                    {analytics.anchorsBreakdown.code}
                    {analytics.anchorsBreakdown.code === 0 &&
                      analytics.unformattedCodeBlocks > 0 && (
                        <span className="breakdown-warning">⚠️</span>
                      )}
                  </span>
                  <span className="breakdown-label">{t('lblCode')}</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-value">{analytics.anchorsBreakdown.links}</span>
                  <span className="breakdown-label">{t('lblLinks')}</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-value">{analytics.anchorsBreakdown.images}</span>
                  <span className="breakdown-label">{t('lblImages')}</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-value">{analytics.anchorsBreakdown.lists}</span>
                  <span className="breakdown-label">{t('lblLists')}</span>
                </div>
              </div>
            </div>

            {/* Color Legend */}
            {analytics.unformattedCodeBlocks > 0 && (
              <div className="color-legend">
                <div className="legend-title">{t('lblColorGuide')}</div>
                <div className="legend-grid">
                  <div className="legend-item">
                    <span className="legend-color legend-color--orange-dashed" />
                    <span className="legend-label">{t('lblUnformattedCode')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Platform-specific Suggestions */}
            {analytics.suggestions && analytics.suggestions.length > 0 && (
              <div className="suggestions">
                <div className="suggestions-title">
                  <span className="suggestions-icon">💡</span>
                  <span>{t('lblSuggestionsFor', currentPreset.name)}</span>
                </div>
                <ul className="suggestions-list">
                  {analytics.suggestions.map((suggestion) => (
                    <li key={suggestion.id} className="suggestion-item">
                      <span className="suggestion-name">{suggestion.name}</span>
                      <span className="suggestion-description">{suggestion.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Visualization Modes Section */}
      <div className="section">
        <button
          type="button"
          className="section-header"
          onClick={() => setModesExpanded(!modesExpanded)}
        >
          {modesExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="section-title">{t('lblVisualizationModes')}</span>
        </button>
        {modesExpanded && (
          <div className="section-content">
            <ModeList activeModes={activeModes} onToggle={handleModeToggle} />
          </div>
        )}
      </div>

      {/* 4. Customization Section */}
      <div className="section">
        <button
          type="button"
          className="section-header"
          onClick={() => setCustomizationExpanded(!customizationExpanded)}
        >
          {customizationExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="section-title">{t('lblCustomization')}</span>
        </button>
        {customizationExpanded && (
          <div className="section-content">
            <div className="control-group">
              <div className="control-label">
                <span>{t('lblTextVisibility')}</span>
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
                aria-label={t('lblTextVisibility')}
              />
            </div>

            <div className="control-group">
              <div className="control-label">
                <span>{t('lblBlurAmount')}</span>
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
                aria-label={t('lblBlurAmount')}
              />
            </div>

            <button type="button" onClick={handleReset} className="reset-button">
              {t('btnResetDefaults')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
