import type { Context } from 'hono'
import type { AppEnv } from '../../types'
import { readHeader } from '../../utils/header'

/** GET /ua —— 回显 User-Agent。 */
export function ua(c: Context<AppEnv>) {
  return c.text(readHeader(c, 'user-agent'))
}
