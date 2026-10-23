import type { Context } from 'hono'
import type { AppEnv } from '../../types'
import { readHeader } from '../../utils/header'

/** GET /lang —— 回显 Accept-Language。 */
export function lang(c: Context<AppEnv>) {
  return c.text(readHeader(c, 'accept-language'))
}
