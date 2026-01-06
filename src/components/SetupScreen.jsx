import { useState, useEffect, useRef } from 'react'
import { useSettings } from '../hooks/useSettings'
import { checkSonglengthsAvailable } from '../services/api'
import './SetupScreen.css'

function SetupScreen({ onComplete }) {
  const { settings, isLoading, updateSettings } = useSettings()
  const [formData, setFormData] = useState({
    ip: '',
    proxyUrl: '',
    hvscPath: '',
    cgscPath: '',
    musPlayerPath: '',
    useSidSonglength: true,
    defaultSidPlayTime: 60,
    defaultMusPlayTime: 60,
    theme: 'c64-basic'
  })
  const [originalData, setOriginalData] = useState(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [songlengthsAvailable, setSonglengthsAvailable] = useState(null)
  const [checkingSonglengths, setCheckingSonglengths] = useState(false)
  const [songlengthWarning, setSonglengthWarning] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const originalDataRef = useRef(null)

  // Update formData when settings are loaded
  useEffect(() => {
    if (!isLoading && settings) {
      const initialData = {
        ip: settings.ip || '',
        proxyUrl: settings.proxyUrl || '',
        hvscPath: settings.hvscPath || '',
        cgscPath: settings.cgscPath || '',
        musPlayerPath: settings.musPlayerPath || '',
        useSidSonglength: settings.useSidSonglength !== false,
        defaultSidPlayTime: settings.defaultSidPlayTime || 60,
        defaultMusPlayTime: settings.defaultMusPlayTime || 60,
        theme: settings.theme || 'c64-basic'
      }
      setFormData(initialData)
      setOriginalData(initialData)
      originalDataRef.current = initialData
      setSonglengthsAvailable(settings.songlengthsAvailable ?? null)
    }
  }, [settings, isLoading])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'range' ? parseInt(value, 10) : value)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    setSonglengthWarning('')
    
    try {
      // Check if songlengths data is available in our index
      setCheckingSonglengths(true)
      const songlengthsExist = await checkSonglengthsAvailable()
      setCheckingSonglengths(false)
      setSonglengthsAvailable(songlengthsExist)
      
      if (!songlengthsExist && formData.useSidSonglength) {
        setSonglengthWarning('Songlength data not found in index. Using default play time instead.')
      }
      
      // Save settings with songlengths availability
      const settingsToSave = {
        ...formData,
        songlengthsAvailable: songlengthsExist,
        // If songlengths not available, disable the option
        useSidSonglength: songlengthsExist ? formData.useSidSonglength : false
      }
      
      await updateSettings(settingsToSave)
      setOriginalData(settingsToSave)
      originalDataRef.current = settingsToSave
      setFormData(settingsToSave)
      
      onComplete()
    } catch (error) {
      console.error('Error saving settings:', error)
      setSonglengthWarning('Error checking songlengths: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = () => {
    if (!originalDataRef.current) return false
    const original = originalDataRef.current
    return (
      formData.ip !== original.ip ||
      formData.proxyUrl !== original.proxyUrl ||
      formData.hvscPath !== original.hvscPath ||
      formData.cgscPath !== original.cgscPath ||
      formData.musPlayerPath !== original.musPlayerPath ||
      formData.useSidSonglength !== original.useSidSonglength ||
      formData.defaultSidPlayTime !== original.defaultSidPlayTime ||
      formData.defaultMusPlayTime !== original.defaultMusPlayTime ||
      formData.theme !== original.theme
    )
  }

  const handleBack = () => {
    if (hasChanges()) {
      setShowConfirmDialog(true)
    } else {
      onComplete()
    }
  }

  const handleConfirmCancel = () => {
    setShowConfirmDialog(false)
    onComplete()
  }

  const handleCancelDialog = () => {
    setShowConfirmDialog(false)
  }

  if (isLoading) {
    return (
      <div className="setup-screen">
        <div className="setup-content">
          <p>Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="setup-screen">
      <div className="setup-content">
        <h2>Setup</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="ip">Ultimate64 IP Address</label>
            <input
              type="text"
              id="ip"
              name="ip"
              value={formData.ip}
              onChange={handleChange}
              placeholder="192.168.1.234"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="proxyUrl">Proxy URL (optional)</label>
            <input
              type="text"
              id="proxyUrl"
              name="proxyUrl"
              value={formData.proxyUrl}
              onChange={handleChange}
              placeholder="http://localhost:3001"
            />
            <div className="form-hint">
              Required when using the app from HTTPS (like GitHub Pages). 
              Run the proxy helper locally first.
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="hvscPath">HVSC Base Path on C64</label>
            <input
              type="text"
              id="hvscPath"
              name="hvscPath"
              value={formData.hvscPath}
              onChange={handleChange}
              placeholder="/Usb0/HVSC/"
              required
            />
          </div>



          <div className="form-group">
            <label className="toggle-label">
              <input
                type="checkbox"
                name="useSidSonglength"
                checked={formData.useSidSonglength}
                onChange={handleChange}
                disabled={songlengthsAvailable === false}
              />
              <span> Use SID songlength file</span>
              {songlengthsAvailable === false && (
                <span className="option-disabled-hint"> (not available)</span>
              )}
            </label>
            {songlengthWarning && (
              <div className="warning-message">{songlengthWarning}</div>
            )}
          </div>

          {(!formData.useSidSonglength || songlengthsAvailable === false) && (
            <div className="form-group">
              <label htmlFor="defaultSidPlayTime">
                Default SID Play Time: {formData.defaultSidPlayTime} seconds
              </label>
              <input
                type="range"
                id="defaultSidPlayTime"
                name="defaultSidPlayTime"
                min="5"
                max="300"
                value={formData.defaultSidPlayTime}
                onChange={handleChange}
              />
            </div>
          )}


          <div className="form-group">
            <label htmlFor="theme">Theme</label>
            <select
              id="theme"
              name="theme"
              value={formData.theme}
              onChange={handleChange}
            >
              <option value="c64-basic">C64 BASIC</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="back-button"
              onClick={handleBack}
              disabled={isSaving}
            >
              {hasChanges() ? 'Cancel' : 'Back'}
            </button>
            <button 
              type="submit" 
              className="save-button"
              disabled={!hasChanges() || isSaving}
            >
              {isSaving ? (checkingSonglengths ? 'Checking songlengths...' : 'Saving...') : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {showConfirmDialog && (
        <div className="confirm-dialog-overlay" onClick={handleCancelDialog}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Unsaved Changes</h3>
            <p>You will lose changes if you continue.</p>
            <div className="confirm-dialog-actions">
              <button 
                className="confirm-button cancel"
                onClick={handleCancelDialog}
              >
                Cancel
              </button>
              <button 
                className="confirm-button ok"
                onClick={handleConfirmCancel}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SetupScreen
