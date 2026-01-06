import { useState, useEffect } from 'react'
import { usePlaylists } from '../hooks/usePlaylists'
import { getAllFavourites } from '../services/storage'
import CreatePlaylistDialog from './CreatePlaylistDialog'
import './PlaylistList.css'

function PlaylistList({ onPlaylistSelect }) {
  const { playlists, isLoading, addPlaylist, refresh } = usePlaylists()
  const [favouritesCount, setFavouritesCount] = useState(0)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    const loadFavouritesCount = async () => {
      try {
        const favs = await getAllFavourites()
        setFavouritesCount(favs.length)
      } catch (error) {
        console.error('Failed to load favourites count:', error)
      }
    }
    loadFavouritesCount()
  }, [])

  const handleFavouritesClick = () => {
    onPlaylistSelect({ id: 'favourites', name: 'Favourites', songs: [] })
  }

  if (isLoading) {
    return (
      <div className="playlist-list">
        <div className="playlist-content">
          <p>Loading playlists...</p>
        </div>
      </div>
    )
  }

  const handleCreatePlaylist = async (name) => {
    try {
      await addPlaylist(name, [])
      await refresh()
      setShowCreateDialog(false)
    } catch (error) {
      console.error('Failed to create playlist:', error)
    }
  }

  return (
    <div className="playlist-list">
      <div className="playlist-content">
        <div className="playlist-header">
          <h2>Playlists</h2>
          <button
            className="create-playlist-button"
            onClick={() => setShowCreateDialog(true)}
          >
            + New Playlist
          </button>
        </div>
        <ul className="playlist-items">
          <li 
            className="playlist-item favourites-item"
            onClick={handleFavouritesClick}
          >
            <span className="playlist-icon">⭐</span>
            <span className="playlist-name">Favourites</span>
            {favouritesCount > 0 && (
              <span className="playlist-count">({favouritesCount})</span>
            )}
          </li>
          {playlists.map(playlist => (
            <li 
              key={playlist.id}
              className="playlist-item"
              onClick={() => onPlaylistSelect(playlist)}
            >
              <span className="playlist-name">{playlist.name}</span>
              {playlist.songs && playlist.songs.length > 0 && (
                <span className="playlist-count">({playlist.songs.length})</span>
              )}
            </li>
          ))}
        </ul>
      </div>
      {showCreateDialog && (
        <CreatePlaylistDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={handleCreatePlaylist}
        />
      )}
    </div>
  )
}

export default PlaylistList
