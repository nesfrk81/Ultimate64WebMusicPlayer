import { useState, useEffect } from 'react'
import { getSongTime, setSongTime, removeSongTime, getSongPrefs, setDefaultSubsong, setAutoPlaySubsongs } from '../services/storage'
import './NowPlaying.css'

function NowPlaying({ player, onBack }) {
  const { 
    isPlaying, 
    currentSong, 
    remainingTime, 
    playOptions, 
    currentIndex, 
    totalSongs, 
    stop, 
    skip, 
    previous,
    currentSubsong,
    maxSubsongs,
    nextSubsong,
    previousSubsong
  } = player
  const [customTime, setCustomTime] = useState(null)
  const [hasCustomTime, setHasCustomTime] = useState(false)
  const [autoPlaySubsongsEnabled, setAutoPlaySubsongsEnabled] = useState(false)
  const [isDefaultSubsong, setIsDefaultSubsong] = useState(false)

  useEffect(() => {
    if (currentSong) {
      loadCustomTime()
      loadSongPrefs()
    }
  }, [currentSong, currentSubsong])

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

  const loadSongPrefs = () => {
    if (!currentSong) return
    const songId = currentSong.songId || currentSong.id
    const prefs = getSongPrefs(songId)
    setAutoPlaySubsongsEnabled(prefs?.autoPlaySubsongs || false)
    
    // Check if current subsong is the default (either user-set or SID's built-in)
    const sidDefaultSubsong = currentSong.startSong || 1
    const userDefaultSubsong = prefs?.defaultSubsong
    
    // It's the "main" subsong if user has set it, OR if it matches SID's default and user hasn't set a different one
    const isMain = userDefaultSubsong 
      ? userDefaultSubsong === currentSubsong 
      : currentSubsong === sidDefaultSubsong
    setIsDefaultSubsong(isMain)
  }

  const handleSetAsMain = () => {
    if (!currentSong) return
    const songId = currentSong.songId || currentSong.id
    setDefaultSubsong(songId, currentSubsong)
    setIsDefaultSubsong(true)
  }

  const handleToggleAutoPlaySubsongs = () => {
    if (!currentSong) return
    const songId = currentSong.songId || currentSong.id
    const newValue = !autoPlaySubsongsEnabled
    setAutoPlaySubsongs(songId, newValue)
    setAutoPlaySubsongsEnabled(newValue)
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

          {maxSubsongs > 1 && (
            <div className="subsong-section">
              <div className="subsong-nav">
                <button 
                  className="subsong-button"
                  onClick={previousSubsong} 
                  disabled={currentSubsong <= 1}
                  aria-label="Previous subsong"
                >
                  ◀ Sub
                </button>
                <span className="subsong-display">
                  Subsong {currentSubsong}/{maxSubsongs}
                </span>
                <button 
                  className="subsong-button"
                  onClick={nextSubsong} 
                  disabled={currentSubsong >= maxSubsongs}
                  aria-label="Next subsong"
                >
                  Sub ▶
                </button>
              </div>
              
              <div className="subsong-prefs">
                <button 
                  className={`set-main-button ${isDefaultSubsong ? 'is-default' : ''}`}
                  onClick={handleSetAsMain}
                  disabled={isDefaultSubsong}
                >
                  {isDefaultSubsong ? '★ Main subsong' : 'Set as main'}
                </button>
                
                <label className="auto-play-label">
                  <input 
                    type="checkbox" 
                    checked={autoPlaySubsongsEnabled}
                    onChange={handleToggleAutoPlaySubsongs}
                  />
                  Auto play subsongs
                </label>
              </div>
            </div>
          )}
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
          className="prev-button"
          onClick={previous}
          disabled={!isPlaying}
          aria-label="Previous"
        >
          ◀
        </button>
        <button
          className="next-button"
          onClick={skip}
          disabled={!isPlaying}
          aria-label="Next"
        >
          ▶
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
