import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function generateSlug() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export default function ProjectSelector({ userName, onSelect, onChangeName }) {
  const [mode, setMode] = useState('list') // 'list' | 'create' | 'join'
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [joinSlug, setJoinSlug] = useState('')
  const [error, setError] = useState('')

  // Load recent projects from localStorage
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('url_tool_recent') || '[]')
    if (!stored.length) { setLoading(false); return }

    supabase
      .from('projects')
      .select('id, name, slug, csv_uploaded, created_at, created_by')
      .in('id', stored)
      .then(({ data }) => {
        if (data) setProjects(data)
        setLoading(false)
      })
  }, [])

  function saveRecent(projectId) {
    const stored = JSON.parse(localStorage.getItem('url_tool_recent') || '[]')
    const updated = [projectId, ...stored.filter(id => id !== projectId)].slice(0, 10)
    localStorage.setItem('url_tool_recent', JSON.stringify(updated))
  }

  function selectProject(project) {
    saveRecent(project.id)
    onSelect(project)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    const name = newName.trim()
    if (!name) return

    const { data, error } = await supabase
      .from('projects')
      .insert({ name, slug: generateSlug(), created_by: userName })
      .select()
      .single()

    if (error) { setError(error.message); return }
    selectProject(data)
  }

  async function handleJoin(e) {
    e.preventDefault()
    setError('')
    const slug = joinSlug.trim().toUpperCase()
    if (!slug) return

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error || !data) { setError('Project not found. Check the code and try again.'); return }
    selectProject(data)
  }

  return (
    <div className="screen">
      <div className="screen-card">
        <div>
          <h2>URL Audit Projects</h2>
          <p>Hi {userName}! Create a new project or join an existing one with a project code.</p>
        </div>

        {error && (
          <div style={{ color: 'var(--delete)', background: 'var(--delete-bg)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Recent projects */}
        {!loading && projects.length > 0 && (
          <div>
            <label style={{ marginBottom: 8, display: 'block' }}>Recent Projects</label>
            <div className="project-list">
              {projects.map(p => (
                <button key={p.id} className="project-item" onClick={() => selectProject(p)}>
                  <div>
                    <div className="project-item-name">{p.name}</div>
                    <div className="project-item-meta">
                      Code: <strong>{p.slug}</strong> · Created by {p.created_by}
                    </div>
                  </div>
                  <span className="project-item-progress">
                    {p.csv_uploaded ? 'In progress →' : 'Awaiting CSV →'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {projects.length > 0 && <div className="divider">or</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => setMode(mode === 'create' ? 'list' : 'create')}
          >
            + New Project
          </button>
          <button
            className="btn btn-outline"
            style={{ flex: 1 }}
            onClick={() => setMode(mode === 'join' ? 'list' : 'join')}
          >
            Join with Code
          </button>
        </div>

        {mode === 'create' && (
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field">
              <label>Project name</label>
              <input
                type="text"
                placeholder="e.g. NSI Q2 2026 Audit"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}
              disabled={!newName.trim()}>
              Create Project →
            </button>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field">
              <label>Project code</label>
              <input
                type="text"
                placeholder="e.g. A3B7C2"
                value={joinSlug}
                onChange={e => setJoinSlug(e.target.value.toUpperCase())}
                maxLength={6}
                autoFocus
                style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '.1em' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}
              disabled={!joinSlug.trim()}>
              Join Project →
            </button>
          </form>
        )}

        <button className="btn-ghost" style={{ color: 'var(--text-3)', fontSize: 12, alignSelf: 'flex-start', padding: 0, background: 'none', border: 'none' }}
          onClick={onChangeName}>
          ← Change name
        </button>
      </div>
    </div>
  )
}
