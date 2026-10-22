import type { Context } from 'hono'
import type { AppEnv } from '../types'

type Fields = Record<string, string | number | boolean | null>

/**
 * 结构化日志：一行一条 JSON，带上 requestId，
 * 方便在 Workers Logs 里把一次请求的 KV 操作串起来。
 */
export function logEvent(
  c: Context<AppEnv>,
  event: string,
  fields: Fields = {},
): void {
  // 这个文件只干一件事：打日志，所以允许 console.log
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({ event, requestId: c.get('requestId'), ...fields }),
  )
}
