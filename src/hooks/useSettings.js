import { useState, useEffect } from 'react'
import { getSettings, saveSettings } from '../services/storage'

export function useSettings() {
  const [settings, setSettings] = useState({
    ip: '',
    hvscPath: '',
    cgscPath: '',
    musPlayerPath: '',
    useSidSonglength: true,
    defaultSidPlayTime: 60,
    defaultMusPlayTime: 60,
    shuffle: false,
    loop: false,
    theme: 'c64-basic'
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    // Apply theme to document root
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme])

  const loadSettings = async () => {
    try {
      const saved = await getSettings()
      if (saved) {
        setSettings(prev => ({ ...prev, ...saved }))
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateSettings = async (newSettings) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    await saveSettings(updated)
    // Apply theme immediately
    if (newSettings.theme) {
      document.documentElement.setAttribute('data-theme', newSettings.theme)
    }
  }

  return { settings, isLoading, updateSettings }
}
