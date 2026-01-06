import { useState } from 'react'
import SongBadge from './SongBadge'
import { useFavourites } from '../hooks/useFavourites'
import { usePlaylists } from '../hooks/usePlaylists'
import { playSid, playMus, stopPlayback } from '../services/api'
import './SearchResults.css'

function SearchResults({ results, query }) {
  const { isFavourite, toggle: toggleFavourite } = useFavourites()
  const { playlists, addSong } = usePlaylists()
  const [showAddMenu, setShowAddMenu] = useState(null)
  const [previewingId, setPreviewingId] = useState(null)

  const handleAddClick = (songId, e) => {
    e.stopPropagation()
    setShowAddMenu(showAddMenu === songId ? null : songId)
  }

  const handleAddToFavourites = async (songId) => {
    await toggleFavourite(songId)
    setShowAddMenu(null)
  }

  const handleAddToPlaylist = async (playlistId, songId) => {
    await addSong(playlistId, songId)
    setShowAddMenu(null)
  }

  const handlePreview = async (song) => {
    if (previewingId === song.id) {
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
        const collection = song.id.startsWith('hvsc_') ? 'hvsc' : 'cgsc'
        if (song.type === 'sid') {
          await playSid(song.path, collection)
        } else if (song.type === 'mus') {
          await playMus(song.path, collection)
        }
        setPreviewingId(song.id)
      } catch (error) {
        console.error('Error starting preview:', error)
        setPreviewingId(null)
      }
    }
  }

  if (!results || results.length === 0) {
    return (
      <div className="search-results">
        <div className="search-results-header">
          <h3>Search Results</h3>
        </div>
        <div className="search-results-empty">
          {query ? `No results found for "${query}"` : 'Start typing to search...'}
        </div>
      </div>
    )
  }

  const isLimited = results.length >= 1000

  return (
    <div className="search-results">
      <div className="search-results-header">
        <h3>
          Search Results ({results.length}{isLimited ? '+' : ''})
          {isLimited && <span className="results-limited"> - showing first 1000</span>}
        </h3>
      </div>
      <div className="search-results-list">
        {results.map(song => (
          <div key={song.id} className="search-result-item">
            <div className="result-info">
              <SongBadge type={song.type} />
              <div className="result-details">
                <div className="result-name">{song.name || 'Unknown'}</div>
                {song.artist && (
                  <div className="result-artist">Artist: {song.artist}</div>
                )}
                <div className="result-path">{song.path}</div>
              </div>
            </div>
            <div className="result-actions">
              <button
                className={`preview-button ${previewingId === song.id ? 'playing' : ''}`}
                onClick={() => handlePreview(song)}
                aria-label={previewingId === song.id ? 'Stop preview' : 'Preview song'}
              >
                {previewingId === song.id ? '■' : '▶'}
              </button>
              <button
                className="add-button"
                onClick={(e) => handleAddClick(song.id, e)}
                aria-label="Add to playlist"
              >
                +
              </button>
              {showAddMenu === song.id && (
                <div className="add-menu">
                  <button
                    className="add-menu-item"
                    onClick={() => handleAddToFavourites(song.id)}
                  >
                    ⭐ Add to Favourites
                  </button>
                  {playlists.map(playlist => (
                    <button
                      key={playlist.id}
                      className="add-menu-item"
                      onClick={() => handleAddToPlaylist(playlist.id, song.id)}
                    >
                      Add to {playlist.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SearchResults
