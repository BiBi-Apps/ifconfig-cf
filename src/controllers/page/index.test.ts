import { describe, expect, test } from 'vitest'
import pageApp from './index'

const CURL = { 'user-agent': 'curl/8.7.1' }
const BROWSER = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

/** 用指定的请求头打一次 /ip，返回响应正文。 */
async function ipOf(headers: Record<string, string>): Promise<string> {
  const res = await pageApp.request('/ip', { headers })
  return res.text()
}

describe('GET /', () => {
  test('命令行客户端拿到 text/plain 的 IP', async () => {
    const res = await pageApp.request('/', {
      headers: { ...CURL, 'cf-connecting-ip': '203.0.113.7' },
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.text()).toBe('203.0.113.7')
  })

  test('浏览器拿到 text/html', async () => {
    const res = await pageApp.request('/', {
      headers: { ...BROWSER, 'cf-connecting-ip': '203.0.113.7' },
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/html; charset=UTF-8')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.text()).toBe('203.0.113.7')
  })

  test('响应带 Vary，避免协商结果被缓存串味', async () => {
    const res = await pageApp.request('/', { headers: BROWSER })
    expect(res.headers.get('vary')).toBe('Accept, User-Agent')
  })

  test('UA 像浏览器但 Accept 不含 html 时仍返回纯文本', async () => {
    const res = await pageApp.request('/', {
      headers: {
        'user-agent': BROWSER['user-agent'],
        accept: 'application/json',
      },
    })

    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8')
  })

  test('没有 UA / Accept 时按纯文本处理', async () => {
    const res = await pageApp.request('/', { headers: {} })
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8')
  })
})

describe('GET /ip', () => {
  test.each([
    ['命令行客户端', CURL],
    ['浏览器', BROWSER],
  ])('%s 都只拿到 text/plain 的 IP', async (_name, headers) => {
    const res = await pageApp.request('/ip', {
      headers: { ...headers, 'cf-connecting-ip': '198.51.100.9' },
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.text()).toBe('198.51.100.9')
  })
})

describe('IP 取值', () => {
  const cases: Array<[string, Record<string, string>, string]> = [
    ['直接用 cf-connecting-ip', { 'cf-connecting-ip': '1.1.1.1' }, '1.1.1.1'],
    [
      'cf-connecting-ip 压过其它头',
      { 'cf-connecting-ip': '1.1.1.1', 'x-real-ip': '2.2.2.2' },
      '1.1.1.1',
    ],
    [
      '可伪造的 x-real-ip / x-forwarded-for / forwarded 一律忽略',
      {
        'x-real-ip': '2.2.2.2',
        'x-forwarded-for': '3.3.3.3, 4.4.4.4',
        forwarded: 'for=5.5.5.5;proto=https',
      },
      'unknown',
    ],
    ['没有 cf-connecting-ip 则为 unknown', {}, 'unknown'],
    ['空白值视为缺失', { 'cf-connecting-ip': '   ' }, 'unknown'],
    [
      '剥掉 IPv4 映射地址的 ::ffff: 前缀',
      { 'cf-connecting-ip': '::ffff:7.7.7.7' },
      '7.7.7.7',
    ],
    ['IPv6 原样返回', { 'cf-connecting-ip': '2001:db8::1' }, '2001:db8::1'],
  ]

  test.each(cases)('%s', async (_name, headers, expected) => {
    expect(await ipOf(headers)).toBe(expected)
  })
})

describe('未知路径', () => {
  test('返回 404', async () => {
    const res = await pageApp.request('/nope')
    expect(res.status).toBe(404)
  })
})
