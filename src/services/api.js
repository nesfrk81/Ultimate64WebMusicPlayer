import { getSettings } from './storage'

const isDevelopment = import.meta.env.DEV
const PROXY_URL = import.meta.env.VITE_PROXY_URL

const getBaseUrl = async () => {
  const settings = await getSettings()
  if (!settings || !settings.ip) {
    throw new Error('Ultimate64 IP address not configured')
  }
  
  if (isDevelopment && PROXY_URL) {
    return PROXY_URL
  }
  
  if (isDevelopment) {
    return '/api/ultimate64'
  }
  
  return `http://${settings.ip}`
}

const getFullPath = async (relativePath, collection) => {
  const settings = await getSettings()
  if (!settings) {
    throw new Error('Settings not configured')
  }
  
  let basePath = ''
  if (collection === 'hvsc') {
    basePath = settings.hvscPath || '/Usb0/HVSC/'
  } else if (collection === 'cgsc') {
    basePath = settings.cgscPath || '/Usb0/CGSC/'
  }
  
  if (!basePath.endsWith('/')) {
    basePath += '/'
  }
  
  const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath
  
  return basePath + cleanPath
}

export const playSid = async (songPath, collection = 'hvsc', songNumber = null) => {
  const baseUrl = await getBaseUrl()
  const fullPath = await getFullPath(songPath, collection)
  
  let url = `${baseUrl}/v1/runners:sidplay?file=${encodeURIComponent(fullPath)}`
  if (songNumber) {
    url += `&songnr=${songNumber}`
  }
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Length': '0'
      }
    })
    
    const responseText = await response.text()
    
    if (response.status >= 400) {
      throw new Error(`Failed to play SID: ${response.status} ${response.statusText} - ${responseText}`)
    }
    
    return { success: true, message: 'SID play command sent' }
  } catch (error) {
    if (error.message && error.message.includes('network')) {
      return { success: true, message: 'SID play command sent (connection closed)' }
    }
    
    throw error
  }
}

export const playMus = async (songPath, collection = 'cgsc') => {
  const baseUrl = await getBaseUrl()
  const settings = await getSettings()
  
  if (!settings || !settings.musPlayerPath || settings.musPlayerPath.trim() === '') {
    throw new Error('MUS player path not configured')
  }
  
  const musPlayerPath = settings.musPlayerPath
  const fullPath = await getFullPath(songPath, collection)
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const url = `${baseUrl}/v1/runners:run_prg?file=${musPlayerPath}`
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.status >= 400) {
        const errorText = await response.text()
        throw new Error(`Failed to run MUS player: ${response.status} ${errorText}`)
      }
      
      return { success: true, message: 'MUS player started' }
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        return { success: true, message: 'MUS player started' }
      }
      throw fetchError
    }
  } catch (error) {
    console.error('Error playing MUS:', error)
    throw error
  }
}

export const stopPlayback = async () => {
  const baseUrl = await getBaseUrl()
  const url = `${baseUrl}/v1/machine:reset`
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Length': '0'
      }
    })
    
    return { success: true, message: 'Playback stopped' }
  } catch (error) {
    if (error.message && error.message.includes('network')) {
      return { success: true, message: 'Playback stopped (connection closed)' }
    }
    
    throw error
  }
}

export const testConnection = async () => {
  const baseUrl = await getBaseUrl()
  const url = `${baseUrl}/v1/info`
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`Connection test failed: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Connection test timed out.')
    }
    console.error('Error testing connection:', error)
    throw error
  }
}

export const checkSonglengthsAvailable = async () => {
  try {
    const { loadIndices } = await import('./search')
    await loadIndices()
    
    const BASE_URL = import.meta.env.BASE_URL
    const indexUrl = `${BASE_URL}data/hvsc-index.json.gz`
    
    const response = await fetch(indexUrl)
    if (!response.ok) {
      return false
    }
    
    const { decompressGzip } = await import('./search')
    const arrayBuffer = await response.arrayBuffer()
    const decompressed = decompressGzip(arrayBuffer)
    const data = JSON.parse(decompressed)
    
    const songsWithLengths = data.songs?.filter(s => s.songlengths && s.songlengths.length > 0) || []
    const hasLengths = songsWithLengths.length > 0
    
    if (hasLengths) {
      try {
        const { getSettings, saveSettings } = await import('./storage')
        const currentSettings = await getSettings()
        if (currentSettings && currentSettings.songlengthsAvailable !== true) {
          await saveSettings({ ...currentSettings, songlengthsAvailable: true })
        }
      } catch (err) {
        console.warn('Could not update songlengths availability in settings:', err)
      }
    }
    
    return hasLengths
  } catch (error) {
    console.error('Error checking songlengths:', error)
    return false
  }
}
