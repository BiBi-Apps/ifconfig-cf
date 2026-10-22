import type { Context } from 'hono'
import { getClientIp } from '../../utils/ip'
import { ip } from './ip'

/** 常见浏览器 UA 特征（curl / wget / python-requests 等都不匹配）。 */
const BROWSER_UA =
  /mozilla|chrome|crios|chromium|safari|firefox|fxios|edg|opr|gecko/i

/** 只有浏览器才当页面渲染：UA 像浏览器，且 Accept 明确接受 html。 */
function isBrowser(c: Context): boolean {
  const ua = c.req.header('user-agent') ?? ''
  const accept = (c.req.header('accept') ?? '').toLowerCase()
  return BROWSER_UA.test(ua) && accept.includes('text/html')
}

/** GET / —— 浏览器看页面，其它客户端只看纯文本 IP。 */
export function home(c: Context) {
  c.header('Vary', 'Accept, User-Agent')

  // 浏览器：渲染页面，Content-Type 为 text/html; charset=UTF-8（JSX 会自动转义 IP）
  if (isBrowser(c)) {
    c.header('Cache-Control', 'no-store')
    return c.render(getClientIp(c))
  }

  // 其它客户端（curl / wget / 脚本）：复用 /ip 的纯文本响应
  return ip(c)
}
