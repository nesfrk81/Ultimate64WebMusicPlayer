import './BottomBar.css'

const BASE_URL = import.meta.env.BASE_URL

function BottomBar({ onSettingsClick, onSearchClick, onNowPlayingClick, isPlaying }) {
  return (
    <div className="bottom-bar">
      <button 
        type="button" 
        className="bottom-bar-button"
        onClick={onSettingsClick}
        aria-label="Settings"
      >
        <img src={`${BASE_URL}settings-setup-svgrepo-com.svg`} alt="Settings" className="bottom-bar-icon" />
      </button>
      {isPlaying && (
        <button 
          type="button" 
          className="bottom-bar-button"
          onClick={onNowPlayingClick}
          aria-label="Now Playing"
        >
          <img src={`${BASE_URL}play-button-svgrepo-com.svg`} alt="Now Playing" className="bottom-bar-icon" />
        </button>
      )}
      <button 
        type="button" 
        className="bottom-bar-button"
        onClick={onSearchClick}
        aria-label="Search"
      >
        <img src={`${BASE_URL}zoom-in-magnifying-glass-svgrepo-com.svg`} alt="Search" className="bottom-bar-icon" />
      </button>
    </div>
  )
}

export default BottomBar
