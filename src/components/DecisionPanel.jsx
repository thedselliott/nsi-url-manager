import { useState, useEffect, useRef } from 'react'

const DECISIONS = [
  { key: 'keep',     label: 'Keep',     shortcut: 'K', needsDest: false },
  { key: 'redirect', label: 'Redirect', shortcut: 'R', needsDest: true  },
  { key: 'delete',   label: 'Delete',   shortcut: 'D', needsDest: false },
  { key: 'merge',    label: 'Merge',    shortcut: 'M', needsDest: true  },
]

function HttpBadge({ code }) {
  if (!code) return null
  const cls = code < 300 ? 'ok' : code < 400 ? 'redir' : 'err'
  return <span className={`http-badge ${cls}`}>{code}</span>
}

function AutocompleteInput({ value, onChange, suggestions }) {
  const [open, setOpen] = useState(false)
  const [filtered, setFiltered] = useState([])
  const wrapRef = useRef()

  useEffect(() => {
    if (!value.trim()) { setFiltered([]); setOpen(false); return }
    const q = value.toLowerCase()
    const matches = suggestions
      .filter(u => u.url.toLowerCase().includes(q) || (u.title || '').toLowerCase().includes(q))
      .slice(0, 8)
    setFiltered(matches)
    setOpen(matches.length > 0)
  }, [value, suggestions])

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="autocomplete-wrap" ref={wrapRef}>
      <input
        type="url"
        placeholder="https://nextsteps.idaho.gov/new-page/ or any URL"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => filtered.length > 0 && setOpen(true)}
      />
      {open && (
        <div className="autocomplete-list">
          {filtered.map(u => (
            <div
              key={u.id}
              className="autocomplete-item"
              onMouseDown={() => { onChange(u.url); setOpen(false) }}
            >
              <strong>{u.title || u.path}</strong>
              <span>{u.url}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DecisionPanel({ url, urls, userName, onSave, onNext, onPrev }) {
  const [decision, setDecision] = useState(null)
  const [destination, setDestination] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Sync state when selected URL changes
  useEffect(() => {
    if (url) {
      setDecision(url.decision || null)
      setDestination(url.destination || '')
      setNotes(url.notes || '')
    }
  }, [url?.id])

  const activeDef = DECISIONS.find(d => d.key === decision)

  async function handleSave(overrideDecision) {
    const d = overrideDecision || decision
    if (!d) return
    if (activeDef?.needsDest && !destination.trim()) return

    setSaving(true)
    await onSave({
      id: url.id,
      decision: d,
      destination: destination.trim() || null,
      notes: notes.trim() || null,
    })
    setSaving(false)
  }

  // Quick-save for K and D (no destination needed)
  function handleDecisionClick(def) {
    setDecision(def.key)
    if (!def.needsDest) {
      // Save immediately
      onSave({
        id: url.id,
        decision: def.key,
        destination: null,
        notes: notes.trim() || null,
      })
    }
  }

  if (!url) {
    return (
      <div className="decision-panel">
        <div className="decision-empty">
          <div className="icon">👈</div>
          <p>Select a URL from the tree to review it</p>
          <p style={{ fontSize: 12 }}>Use Tab to jump to the next undecided URL</p>
        </div>
      </div>
    )
  }

  const hasPriorDecision = url.decision && url.decided_by
  const decidedDate = url.decided_at ? new Date(url.decided_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

  return (
    <div className="decision-panel">
      <div className="decision-inner">

        {/* URL info block */}
        <div className="decision-url-block">
          <div className="decision-title">{url.title || url.path}</div>
          <div className="decision-url">
            <a href={url.url} target="_blank" rel="noopener noreferrer">{url.url}</a>
          </div>
          <div className="decision-meta">
            <HttpBadge code={url.status_code} />
            {url.decision && (
              <span className={`status-badge ${url.decision}`}>
                {url.decision}
              </span>
            )}
          </div>
        </div>

        {/* Prior decision warning */}
        {hasPriorDecision && url.decided_by !== userName && (
          <div className="prior-decision">
            <span>ℹ️</span>
            <span>
              Marked <strong>{url.decision}</strong> by <strong>{url.decided_by}</strong> on {decidedDate}.
              You can override below.
            </span>
          </div>
        )}

        {/* Decision buttons */}
        <div className="decision-buttons">
          {DECISIONS.map(def => (
            <button
              key={def.key}
              className={`decision-btn ${def.key} ${decision === def.key ? 'active' : ''}`}
              onClick={() => handleDecisionClick(def)}
            >
              {def.label}
              <span className="shortcut">[{def.shortcut}]</span>
            </button>
          ))}
        </div>

        {/* Destination field — for Redirect and Merge */}
        {activeDef?.needsDest && (
          <div className="destination-block">
            <h4>
              {decision === 'redirect' ? 'Redirect destination' : 'Merge into'}
            </h4>
            <AutocompleteInput
              value={destination}
              onChange={setDestination}
              suggestions={urls.filter(u => u.id !== url.id)}
            />
            <div className="destination-hint">
              Type a URL from the list above or any destination — including pages that don't exist yet.
            </div>

            <button
              className="btn btn-primary"
              style={{ alignSelf: 'flex-start', marginTop: 4 }}
              disabled={!destination.trim() || saving}
              onClick={() => handleSave()}
            >
              {saving ? 'Saving…' : `Confirm ${decision === 'redirect' ? 'Redirect' : 'Merge'} →`}
            </button>
          </div>
        )}

        {/* Notes */}
        <div className="notes-block">
          <label htmlFor="notes">Notes (optional)</label>
          <textarea
            id="notes"
            placeholder="Add any context for this decision…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={() => {
              if (url.decision && notes !== url.notes) {
                onSave({ id: url.id, decision: url.decision, destination: url.destination, notes: notes.trim() || null })
              }
            }}
          />
        </div>

        {/* Navigation */}
        <div className="decision-actions">
          <div className="shortcuts-hint">
            <span><kbd>K</kbd> Keep</span>
            <span><kbd>R</kbd> Redirect</span>
            <span><kbd>D</kbd> Delete</span>
            <span><kbd>M</kbd> Merge</span>
            <span><kbd>Tab</kbd> Next undecided</span>
          </div>
          <div className="decision-nav">
            {onPrev && <button onClick={onPrev}>← Prev</button>}
            <button onClick={onNext}>Next undecided →</button>
          </div>
        </div>

      </div>
    </div>
  )
}
