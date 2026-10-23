import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { requestId } from 'hono/request-id'
import apiApp from './controllers/api'
import pageApp from './controllers/page'
import type { AppEnv } from './types'

const app = new Hono<AppEnv>()

// requestId 必须在最前面：后面的日志都要靠它串起来
app.use(requestId())
app.use(logger())

app.route('/', pageApp)
app.route('/_', apiApp)

export default app
