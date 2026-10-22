import { beforeEach, vi } from 'vitest'

// 中间件与 KV 操作都会打日志，测试里默认静音。
// 需要断言日志时读 `vi.mocked(console.log).mock.calls`（spy 仍会记录调用）。
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
})
