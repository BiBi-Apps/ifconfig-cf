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

### Request headers

Each of these echoes one request header back as plain text, so you can see what
your client actually sends (an empty body when the header is missing):

```bash
# media types the client accepts (Accept)
curl ifconfig.example.com/mime
# */*

# languages (Accept-Language)
curl ifconfig.example.com/lang
# en-US,en;q=0.9

# user agent (User-Agent)
curl ifconfig.example.com/ua
# curl/8.7.1

# charsets (Accept-Charset, else the charset= of Accept)
curl ifconfig.example.com/charset
# (empty body)

# content codings (Accept-Encoding)
curl ifconfig.example.com/encoding
# gzip, br

# forwarding headers (Forwarded, else X-Forwarded-For)
curl ifconfig.example.com/forwarded
# (empty body)
```

Missing or blank request headers return an empty body.

`/forwarded` only reports what reaches the Worker. The visitor IP is always
taken from `cf-connecting-ip` (written by the Cloudflare edge), never from these
headers, so a client cannot spoof it by sending its own `X-Forwarded-For`.

### Per-point IP record

`/_/<point_name>/ip` reads the IP recorded for a point; `POST /_/<point_name>`
writes it. `point_name` must be at most 64 characters.

```bash
# read the IP recorded for this point (127.0.0.1 when nothing is recorded)
curl ifconfig.example.com/_/my-point/ip
# 1.2.3.4

# record this visitor's IP; only written when the token matches
curl -X POST "ifconfig.example.com/_/my-point?token=secret"
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

npm run lint             # type-check + formatter check + oxlint (sequential)
npm run lint:type-check  # tsc -p tsconfig.json --noEmit
npm run lint:formatter   # oxfmt --check
npm run lint:oxlint      # oxlint
npm run fix:formatter    # oxfmt (write)

npm run test             # vitest run
npm run test:watch       # vitest in watch mode
```
