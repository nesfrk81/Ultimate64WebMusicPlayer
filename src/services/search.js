import { getSettings } from './storage'

let hvscIndex = null
let cgscIndex = null

export const loadIndices = async () => {
  try {
    const [hvscResponse, cgscResponse] = await Promise.all([
      fetch('/data/hvsc-index.json').catch(() => null),
      fetch('/data/cgsc-index.json').catch(() => null)
    ])

    if (hvscResponse && hvscResponse.ok) {
      hvscIndex = await hvscResponse.json()
    }

    if (cgscResponse && cgscResponse.ok) {
      cgscIndex = await cgscResponse.json()
    }
  } catch (error) {
    console.error('Failed to load song indices:', error)
  }
}

const MAX_SEARCH_RESULTS = 1000

export const searchSongs = async (query, options = {}) => {
  const { includeMus = true } = options
  
  // Check if MUS should be included
  const settings = await getSettings()
  const musEnabled = settings && settings.musPlayerPath && settings.musPlayerPath.trim() !== ''
  const shouldIncludeMus = includeMus && musEnabled

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
