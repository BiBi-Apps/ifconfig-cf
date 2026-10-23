import type { Context } from 'hono'
import type { AppEnv } from '../../types'
import { readHeader } from '../../utils/header'

/** GET /encoding —— 回显 Accept-Encoding（客户端能接受的压缩方式）。 */
export function encoding(c: Context<AppEnv>) {
  return c.text(readHeader(c, 'accept-encoding'))
}
