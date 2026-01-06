import { getSettings } from './storage'
import pako from 'pako'

const BASE_URL = import.meta.env.BASE_URL

let hvscIndex = null
let cgscIndex = null

// Check if data is gzip compressed (starts with gzip magic bytes 0x1f 0x8b)
const isGzipped = (arrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer)
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b
}

// Decompress gzip data using pako, or return as-is if already decompressed
export const decompressGzip = (arrayBuffer) => {
  if (!isGzipped(arrayBuffer)) {
    return new TextDecoder().decode(arrayBuffer)
  }
  
  try {
    const compressed = new Uint8Array(arrayBuffer)
    const decompressed = pako.inflate(compressed, { to: 'string' })
    return decompressed
  } catch (err) {
    console.error('Decompression error:', err)
    throw new Error('Failed to decompress data: ' + err.message)
  }
}

export const loadIndices = async () => {
  try {
    const hvscUrl = `${BASE_URL}data/hvsc-index.json.gz`
    
    const hvscResponse = await fetch(hvscUrl).catch((err) => {
      console.error('Failed to fetch HVSC index:', err)
      return null
    })

    if (hvscResponse && hvscResponse.ok) {
      const arrayBuffer = await hvscResponse.arrayBuffer()
      const jsonText = decompressGzip(arrayBuffer)
      hvscIndex = JSON.parse(jsonText)
      
      // Check if songlengths are available and update settings
      const songsWithLengths = hvscIndex?.songs?.filter(s => s.songlengths && s.songlengths.length > 0) || []
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
    } else {
      console.warn('HVSC index not loaded:', hvscResponse?.status, hvscResponse?.statusText)
    }
  } catch (error) {
    console.error('Failed to load song indices:', error)
  }
}

const MAX_SEARCH_RESULTS = 1000

export const searchSongs = async (query, options = {}) => {
  const shouldIncludeMus = false

  if (!hvscIndex && !cgscIndex) {
    await loadIndices()
  }

  const results = []
  const searchTerm = query.toLowerCase().trim()

  if (!searchTerm) {
    return results
  }

  // Search HVSC (SID files)
  if (hvscIndex && hvscIndex.songs) {
    for (const song of hvscIndex.songs) {
      if (results.length >= MAX_SEARCH_RESULTS) break
      
      const matches = 
        song.name?.toLowerCase().includes(searchTerm) ||
        song.path?.toLowerCase().includes(searchTerm) ||
        song.artist?.toLowerCase().includes(searchTerm) ||
        song.category?.toLowerCase().includes(searchTerm)

      if (matches) {
        results.push({
          ...song,
          collection: 'hvsc',
          type: 'sid'
        })
      }
    }
  }

  // Search CGSC (MUS files) - only if MUS is enabled
  if (shouldIncludeMus && cgscIndex && cgscIndex.songs && results.length < MAX_SEARCH_RESULTS) {
    for (const song of cgscIndex.songs) {
      if (results.length >= MAX_SEARCH_RESULTS) break
      
      const matches = 
        song.name?.toLowerCase().includes(searchTerm) ||
        song.path?.toLowerCase().includes(searchTerm) ||
        song.artist?.toLowerCase().includes(searchTerm)

      if (matches) {
        results.push({
          ...song,
          collection: 'cgsc',
          type: 'mus'
        })
      }
    }
  }

  // Sort results: exact name matches first, then by name
  results.sort((a, b) => {
    const aName = a.name?.toLowerCase() || ''
    const bName = b.name?.toLowerCase() || ''
    const aExact = aName === searchTerm
    const bExact = bName === searchTerm

    if (aExact && !bExact) return -1
    if (!aExact && bExact) return 1
    return aName.localeCompare(bName)
  })

  return results
}

export const getSongById = async (songId, collection) => {
  if (!hvscIndex && !cgscIndex) {
    await loadIndices()
  }

  const index = collection === 'hvsc' ? hvscIndex : cgscIndex
  if (!index || !index.songs) {
    return null
  }

  return index.songs.find(song => song.id === songId) || null
}
