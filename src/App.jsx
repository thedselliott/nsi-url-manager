import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { buildTree, flattenTree } from './lib/treeBuilder'
import UserNameModal from './components/UserNameModal'
import ProjectSelector from './components/ProjectSelector'
import CsvUpload from './components/CsvUpload'
import ProgressBar from './components/ProgressBar'
import UrlTree from './components/UrlTree'
import DecisionPanel from './components/DecisionPanel'
import ExportButton from './components/ExportButton'

function readStored(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

export default function App() {
  const [userName, setUserName] = useState(() => localStorage.getItem('url_tool_username') || '')
  const [project, setProject]   = useState(() => readStored('url_tool_project'))
  const [urls, setUrls]         = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  // ── Persist user / project ──────────────────────────────────────────────────
  function applyUserName(name) {
    setUserName(name)
    localStorage.setItem('url_tool_username', name)
  }

  function applyProject(proj) {
    setProject(proj)
    if (proj) localStorage.setItem('url_tool_project', JSON.stringify(proj))
    else       localStorage.removeItem('url_tool_project')
  }

  // ── Load & subscribe ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!project?.id || !project?.csv_uploaded) return

    setLoading(true)
    supabase
      .from('urls')
      .select('*')
      .eq('project_id', project.id)
      .order('path')
      .then(({ data, error }) => {
        if (error) { setError(error.message); setLoading(false); return }
        const rows = data || []
        setUrls(rows)
        setLoading(false)
        // Auto-select first undecided
        const first = rows.find(u => !u.decision)
        if (first) setSelectedId(first.id)
      })

    // Real-time — another user made a decision
    const channel = supabase
      .channel(`urls-${project.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'urls',
        filter: `project_id=eq.${project.id}`,
      }, ({ new: updated }) => {
        setUrls(prev => prev.map(u => u.id === updated.id ? updated : u))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [project?.id, project?.csv_uploaded])

  // ── Navigation ──────────────────────────────────────────────────────────────
  const sortedUrls = useCallback(
    () => [...urls].sort((a, b) => a.path.localeCompare(b.path)),
    [urls]
  )

  function goToNextUndecided(fromId) {
    const sorted = sortedUrls()
    const idx = fromId ? sorted.findIndex(u => u.id === fromId) : -1
    const next = sorted.slice(idx + 1).find(u => !u.decision)
              || sorted.slice(0, Math.max(0, idx)).find(u => !u.decision)
    if (next) setSelectedId(next.id)
  }

  function goToPrev(fromId) {
    const sorted = sortedUrls()
    const idx = sorted.findIndex(u => u.id === fromId)
    if (idx > 0) setSelectedId(sorted[idx - 1].id)
  }

  // ── Save decision ───────────────────────────────────────────────────────────
  async function handleSave({ id, decision, destination, notes }) {
    const existing = urls.find(u => u.id === id)
    if (
      existing?.decision &&
      existing.decided_by &&
      existing.decided_by !== userName
    ) {
      const date = existing.decided_at
        ? new Date(existing.decided_at).toLocaleDateString()
        : ''
      const ok = window.confirm(
        `"${existing.url}" was marked "${existing.decision}" by ${existing.decided_by}${date ? ` on ${date}` : ''}.\n\nOverride their decision?`
      )
      if (!ok) return
    }

    const { data, error } = await supabase
      .from('urls')
      .update({
        decision,
        destination: destination || null,
        notes: notes || null,
        decided_by: userName,
        decided_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) { setError(error.message); return }
    setUrls(prev => prev.map(u => u.id === id ? data : u))
    // Move to next undecided after any Keep or Delete
    if (decision === 'keep' || decision === 'delete') {
      goToNextUndecided(id)
    }
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const selected = urls.find(u => u.id === selectedId)
      if (!selected) return

      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault()
        handleSave({ id: selected.id, decision: 'keep', destination: null, notes: selected.notes })
      }
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        handleSave({ id: selected.id, decision: 'delete', destination: null, notes: selected.notes })
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        goToNextUndecided(selectedId)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [urls, selectedId, userName]) // eslint-disable-line

  // ── Render flow ─────────────────────────────────────────────────────────────
  if (!userName) {
    return <UserNameModal onSubmit={applyUserName} />
  }

  if (!project) {
    return (
      <ProjectSelector
        userName={userName}
        onSelect={applyProject}
        onChangeName={() => applyUserName('')}
      />
    )
  }

  if (!project.csv_uploaded) {
    return (
      <CsvUpload
        project={project}
        userName={userName}
        onUploaded={() => applyProject({ ...project, csv_uploaded: true })}
        onBack={() => applyProject(null)}
      />
    )
  }

  const decided = urls.filter(u => u.decision).length
  const selectedUrl = urls.find(u => u.id === selectedId) || null

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <h1 className="app-title">URL Audit</h1>
          <span className="project-badge">{project.name}</span>
          <span className="project-badge" style={{ fontFamily: 'monospace', letterSpacing: '.06em' }}>
            {project.slug}
          </span>
        </div>
        <div className="app-header-right">
          <ProgressBar decided={decided} total={urls.length} />
          <ExportButton urls={urls} projectName={project.name} />
          <button className="btn-ghost" onClick={() => applyProject(null)}>
            Switch Project
          </button>
          <span className="username-badge">👤 {userName}</span>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading URLs…</div>
      ) : (
        <div className="app-body">
          <UrlTree
            urls={urls}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <DecisionPanel
            url={selectedUrl}
            urls={urls}
            userName={userName}
            onSave={handleSave}
            onNext={() => goToNextUndecided(selectedId)}
            onPrev={() => goToPrev(selectedId)}
          />
        </div>
      )}
    </div>
  )
}
