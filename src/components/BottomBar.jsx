import './BottomBar.css'

function BottomBar({ onSettingsClick, onSearchClick }) {
  return (
    <div className="bottom-bar">
      <button 
        type="button" 
        className="bottom-bar-button"
        onClick={onSettingsClick}
        aria-label="Settings"
      >
        <img src="/settings-setup-svgrepo-com.svg" alt="Settings" className="bottom-bar-icon" />
      </button>
      <button 
        type="button" 
        className="bottom-bar-button"
        onClick={onSearchClick}
        aria-label="Search"
      >
        <img src="/zoom-in-magnifying-glass-svgrepo-com.svg" alt="Search" className="bottom-bar-icon" />
      </button>
    </div>
  )
}

export default BottomBar
