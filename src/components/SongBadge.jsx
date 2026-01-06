import './SongBadge.css'

function SongBadge({ type }) {
  if (!type) return null

  const badgeClass = type === 'sid' ? 'badge-sid' : 'badge-mus'
  const badgeText = type.toUpperCase()

  return (
    <span className={`song-badge ${badgeClass}`}>
      {badgeText}
    </span>
  )
}

export default SongBadge
