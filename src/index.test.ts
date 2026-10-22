import { describe, expect, test } from 'vitest'
import app from './index'

describe('根应用挂载', () => {
  test('/', async () => {
    const res = await app.request('/', {
      headers: { 'cf-connecting-ip': '203.0.113.7' },
    })

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('203.0.113.7')
  })

  test('/_ 挂载 api 应用', async () => {
    // SAFETY: 只用到 KVNamespace 的 get，其余成员不会被调用。
    const env = {
      KV: { get: async () => '198.51.100.7' },
    } as unknown as CloudflareBindings

    const res = await app.request('/_/point-a', {}, env)

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('198.51.100.7')
  })
})
