import { beforeEach, describe, expect, test, vi } from 'vitest'
import { cacheClear } from './point.cache'
import apiApp from './index'

interface PutOptions {
  expirationTtl?: number
}

interface MockKV {
  store: Map<string, string>
  gets: string[]
  puts: Array<{ key: string; value: string; options?: PutOptions }>
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: PutOptions): Promise<void>
}

function mockKV(seed: Record<string, string> = {}): MockKV {
  const kv: MockKV = {
    store: new Map(Object.entries(seed)),
    gets: [],
    puts: [],
    get: async (key) => {
      kv.gets.push(key)
      return kv.store.get(key) ?? null
    },
    put: async (key, value, options) => {
      kv.puts.push({ key, value, options })
      kv.store.set(key, value)
    },
  }
  return kv
}

function envWith(kv: MockKV): CloudflareBindings {
  // SAFETY: MockKV 只实现了 KVNamespace 的 get / put，测试路径不会碰其它成员。
  return { KV: kv } as unknown as CloudflareBindings
}

beforeEach(() => {
  // 进程内缓存是模块级状态，用例之间要清掉
  cacheClear()
})

describe('GET /:point_name', () => {
  test('返回 KV 里记录的 IP', async () => {
    const kv = mockKV({ 'ip-point-a': '198.51.100.7' })
    const res = await apiApp.request('/point-a', {}, envWith(kv))

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(res.headers.get('cache-control')).toBe('no-store')
    // GET 不写 KV，也就不带写入信号
    expect(res.headers.get('x-client-ip-stored')).toBeNull()
    expect(await res.text()).toBe('198.51.100.7')
    expect(kv.gets).toEqual(['ip-point-a'])
    expect(kv.puts).toHaveLength(0)
  })

  test('没有记录时返回 127.0.0.1', async () => {
    const kv = mockKV()
    const res = await apiApp.request('/point-a', {}, envWith(kv))

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('127.0.0.1')
    expect(kv.puts).toHaveLength(0)
  })

  test('带上 token 也只读不写', async () => {
    const kv = mockKV({
      'token-point-a': 'secret',
      'ip-point-a': '198.51.100.7',
    })
    const res = await apiApp.request(
      '/point-a?token=secret',
      { headers: { 'cf-connecting-ip': '203.0.113.42' } },
      envWith(kv),
    )

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('198.51.100.7')
    expect(kv.puts).toHaveLength(0)
    expect(kv.gets).toEqual(['ip-point-a'])
  })

  test.each([65, 600])(
    'point_name 过长（%i）直接返回兜底值，不碰 KV',
    async (length) => {
      const kv = mockKV({ [`ip-${'a'.repeat(length)}`]: '198.51.100.7' })
      const res = await apiApp.request(
        `/${'a'.repeat(length)}`,
        {},
        envWith(kv),
      )

      expect(res.status).toBe(200)
      expect(res.headers.get('cache-control')).toBe('no-store')
      expect(res.headers.get('x-client-ip-stored')).toBeNull()
      expect(await res.text()).toBe('127.0.0.1')
      expect(kv.gets).toHaveLength(0)
    },
  )

  test('缺少 point_name 时 404', async () => {
    const res = await apiApp.request('/', {}, envWith(mockKV()))
    expect(res.status).toBe(404)
  })
})

