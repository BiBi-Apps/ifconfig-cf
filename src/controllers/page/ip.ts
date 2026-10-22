import type { Context } from 'hono'
import { getClientIp } from '../../utils/ip'

/** GET /ip —— 不管谁访问，都只返回 text/plain 的 IP。 */
export function ip(c: Context) {
  c.header('Cache-Control', 'no-store')
  return c.text(getClientIp(c), 200, {
    'Content-Type': 'text/plain; charset=utf-8',
  })
}
