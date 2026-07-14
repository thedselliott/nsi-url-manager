export default function ProgressBar({ decided, total }) {
  const pct = total > 0 ? Math.round((decided / total) * 100) : 0
  return (
    <div className="progress-wrap">
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-label">{decided}/{total} decided</span>
    </div>
  )
}
