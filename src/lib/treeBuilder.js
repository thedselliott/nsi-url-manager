function formatSegment(segment) {
  return decodeURIComponent(segment)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

export function buildTree(urls) {
  // Index by path for O(1) lookup
  const byPath = new Map()
  for (const u of urls) {
    byPath.set(u.path, u)
  }

  // Collect all paths + their ancestors
  const allPaths = new Set(['/'])
  for (const u of urls) {
    const parts = u.path.split('/').filter(Boolean)
    for (let i = 1; i <= parts.length; i++) {
      allPaths.add('/' + parts.slice(0, i).join('/') + '/')
    }
  }

  // Build node map
  const nodeMap = new Map()
  for (const path of allPaths) {
    const parts = path.split('/').filter(Boolean)
    const segment = parts[parts.length - 1] || ''
    const urlData = byPath.get(path) || null
    nodeMap.set(path, {
      path,
      segment,
      label: urlData?.title || (segment ? formatSegment(segment) : 'Home'),
      urlData,
      children: [],
    })
  }

  // Wire parent → child relationships
  for (const [path, node] of nodeMap) {
    if (path === '/') continue
    const parts = path.split('/').filter(Boolean)
    const parentPath = parts.length > 1
      ? '/' + parts.slice(0, -1).join('/') + '/'
      : '/'
    const parent = nodeMap.get(parentPath)
    if (parent) parent.children.push(node)
  }

  // Sort children alphabetically at every level
  for (const node of nodeMap.values()) {
    node.children.sort((a, b) => a.segment.localeCompare(b.segment))
  }

  return nodeMap.get('/') || { path: '/', segment: '', label: 'Home', urlData: null, children: [] }
}

// Returns all urlData entries in tree order (depth-first)
export function flattenTree(node, result = []) {
  if (node.urlData) result.push(node.urlData)
  for (const child of node.children) flattenTree(child, result)
  return result
}

// Filters tree to only nodes matching a search string (and their ancestors)
export function filterTree(node, query) {
  const q = query.toLowerCase()
  const matches = (n) =>
    n.label.toLowerCase().includes(q) ||
    n.path.toLowerCase().includes(q) ||
    (n.urlData?.url || '').toLowerCase().includes(q)

  function filterNode(n) {
    const filteredChildren = n.children.map(filterNode).filter(Boolean)
    if (matches(n) || filteredChildren.length) {
      return { ...n, children: filteredChildren }
    }
    return null
  }

  return filterNode(node)
}
