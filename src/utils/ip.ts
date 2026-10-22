import type { Context } from 'hono'
import type { AppEnv } from '../types'

/**
 * 取访问者 IP。
 *
 * 只信 `cf-connecting-ip`：这个头由 Cloudflare 边缘写入并覆盖客户端伪造的值，
 * 其它 `x-real-ip` / `x-forwarded-for` 之类的头客户端可以随意伪造，不参与判断。
 * 拿不到（Cron、service binding、本地直连等）时返回 `null`。
 */
export function getClientIp(c: Context<AppEnv>): string | null {
  const ip = c.req.header('cf-connecting-ip')?.trim()

  if (!ip) return null

  // 双栈环境下 IPv4 常被映射成 ::ffff:1.2.3.4
  return ip.replace(/^::ffff:/i, '')
}
