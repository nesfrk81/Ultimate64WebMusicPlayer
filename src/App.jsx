import { useState, useEffect } from 'react'
import Header from './components/Header'
import BottomBar from './components/BottomBar'
import SetupScreen from './components/SetupScreen'
import PlaylistList from './components/PlaylistList'
import PlaylistView from './components/PlaylistView'
import NowPlaying from './components/NowPlaying'
import SearchBar from './components/SearchBar'
import { useSettings } from './hooks/useSettings'
import { usePlayer } from './hooks/usePlayer'

function App() {
  const { settings, isLoading } = useSettings()
  const player = usePlayer()
  const [currentScreen, setCurrentScreen] = useState('loading')
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [previousScreen, setPreviousScreen] = useState(null)

  useEffect(() => {
    if (isLoading) return
    
    // Check if setup is needed
    if (!settings.ip || !settings.hvscPath) {
      setCurrentScreen('setup')
    } else {
      setCurrentScreen('playlist-list')
    }
  }, [settings, isLoading])

  const handleHomeClick = () => {
    setCurrentScreen('playlist-list')
  }

  const handleNowPlayingClick = () => {
    setCurrentScreen('now-playing')
  }

  const handleSettingsClick = () => {
    setCurrentScreen('setup')
  }

  const handlePlaylistSelect = (playlist) => {
    setSelectedPlaylist(playlist)
    setCurrentScreen('playlist-view')
  }

  const handlePlay = async (playData) => {
    await player.play(playData)
    setCurrentScreen('now-playing')
  }

  const handleSearch = () => {
    setPreviousScreen(currentScreen)
    setCurrentScreen('search')
  }

  const handleSearchBack = () => {
    if (previousScreen) {
      setCurrentScreen(previousScreen)
      setPreviousScreen(null)
    } else {
      setCurrentScreen('playlist-list')
    }
  }

  if (currentScreen === 'loading') {
    return <div className="app-loading">Loading...</div>
  }

  return (
    <div className="app">
      <Header 
        onHomeClick={handleHomeClick} 
        onNowPlayingClick={handleNowPlayingClick}
        isPlaying={player.isPlaying}
      />
      
      {currentScreen === 'setup' && (
        <SetupScreen onComplete={() => setCurrentScreen('playlist-list')} />
      )}
      
      {currentScreen === 'playlist-list' && (
        <PlaylistList onPlaylistSelect={handlePlaylistSelect} />
      )}
      
      {currentScreen === 'playlist-view' && selectedPlaylist && (
        <PlaylistView 
          playlist={selectedPlaylist}
          onBack={() => setCurrentScreen('playlist-list')}
          onPlay={handlePlay}
        />
      )}
      
      {currentScreen === 'now-playing' && (
        <NowPlaying 
          player={player}
          onBack={() => setCurrentScreen('playlist-view')}
        />
      )}
      
      {currentScreen === 'search' && (
        <SearchBar onBack={handleSearchBack} />
      )}
      
      {currentScreen !== 'setup' && currentScreen !== 'search' && (
        <BottomBar 
          onSettingsClick={handleSettingsClick}
          onSearchClick={handleSearch}
        />
      )}
    </div>
  )
}

export default App
