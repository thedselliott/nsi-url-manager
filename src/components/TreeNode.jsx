import { useState } from 'react'

const INDENT_PX = 16

function DecisionDot({ decision }) {
  const cls = decision || 'undecided'
  return <span className={`dot ${cls}`} title={decision || 'Undecided'} />
}

export default function TreeNode({ node, depth, selectedId, onSelect, htmlOnly, searchQuery }) {
  const [expanded, setExpanded] = useState(depth < 2)

  const hasChildren = node.children.length > 0
  const isSelected = node.urlData && node.urlData.id === selectedId
  const isClickable = !!node.urlData

  function handleRowClick(e) {
    if (!isClickable) return
    onSelect(node.urlData.id)
  }

  function handleToggle(e) {
    e.stopPropagation()
    setExpanded(v => !v)
  }

  // Determine if this is a "virtual" folder node (path in tree but no URL data)
  const isFolder = !node.urlData

  return (
    <div className="tree-node">
      <div
        className={`tree-node-row ${isSelected ? 'selected' : ''} ${isFolder ? 'no-data' : ''}`}
        onClick={handleRowClick}
        title={node.urlData?.url || node.path}
      >
        {/* Indentation */}
        <div className="tree-node-indent" style={{ width: depth * INDENT_PX }} />

        {/* Expand / collapse toggle */}
        {hasChildren ? (
          <button className="tree-node-toggle" onClick={handleToggle} tabIndex={-1}>
            {expanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className="tree-node-spacer" />
        )}

        {/* Status dot — only for actual URL nodes */}
        <span className="tree-node-dot">
          {node.urlData
            ? <DecisionDot decision={node.urlData.decision} />
            : <span style={{ width: 8, display: 'inline-block' }} />
          }
        </span>

        {/* Label */}
        <div className="tree-node-text">
          <div className="tree-node-title" style={{ opacity: isFolder ? 0.5 : 1, fontStyle: isFolder ? 'italic' : 'normal' }}>
            {node.label || node.segment}
          </div>
          <div className="tree-node-url">{node.path}</div>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="tree-node-children">
          {node.children.map(child => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              htmlOnly={htmlOnly}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  )
}
