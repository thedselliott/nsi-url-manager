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

export default function DecisionPanel({ url, urls, userName, onSave, onCascade, onNext, onNextUndecided, onPrev }) {
  const [decision, setDecision] = useState(null)
  const [destination, setDestination] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [destConfirmed, setDestConfirmed] = useState(false)

  // Sync state when selected URL changes
  useEffect(() => {
    if (url) {
      setDecision(url.decision || null)
      setDestination(url.destination || '')
      setNotes(url.notes || '')
      // If URL already has a saved destination, show it as confirmed
      setDestConfirmed(!!(url.destination))
    }
  }, [url?.id])

  const activeDef = DECISIONS.find(d => d.key === decision)
  const showDeleteConfirmation = decision === 'delete' && url?.decision === 'delete'

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
    setDestConfirmed(true)
  }

  // Quick-save for K and D (no destination needed); clicking active button clears it
  function handleDecisionClick(def) {
    if (decision === def.key) {
      setDecision(null)
      setDestination('')
      setDestConfirmed(false)
      onSave({ id: url.id, decision: null, destination: null, notes: notes.trim() || null })
      return
    }
    setDecision(def.key)
    if (!def.needsDest) {
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

        {/* Deletion confirmation */}
        {showDeleteConfirmation && (
          <div className="deletion-confirmed">
            <div className="deletion-confirmed-icon">🗑️</div>
            <div className="deletion-confirmed-text">
              <strong>Marked for deletion</strong>
              <p>This page will be removed. If visitors land here they'll get a 404 unless you set up a redirect elsewhere. Use the Notes field below to record any context.</p>
            </div>
            <button
              className="btn btn-outline"
              style={{ fontSize: 12, padding: '4px 10px', flexShrink: 0 }}
              onClick={() => {
                setDecision(null)
                onSave({ id: url.id, decision: null, destination: null, notes: notes.trim() || null })
              }}
            >
              Undo
            </button>
          </div>
        )}

        {/* Destination field — for Redirect and Merge */}
        {activeDef?.needsDest && (
          <div className="destination-block">
            <h4>
              {decision === 'redirect' ? 'Where should this URL redirect to?' : 'Which page should this content merge into?'}
            </h4>

            {destConfirmed && destination ? (
              <div className="destination-confirmed">
                <div className="destination-confirmed-value">
                  <span className="destination-confirmed-icon">✓</span>
                  <span className="destination-confirmed-url">{destination}</span>
                </div>
                <button
                  className="btn btn-outline"
                  style={{ fontSize: 12, padding: '4px 10px' }}
                  onClick={() => setDestConfirmed(false)}
                >
                  Edit
                </button>
              </div>
            ) : (
              <>
                <AutocompleteInput
                  value={destination}
                  onChange={setDestination}
                  suggestions={urls.filter(u => u.id !== url.id)}
                />
                <div className="destination-hint">
                  Start typing a page title or path to search existing URLs — or paste any destination, including pages that don't exist yet.
                </div>
                <button
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-start', marginTop: 4 }}
                  disabled={!destination.trim() || saving}
                  onClick={() => handleSave()}
                >
                  {saving ? 'Saving…' : `Confirm ${decision === 'redirect' ? 'Redirect' : 'Merge'} →`}
                </button>
              </>
            )}
          </div>
        )}

        {/* Children warning */}
        {url.decision && url.decision !== 'keep' && (() => {
          const undecidedChildren = urls.filter(u =>
            u.id !== url.id &&
            u.path.startsWith(url.path) &&
            u.is_html &&
            !u.path.match(/\.[a-z]{2,4}\/?$/i) &&
            !u.decision
          )
          if (!undecidedChildren.length) return null
          return (
            <div className="children-warning">
              <div className="children-warning-text">
                <strong>⚠️ {undecidedChildren.length} child page{undecidedChildren.length !== 1 ? 's' : ''} still need decisions</strong>
                <p>
                  {url.decision === 'delete'
                    ? 'These pages live under this URL. You can mark them all for deletion at once, or decide each one individually.'
                    : 'These pages live under this URL and will still need individual decisions.'}
                </p>
                <ul className="children-warning-list">
                  {undecidedChildren.slice(0, 5).map(c => (
                    <li key={c.id}>{c.path}</li>
                  ))}
                  {undecidedChildren.length > 5 && (
                    <li>…and {undecidedChildren.length - 5} more</li>
                  )}
                </ul>
              </div>
              {url.decision === 'delete' && (
                <button
                  className="btn btn-outline"
                  style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0, alignSelf: 'flex-start', color: 'var(--delete-text)', borderColor: 'var(--delete-border)' }}
                  onClick={() => onCascade(url, 'delete')}
                >
                  Mark all {undecidedChildren.length} as Delete
                </button>
              )}
            </div>
          )
        })()}

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
            <span><kbd>N</kbd> Next undecided</span>
          </div>
          <div className="decision-nav">
            {onPrev && <button onClick={onPrev}>← Prev</button>}
            <button onClick={onNext}>Next →</button>
            <button onClick={onNextUndecided}>Next undecided →</button>
          </div>
        </div>

      </div>
    </div>
  )
}
