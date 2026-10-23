# ifconfig

[English](./README.md) | **简体中文**

基于 [Hono](https://hono.dev) + Cloudflare Workers 的极简 ifconfig 站点：
首页直接返回访问者的公网 IP。

```bash
$ curl https://example.com
1.2.3.4
```

## 用法

浏览器打开是页面，终端里全部是纯文本：

```bash
# 你的 IP（浏览器会拿到 HTML 页面）
curl ifconfig.example.com
# 1.2.3.4

# 同样只返回 IP，不看 UA / Accept
curl ifconfig.example.com/ip
# 1.2.3.4
```

### 请求头回显

下面每个路径都把对应的请求头原样回显为纯文本，用来查看客户端实际发的是什么
（没有该请求头时返回空正文）：

```bash
# 客户端能接受的媒体类型（Accept）
curl ifconfig.example.com/mime
# */*

# 语言偏好（Accept-Language）
curl ifconfig.example.com/lang
# zh-CN,zh;q=0.9,en;q=0.8

# 客户端标识（User-Agent）
curl ifconfig.example.com/ua
# curl/8.7.1

# 字符集（Accept-Charset，取不到则用 Accept 里的 charset=）
curl ifconfig.example.com/charset
# （空正文）

# 压缩方式（Accept-Encoding）
curl ifconfig.example.com/encoding
# gzip, br

# 转发头（Forwarded，取不到则用 X-Forwarded-For）
curl ifconfig.example.com/forwarded
# （空正文）
```

请求头缺失或全为空白时返回空正文。

`/forwarded` 只回显到达 Worker 的转发头；访问者 IP 始终取自 `cf-connecting-ip`
（由 Cloudflare 边缘写入），转发头不参与 IP 判断。

### 按 point 记录 IP

`/_/<point_name>/ip` 用 GET 读该 point 的记录，`POST /_/<point_name>` 写入。
`point_name` 最长 64 个字符。

```bash
# 读取该 point 记录的 IP（没有记录则返回 127.0.0.1）
curl ifconfig.example.com/_/my-point/ip
# 1.2.3.4

# 记录本次访问者 IP，token 正确才会写入
curl -X POST "ifconfig.example.com/_/my-point?token=secret"
# 1.2.3.4
```

## 常用命令

```txt
npm install          # 安装依赖
npm run dev          # 本地开发（Vite + workerd）
npm run build        # 生产构建
npm run preview      # 本地预览构建产物
npm run deploy       # 构建并部署到 Cloudflare Workers
npm run clean        # 删除 dist/

npm run lint             # 类型检查 + 格式检查 + oxlint，依次执行
npm run lint:type-check  # tsc -p tsconfig.json --noEmit
npm run lint:formatter   # oxfmt --check
npm run lint:oxlint      # oxlint
npm run fix:formatter    # oxfmt（写入）

npm run test             # vitest run
npm run test:watch       # vitest 监听模式
```
