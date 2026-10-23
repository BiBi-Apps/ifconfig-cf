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

describe('请求头回显', () => {
  const CASES: Array<[string, Record<string, string>, string]> = [
    [
      '/mime',
      { accept: 'text/html,application/xhtml+xml' },
      'text/html,application/xhtml+xml',
    ],
    [
      '/lang',
      { 'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8' },
      'zh-CN,zh;q=0.9,en;q=0.8',
    ],
    ['/ua', CURL, 'curl/8.7.1'],
    ['/encoding', { 'accept-encoding': 'gzip, br' }, 'gzip, br'],
    [
      '/charset',
      { 'accept-charset': 'utf-8, iso-8859-1' },
      'utf-8, iso-8859-1',
    ],
    [
      '/forwarded',
      { forwarded: 'for=5.5.5.5;proto=https' },
      'for=5.5.5.5;proto=https',
    ],
  ]

  test.each(CASES)('%s 原样回显请求头', async (path, headers, expected) => {
    const res = await pageApp.request(path, { headers })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.text()).toBe(expected)
  })

  test.each(['/mime', '/lang', '/ua', '/encoding', '/charset', '/forwarded'])(
    '%s 没有对应请求头时返回 unknown',
    async (path) => {
      const res = await pageApp.request(path, { headers: {} })
      expect(await res.text()).toBe('unknown')
    },
  )

  test('全空白的请求头视为缺失', async () => {
    const res = await pageApp.request('/ua', {
      headers: { 'user-agent': '  ' },
    })
    expect(await res.text()).toBe('unknown')
  })

  test('/charset 没有 Accept-Charset 时从 Accept 的 charset= 取', async () => {
    const res = await pageApp.request('/charset', {
      headers: { accept: 'text/html; charset=UTF-8' },
    })
    expect(await res.text()).toBe('UTF-8')
  })

  test('/forwarded 没有 Forwarded 时退到 X-Forwarded-For', async () => {
    const res = await pageApp.request('/forwarded', {
      headers: { 'x-forwarded-for': '3.3.3.3, 4.4.4.4' },
    })
    expect(await res.text()).toBe('3.3.3.3, 4.4.4.4')
  })

  test('/charset 多候选时只取第一个 charset', async () => {
    const res = await pageApp.request('/charset', {
      headers: { accept: 'text/html;charset=UTF-8, application/json' },
    })
    expect(await res.text()).toBe('UTF-8')
  })

  test('/forwarded 优先 Forwarded，空白时让位给 X-Forwarded-For', async () => {
    const both = await pageApp.request('/forwarded', {
      headers: { forwarded: 'for=5.5.5.5', 'x-forwarded-for': '3.3.3.3' },
    })
    expect(await both.text()).toBe('for=5.5.5.5')

    const blank = await pageApp.request('/forwarded', {
      headers: { forwarded: '  ', 'x-forwarded-for': '3.3.3.3' },
    })
    expect(await blank.text()).toBe('3.3.3.3')
  })
})

describe('未知路径', () => {
  test('返回 404', async () => {
    const res = await pageApp.request('/nope')
    expect(res.status).toBe(404)
  })
})
