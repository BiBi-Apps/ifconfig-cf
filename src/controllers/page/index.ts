import { Hono } from 'hono'
import type { AppEnv } from '../../types'
import { plain } from '../middleware/plain'
import { charset } from './charset'
import { encoding } from './encoding'
import { forwarded } from './forwarded'
import { home } from './home'
import { ip } from './ip'
import { lang } from './lang'
import { mime } from './mime'
import { ua } from './ua'

const pageApp = new Hono<AppEnv>()

// 只有纯文本路由挂 plain；'/' 还要给浏览器回 HTML，头由 home 自己给
pageApp.get('/ip', plain, ip)
pageApp.get('/mime', plain, mime)
pageApp.get('/lang', plain, lang)
pageApp.get('/ua', plain, ua)
pageApp.get('/charset', plain, charset)
pageApp.get('/encoding', plain, encoding)
pageApp.get('/forwarded', plain, forwarded)

pageApp.get('/', home)

export default pageApp
