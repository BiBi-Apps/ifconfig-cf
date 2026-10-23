import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../../types'

/** 纯文本响应的 content-type（首页的协商分支也要用同一份字面量）。 */
export const PLAIN_TYPE = 'text/plain; charset=utf-8'

/**
 * 纯文本响应头：强制 `Content-Type: text/plain` + `Cache-Control: no-store`。
 *
 * 在 handler 之后设置，才能盖掉 `c.text()` 默认的 `text/plain; charset=UTF-8`。
 * 不做任何条件判断——hence 只挂纯文本路由；`/` 还要给浏览器回 HTML，
 * 所以首页自己在分支里给头，不经过这个中间件。
 */
export const plain = createMiddleware<AppEnv>(async (c, next) => {
  await next()

  c.header('Cache-Control', 'no-store')
  c.header('Content-Type', PLAIN_TYPE)
})
