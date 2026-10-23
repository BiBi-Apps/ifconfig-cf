import type { Context } from 'hono'
import type { AppEnv } from '../../types'
import { getClientIp } from '../../utils/ip'
import { PLAIN_TYPE } from '../middleware/plain'

/** 常见浏览器 UA 特征（curl / wget / python-requests 等都不匹配）。 */
const BROWSER_UA =
  /mozilla|chrome|crios|chromium|safari|firefox|fxios|edg|opr|gecko/i

/** 只有浏览器才当页面渲染：UA 像浏览器，且 Accept 明确接受 html。 */
function isBrowser(c: Context<AppEnv>): boolean {
  const ua = c.req.header('user-agent') ?? ''
  const accept = (c.req.header('accept') ?? '').toLowerCase()
  return BROWSER_UA.test(ua) && accept.includes('text/html')
}

/** GET / —— 浏览器看页面，其它客户端只看纯文本 IP。 */
export function home(c: Context<AppEnv>) {
  c.header('Vary', 'Accept, User-Agent')

  // 浏览器：渲染页面，Content-Type 为 text/html; charset=UTF-8（JSX 会自动转义 IP）
  if (isBrowser(c)) {
    c.header('Cache-Control', 'no-store')
    return c.render(getClientIp(c) ?? 'unknown')
  }

  // 其它客户端（curl / wget / 脚本）：纯文本。'/' 还会回 HTML，挂不了 plain
  // 中间件，所以头在这里自己给。
  return c.text(getClientIp(c) ?? 'unknown', 200, {
    'Cache-Control': 'no-store',
    'Content-Type': PLAIN_TYPE,
  })
}
