import { useState, useEffect } from 'react'
import { getAllFavourites } from '../services/storage'
import { getSongById } from '../services/search'
import { usePlaylists } from '../hooks/usePlaylists'
import { useFavourites } from '../hooks/useFavourites'
import { useSettings } from '../hooks/useSettings'
import { playSid, playMus, stopPlayback } from '../services/api'
import PlayOptions from './PlayOptions'
import './PlaylistView.css'

function PlaylistView({ playlist, onBack, onPlay }) {
  const { playlists, removeSong, removePlaylist } = usePlaylists()
  const { remove: removeFavourite } = useFavourites()
  const { settings } = useSettings()
  const [songs, setSongs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [optionsInitialized, setOptionsInitialized] = useState(false)
  const [previewingId, setPreviewingId] = useState(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRemoveSongDialog, setShowRemoveSongDialog] = useState(false)
  const [songToRemove, setSongToRemove] = useState(null)
  const [playOptions, setPlayOptions] = useState({
    shuffle: false,
    loop: false,
    useSidSonglength: true
  })

  // Initialize playOptions from settings ONCE when settings first load
  useEffect(() => {
    if (settings && !optionsInitialized) {
      setPlayOptions(prev => ({
        ...prev,
        useSidSonglength: settings.songlengthsAvailable !== false && settings.useSidSonglength !== false
      }))
      setOptionsInitialized(true)
    }
  }, [settings, optionsInitialized])

  useEffect(() => {
    loadSongs()
  }, [playlist])

  // Reload songs when playlist is updated in usePlaylists
  useEffect(() => {
    if (playlist.id !== 'favourites') {
      const updatedPlaylist = playlists.find(p => p.id === playlist.id)
      if (updatedPlaylist) {
        // Reload songs if playlist was updated
        loadSongs()
      }
    }
  }, [playlists])

  const loadSongs = async () => {
    setIsLoading(true)
    try {
      let songIds = []
      
      if (playlist.id === 'favourites') {
        // Load favourites
        songIds = await getAllFavourites()
      } else {
        // Get the latest playlist data from usePlaylists
        const currentPlaylist = playlists.find(p => p.id === playlist.id) || playlist
        if (currentPlaylist.songs) {
          songIds = currentPlaylist.songs
        }
      }

      // Load full song data
      const songPromises = songIds.map(async (songId) => {
        // Try to determine collection from songId format
        const collection = songId.startsWith('hvsc_') ? 'hvsc' : 'cgsc'
        const song = await getSongById(songId, collection)
        return song ? { ...song, songId } : null
      })

      const loadedSongs = (await Promise.all(songPromises)).filter(Boolean)
      setSongs(loadedSongs)
    } catch (error) {
      console.error('Failed to load playlist songs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveSongClick = (songId) => {
    setSongToRemove(songId)
    setShowRemoveSongDialog(true)
  }

  const handleRemoveSongCancel = () => {
    setShowRemoveSongDialog(false)
    setSongToRemove(null)
  }

  const handleRemoveSongConfirm = async () => {
    if (!songToRemove) return

    try {
      if (playlist.id === 'favourites') {
        await removeFavourite(songToRemove)
        setSongs(prev => prev.filter(s => s.songId !== songToRemove))
      } else {
        await removeSong(playlist.id, songToRemove)
        setSongs(prev => prev.filter(s => s.songId !== songToRemove))
      }
      setShowRemoveSongDialog(false)
      setSongToRemove(null)
    } catch (error) {
      console.error('Failed to remove song:', error)
      alert('Failed to remove song: ' + error.message)
    }
  }

  const handlePreview = async (song) => {
    const songId = song.songId || song.id
    if (previewingId === songId) {
      // Stop preview
      try {
        await stopPlayback()
      } catch (error) {
        console.error('Error stopping preview:', error)
      }
      setPreviewingId(null)
    } else {
      // Stop any current preview first
      if (previewingId) {
        try {
          await stopPlayback()
        } catch (error) {
          console.error('Error stopping previous preview:', error)
        }
      }
      // Start new preview
      try {
        const collection = songId.startsWith('hvsc_') ? 'hvsc' : 'cgsc'
        if (song.type === 'sid') {
          await playSid(song.path, collection)
        } else if (song.type === 'mus') {
          await playMus(song.path, collection)
        }
        setPreviewingId(songId)
      } catch (error) {
        console.error('Error starting preview:', error)
        setPreviewingId(null)
      }
    }
  }

  const handlePlay = () => {
    if (songs.length === 0) return
    onPlay({
      playlist,
      songs,
      options: playOptions
    })
  }

  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false)
  }

  const handleDeleteConfirm = async () => {
    try {
      await removePlaylist(playlist.id)
      setShowDeleteDialog(false)
      onBack() // Navigate back to playlist list
    } catch (error) {
      console.error('Failed to delete playlist:', error)
      alert('Failed to delete playlist: ' + error.message)
    }
  }

  const canDelete = playlist.id !== 'favourites'

  if (isLoading) {
    return (
      <div className="playlist-view">
        <div className="playlist-header">
          <h2>{playlist.name}</h2>
        </div>
        <div className="playlist-songs">
          <p>Loading songs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="playlist-view">
      <div className="playlist-header">
        <h2>{playlist.name}</h2>
        {canDelete && (
          <button
            className="delete-playlist-button"
            onClick={handleDeleteClick}
            aria-label="Delete playlist"
          >
            ×
          </button>
        )}
      </div>
      <div className="playlist-songs">
        {songs.length === 0 ? (
          <p className="empty-message">No songs in this playlist</p>
        ) : (
          <ul className="song-list">
            {songs.map(song => {
              const songId = song.songId || song.id
              return (
                <li key={songId} className="song-item">
                  <div className="song-info">
                    <div className="song-details">
                      <div className="song-name">{song.name || 'Unknown'}</div>
                      {song.artist && (
                        <div className="song-artist">{song.artist}</div>
                      )}
                    </div>
                  </div>
                  <div className="song-actions">
                    <button
                      className={`preview-button ${previewingId === songId ? 'playing' : ''}`}
                      onClick={() => handlePreview(song)}
                      aria-label={previewingId === songId ? 'Stop preview' : 'Preview song'}
                    >
                      {previewingId === songId ? '■' : '▶'}
                    </button>
                    <button
                      className="remove-button"
                      onClick={() => handleRemoveSongClick(songId)}
                      aria-label="Remove song"
                    >
                      ×
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <PlayOptions
        options={playOptions}
        onChange={setPlayOptions}
        onPlay={handlePlay}
        onStop={() => {}}
        onBack={onBack}
        songCount={songs.length}
        isPlaying={false}
      />

      {showDeleteDialog && (
        <div className="confirm-dialog-overlay" onClick={handleDeleteCancel}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Playlist</h3>
            <p>Are you sure you want to delete the playlist?</p>
            <div className="confirm-dialog-actions">
              <button 
                className="confirm-button cancel"
                onClick={handleDeleteCancel}
              >
                Cancel
              </button>
              <button 
                className="confirm-button ok"
                onClick={handleDeleteConfirm}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showRemoveSongDialog && (
        <div className="confirm-dialog-overlay" onClick={handleRemoveSongCancel}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Remove Song</h3>
            <p>Are you sure you want to remove the song from the playlist?</p>
            <div className="confirm-dialog-actions">
              <button 
                className="confirm-button cancel"
                onClick={handleRemoveSongCancel}
              >
                Cancel
              </button>
              <button 
                className="confirm-button ok"
                onClick={handleRemoveSongConfirm}
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

export default PlaylistView
