import { useState, useEffect, useRef } from 'react'
import { playSid, playMus, stopPlayback } from '../services/api'
import { getSettings, getSonglength, getSongTime, recordPlay } from '../services/storage'

export function usePlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSong, setCurrentSong] = useState(null)
  const [currentPlaylist, setCurrentPlaylist] = useState(null)
  const [playOptions, setPlayOptions] = useState(null)
  const [playIndex, setPlayIndex] = useState(0)
  const [remainingTime, setRemainingTime] = useState(0)
  const [playedSongs, setPlayedSongs] = useState(new Set())
  const timeoutRef = useRef(null)
  const intervalRef = useRef(null)
  const stoppedRef = useRef(false) // Flag to prevent race conditions
  
  // Refs to access current state in callbacks (avoid stale closures)
  const currentPlaylistRef = useRef(null)
  const playOptionsRef = useRef(null)
  const playIndexRef = useRef(0)
  const playedSongsRef = useRef(new Set())
  const shuffledOrderRef = useRef(null) // Store shuffled order for consistent looping

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

  const parseDuration = (durationStr) => {
    // Convert mm:ss[.SSS] to seconds
    const parts = durationStr.split(':')
    const minutes = parseInt(parts[0], 10) || 0
    const secondsPart = parts[1] || '0'
    const secondsParts = secondsPart.split('.')
    const seconds = parseInt(secondsParts[0], 10) || 0
    const milliseconds = secondsParts[1] ? parseFloat(`0.${secondsParts[1]}`) : 0
    return (minutes * 60) + seconds + milliseconds
  }

  const getSongDuration = async (song, options) => {
    const settings = await getSettings()
    
    // Check for custom time override first
    const customTime = await getSongTime(song.songId || song.id)
    if (customTime) {
      console.log('Using custom time:', customTime)
      return customTime
    }

    // For SID files, check songlength if enabled
    // Use passed options directly instead of state (which may not be updated yet)
    if (song.type === 'sid' && options?.useSidSonglength) {
      // First try songlengths from the song object (from index)
      if (song.songlengths && song.songlengths.length > 0) {
        const duration = parseDuration(song.songlengths[0])
        console.log('Using songlength from index:', song.songlengths[0], '=', duration, 'seconds')
        return duration
      }
      
      // Fallback: try storage lookup by MD5
      if (song.md5) {
        const durations = await getSonglength(song.md5)
        if (durations && durations.length > 0) {
          const duration = parseDuration(durations[0])
          console.log('Using songlength from storage:', durations[0], '=', duration, 'seconds')
          return duration
        }
      }
    }

    // Use default time based on song type
    if (song.type === 'sid') {
      console.log('Using default SID play time:', settings?.defaultSidPlayTime || 60)
      return settings?.defaultSidPlayTime || 60
    } else if (song.type === 'mus') {
      console.log('Using default MUS play time:', settings?.defaultMusPlayTime || 60)
      return settings?.defaultMusPlayTime || 60
    }

    return 60 // Fallback
  }

  const playSong = async (song, playlist, options) => {
    try {
      console.log('playSong called:', { song, playlist, options })
      
      setIsPlaying(true)
      setCurrentSong(song)
      setCurrentPlaylist(playlist)
      setPlayOptions(options)
      
      // Also update refs for use in callbacks
      currentPlaylistRef.current = playlist
      playOptionsRef.current = options

      // Record play
      await recordPlay(song.songId || song.id)

      // Play the song
      console.log('Calling play API...')
      if (song.type === 'sid') {
        const result = await playSid(song.path, song.collection || 'hvsc')
        console.log('Play SID result:', result)
      } else if (song.type === 'mus') {
        const result = await playMus(song.path, song.collection || 'cgsc')
        console.log('Play MUS result:', result)
      }
      console.log('Play API call completed')

      // Clear any existing timers before setting new ones
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      // Get duration and start timer - pass options directly
      const duration = await getSongDuration(song, options)
      console.log('Song duration:', duration, 'seconds')
      setRemainingTime(Math.round(duration))

      // Update remaining time every second
      intervalRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      // Auto-advance when time runs out
      console.log('Setting timeout for', duration, 'seconds to advance to next song')
      timeoutRef.current = setTimeout(() => {
        console.log('Timeout fired! Calling handleNext...')
        handleNext()
      }, duration * 1000)

      console.log('Playback started successfully, playIndexRef =', playIndexRef.current)
    } catch (error) {
      console.error('Failed to play song:', error)
      alert(`Failed to play song: ${error.message}`)
      setIsPlaying(false)
      setCurrentSong(null)
      setRemainingTime(0)
    }
  }

  const stop = async () => {
    console.log('=== STOP called ===')
    
    // Set stopped flag immediately to prevent race conditions
    stoppedRef.current = true
    
    // Clear timers first
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    // Clear all playback state
    setIsPlaying(false)
    setCurrentSong(null)
    setCurrentPlaylist(null)
    setPlayOptions(null)
    setPlayIndex(0)
    setRemainingTime(0)
    setPlayedSongs(new Set())
    shuffledOrderRef.current = null
    
    try {
      await stopPlayback()
      console.log('Playback stopped successfully')
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
    console.log('=== handlePrevious called ===')
    
    // Check if stopped
    if (stoppedRef.current) {
      console.log('handlePrevious: stopped flag is set, aborting')
      return
    }
    
    const playlist = currentPlaylistRef.current
    const options = playOptionsRef.current
    const currentIndex = playIndexRef.current
    
    if (!playlist || !options) {
      console.log('handlePrevious: no playlist or options, aborting')
      return
    }

    const songs = playlist.songs || []
    if (songs.length === 0) {
      return
    }

    let prevIndex = currentIndex

    if (options.shuffle) {
      // Shuffle: go back in shuffled order
      const shuffledOrder = shuffledOrderRef.current
      
      if (shuffledOrder) {
        const currentShuffledIndex = shuffledOrder.indexOf(currentIndex)
        
        if (currentShuffledIndex > 0) {
          // Go back one in shuffled order
          prevIndex = shuffledOrder[currentShuffledIndex - 1]
        } else if (options.loop) {
          // At start, loop to end of shuffled order
          prevIndex = shuffledOrder[shuffledOrder.length - 1]
        }
        // If not looping and at start, stay on current song
      }
    } else {
      // Normal: go to previous song
      if (currentIndex > 0) {
        prevIndex = currentIndex - 1
      } else if (options.loop) {
        // Loop to end
        prevIndex = songs.length - 1
      }
      // If not looping and at start, stay on current song
    }

    console.log('handlePrevious: playing previous song at index', prevIndex)
    setPlayIndex(prevIndex)
    playIndexRef.current = prevIndex
    await playSong(songs[prevIndex], playlist, options)
  }

  const handleNext = async () => {
    console.log('=== handleNext called ===')
    
    // Check if stopped - prevent race condition
    if (stoppedRef.current) {
      console.log('handleNext: stopped flag is set, aborting')
      return
    }
    
    // Use refs to get current values (avoid stale closures from setTimeout)
    const playlist = currentPlaylistRef.current
    const options = playOptionsRef.current
    const currentIndex = playIndexRef.current
    const played = playedSongsRef.current
    
    console.log('handleNext state:', { 
      hasPlaylist: !!playlist,
      hasOptions: !!options,
      currentIndex,
      playedCount: played?.size,
      songsCount: playlist?.songs?.length
    })
    
    if (!playlist || !options) {
      console.log('handleNext: no playlist or options, aborting')
      return
    }

    const songs = playlist.songs || []
    if (songs.length === 0) {
      console.log('handleNext: no songs, stopping')
      await stop()
      return
    }

    let nextIndex = currentIndex

    if (options.shuffle) {
      // Shuffle: use stored shuffled order for consistent looping
      let shuffledOrder = shuffledOrderRef.current
      
      // If no shuffled order exists, create one
      if (!shuffledOrder || shuffledOrder.length !== songs.length) {
        // Create shuffled array of indices
        shuffledOrder = Array.from({ length: songs.length }, (_, i) => i)
        // Fisher-Yates shuffle
        for (let i = shuffledOrder.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledOrder[i], shuffledOrder[j]] = [shuffledOrder[j], shuffledOrder[i]]
        }
        shuffledOrderRef.current = shuffledOrder
        console.log('Created new shuffled order:', shuffledOrder)
      }
      
      // Find current position in shuffled order
      const currentShuffledIndex = shuffledOrder.indexOf(currentIndex)
      
      if (currentShuffledIndex === -1) {
        // Current index not in shuffled order (shouldn't happen), use first
        nextIndex = shuffledOrder[0]
      } else if (currentShuffledIndex < shuffledOrder.length - 1) {
        // Not at end of shuffled order, play next
        nextIndex = shuffledOrder[currentShuffledIndex + 1]
      } else {
        // At end of shuffled order
        if (options.loop) {
          // Loop: start from beginning of same shuffled order
          nextIndex = shuffledOrder[0]
          console.log('Looping: restarting with same shuffled order')
        } else {
          await stop()
          return
        }
      }
      
      // Update played songs tracking (for display purposes)
      const newPlayed = new Set([...played, nextIndex])
      setPlayedSongs(newPlayed)
      playedSongsRef.current = newPlayed
    } else {
      // Normal: play next song
      nextIndex = (currentIndex + 1) % songs.length
      console.log('handleNext: normal mode, nextIndex =', nextIndex, 'loop =', options.loop)
      
      if (nextIndex === 0 && !options.loop) {
        // Reached end, stop
        console.log('handleNext: reached end of playlist, stopping')
        await stop()
        return
      }
    }

    console.log('handleNext: playing next song at index', nextIndex)
    setPlayIndex(nextIndex)
    playIndexRef.current = nextIndex
    await playSong(songs[nextIndex], playlist, options)
  }

  const startPlaylist = async (playlistData) => {
    const { playlist, songs, options } = playlistData
    
    if (songs.length === 0) return

    // Reset stopped flag
    stoppedRef.current = false
    
    // Reset state
    setPlayedSongs(new Set())
    setPlayIndex(0)
    playedSongsRef.current = new Set()
    playIndexRef.current = 0
    shuffledOrderRef.current = null // Reset shuffled order for new playlist

    // Create playlist object with songs
    const playlistWithSongs = { ...playlist, songs }

    // Determine starting index
    let startIndex = 0
    if (options.shuffle) {
      // Create shuffled order first
      const shuffledOrder = Array.from({ length: songs.length }, (_, i) => i)
      // Fisher-Yates shuffle
      for (let i = shuffledOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOrder[i], shuffledOrder[j]] = [shuffledOrder[j], shuffledOrder[i]]
      }
      shuffledOrderRef.current = shuffledOrder
      startIndex = shuffledOrder[0] // Start with first song in shuffled order
      const initialPlayed = new Set([startIndex])
      setPlayedSongs(initialPlayed)
      playedSongsRef.current = initialPlayed
      console.log('Created shuffled order for playlist:', shuffledOrder)
    }

    setPlayIndex(startIndex)
    playIndexRef.current = startIndex
    await playSong(songs[startIndex], playlistWithSongs, options)
  }

  return {
    isPlaying,
    currentSong,
    remainingTime,
    playOptions,
    currentIndex: playIndex,
    totalSongs: currentPlaylist?.songs?.length || 0,
    play: startPlaylist,
    stop,
    skip,
    previous,
    pause: stop // For now, pause is same as stop
  }
}
