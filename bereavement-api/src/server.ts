import { buildApp } from './app.ts'
import { loadConfig } from './config.ts'

const config = loadConfig()
const app = await buildApp({ config })

try {
  await app.listen({ host: config.host, port: config.port })
  app.log.info(`Bereavement API listening on http://${config.host}:${config.port}`)
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
