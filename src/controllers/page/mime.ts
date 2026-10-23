import type { Context } from 'hono'
import type { AppEnv } from '../../types'
import { readHeader } from '../../utils/header'

/** GET /mime —— 回显 Accept（客户端能接受的媒体类型）。 */
export function mime(c: Context<AppEnv>) {
  return c.text(readHeader(c, 'accept'))
}
