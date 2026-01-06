import { getSettings } from './storage'
import pako from 'pako'

const BASE_URL = import.meta.env.BASE_URL

let hvscIndex = null
let cgscIndex = null

// Decompress gzip data using pako
export const decompressGzip = (arrayBuffer) => {
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
    const cgscUrl = `${BASE_URL}data/cgsc-index.json.gz`
    
    console.log('Loading indices from:', { hvscUrl, cgscUrl, BASE_URL })
    
    const [hvscResponse, cgscResponse] = await Promise.all([
      fetch(hvscUrl).catch((err) => {
        console.error('Failed to fetch HVSC index:', err)
        return null
      }),
      fetch(cgscUrl).catch((err) => {
        console.error('Failed to fetch CGSC index:', err)
        return null
      })
    ])

    if (hvscResponse && hvscResponse.ok) {
      const arrayBuffer = await hvscResponse.arrayBuffer()
      const decompressed = decompressGzip(arrayBuffer)
      hvscIndex = JSON.parse(decompressed)
      console.log('HVSC index loaded:', hvscIndex?.songs?.length || 0, 'songs')
      
      // Check if songlengths are available and update settings
      const songsWithLengths = hvscIndex?.songs?.filter(s => s.songlengths && s.songlengths.length > 0) || []
      const hasLengths = songsWithLengths.length > 0
      console.log(`Songlengths available in index: ${hasLengths} (${songsWithLengths.length} songs with lengths)`)
      
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
    } else {
      console.warn('HVSC index not loaded:', hvscResponse?.status, hvscResponse?.statusText)
    }

    if (cgscResponse && cgscResponse.ok) {
      const arrayBuffer = await cgscResponse.arrayBuffer()
      const decompressed = decompressGzip(arrayBuffer)
      cgscIndex = JSON.parse(decompressed)
      console.log('CGSC index loaded:', cgscIndex?.songs?.length || 0, 'songs')
    } else {
      console.warn('CGSC index not loaded:', cgscResponse?.status, cgscResponse?.statusText)
    }
  } catch (error) {
    console.error('Failed to load song indices:', error)
  }
}

const MAX_SEARCH_RESULTS = 1000

export const searchSongs = async (query, options = {}) => {
  // MUS file support is disabled for now
  const shouldIncludeMus = false

  if (!hvscIndex && !cgscIndex) {
    console.log('Indices not loaded, loading now...')
    await loadIndices()
  }

  const results = []
  const searchTerm = query.toLowerCase().trim()

  if (!searchTerm) {
    return results
  }

  console.log('Searching for:', searchTerm, {
    hvscLoaded: !!hvscIndex,
    cgscLoaded: !!cgscIndex,
    hvscSongs: hvscIndex?.songs?.length || 0,
    cgscSongs: cgscIndex?.songs?.length || 0
  })

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
