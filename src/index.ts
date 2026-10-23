import { WorkerEntrypoint } from 'cloudflare:workers'
import type { Context } from 'hono'
import app from './app'
import {
  FALLBACK_IP,
  POINT_NAME_MAX_LENGTH,
} from './controllers/api/point.constant'
import { readRecorded } from './controllers/api/point.utils'
import type { AppEnv } from './types'

export interface GetPointIpOpts {
  /** 调用方自愿带上的 requestId，只用来打日志，把 RPC 和它自己那次请求串起来 */
  requestId: string
}

/**
 * RPC 调用没有请求上下文，而 `readRecorded` 只用 `env.KV` 和 `requestId`（打日志）。
 * 调用方没带 requestId（或空串）时回退成 `rpc`，日志里一眼能认出不是 HTTP 请求。
 */
function rpcContext(
  env: CloudflareBindings,
  requestId?: string,
): Context<AppEnv> {
  // SAFETY: readRecorded 只碰 env.KV 和 get('requestId')，不会走其它成员。
  return { env, get: () => requestId || 'rpc' } as unknown as Context<AppEnv>
}

/**
 * Worker 入口。
 *
 * `fetch` 交给 `app.ts` 的 Hono 应用；其余 public 方法通过 service binding RPC
 * 暴露给账号内其它 Worker：`await env.IFCONFIG.getPointIp('point-a')`。
 * 实例每次调用重建、用完即弃，别在这里存状态（要状态用 Durable Objects）。
 */
export default class extends WorkerEntrypoint<CloudflareBindings> {
  fetch(request: Request) {
    return app.fetch(request, this.env, this.ctx)
  }

  /**
   * 读该 point 记录的 IP，语义与 `GET /_:point_name` 一致。
   * `opts.requestId` 可传可不传：传了就进日志，方便和调用方那次请求对齐。
   */
  async getPointIp(pointName: string, opts?: GetPointIpOpts): Promise<string> {
    // 与 `requirePointName` 同一套规则：非法名直接兜底，不碰 KV
    if (!pointName || pointName.length > POINT_NAME_MAX_LENGTH)
      return FALLBACK_IP

    const recorded = await readRecorded(
      rpcContext(this.env, opts?.requestId),
      pointName,
    )

    return recorded.value
  }
}
