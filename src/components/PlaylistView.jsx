import { useState, useEffect } from 'react'
import { getAllFavourites } from '../services/storage'
import { getSongById } from '../services/search'
import { usePlaylists } from '../hooks/usePlaylists'
import { useFavourites } from '../hooks/useFavourites'
import { useSettings } from '../hooks/useSettings'
import { playSid, playMus, stopPlayback } from '../services/api'
import SongBadge from './SongBadge'
import PlayOptions from './PlayOptions'
import './PlaylistView.css'

function PlaylistView({ playlist, onBack, onPlay }) {
  const { playlists, removeSong } = usePlaylists()
  const { remove: removeFavourite } = useFavourites()
  const { settings } = useSettings()
  const [songs, setSongs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [optionsInitialized, setOptionsInitialized] = useState(false)
  const [previewingId, setPreviewingId] = useState(null)
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

  const handleRemoveSong = async (songId) => {
    if (playlist.id === 'favourites') {
      try {
        await removeFavourite(songId)
        setSongs(prev => prev.filter(s => s.songId !== songId))
      } catch (error) {
        console.error('Failed to remove from favourites:', error)
      }
    } else {
      try {
        await removeSong(playlist.id, songId)
        setSongs(prev => prev.filter(s => s.songId !== songId))
      } catch (error) {
        console.error('Failed to remove song:', error)
      }
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
                    <SongBadge type={song.type} />
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
                      onClick={() => handleRemoveSong(songId)}
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
        onStop={() => {
          // TODO: Implement stop functionality
          console.log('Stop playback')
        }}
        onBack={onBack}
        songCount={songs.length}
        isPlaying={false}
      />
    </div>
  )
}

export default PlaylistView
