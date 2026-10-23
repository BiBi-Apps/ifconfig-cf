import { Hono } from 'hono'
import type { AppEnv } from '../../types'
import { plain } from '../middleware/plain'
import { pointGet, pointPost } from './point'
import { initStoredHeader, requirePointName } from './point.middleware'

const apiApp = new Hono<AppEnv>()

// 与 page 共用：api 全是纯文本，统一 no-store + text/plain
apiApp.use('*', plain)

apiApp.get('/:point_name', requirePointName, pointGet)
apiApp.get('/:point_name/ip', requirePointName, pointGet)
apiApp.post('/:point_name', initStoredHeader, requirePointName, pointPost)

export default apiApp
