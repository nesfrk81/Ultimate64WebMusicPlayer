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
import { loadIndices } from './services/search'
import { checkSonglengthsAvailable } from './services/api'

function App() {
  const { settings, isLoading, updateSettings } = useSettings()
  const player = usePlayer()
  const [currentScreen, setCurrentScreen] = useState('loading')
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [previousScreen, setPreviousScreen] = useState(null)
  const [showAboutDialog, setShowAboutDialog] = useState(false)

  // Load song indices on app start
  useEffect(() => {
    loadIndices().catch(err => {
      console.error('Failed to load indices on app start:', err)
    })
  }, [])

  // Check songlengths availability after settings and indices are loaded
  useEffect(() => {
    if (isLoading) return
    
    const checkSonglengths = async () => {
      try {
        const songlengthsExist = await checkSonglengthsAvailable()
        if (songlengthsExist && settings.songlengthsAvailable !== true) {
          await updateSettings({ songlengthsAvailable: true })
        }
      } catch (err) {
        console.error('Failed to check songlengths availability:', err)
      }
    }
    
    // Small delay to ensure indices are loaded
    const timer = setTimeout(checkSonglengths, 500)
    return () => clearTimeout(timer)
  }, [isLoading, settings?.songlengthsAvailable, updateSettings])

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

  const handleAboutClick = () => {
    setShowAboutDialog(true)
  }

  const handleAboutClose = () => {
    setShowAboutDialog(false)
  }

  if (currentScreen === 'loading') {
    return <div className="app-loading">Loading...</div>
  }

  return (
    <div className="app">
      <Header 
        onHomeClick={handleHomeClick}
        onAboutClick={handleAboutClick}
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
          onNowPlayingClick={handleNowPlayingClick}
          isPlaying={player.isPlaying}
        />
      )}

      {showAboutDialog && (
        <div className="about-dialog-overlay" onClick={handleAboutClose}>
          <div className="about-dialog" onClick={(e) => e.stopPropagation()}>
            <h2>About</h2>
            <div className="about-content">
              <h3>Instructions</h3>
              <p>To use this music player, you need to configure the following settings:</p>
              
              <h4>Required Settings:</h4>
              <ul>
                <li><strong>Ultimate64 IP Address:</strong> Enter the IP address of your Ultimate64 device on your local network (e.g., 192.168.1.64). Make sure your device and Ultimate64 are on the same network.</li>
                <li><strong>HVSC Base Path on C64:</strong> Enter the full path to your HVSC collection on the Ultimate64 file system. This should match the exact path as it appears on your C64 (e.g., /USB0/MUSIC/HVSC).</li>
              </ul>
              
              <h4>Optional Settings:</h4>
              <ul>
                <li><strong>Use SID songlength file:</strong> When enabled, the player will use songlength data from the HVSC Songlengths.md5 file for accurate playback duration. This option is automatically enabled if songlength data is available in the index.</li>
                <li><strong>Default SID Play Time:</strong> If songlength data is not available or disabled, this sets how long each SID file will play (5-300 seconds). Default is 60 seconds.</li>
                <li><strong>Theme:</strong> Choose between C64 BASIC (classic purple) or Dark theme.</li>
              </ul>
          
             
              <div className="about-links">
                <h3>Social Links:</h3>
                <ul>
                  <li>
                    <a href="https://www.instagram.com/nesfrk/" target="_blank" rel="noopener noreferrer">
                      Instagram
                    </a>
                  </li>
                  <li>
                    <a href="https://www.youtube.com/@nesfrk" target="_blank" rel="noopener noreferrer">
                      YouTube
                    </a>
                  </li>

                  <li>
                    <a href="https://x.com/nesfreak/" target="_blank" rel="noopener noreferrer">
                      X (Twitter)
                    </a>
                  </li>
                  <li>
                    <a href="https://www.twitch.tv/nesfrk" target="_blank" rel="noopener noreferrer">
                      Twitch
                    </a>
                  </li>
                </ul>
                
                <h3>Project:</h3>
                <ul>
                  <li>
                    <a href="https://github.com/nesfrk81/Ultimate64WebMusicPlayer" target="_blank" rel="noopener noreferrer">
                      GitHub
                    </a>
                  </li>
                </ul>
              </div>

              <p className="copyright">© Nesfrk 2026</p>
            </div>
            <div className="about-dialog-actions">
              <button 
                className="about-close-button"
                onClick={handleAboutClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
