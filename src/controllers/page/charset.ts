import type { Context } from 'hono'
import type { AppEnv } from '../../types'

/**
 * GET /charset —— 回显 Accept-Charset。
 * 现代客户端基本不发这个头，所以退而从 Accept 的 `charset=` 参数里取。
 */
export function charset(c: Context<AppEnv>) {
  const acceptCharset = c.req.header('accept-charset')?.trim()
  if (acceptCharset) return c.text(acceptCharset)

  const fromAccept = /;\s*charset="?([^";,\s]+)/i.exec(
    c.req.header('accept') ?? '',
  )?.[1]

  return c.text(fromAccept ?? '')
}