describe('POST /:point_name', () => {
  const IP_HEADERS = { 'cf-connecting-ip': '203.0.113.42' }

  test('token 正确时写入访问者 IP 并返回它', async () => {
    const kv = mockKV({ 'token-point-a': 'secret' })
    const res = await apiApp.request(
      '/point-a?token=secret',
      { method: 'POST', headers: IP_HEADERS },
      envWith(kv),
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(res.headers.get('x-client-ip-stored')).toBe('1')
    expect(await res.text()).toBe('203.0.113.42')
    expect(kv.store.get('ip-point-a')).toBe('203.0.113.42')
  })

  test('写入的 IP 有效期是 24 小时', async () => {
    const kv = mockKV({ 'token-point-a': 'secret' })
    await apiApp.request(
      '/point-a?token=secret',
      { method: 'POST', headers: IP_HEADERS },
      envWith(kv),
    )

    expect(kv.puts).toEqual([
      {
        key: 'ip-point-a',
        value: '203.0.113.42',
        options: { expirationTtl: 60 * 60 * 24 },
      },
    ])
  })

  test('token 正确时覆盖 KV 里的旧值', async () => {
    const kv = mockKV({
      'token-point-a': 'secret',
      'ip-point-a': '198.51.100.7',
    })
    const res = await apiApp.request(
      '/point-a?token=secret',
      { method: 'POST', headers: IP_HEADERS },
      envWith(kv),
    )

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('203.0.113.42')
    expect(kv.store.get('ip-point-a')).toBe('203.0.113.42')
  })

  test('token 错误时跳过写入，返回原有记录', async () => {
    const kv = mockKV({
      'token-point-a': 'secret',
      'ip-point-a': '198.51.100.7',
    })
    const res = await apiApp.request(
      '/point-a?token=wrong',
      { method: 'POST', headers: IP_HEADERS },
      envWith(kv),
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('x-client-ip-stored')).toBe('0')
    expect(await res.text()).toBe('198.51.100.7')
    expect(kv.puts).toHaveLength(0)
  })

  test('没有 token 时跳过写入', async () => {
    const kv = mockKV({ 'ip-point-a': '198.51.100.7' })
    const res = await apiApp.request(
      '/point-a',
      { method: 'POST', headers: IP_HEADERS },
      envWith(kv),
    )

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('198.51.100.7')
    expect(kv.puts).toHaveLength(0)
    expect(kv.gets).toEqual(['ip-point-a'])
  })

  test('KV 里没有该 point 的 token 时跳过写入', async () => {
    const kv = mockKV()
    const res = await apiApp.request(
      '/point-a?token=secret',
      { method: 'POST', headers: IP_HEADERS },
      envWith(kv),
    )

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('127.0.0.1')
    expect(kv.puts).toHaveLength(0)
  })

  test('不同 point 的 token 不能串用', async () => {
    const kv = mockKV({
      'token-point-a': 'secret-a',
      'token-point-b': 'secret-b',
      'ip-point-b': '198.51.100.7',
    })
    const res = await apiApp.request(
      '/point-b?token=secret-a',
      { method: 'POST', headers: IP_HEADERS },
      envWith(kv),
    )

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('198.51.100.7')
    expect(kv.puts).toHaveLength(0)
  })

  test('没有 cf-connecting-ip 时不写 KV', async () => {
    const kv = mockKV({
      'token-point-a': 'secret',
      'ip-point-a': '198.51.100.7',
    })
    const res = await apiApp.request(
      '/point-a?token=secret',
      { method: 'POST' },
      envWith(kv),
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('x-client-ip-stored')).toBe('0')
    expect(await res.text()).toBe('198.51.100.7')
    expect(kv.puts).toHaveLength(0)
  })

  test('point_name 过长时不写 KV，返回兜底值', async () => {
    const name = 'a'.repeat(65)
    const kv = mockKV({ [`token-${name}`]: 'secret' })
    const res = await apiApp.request(
      `/${name}?token=secret`,
      { method: 'POST', headers: IP_HEADERS },
      envWith(kv),
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('x-client-ip-stored')).toBe('0')
    expect(await res.text()).toBe('127.0.0.1')
    expect(kv.gets).toHaveLength(0)
    expect(kv.puts).toHaveLength(0)
  })

  test('point_name 正好 64 位可用', async () => {
    const name = 'a'.repeat(64)
    const kv = mockKV({ [`token-${name}`]: 'secret' })
    const res = await apiApp.request(
      `/${name}?token=secret`,
      { method: 'POST', headers: IP_HEADERS },
      envWith(kv),
    )

    expect(res.status).toBe(200)
    expect(kv.store.get(`ip-${name}`)).toBe('203.0.113.42')
  })

  test('写入的 IP 会剥掉 ::ffff: 前缀', async () => {
    const kv = mockKV({ 'token-point-a': 'secret' })
    const res = await apiApp.request(
      '/point-a?token=secret',
      {
        method: 'POST',
        headers: { 'cf-connecting-ip': '::ffff:198.51.100.7' },
      },
      envWith(kv),
    )

    expect(res.status).toBe(200)
    expect(kv.store.get('ip-point-a')).toBe('198.51.100.7')
  })
})

describe('进程内缓存（15 分钟）', () => {
  test('命中缓存后不再读 KV', async () => {
    const kv = mockKV({ 'ip-point-a': '198.51.100.7' })
    const first = await apiApp.request('/point-a', {}, envWith(kv))
    const second = await apiApp.request('/point-a', {}, envWith(kv))

    expect(await first.text()).toBe('198.51.100.7')
    expect(await second.text()).toBe('198.51.100.7')
    expect(kv.gets).toEqual(['ip-point-a'])
  })

  test('兜底值也会被缓存', async () => {
    const kv = mockKV()
    await apiApp.request('/point-a', {}, envWith(kv))
    const res = await apiApp.request('/point-a', {}, envWith(kv))

    expect(await res.text()).toBe('127.0.0.1')
    expect(kv.gets).toEqual(['ip-point-a'])
  })

  test('POST 写入后当前 isolate 立即可读到新值', async () => {
    const kv = mockKV({
      'token-point-a': 'secret',
      'ip-point-a': '198.51.100.7',
    })
    await apiApp.request('/point-a', {}, envWith(kv))

    const posted = await apiApp.request(
      '/point-a?token=secret',
      { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.42' } },
      envWith(kv),
    )

    expect(await posted.text()).toBe('203.0.113.42')

    const res = await apiApp.request('/point-a', {}, envWith(kv))
    expect(await res.text()).toBe('203.0.113.42')
    expect(kv.gets).toEqual(['ip-point-a', 'token-point-a'])
  })

  test('缓存命中的 token 在写入前会再和 KV 核对一次', async () => {
    const kv = mockKV({ 'token-point-a': 'secret' })

    await apiApp.request(
      '/point-a?token=secret',
      { method: 'POST', headers: { 'cf-connecting-ip': '1.1.1.1' } },
      envWith(kv),
    )
    const second = await apiApp.request(
      '/point-a?token=secret',
      { method: 'POST', headers: { 'cf-connecting-ip': '2.2.2.2' } },
      envWith(kv),
    )

    expect(second.headers.get('x-client-ip-stored')).toBe('1')
    // 第一次直接读 KV，第二次命中缓存后为写入前核对再读一次
    expect(kv.gets.filter((key) => key.startsWith('token-'))).toHaveLength(2)
    expect(kv.puts).toHaveLength(2)
    expect(kv.store.get('ip-point-a')).toBe('2.2.2.2')
  })

  test('token 已在 KV 里轮换时，缓存中的旧 token 不再写入', async () => {
    const kv = mockKV({ 'token-point-a': 'old' })
    const post = (token: string) =>
      apiApp.request(
        `/point-a?token=${token}`,
        { method: 'POST', headers: { 'cf-connecting-ip': '1.1.1.1' } },
        envWith(kv),
      )

    expect((await post('old')).headers.get('x-client-ip-stored')).toBe('1')

    kv.store.set('token-point-a', 'new')

    // 缓存里还是 old：命中后强制核对 KV，发现已轮换，不写入
    expect((await post('old')).headers.get('x-client-ip-stored')).toBe('0')
    expect(kv.puts).toHaveLength(1)

    // 新 token 可以直接使用（核对时已刷新缓存）
    expect((await post('new')).headers.get('x-client-ip-stored')).toBe('1')
    expect(kv.puts).toHaveLength(2)
  })

  test('不存在的 token 会被负缓存，不再读 KV', async () => {
    const kv = mockKV()

    await apiApp.request(
      '/point-a?token=x',
      { method: 'POST', headers: { 'cf-connecting-ip': '1.1.1.1' } },
      envWith(kv),
    )
    const second = await apiApp.request(
      '/point-a?token=y',
      { method: 'POST', headers: { 'cf-connecting-ip': '1.1.1.1' } },
      envWith(kv),
    )

    expect(second.headers.get('x-client-ip-stored')).toBe('0')
    expect(kv.gets.filter((key) => key.startsWith('token-'))).toHaveLength(1)
    expect(kv.puts).toHaveLength(0)
  })

  test('token 缓存 5 分钟后重新读 KV', async () => {
    vi.useFakeTimers()

    try {
      const kv = mockKV({ 'token-point-a': 'old' })
      const post = (token: string) =>
        apiApp.request(
          `/point-a?token=${token}`,
          { method: 'POST', headers: { 'cf-connecting-ip': '1.1.1.1' } },
          envWith(kv),
        )

      expect((await post('old')).headers.get('x-client-ip-stored')).toBe('1')

      kv.store.set('token-point-a', 'new')

      vi.advanceTimersByTime(4 * 60 * 1000)
      expect((await post('new')).headers.get('x-client-ip-stored')).toBe('0')

      vi.advanceTimersByTime(2 * 60 * 1000)
      expect((await post('new')).headers.get('x-client-ip-stored')).toBe('1')
    } finally {
      vi.useRealTimers()
    }
  })

  test('15 分钟后过期，重新读 KV', async () => {
    vi.useFakeTimers()

    try {
      const kv = mockKV({ 'ip-point-a': '198.51.100.7' })
      await apiApp.request('/point-a', {}, envWith(kv))
      expect(kv.gets).toHaveLength(1)

      kv.store.set('ip-point-a', '203.0.113.9')

      vi.advanceTimersByTime(14 * 60 * 1000)
      const cached = await apiApp.request('/point-a', {}, envWith(kv))
      expect(await cached.text()).toBe('198.51.100.7')
      expect(kv.gets).toHaveLength(1)

      vi.advanceTimersByTime(2 * 60 * 1000)
      const refreshed = await apiApp.request('/point-a', {}, envWith(kv))
      expect(await refreshed.text()).toBe('203.0.113.9')
      expect(kv.gets).toHaveLength(2)
    } finally {
      vi.useRealTimers()
    }
  })
})
