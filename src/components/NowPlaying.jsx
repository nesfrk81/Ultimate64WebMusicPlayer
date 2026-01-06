import { useState, useEffect } from 'react'
import { getSongTime, setSongTime, removeSongTime } from '../services/storage'
import './NowPlaying.css'

function NowPlaying({ player, onBack }) {
  const { isPlaying, currentSong, remainingTime, playOptions, currentIndex, totalSongs, stop, skip } = player
  const [customTime, setCustomTime] = useState(null)
  const [hasCustomTime, setHasCustomTime] = useState(false)

  useEffect(() => {
    if (currentSong) {
      loadCustomTime()
    }
  }, [currentSong])

  const loadCustomTime = async () => {
    if (!currentSong) return
    const songId = currentSong.songId || currentSong.id
    const time = await getSongTime(songId)
    if (time) {
      setCustomTime(time)
      setHasCustomTime(true)
    } else {
      setCustomTime(null)
      setHasCustomTime(false)
    }
  }

  const handleSetCustomTime = async () => {
    if (!currentSong) return
    const songId = currentSong.songId || currentSong.id
    const time = parseInt(prompt('Enter play time in seconds:', customTime || 60), 10)
    if (!isNaN(time) && time > 0) {
      await setSongTime(songId, time)
      setCustomTime(time)
      setHasCustomTime(true)
    }
  }

  const handleRemoveCustomTime = async () => {
    if (!currentSong) return
    const songId = currentSong.songId || currentSong.id
    await removeSongTime(songId)
    setCustomTime(null)
    setHasCustomTime(false)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getDurationSource = () => {
    if (hasCustomTime) return 'custom'
    if (currentSong?.type === 'sid' && playOptions?.useSidSonglength) {
      return 'songlength'
    }
    return 'default'
  }

  const handleStop = async () => {
    await stop()
    onBack()
  }

  // Only go back if explicitly stopped (isPlaying is false AND no song)
  // Don't go back during song transitions where currentSong might briefly be updating
  if (!currentSong && !isPlaying) {
    onBack()
    return null
  }
  
  // Show loading state during song transitions
  if (!currentSong) {
    return (
      <div className="now-playing">
        <div className="player-header">
          <h2>Now Playing</h2>
        </div>
        <div className="player-content">
          <p>Loading next song...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="now-playing">
      <div className="player-header">
        <h2>Now Playing</h2>
        {totalSongs > 0 && (
          <span className="song-counter">Song {currentIndex + 1} / {totalSongs}</span>
        )}
      </div>
      <div className="player-content">
        <div className="current-song">
          <div className="song-header">
            <div className="song-title">
              <h3>{currentSong.name || 'Unknown'}</h3>
              {currentSong.artist && (
                <p className="song-artist">{currentSong.artist}</p>
              )}
            </div>
          </div>

          <div className="time-display">
            <div className="time-remaining">
              Time remaining: {formatTime(remainingTime)}
            </div>
            <div className="duration-source">
              Duration: {getDurationSource()}
              {hasCustomTime && ` (${customTime}s)`}
            </div>
          </div>

          <div className="time-controls">
            <button
              className="time-button"
              onClick={handleSetCustomTime}
            >
              Set Custom Time
            </button>
            {hasCustomTime && (
              <button
                className="time-button"
                onClick={handleRemoveCustomTime}
              >
                Remove Custom Time
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="player-actions">
        <button
          className="stop-button"
          onClick={handleStop}
          aria-label="Stop"
        >
          ■
        </button>
        <button
          className="next-button"
          onClick={skip}
          disabled={!isPlaying}
        >
          Next Song →
        </button>
        <button
          className="back-button"
          onClick={onBack}
          aria-label="Back"
        >
          ←
        </button>
      </div>
    </div>
  )
}

export default NowPlaying
