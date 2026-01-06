import { useState, useEffect } from 'react'
import { 
  getAllPlaylists, 
  createPlaylist, 
  updatePlaylist, 
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist
} from '../services/storage'

export function usePlaylists() {
  const [playlists, setPlaylists] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPlaylists()
  }, [])

  const loadPlaylists = async () => {
    try {
      const allPlaylists = await getAllPlaylists()
      setPlaylists(allPlaylists)
    } catch (error) {
      console.error('Failed to load playlists:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addPlaylist = async (name, songs = []) => {
    try {
      const newPlaylist = await createPlaylist(name, songs)
      setPlaylists(prev => [...prev, newPlaylist])
      return newPlaylist
    } catch (error) {
      console.error('Failed to create playlist:', error)
      throw error
    }
  }

  const updatePlaylistById = async (id, updates) => {
    try {
      const updated = await updatePlaylist(id, updates)
      setPlaylists(prev => prev.map(p => p.id === id ? updated : p))
      return updated
    } catch (error) {
      console.error('Failed to update playlist:', error)
      throw error
    }
  }

  const removePlaylist = async (id) => {
    try {
      await deletePlaylist(id)
      setPlaylists(prev => prev.filter(p => p.id !== id))
    } catch (error) {
      console.error('Failed to delete playlist:', error)
      throw error
    }
  }

  const addSong = async (playlistId, songId) => {
    try {
      await addSongToPlaylist(playlistId, songId)
      await loadPlaylists() // Reload to get updated playlist
    } catch (error) {
      console.error('Failed to add song to playlist:', error)
      throw error
    }
  }

  const removeSong = async (playlistId, songId) => {
    try {
      await removeSongFromPlaylist(playlistId, songId)
      await loadPlaylists() // Reload to get updated playlist
    } catch (error) {
      console.error('Failed to remove song from playlist:', error)
      throw error
    }
  }

  return {
    playlists,
    isLoading,
    addPlaylist,
    updatePlaylist: updatePlaylistById,
    removePlaylist,
    addSong,
    removeSong,
    refresh: loadPlaylists
  }
}
