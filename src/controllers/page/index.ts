import { Hono } from 'hono'
import type { AppEnv } from '../../types'
import { home } from './home'
import { ip } from './ip'

const pageApp = new Hono<AppEnv>()

pageApp.get('/', home)
pageApp.get('/ip', ip)

export default pageApp
