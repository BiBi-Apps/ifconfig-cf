# ifconfig

**English** | [简体中文](./README.zh-CN.md)

A minimal ifconfig site built with [Hono](https://hono.dev) on Cloudflare Workers:
the homepage answers with the visitor's public IP address.

```bash
$ curl https://example.com
1.2.3.4
```

## Commands

```txt
npm install          # install dependencies
npm run dev          # local dev server (Vite + workerd)
npm run build        # production build
npm run preview      # preview the production build locally
npm run deploy       # build and deploy to Cloudflare Workers
npm run clean        # remove dist/

npm run lint             # type-check + formatter check + oxlint + tests (sequential)
npm run lint:type-check  # tsc -p tsconfig.json --noEmit
npm run lint:formatter   # oxfmt --check
npm run lint:oxlint      # oxlint
npm run lint:test        # vitest run
npm run fix:formatter    # oxfmt (write)

npm run test             # vitest run
npm run test:watch       # vitest in watch mode
```

## Cloudflare types

Generate/sync types for your Worker bindings:

```txt
npm run cf-typegen
```

Then pass the bindings as a generic:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
