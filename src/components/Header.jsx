import './Header.css'

const BASE_URL = import.meta.env.BASE_URL

function Header({ onHomeClick, onAboutClick }) {
  return (
    <header className="header">
      <button 
        className="header-logo-button"
        onClick={onAboutClick}
        aria-label="About"
      >
        <div className="header-logo">
          <img src={`${BASE_URL}c64-logo.svg`} alt="C64" className="c64-logo" />
        </div>
      </button>
      <div className="header-title">
        <h1>UC64WebMusicPlayer</h1>
      </div>
      <div className="header-actions">
        <button 
          className="home-button"
          onClick={onHomeClick}
          aria-label="Home"
        >
          <img src={`${BASE_URL}home-svgrepo-com.svg`} alt="Home" className="home-icon" />
        </button>
      </div>
    </header>
  )
}

export default Header
