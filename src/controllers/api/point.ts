import type { Context } from 'hono'
import type { AppEnv } from '../../types'
import { getClientIp } from '../../utils/ip'
import { logEvent } from '../../utils/log'
import { cacheSet } from './point.cache'
import { CACHE_TTL_MS, IP_TTL_SECONDS, STORED_HEADER } from './point.constant'
import { fetchToken, readRecorded, readToken } from './point.utils'

/**
 * GET /_/:point_name、GET /_/:point_name/ip —— 读取该 point 记录的 IP。
 *
 * 先查进程内缓存（15 分钟），未命中再读 KV 并回填；都没有则返回 127.0.0.1。
 * point_name 的校验由 `requirePointName` 中间件完成。
 */
export async function pointGet(c: Context<AppEnv>) {
  const pointName = c.req.param('point_name') ?? ''

  const recorded = await readRecorded(c, pointName)

  return c.text(recorded.value)
}

/**
 * POST /_/:point_name?token=xxx —— 记录访问者 IP。
 *
 * token 与 `token-${point_name}` 一致且能取到 IP 时，把 IP 写入
 * `ip-${point_name}`（24 小时后过期）并返回它；否则跳过写入，返回该 point 已有的记录。
 */
export async function pointPost(c: Context<AppEnv>) {
  const pointName = c.req.param('point_name') ?? ''
  const token = c.req.query('token')

  const ip = getClientIp(c)
  const lookup = await readToken(c, pointName, token)

  if (ip && lookup.value && lookup.value === token) {
    // 命中缓存时 token 可能已被轮换/吊销，写之前强制和 KV 核对一次；
    // 刚从 KV 读到的值本身是新的，不必再读。
    const expected = lookup.fromCache
      ? await fetchToken(c, pointName)
      : lookup.value

    if (expected !== token) {
      logEvent(c, 'token.mismatch', { point: pointName, fromCache: true })

      const recorded = await readRecorded(c, pointName)

      return c.text(recorded.value)
    }

    await c.env.KV.put(`ip-${pointName}`, ip, { expirationTtl: IP_TTL_SECONDS })
    logEvent(c, 'kv.put', {
      key: `ip-${pointName}`,
      value: ip,
      ttl: IP_TTL_SECONDS,
    })
    // 当前 isolate 立即可见，不必等 KV 最终一致
    cacheSet(`ip-${pointName}`, ip, CACHE_TTL_MS)
    c.header(STORED_HEADER, '1')

    return c.text(ip)
  }

  const recorded = await readRecorded(c, pointName)

  return c.text(recorded.value)
}
