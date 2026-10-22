import type { Context } from 'hono'

/**
 * 取访问者 IP。
 *
 * Cloudflare 在 `cf-connecting-ip` 里放了真实客户端 IP（IPv4 / IPv6 都已归一化），
 * 其它代理环境退回到常见的转发头；都拿不到时返回 `unknown`。
 */
export function getClientIp(c: Context): string {
  const direct = c.req.header('cf-connecting-ip') ?? c.req.header('x-real-ip')
  const forwarded = c.req.header('x-forwarded-for') ?? c.req.header('forwarded')

  const ip = direct?.trim() || firstInChain(forwarded) || 'unknown'

  // 双栈环境下 IPv4 常被映射成 ::ffff:1.2.3.4
  return ip.replace(/^::ffff:/i, '')
}

/** 从 `1.2.3.4, 5.6.7.8` / `for="1.2.3.4";proto=https` 这类头里取第一跳。 */
function firstInChain(value: string | undefined): string | undefined {
  if (!value) return undefined
  const forMatch = value.match(/for="?\[?([^"';,\]]+)/i)
  return (forMatch?.[1] ?? value.split(',')[0])?.trim() || undefined
}
