import { Hono } from 'hono'
import pageApp from './controllers/page'

const app = new Hono()

app.route('/', pageApp)

export default app
