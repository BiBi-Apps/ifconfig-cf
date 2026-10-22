/**
 * 进程内 TTL 缓存（每个 isolate 各一份）。
 *
 * 只用来抵消 KV read 成本与抖动，不是数据源：
 * - 每个 Worker isolate 独立，别的 colo / 新实例看不到这里的缓存
 * - isolate 随时可能被回收，读写都不保证命中
 * - 真正的数据仍以 KV 为准
 *
 * 同一个 key 再次写入会挪到队尾，淘汰时先丢最久没写过的（近似 LRU）。
 */
interface Entry {
  value: string | null
  expiresAt: number
}

export interface CacheLookup {
  /** 是否命中（命中时 value 仍可能是 null，表示「KV 里确实没有」） */
  hit: boolean
  value: string | null
}

/** 上限，防止被大量 point_name 撑爆内存。 */
const MAX_ENTRIES = 1000

const store = new Map<string, Entry>()

export function cacheGet(key: string): CacheLookup {
  const entry = store.get(key)

  if (!entry) return { hit: false, value: null }

  if (entry.expiresAt <= Date.now()) {
    store.delete(key)
    return { hit: false, value: null }
  }

  return { hit: true, value: entry.value }
}

export function cacheSet(
  key: string,
  value: string | null,
  ttlMs: number,
): void {
  if (store.has(key)) {
    store.delete(key)
  } else if (store.size >= MAX_ENTRIES) {
    evict()
  }

  store.set(key, { value, expiresAt: Date.now() + ttlMs })
}

/** 测试用：清空缓存。 */
export function cacheClear(): void {
  store.clear()
}

function evict(): void {
  const now = Date.now()

  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key)
  }

  // 仍然满：按最久未写入的顺序淘汰
  while (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value
    if (oldest === undefined) break
    store.delete(oldest)
  }
}
