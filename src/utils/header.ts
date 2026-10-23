import type { Context } from 'hono'
import type { AppEnv } from '../types'

/** 取请求头并 trim，按顺序返回第一个非空值；都没有则 unknown。 */
export function readHeader(c: Context<AppEnv>, ...names: string[]): string {
  for (const name of names) {
    const value = c.req.header(name)?.trim()
    if (value) return value
  }

  return 'unknown'
}
