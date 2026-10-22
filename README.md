# ifconfig

**English** | [简体中文](./README.zh-CN.md)

A minimal ifconfig site built with [Hono](https://hono.dev) on Cloudflare Workers:
the homepage answers with the visitor's public IP address.

```bash
$ curl https://example.com
1.2.3.4
```

## Usage

Open it in a browser and the page shows your IP. In a terminal, everything is
plain text:

```bash
# your IP (a browser gets an HTML page instead)
curl ifconfig.example.com
# 1.2.3.4

# the same IP, without looking at UA / Accept
curl ifconfig.example.com/ip
# 1.2.3.4
```

### Per-point IP record

`/_/<point_name>` reads the IP recorded for a point; `POST` writes it. `point_name`
must be at most 64 characters.

```bash
# read the IP recorded for this point (127.0.0.1 when nothing is recorded)
curl ifconfig.example.com/_my-point
# 1.2.3.4

# record this visitor's IP; only written when the token matches
curl -X POST "ifconfig.example.com/_my-point?token=secret"
# 1.2.3.4
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
