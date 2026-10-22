import { Hono } from 'hono'
import { home } from './home'
import { ip } from './ip'

const pageApp = new Hono()

pageApp.get('/', home)
pageApp.get('/ip', ip)

export default pageApp
