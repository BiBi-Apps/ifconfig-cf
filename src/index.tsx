import { Hono } from 'hono'
import pageApp from './controllers/page'
import apiApp from './controllers/api'
import type { AppEnv } from './types'

const app = new Hono<AppEnv>()

app.route('/', pageApp)
app.route('/_', apiApp)

export default app
