import { useState } from 'react'

export default function UserNameModal({ onSubmit }) {
  const [name, setName] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed) onSubmit(trimmed)
  }

  return (
    <div className="overlay">
      <div className="modal">
        <div>
          <h2>Welcome to the URL Audit Tool</h2>
          <p style={{ marginTop: 6 }}>Enter your name so your decisions can be attributed to you.</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label htmlFor="username">Your name</label>
            <input
              id="username"
              type="text"
              placeholder="e.g. Sarah Johnson"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!name.trim()}
            style={{ alignSelf: 'flex-start' }}
          >
            Continue →
          </button>
        </form>
      </div>
    </div>
  )
}
