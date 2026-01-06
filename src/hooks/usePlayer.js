import { useState, useEffect, useRef } from 'react'
import { playSid, playMus, stopPlayback } from '../services/api'
import { getSettings, getSonglength, getSongTime, recordPlay, getSongPrefs } from '../services/storage'

const SESSION_KEY = 'uc64_player_session'

// Save session to localStorage
const saveSession = (data) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data))
  } catch (e) {
    // Ignore storage errors
  }
}

// Load session from localStorage
const loadSession = () => {
  try {
    const data = localStorage.getItem(SESSION_KEY)
    return data ? JSON.parse(data) : null
  } catch (e) {
    return null
  }
}

// Clear session from localStorage
const clearSession = () => {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch (e) {
    // Ignore storage errors
  }
}

export function usePlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSong, setCurrentSong] = useState(null)
  const [currentPlaylist, setCurrentPlaylist] = useState(null)
  const [playOptions, setPlayOptions] = useState(null)
  const [playIndex, setPlayIndex] = useState(0)
  const [remainingTime, setRemainingTime] = useState(0)
  const [playedSongs, setPlayedSongs] = useState(new Set())
  const [currentSubsong, setCurrentSubsong] = useState(1)
  const timeoutRef = useRef(null)
  const intervalRef = useRef(null)
  const stoppedRef = useRef(false)
  
  const currentPlaylistRef = useRef(null)
  const playOptionsRef = useRef(null)
  const playIndexRef = useRef(0)
  const playedSongsRef = useRef(new Set())
  const shuffledOrderRef = useRef(null)
  const songEndTimeRef = useRef(null)
  const handleNextRef = useRef(null)
  const restoringRef = useRef(false)
  const currentSubsongRef = useRef(1)
  const currentSongRef = useRef(null)

  // Keep handleNextRef updated so visibility handler can call it
  useEffect(() => {
    handleNextRef.current = handleNext
  })

  // Restore session on mount
  useEffect(() => {
    const session = loadSession()
    if (session && session.songEndTime && Date.now() < session.songEndTime) {
      // Session is still valid, restore it
      restoringRef.current = true
      stoppedRef.current = false
      
      setIsPlaying(true)
      setCurrentSong(session.currentSong)
      setCurrentPlaylist(session.playlist)
      setPlayOptions(session.options)
      setPlayIndex(session.playIndex)
      setCurrentSubsong(session.currentSubsong || 1)
      
      currentPlaylistRef.current = session.playlist
      playOptionsRef.current = session.options
      playIndexRef.current = session.playIndex
      shuffledOrderRef.current = session.shuffledOrder
      songEndTimeRef.current = session.songEndTime
      currentSubsongRef.current = session.currentSubsong || 1
      currentSongRef.current = session.currentSong
      
      if (session.playedSongs) {
        const played = new Set(session.playedSongs)
        setPlayedSongs(played)
        playedSongsRef.current = played
      }
      
      // Calculate remaining time and set up timer
      const remaining = Math.round((session.songEndTime - Date.now()) / 1000)
      setRemainingTime(Math.max(0, remaining))
      
      // Set up interval for countdown
      intervalRef.current = setInterval(() => {
        if (songEndTimeRef.current) {
          const rem = Math.round((songEndTimeRef.current - Date.now()) / 1000)
          setRemainingTime(Math.max(0, rem))
        }
      }, 1000)
      
      // Set up timeout for next song
      const timeLeft = session.songEndTime - Date.now()
      if (timeLeft > 0) {
        timeoutRef.current = setTimeout(() => {
          if (handleNextRef.current) {
            handleNextRef.current()
          }
        }, timeLeft)
      }
      
      restoringRef.current = false
    } else if (session) {
      // Session expired, clear it
      clearSession()
    }
  }, [])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Handle visibility change (for when phone is locked/unlocked)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !stoppedRef.current) {
        // Try to restore from session if refs are empty (page was reloaded)
        if (!songEndTimeRef.current) {
          const session = loadSession()
          if (session && session.songEndTime) {
            songEndTimeRef.current = session.songEndTime
            currentPlaylistRef.current = session.playlist
            playOptionsRef.current = session.options
            playIndexRef.current = session.playIndex
            shuffledOrderRef.current = session.shuffledOrder
            if (session.playedSongs) {
              playedSongsRef.current = new Set(session.playedSongs)
            }
          }
        }
        
        if (songEndTimeRef.current) {
          const now = Date.now()
          if (now >= songEndTimeRef.current) {
            // Song should have ended while we were in background
            if (handleNextRef.current) {
              handleNextRef.current()
            }
          } else {
            // Update remaining time display
            const remaining = Math.round((songEndTimeRef.current - now) / 1000)
            setRemainingTime(Math.max(0, remaining))
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const parseDuration = (durationStr) => {
    const parts = durationStr.split(':')
    const minutes = parseInt(parts[0], 10) || 0
    const secondsPart = parts[1] || '0'
    const secondsParts = secondsPart.split('.')
    const seconds = parseInt(secondsParts[0], 10) || 0
    const milliseconds = secondsParts[1] ? parseFloat(`0.${secondsParts[1]}`) : 0
    return (minutes * 60) + seconds + milliseconds
  }

  const getSongDuration = async (song, options, subsong = 1) => {
    const settings = await getSettings()
    
    const customTime = await getSongTime(song.songId || song.id)
    if (customTime) {
      return customTime
    }

    // Get duration for specific subsong (0-indexed in array)
    const subsongIndex = Math.max(0, subsong - 1)

    if (song.type === 'sid' && options?.useSidSonglength) {
      if (song.songlengths && song.songlengths.length > subsongIndex) {
        return parseDuration(song.songlengths[subsongIndex])
      }
      
      if (song.md5) {
        const durations = await getSonglength(song.md5)
        if (durations && durations.length > subsongIndex) {
          return parseDuration(durations[subsongIndex])
        }
      }
    }

    if (song.type === 'sid') {
      return settings?.defaultSidPlayTime || 60
    } else if (song.type === 'mus') {
      return settings?.defaultMusPlayTime || 60
    }

    return 60
  }

  const playSong = async (song, playlist, options, subsong = null) => {
    try {
      // Determine which subsong to play
      const prefs = getSongPrefs(song.songId || song.id)
      const maxSubsongs = song.subsongs || (song.songlengths?.length) || 1
      
      // Get the SID's built-in default start song (from index, parsed from SID header)
      const sidDefaultSubsong = song.startSong || 1
      
      // Check if user has explicitly set a default subsong preference
      // Ignore preferences where defaultSubsong is 1 - these were likely set before proper subsong support
      // and don't represent an intentional user choice
      const hasUserPreference = prefs?.defaultSubsong && 
                                prefs.defaultSubsong !== 1 && 
                                prefs.defaultSubsong !== sidDefaultSubsong
      
      // Determine subsong number to pass to API
      // - If subsong is explicitly passed (navigation), use it
      // - If user has a saved preference, use it
      // - Otherwise, use the SID's default startSong from our index
      // Note: We ALWAYS pass the subsong number since Ultimate64 doesn't reliably
      // read the SID's internal startSong field from the file header
      let subsongForApi = sidDefaultSubsong
      let subsongForDisplay = sidDefaultSubsong
      
      if (subsong !== null) {
        // Explicitly navigating to a specific subsong
        subsongForApi = Math.max(1, Math.min(subsong, maxSubsongs))
        subsongForDisplay = subsongForApi
      } else if (hasUserPreference) {
        // User has saved a preference
        subsongForApi = Math.max(1, Math.min(prefs.defaultSubsong, maxSubsongs))
        subsongForDisplay = subsongForApi
      }
      // else: Use the SID's default from our index (already set above)
      
      setIsPlaying(true)
      setCurrentSong(song)
      setCurrentPlaylist(playlist)
      setPlayOptions(options)
      setCurrentSubsong(subsongForDisplay)
      
      currentPlaylistRef.current = playlist
      playOptionsRef.current = options
      currentSubsongRef.current = subsongForDisplay
      currentSongRef.current = song

      await recordPlay(song.songId || song.id)

      if (song.type === 'sid') {
        await playSid(song.path, song.collection || 'hvsc', subsongForApi)
      } else if (song.type === 'mus') {
        await playMus(song.path, song.collection || 'cgsc')
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      const duration = await getSongDuration(song, options, subsongForDisplay)
      const durationMs = duration * 1000
      songEndTimeRef.current = Date.now() + durationMs
      setRemainingTime(Math.round(duration))

      // Save session to localStorage for mobile background recovery
      saveSession({
        currentSong: song,
        playlist: playlist,
        options: options,
        playIndex: playIndexRef.current,
        shuffledOrder: shuffledOrderRef.current,
        playedSongs: Array.from(playedSongsRef.current),
        songEndTime: songEndTimeRef.current,
        currentSubsong: subsongForDisplay
      })

      intervalRef.current = setInterval(() => {
        if (songEndTimeRef.current) {
          const remaining = Math.round((songEndTimeRef.current - Date.now()) / 1000)
          setRemainingTime(Math.max(0, remaining))
        }
      }, 1000)

      timeoutRef.current = setTimeout(() => {
        handleNext()
      }, durationMs)
    } catch (error) {
      console.error('Failed to play song:', error)
      alert(`Failed to play song: ${error.message}`)
      setIsPlaying(false)
      setCurrentSong(null)
      setRemainingTime(0)
    }
  }

  const stop = async () => {
    stoppedRef.current = true
    songEndTimeRef.current = null
    clearSession()
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    setIsPlaying(false)
    setCurrentSong(null)
    setCurrentPlaylist(null)
    setPlayOptions(null)
    setPlayIndex(0)
    setRemainingTime(0)
    setPlayedSongs(new Set())
    setCurrentSubsong(1)
    shuffledOrderRef.current = null
    currentSubsongRef.current = 1
    currentSongRef.current = null
    
    try {
      await stopPlayback()
    } catch (error) {
      console.error('Failed to stop playback:', error)
    }
  }

  const skip = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    await handleNext()
  }

  const previous = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    await handlePrevious()
  }

  const handlePrevious = async () => {
    if (stoppedRef.current) return
    
    const playlist = currentPlaylistRef.current
    const options = playOptionsRef.current
    const currentIndex = playIndexRef.current
    
    if (!playlist || !options) return

    const songs = playlist.songs || []
    if (songs.length === 0) return

    let prevIndex = currentIndex

    if (options.shuffle) {
      const shuffledOrder = shuffledOrderRef.current
      
      if (shuffledOrder) {
        const currentShuffledIndex = shuffledOrder.indexOf(currentIndex)
        
        if (currentShuffledIndex > 0) {
          prevIndex = shuffledOrder[currentShuffledIndex - 1]
        } else if (options.loop) {
          prevIndex = shuffledOrder[shuffledOrder.length - 1]
        }
      }
    } else {
      if (currentIndex > 0) {
        prevIndex = currentIndex - 1
      } else if (options.loop) {
        prevIndex = songs.length - 1
      }
    }

    setPlayIndex(prevIndex)
    playIndexRef.current = prevIndex
    await playSong(songs[prevIndex], playlist, options)
  }

  const handleNext = async () => {
    if (stoppedRef.current) return
    
    const playlist = currentPlaylistRef.current
    const options = playOptionsRef.current
    const currentIndex = playIndexRef.current
    const played = playedSongsRef.current
    const song = currentSongRef.current
    const subsong = currentSubsongRef.current
    
    if (!playlist || !options) return

    const songs = playlist.songs || []
    if (songs.length === 0) {
      await stop()
      return
    }

    // Check if we should auto-play next subsong
    if (song) {
      const maxSubsongs = song.subsongs || (song.songlengths?.length) || 1
      const prefs = getSongPrefs(song.songId || song.id)
      
      if (prefs?.autoPlaySubsongs && subsong < maxSubsongs) {
        // Play next subsong of current song
        const nextSubsong = subsong + 1
        setCurrentSubsong(nextSubsong)
        currentSubsongRef.current = nextSubsong
        await playSong(song, playlist, options, nextSubsong)
        return
      }
    }

    // Move to next song in playlist
    let nextIndex = currentIndex

    if (options.shuffle) {
      let shuffledOrder = shuffledOrderRef.current
      
      if (!shuffledOrder || shuffledOrder.length !== songs.length) {
        shuffledOrder = Array.from({ length: songs.length }, (_, i) => i)
        for (let i = shuffledOrder.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledOrder[i], shuffledOrder[j]] = [shuffledOrder[j], shuffledOrder[i]]
        }
        shuffledOrderRef.current = shuffledOrder
      }
      
      const currentShuffledIndex = shuffledOrder.indexOf(currentIndex)
      
      if (currentShuffledIndex === -1) {
        nextIndex = shuffledOrder[0]
      } else if (currentShuffledIndex < shuffledOrder.length - 1) {
        nextIndex = shuffledOrder[currentShuffledIndex + 1]
      } else {
        if (options.loop) {
          nextIndex = shuffledOrder[0]
        } else {
          await stop()
          return
        }
      }
      
      const newPlayed = new Set([...played, nextIndex])
      setPlayedSongs(newPlayed)
      playedSongsRef.current = newPlayed
    } else {
      nextIndex = (currentIndex + 1) % songs.length
      
      if (nextIndex === 0 && !options.loop) {
        await stop()
        return
      }
    }

    setPlayIndex(nextIndex)
    playIndexRef.current = nextIndex
    // Next song starts at its default subsong (null lets playSong determine it)
    await playSong(songs[nextIndex], playlist, options, null)
  }

  const startPlaylist = async (playlistData) => {
    const { playlist, songs, options } = playlistData
    
    if (songs.length === 0) return

    stoppedRef.current = false
    
    setPlayedSongs(new Set())
    setPlayIndex(0)
    playedSongsRef.current = new Set()
    playIndexRef.current = 0
    shuffledOrderRef.current = null

    const playlistWithSongs = { ...playlist, songs }

    let startIndex = 0
    if (options.shuffle) {
      const shuffledOrder = Array.from({ length: songs.length }, (_, i) => i)
      for (let i = shuffledOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOrder[i], shuffledOrder[j]] = [shuffledOrder[j], shuffledOrder[i]]
      }
      shuffledOrderRef.current = shuffledOrder
      startIndex = shuffledOrder[0]
      const initialPlayed = new Set([startIndex])
      setPlayedSongs(initialPlayed)
      playedSongsRef.current = initialPlayed
    }

    setPlayIndex(startIndex)
    playIndexRef.current = startIndex
    await playSong(songs[startIndex], playlistWithSongs, options)
  }

  const nextSubsong = async () => {
    const song = currentSongRef.current
    if (!song) return
    
    const maxSubsongs = song.subsongs || (song.songlengths?.length) || 1
    const subsong = currentSubsongRef.current
    
    if (subsong < maxSubsongs) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
      
      const nextSub = subsong + 1
      await playSong(song, currentPlaylistRef.current, playOptionsRef.current, nextSub)
    }
  }

  const previousSubsong = async () => {
    const song = currentSongRef.current
    if (!song) return
    
    const subsong = currentSubsongRef.current
    
    if (subsong > 1) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
      
      const prevSub = subsong - 1
      await playSong(song, currentPlaylistRef.current, playOptionsRef.current, prevSub)
    }
  }

  const playSubsong = async (subsongNumber) => {
    const song = currentSongRef.current
    if (!song) return
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    
    await playSong(song, currentPlaylistRef.current, playOptionsRef.current, subsongNumber)
  }

  return {
    isPlaying,
    currentSong,
    currentPlaylist,
    remainingTime,
    playOptions,
    currentIndex: playIndex,
    totalSongs: currentPlaylist?.songs?.length || 0,
    currentSubsong,
    maxSubsongs: currentSong?.subsongs || (currentSong?.songlengths?.length) || 1,
    play: startPlaylist,
    stop,
    skip,
    previous,
    nextSubsong,
    previousSubsong,
    playSubsong,
    pause: stop
  }
}
