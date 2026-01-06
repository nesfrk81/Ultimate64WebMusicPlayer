import { getSettings } from './storage'

// Check if we're in development mode
const isDevelopment = import.meta.env.DEV
const PROXY_URL = import.meta.env.VITE_PROXY_URL

const getBaseUrl = async () => {
  const settings = await getSettings()
  if (!settings || !settings.ip) {
    throw new Error('Ultimate64 IP address not configured')
  }
  
  // In development, use proxy if available to avoid CORS issues
  if (isDevelopment && PROXY_URL) {
    return PROXY_URL
  }
  
  // Try Vite proxy in development
  if (isDevelopment) {
    return '/api/ultimate64'
  }
  
  // In production, use direct URL (may have CORS issues)
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
  
  // Ensure base path ends with /
  if (!basePath.endsWith('/')) {
    basePath += '/'
  }
  
  // Remove leading / from relative path if present
  const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath
  
  return basePath + cleanPath
}

export const playSid = async (songPath, collection = 'hvsc', songNumber = null) => {
  const baseUrl = await getBaseUrl()
  const fullPath = await getFullPath(songPath, collection)
  
  // Ultimate64 API uses PUT method with file as query parameter
  let url = `${baseUrl}/v1/runners:sidplay?file=${encodeURIComponent(fullPath)}`
  if (songNumber) {
    url += `&songnr=${songNumber}`
  }
  
  console.log('=== playSid START ===')
  console.log('songPath:', songPath)
  console.log('collection:', collection)
  console.log('fullPath:', fullPath)
  console.log('baseUrl:', baseUrl)
  console.log('URL:', url)
  console.log('Method: PUT')
  
  try {
    console.log('Creating fetch request...')
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Length': '0'
      }
    })
    
    console.log('=== Response received ===')
    console.log('Status:', response.status)
    console.log('StatusText:', response.statusText)
    console.log('OK:', response.ok)
    console.log('Headers:', Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log('Body:', responseText || '(empty)')
    console.log('Body length:', responseText.length)
    
    if (response.status >= 400) {
      console.error('=== ERROR: Bad status code ===')
      throw new Error(`Failed to play SID: ${response.status} ${response.statusText} - ${responseText}`)
    }
    
    console.log('=== playSid SUCCESS ===')
    return { success: true, message: 'SID play command sent' }
  } catch (error) {
    console.error('=== playSid ERROR ===')
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    
    // Connection reset might mean success - the Ultimate64 closes connection after processing
    if (error.message && error.message.includes('network')) {
      console.log('Network error - command may have been sent successfully')
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
  
  console.log('Playing MUS:', { fullPath, musPlayerPath, baseUrl })
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    // Run the MUS player program with the MUS file
    const url = `${baseUrl}/v1/runners:run_prg?file=${musPlayerPath}`
    
    console.log('Running MUS player:', url)
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      console.log('MUS player response:', response.status, response.statusText)
      
      if (response.status >= 400) {
        const errorText = await response.text()
        throw new Error(`Failed to run MUS player: ${response.status} ${errorText}`)
      }
      
      console.log('✓ MUS player started')
      return { success: true, message: 'MUS player started' }
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        console.log('✓ MUS player command sent (timeout, assuming success)')
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
  
  console.log('=== stopPlayback START ===')
  console.log('URL:', url)
  console.log('Method: PUT')
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Length': '0'
      }
    })
    
    console.log('=== Response received ===')
    console.log('Status:', response.status)
    console.log('StatusText:', response.statusText)
    
    console.log('=== stopPlayback SUCCESS ===')
    return { success: true, message: 'Playback stopped' }
  } catch (error) {
    console.error('=== stopPlayback ERROR ===')
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    
    // Connection reset might mean success
    if (error.message && error.message.includes('network')) {
      console.log('Network error - command may have been sent successfully')
      return { success: true, message: 'Playback stopped (connection closed)' }
    }
    
    throw error
  }
}

export const testConnection = async () => {
  const baseUrl = await getBaseUrl()
  const url = `${baseUrl}/v1/info`
  
  console.log('Testing connection:', url)
  
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
    console.log('Connection test result:', data)
    return data
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Connection test timed out.')
    }
    console.error('Error testing connection:', error)
    throw error
  }
}

// Check if songlengths are available in our local index
// The songlength data is baked into hvsc-index.json, so we check if that data exists
// First tries to use the already-loaded index, then falls back to fetching
export const checkSonglengthsAvailable = async () => {
  try {
    // First, try to use the already-loaded index from search.js
    const { loadIndices } = await import('./search')
    
    // Ensure indices are loaded
    await loadIndices()
    
    // Try to access the loaded index (this is a bit of a hack, but works)
    // We'll fetch it again to be safe, but with better error handling
    const BASE_URL = import.meta.env.BASE_URL
    const indexUrl = `${BASE_URL}data/hvsc-index.json.gz`
    
    console.log('Checking songlengths availability from:', indexUrl)
    
    // Check if we have the index with songlength data
    const response = await fetch(indexUrl)
    if (!response.ok) {
      console.log('HVSC index not found:', response.status, response.statusText)
      return false
    }
    
    // Decompress the gzip file
    const { decompressGzip } = await import('./search')
    const arrayBuffer = await response.arrayBuffer()
    const decompressed = await decompressGzip(arrayBuffer)
    const data = JSON.parse(decompressed)
    
    // Check if at least some songs have songlength data
    const songsWithLengths = data.songs?.filter(s => s.songlengths && s.songlengths.length > 0) || []
    const hasLengths = songsWithLengths.length > 0
    
    console.log(`Songlengths available: ${hasLengths} (${songsWithLengths.length} songs with lengths)`)
    
    // Update settings if songlengths are available
    if (hasLengths) {
      try {
        const { getSettings, saveSettings } = await import('./storage')
        const currentSettings = await getSettings()
        if (currentSettings && currentSettings.songlengthsAvailable !== true) {
          console.log('Updating settings: songlengths are now available')
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
