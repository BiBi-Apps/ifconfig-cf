# ifconfig

[English](./README.md) | **简体中文**

基于 [Hono](https://hono.dev) + Cloudflare Workers 的极简 ifconfig 站点：
首页直接返回访问者的公网 IP。

```bash
$ curl https://example.com
1.2.3.4
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

## Cloudflare 类型

按 Worker 配置生成/同步绑定类型：

```txt
npm run cf-typegen
```

使用绑定时传入泛型：

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
