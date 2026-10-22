import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../../types'
import {
  FALLBACK_IP,
  POINT_NAME_MAX_LENGTH,
  STORED_HEADER,
  TEXT,
} from './point.constant'

/**
 * 给 POST 响应预置 `X-CLIENT-IP-Stored: 0`。
 *
 * 放在 `requirePointName` 之前，这样即使参数校验提前返回，调用方也能拿到
 * 「本次没有写入」的信号；真正写入的分支再把它改成 `1`。
 */
export const initStoredHeader = createMiddleware<AppEnv>(async (c, next) => {
  c.header(STORED_HEADER, '0')

  await next()
})

/**
 * 校验 `:point_name`：为空或超过最大长度时直接返回兜底值，不进入后续逻辑。
 * 同时统一设置 `Cache-Control: no-store`。
 */
export const requirePointName = createMiddleware<AppEnv>(async (c, next) => {
  c.header('Cache-Control', 'no-store')

  const pointName = c.req.param('point_name') ?? ''

  if (!pointName || pointName.length > POINT_NAME_MAX_LENGTH) {
    return c.text(FALLBACK_IP, 200, TEXT)
  }

  await next()
})
