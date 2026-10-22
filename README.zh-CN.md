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

### 按 point 记录 IP

`/_/<point_name>` 用 GET 读该 point 的记录，用 POST 写入。`point_name` 最长 64 个字符。

```bash
# 读取该 point 记录的 IP（没有记录则返回 127.0.0.1）
curl ifconfig.example.com/_my-point
# 1.2.3.4

# 记录本次访问者 IP，token 正确才会写入
curl -X POST "ifconfig.example.com/_my-point?token=secret"
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

npm run lint             # 类型检查 + 格式检查 + oxlint + 测试，依次执行
npm run lint:type-check  # tsc -p tsconfig.json --noEmit
npm run lint:formatter   # oxfmt --check
npm run lint:oxlint      # oxlint
npm run lint:test        # vitest run
npm run fix:formatter    # oxfmt（写入）

npm run test             # vitest run
npm run test:watch       # vitest 监听模式
```
