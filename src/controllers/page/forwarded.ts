import type { Context } from 'hono'
import type { AppEnv } from '../../types'
import { readHeader } from '../../utils/header'

/**
 * GET /forwarded —— 原样回显转发头，不做合成：
 * 优先 RFC 7239 的 `Forwarded`，否则 nginx 风格的 `X-Forwarded-For`。
 * 只做诊断，不参与取 IP（取 IP 只信 cf-connecting-ip，见 utils/ip.ts）。
 */
export function forwarded(c: Context<AppEnv>) {
  return c.text(readHeader(c, 'forwarded', 'x-forwarded-for'))
}
