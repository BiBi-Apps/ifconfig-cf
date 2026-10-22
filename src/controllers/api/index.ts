import { Hono } from 'hono'
import type { AppEnv } from '../../types'
import { pointGet, pointPost } from './point'
import { initStoredHeader, requirePointName } from './point.middleware'

const apiApp = new Hono<AppEnv>()

apiApp.get('/:point_name', requirePointName, pointGet)
apiApp.post('/:point_name', initStoredHeader, requirePointName, pointPost)

export default apiApp
