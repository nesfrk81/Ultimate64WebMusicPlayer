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
      // Using 'l' (shortened key for songlengths)
      const songsWithLengths = hvscIndex?.songs?.filter(s => s.l && s.l.length > 0) || []
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
  // Index uses shortened keys: n=name, p=path, a=artist, l=songlengths, s=startSong, c=subsongs
  if (hvscIndex && hvscIndex.songs) {
    for (let i = 0; i < hvscIndex.songs.length; i++) {
      if (results.length >= MAX_SEARCH_RESULTS) break
      
      const song = hvscIndex.songs[i]
      const matches = 
        song.n?.toLowerCase().includes(searchTerm) ||
        song.p?.toLowerCase().includes(searchTerm) ||
        song.a?.toLowerCase().includes(searchTerm)

      if (matches) {
        // Expand shortened keys back to full names
        // Use path as stable ID (prefixed with hvsc:) - survives index regeneration
        results.push({
          id: `hvsc:${song.p}`,
          name: song.n,
          path: song.p,
          artist: song.a || null,
          songlengths: song.l || null,
          startSong: song.s || 1,
          subsongs: song.c || (song.l?.length) || 1,
          collection: 'hvsc',
          type: 'sid'
        })
      }
    }
  }

  // Search CGSC (MUS files) - only if MUS is enabled
  // CGSC still uses full field names (not optimized for size)
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

// Expand a song from the shortened index format to full format
// Uses path as stable ID (prefixed with hvsc: or cgsc:)
const expandSong = (song, collection) => {
  if (collection === 'hvsc') {
    return {
      id: `hvsc:${song.p}`,
      name: song.n,
      path: song.p,
      artist: song.a || null,
      songlengths: song.l || null,
      startSong: song.s || 1,
      subsongs: song.c || (song.l?.length) || 1,
      collection: 'hvsc',
      type: 'sid'
    }
  }
  // CGSC uses full field names
  return { ...song, id: `cgsc:${song.path}`, collection: 'cgsc', type: 'mus' }
}

export const getSongById = async (songId, collection) => {
  if (!hvscIndex && !cgscIndex) {
    await loadIndices()
  }

  const index = collection === 'hvsc' ? hvscIndex : cgscIndex
  if (!index || !index.songs) {
    return null
  }

  // New path-based ID format: hvsc:/path/to/song.sid or cgsc:/path/to/song.mus
  if (songId.startsWith('hvsc:') || songId.startsWith('cgsc:')) {
    const path = songId.substring(5) // Remove 'hvsc:' or 'cgsc:' prefix
    const song = index.songs.find(s => (s.p || s.path) === path)
    if (song) {
      return expandSong(song, collection)
    }
    return null
  }

  // Legacy support: old index-based IDs (hvsc_1, hvsc_2, etc.)
  if (collection === 'hvsc' && songId.startsWith('hvsc_')) {
    const idNum = parseInt(songId.replace('hvsc_', ''), 10)
    const arrayIdx = idNum - 1  // Convert 1-based ID to 0-based array index
    if (!isNaN(arrayIdx) && arrayIdx >= 0 && arrayIdx < index.songs.length) {
      return expandSong(index.songs[arrayIdx], collection)
    }
  }
  
  // For CGSC legacy, try to find by original id field
  if (collection === 'cgsc') {
    const song = index.songs.find(s => s.id === songId)
    if (song) {
      return expandSong(song, collection)
    }
  }
  
  return null
}
