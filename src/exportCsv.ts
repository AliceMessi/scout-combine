import { localDay } from './day'
import { toCsv, type Store } from './store'

export function csvFileName(d: Date): string {
  return `scout-combine-${localDay(d)}.csv`
}

export async function exportCsv(store: Store, now = new Date()): Promise<string> {
  const runs = await store.all()
  const csv = toCsv(runs)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = csvFileName(now)
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
  return `Exported ${runs.length} run${runs.length === 1 ? '' : 's'}`
}
