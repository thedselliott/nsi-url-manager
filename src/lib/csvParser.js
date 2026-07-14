import Papa from 'papaparse'

// Flexible column detection — handles Screaming Frog and other crawl tool exports
const COLUMN_ALIASES = {
  url:         ['address', 'url', 'href'],
  title:       ['title 1', 'title1', 'title', 'page title'],
  statusCode:  ['status code', 'status_code', 'statuscode', 'http status'],
  contentType: ['content type', 'content_type', 'contenttype', 'mime type'],
}

function findColumn(headers, aliases) {
  const lower = headers.map(h => h.toLowerCase().trim())
  for (const alias of aliases) {
    const idx = lower.findIndex(h => h === alias || h.startsWith(alias))
    if (idx !== -1) return headers[idx]
  }
  return null
}

function normalizePath(url) {
  try {
    const u = new URL(url)
    let path = u.pathname
    // Normalize: ensure trailing slash for directories, leave extensions as-is
    if (!path.includes('.') && !path.endsWith('/')) path += '/'
    return path
  } catch {
    return '/'
  }
}

function getDepth(path) {
  return path.split('/').filter(Boolean).length
}

function isHtml(contentType) {
  if (!contentType) return true // assume HTML if unknown
  return contentType.toLowerCase().includes('text/html')
}

export function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, errors }) => {
        if (!data.length) {
          reject(new Error('The CSV file appears to be empty.'))
          return
        }

        const headers = Object.keys(data[0])
        const col = {
          url:         findColumn(headers, COLUMN_ALIASES.url),
          title:       findColumn(headers, COLUMN_ALIASES.title),
          statusCode:  findColumn(headers, COLUMN_ALIASES.statusCode),
          contentType: findColumn(headers, COLUMN_ALIASES.contentType),
        }

        if (!col.url) {
          reject(new Error('Could not find a URL column. Expected "Address" or "URL".'))
          return
        }

        const urls = data
          .filter(row => {
            const url = row[col.url]?.trim()
            return url && (url.startsWith('http://') || url.startsWith('https://'))
          })
          .map(row => {
            const url = row[col.url].trim()
            const contentType = col.contentType ? row[col.contentType]?.trim() || '' : ''
            const path = normalizePath(url)
            return {
              url,
              path,
              title: col.title ? (row[col.title]?.trim() || '') : '',
              status_code: col.statusCode ? (parseInt(row[col.statusCode]) || null) : null,
              content_type: contentType,
              is_html: isHtml(contentType),
              depth: getDepth(path),
            }
          })

        if (!urls.length) {
          reject(new Error('No valid URLs found in the CSV.'))
          return
        }

        resolve(urls)
      },
      error: (err) => reject(new Error(err.message)),
    })
  })
}
