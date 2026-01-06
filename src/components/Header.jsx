import './Header.css'

function Header({ onHomeClick, onNowPlayingClick, isPlaying }) {
  return (
    <header className="header">
      <div className="header-logo">
        <img src="/c64-logo.svg" alt="C64" className="c64-logo" />
      </div>
      <div className="header-title">
        <h1>Ultimate64WebMusicPlayer</h1>
      </div>
      <div className="header-actions">
        {isPlaying && (
          <button 
            className="now-playing-button"
            onClick={onNowPlayingClick}
            aria-label="Now Playing"
          >
            <img src="/play-button-svgrepo-com.svg" alt="Now Playing" className="now-playing-icon" />
          </button>
        )}
        <button 
          className="home-button"
          onClick={onHomeClick}
          aria-label="Home"
        >
          <img src="/home-svgrepo-com.svg" alt="Home" className="home-icon" />
        </button>
      </div>
    </header>
  )
}

export default Header
