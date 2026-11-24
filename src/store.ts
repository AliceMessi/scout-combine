import type { RunMetrics } from './run'
import type { Role } from './scoring'

/** One finished run, as saved on the booth PC. */
export interface RunRecord {
  id: string
  day: string // local date, YYYY-MM-DD
  endedAt: number // epoch ms
  tag: string // 3 letters A-Z
  scores: { reaction: number; flick: number; lastHit: number; overall: number }
  metrics: RunMetrics
  role: Role
}

export interface Store {
  save(r: RunRecord): Promise<void>
  /** Runs of one day. Rejects on any failure: a failed read is never an empty board. */
  byDay(day: string): Promise<RunRecord[]>
  all(): Promise<RunRecord[]>
  clearDay(day: string): Promise<void>
  close(): void
}

const DB = 'scout-combine'
const RUNS = 'runs'

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error ?? new Error('IndexedDB request failed'))
  })
}

export function openStore(idb: IDBFactory = indexedDB): Promise<Store> {
  return new Promise((resolve, reject) => {
    let open: IDBOpenDBRequest
    try {
      open = idb.open(DB, 1)
    } catch (e) {
      reject(e)
      return
    }
    open.onupgradeneeded = () => {
      const s = open.result.createObjectStore(RUNS, { keyPath: 'id' })
      s.createIndex('day', 'day')
    }
    open.onerror = () => reject(open.error ?? new Error('IndexedDB open failed'))
    open.onsuccess = () => {
      const db = open.result
      // Every call wraps its transaction in try/catch: a closed or broken database throws synchronously.
      const run = <T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => Promise<T>): Promise<T> => {
        try {
          return f(db.transaction(RUNS, mode).objectStore(RUNS))
        } catch (e) {
          return Promise.reject(e)
        }
      }
      // Writes resolve only when the transaction commits: a quota error is raised at commit,
      // after the request itself has already succeeded.
      const write = (f: (s: IDBObjectStore) => void): Promise<void> => {
        try {
          const tx = db.transaction(RUNS, 'readwrite')
          const done = new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve()
            tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'))
            tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
          })
          f(tx.objectStore(RUNS))
          return done
        } catch (e) {
          return Promise.reject(e)
        }
      }
      resolve({
        save: r =>
          write(s => {
            s.put(r)
          }),
        byDay: day => run('readonly', s => req(s.index('day').getAll(day)) as Promise<RunRecord[]>),
        all: () => run('readonly', s => req(s.getAll()) as Promise<RunRecord[]>),
        clearDay: day =>
          write(s => {
            // Delete through a cursor in the same transaction; the whole clear commits or none of it does.
            const c = s.index('day').openKeyCursor(day)
            c.onsuccess = () => {
              const cur = c.result
              if (!cur) return
              s.delete(cur.primaryKey)
              cur.continue()
            }
          }),
        close: () => db.close(),
      })
    }
  })
}

export function toCsv(rs: RunRecord[]): string {
  const head = 'id,day,endedAt,tag,role,overall,reaction,flick,lastHit'
  const lines = rs.map(r =>
    [r.id, r.day, r.endedAt, r.tag, r.role, r.scores.overall, r.scores.reaction, r.scores.flick, r.scores.lastHit].join(','),
  )
  return [head, ...lines].join('\n')
}
