import Papa from 'papaparse'

export default function ExportButton({ urls, projectName }) {
  function handleExport() {
    // Sort by path (hierarchical order)
    const sorted = [...urls].sort((a, b) => a.path.localeCompare(b.path))

    const rows = sorted.map(u => ({
      'Path': u.path,
      'Full URL': u.url,
      'Title': u.title || '',
      'Depth': u.depth || 0,
      'HTTP Status': u.status_code || '',
      'Content Type': u.content_type || '',
      'Decision': u.decision || '',
      'Destination': u.destination || '',
      'Notes': u.notes || '',
      'Decided By': u.decided_by || '',
      'Decided At': u.decided_at ? new Date(u.decided_at).toLocaleString() : '',
    }))

    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const slug = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    link.href = URL.createObjectURL(blob)
    link.download = `url-audit-${slug}-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const decided = urls.filter(u => u.decision).length
  const total = urls.length

  return (
    <button className="export-btn" onClick={handleExport} title={`Export ${total} URLs (${decided} decided)`}>
      ↓ Export CSV
    </button>
  )
}
