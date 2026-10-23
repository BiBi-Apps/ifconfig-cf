import type { Context } from 'hono'
import type { AppEnv } from '../../types'
import { getClientIp } from '../../utils/ip'

/** GET /ip —— 不管谁访问，都只返回纯文本的 IP（响应头由 plain 中间件统一给）。 */
export function ip(c: Context<AppEnv>) {
  return c.text(getClientIp(c) ?? 'unknown')
}
