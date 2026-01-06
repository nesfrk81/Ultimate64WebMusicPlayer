import { useState } from 'react'
import './CreatePlaylistDialog.css'

function CreatePlaylistDialog({ onClose, onCreate }) {
  const [name, setName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) {
      onCreate(name.trim())
      setName('')
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Create New Playlist</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Playlist name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="dialog-input"
          />
          <div className="dialog-actions">
            <button type="button" onClick={onClose} className="dialog-button cancel">
              Cancel
            </button>
            <button type="submit" className="dialog-button create" disabled={!name.trim()}>
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreatePlaylistDialog
