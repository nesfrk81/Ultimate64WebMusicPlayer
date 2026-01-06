import { useState } from 'react'
import { useSettings } from '../hooks/useSettings'
import './PlayOptions.css'

function PlayOptions({ options, onChange, onPlay, onStop, onBack, songCount, isPlaying = false, hideOptions = false }) {
  const { settings } = useSettings()
  const [localOptions, setLocalOptions] = useState(options)

  const handleChange = (key, value) => {
    const updated = { ...localOptions, [key]: value }
    setLocalOptions(updated)
    onChange(updated)
  }

  const isMusEnabled = settings?.musPlayerPath && settings.musPlayerPath.trim() !== ''

  return (
    <div className="play-options">
      {!hideOptions && (
        <>
          <div className="options-group">
            <label className="option-label">
              <input
                type="checkbox"
                checked={localOptions.shuffle}
                onChange={(e) => handleChange('shuffle', e.target.checked)}
              />
              <span>Shuffle</span>
            </label>
            <label className="option-label">
              <input
                type="checkbox"
                checked={localOptions.loop}
                onChange={(e) => handleChange('loop', e.target.checked)}
              />
              <span>Loop</span>
            </label>
          </div>

          <div className="options-group">
            <label className="option-label">
              <input
                type="checkbox"
                checked={localOptions.useSidSonglength && settings?.songlengthsAvailable !== false}
                onChange={(e) => handleChange('useSidSonglength', e.target.checked)}
                disabled={settings?.songlengthsAvailable === false}
              />
              <span>Use SID songlength file</span>
              {settings?.songlengthsAvailable === false && (
                <span className="option-unavailable">(not available)</span>
              )}
            </label>
            {(!localOptions.useSidSonglength || settings?.songlengthsAvailable === false) && (
              <div className="option-info">
                Default SID play time: {settings?.defaultSidPlayTime || 60} seconds
              </div>
            )}
          </div>

          {isMusEnabled && (
            <div className="options-group">
              <div className="option-info">
                Default MUS play time: {settings?.defaultMusPlayTime || 60} seconds
              </div>
            </div>
          )}
        </>
      )}

      <div className="action-buttons">
        <button
          className="stop-button"
          onClick={onStop}
          disabled={!isPlaying}
        >
          Stop
        </button>
        <button
          className="play-button"
          onClick={onPlay}
          disabled={songCount === 0}
        >
          Play ({songCount} songs)
        </button>
        {onBack && (
          <button
            className="back-button"
            onClick={onBack}
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  )
}

export default PlayOptions
