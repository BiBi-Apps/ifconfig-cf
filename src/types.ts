import type { RequestIdVariables } from 'hono/request-id'

/** Hono 的 Env 泛型：Worker 绑定 + requestId 变量。 */
export type AppEnv = {
  Bindings: CloudflareBindings
  Variables: RequestIdVariables
}
