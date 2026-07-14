import { useState, useMemo } from 'react'
import { buildTree, filterTree } from '../lib/treeBuilder'
import TreeNode from './TreeNode'

export default function UrlTree({ urls, selectedId, onSelect }) {
  const [search, setSearch] = useState('')
  const [decisionFilter, setDecisionFilter] = useState('all') // 'all' | 'undecided' | 'decided'

  const filteredUrls = useMemo(() => {
    let result = urls.filter(u => u.is_html)
    if (decisionFilter === 'undecided') result = result.filter(u => !u.decision)
    if (decisionFilter === 'decided') result = result.filter(u => !!u.decision)
    return result
  }, [urls, decisionFilter])

  const tree = useMemo(() => buildTree(filteredUrls), [filteredUrls])

  const displayTree = useMemo(() => {
    if (!search.trim()) return tree
    return filterTree(tree, search.trim())
  }, [tree, search])

  const undecidedCount = filteredUrls.filter(u => !u.decision).length

  return (
    <div className="tree-panel">
      <div className="tree-header">
        <div className="tree-search">
          <span className="tree-search-icon">🔍</span>
          <input
            type="search"
            placeholder="Search titles or paths…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="tree-filters">
          <button
            className={`tree-filter-btn ${decisionFilter === 'undecided' ? 'active' : ''}`}
            onClick={() => setDecisionFilter(f => f === 'undecided' ? 'all' : 'undecided')}
          >
            Undecided
          </button>

          <button
            className={`tree-filter-btn ${decisionFilter === 'decided' ? 'active' : ''}`}
            onClick={() => setDecisionFilter(f => f === 'decided' ? 'all' : 'decided')}
          >
            Decided
          </button>
        </div>
      </div>

      <div className="tree-scroll">
        {displayTree ? (
          displayTree.children.map(child => (
            <TreeNode
              key={child.path}
              node={child}
              depth={0}
              selectedId={selectedId}
              onSelect={onSelect}
  
              searchQuery={search}
            />
          ))
        ) : (
          <div style={{ padding: '20px 16px', color: 'var(--text-3)', fontSize: 13 }}>
            No results for "{search}"
          </div>
        )}

        {/* Root node (homepage) if it exists */}
        {displayTree?.urlData && (
          <TreeNode
            key={displayTree.path}
            node={{ ...displayTree, children: [] }}
            depth={0}
            selectedId={selectedId}
            onSelect={onSelect}

            searchQuery={search}
          />
        )}
      </div>

      <div className="tree-footer">
        <span>{filteredUrls.length} URLs shown</span>
        {undecidedCount > 0 && <span style={{ color: 'var(--undecided)' }}>{undecidedCount} undecided</span>}
      </div>
    </div>
  )
}
