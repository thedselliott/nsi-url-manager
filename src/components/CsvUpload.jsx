import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { parseCsv } from '../lib/csvParser'

const BATCH_SIZE = 200

export default function CsvUpload({ project, userName, onUploaded, onBack }) {
  const [dragging, setDragging] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef()

  async function handleFile(file) {
    setError('')
    setParsed(null)
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a .csv file.')
      return
    }
    try {
      const urls = await parseCsv(file)
      setParsed({ urls, fileName: file.name })
    } catch (e) {
      setError(e.message)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function handleUpload() {
    if (!parsed) return
    setUploading(true)
    setError('')

    try {
      const rows = parsed.urls.map(u => ({ ...u, project_id: project.id }))

      // Upload in batches
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE)
        const { error } = await supabase.from('urls').insert(batch)
        if (error) throw error
        setProgress(Math.round(((i + batch.length) / rows.length) * 100))
      }

      // Mark project as CSV uploaded (locked)
      await supabase.from('projects').update({ csv_uploaded: true }).eq('id', project.id)

      onUploaded()
    } catch (e) {
      setError(e.message)
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="screen">
      <div className="screen-card">
        <div>
          <h2>Upload URL List</h2>
          <p>
            Upload a Screaming Frog (or compatible) CSV export for <strong>{project.name}</strong>.
            Once uploaded, the URL list is locked for this project — re-uploading isn't allowed so decisions are preserved.
          </p>
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
            Project code: <strong style={{ fontFamily: 'monospace', letterSpacing: '.05em' }}>{project.slug}</strong> — share this with teammates so they can join.
          </p>
        </div>

        {error && (
          <div style={{ color: 'var(--delete)', background: 'var(--delete-bg)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
            {error}
          </div>
        )}

        {!parsed ? (
          <div
            className={`dropzone ${dragging ? 'drag-over' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <div className="icon">📄</div>
            <strong>Drop your CSV here</strong>
            <p>or click to browse</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Supports Screaming Frog exports · must include an "Address" column</p>
            <input ref={inputRef} type="file" accept=".csv" onChange={e => handleFile(e.target.files[0])} />
          </div>
        ) : (
          <div className="parse-preview">
            <div>✅ <strong>{parsed.urls.length.toLocaleString()} URLs</strong> parsed from <em>{parsed.fileName}</em></div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-3)' }}>
              {parsed.urls.filter(u => u.is_html).length} HTML pages ·{' '}
              {parsed.urls.filter(u => !u.is_html).length} other resources
            </div>
          </div>
        )}

        {uploading && (
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 6 }}>
              Uploading… {progress}%
            </div>
            <div style={{ background: 'var(--border)', borderRadius: 3, height: 6, overflow: 'hidden' }}>
              <div style={{ background: 'var(--keep)', height: '100%', width: `${progress}%`, transition: 'width .2s' }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          {parsed && !uploading && (
            <>
              <button className="btn btn-primary" onClick={handleUpload}>
                Upload & Start Audit →
              </button>
              <button className="btn btn-outline" onClick={() => setParsed(null)}>
                Choose different file
              </button>
            </>
          )}
        </div>

        <button
          className="btn-ghost"
          style={{ color: 'var(--text-3)', fontSize: 12, alignSelf: 'flex-start', padding: 0, background: 'none', border: 'none' }}
          onClick={onBack}
        >
          ← Back to projects
        </button>
      </div>
    </div>
  )
}
