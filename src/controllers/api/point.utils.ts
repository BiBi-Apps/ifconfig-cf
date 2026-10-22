import type { Context } from 'hono'
import type { AppEnv } from '../../types'
import { logEvent } from '../../utils/log'
import { cacheGet, cacheSet } from './point.cache'
import { CACHE_TTL_MS, FALLBACK_IP, TOKEN_CACHE_TTL_MS } from './point.constant'

interface CachedLookup<T> {
  value: T
  /** 值是否来自进程内缓存（缓存可能已过期，需要时可据此回 KV 核对） */
  fromCache: boolean
}

type TokenLookup = CachedLookup<string | null>
type RecordedLookup = CachedLookup<string>

/** 直接和 KV 核对 token，并顺手刷新缓存。 */
export async function fetchToken(
  c: Context<AppEnv>,
  pointName: string,
): Promise<string | null> {
  const key = `token-${pointName}`
  const expected = await c.env.KV.get(key)

  logEvent(c, 'kv.get', { key, hit: expected !== null, fromCache: false })

  // 没查到也缓存（负缓存），避免用随机 token 刷 KV read
  cacheSet(key, expected, TOKEN_CACHE_TTL_MS)

  return expected
}

/** 读该 point 的 token：缓存 → KV。没有 token 参数时连 KV 都不碰。 */
export async function readToken(
  c: Context<AppEnv>,
  pointName: string,
  token: string | undefined,
): Promise<TokenLookup> {
  if (!token) return { value: null, fromCache: false }

  const key = `token-${pointName}`
  const cached = cacheGet(key)

  if (cached.hit) {
    logEvent(c, 'cache.hit', { key })

    return { value: cached.value, fromCache: true }
  }

  return { value: await fetchToken(c, pointName), fromCache: false }
}

/** 读该 point 记录到的 IP：缓存 → KV → 兜底值。 */
export async function readRecorded(
  c: Context<AppEnv>,
  pointName: string,
): Promise<RecordedLookup> {
  const key = `ip-${pointName}`
  const cached = cacheGet(key)

  if (cached.hit) {
    logEvent(c, 'cache.hit', { key })

    return { value: cached.value ?? FALLBACK_IP, fromCache: true }
  }

  const recorded = await c.env.KV.get(key)

  logEvent(c, 'kv.get', { key, hit: recorded !== null, fromCache: false })

  // 兜底值也缓存：避免用随机 point_name 刷 KV read（代价是别的 colo 写入后
  // 最多 15 分钟才会在这里生效）
  cacheSet(key, recorded, CACHE_TTL_MS)

  return { value: recorded ?? FALLBACK_IP, fromCache: false }
}
