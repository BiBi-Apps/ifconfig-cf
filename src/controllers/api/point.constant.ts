/** point 控制器的常量。 */

/** 纯文本响应头。 */
export const TEXT = { 'Content-Type': 'text/plain; charset=utf-8' }

/** KV 里没有记录时的兜底值。 */
export const FALLBACK_IP = '127.0.0.1'

/** point_name 最大长度。 */
export const POINT_NAME_MAX_LENGTH = 64

/** 写入的 IP 保留 24 小时。 */
export const IP_TTL_SECONDS = 60 * 60 * 24

/** 进程内缓存的存活时间：15 分钟。 */
export const CACHE_TTL_MS = 15 * 60 * 1000

/** token 缓存的存活时间：5 分钟（越短，token 轮换/吐销后失效越快）。 */
export const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000

/** 响应头：本次请求是否真的把 IP 写进了 KV（1 / 0）。 */
export const STORED_HEADER = 'X-CLIENT-IP-Stored'
