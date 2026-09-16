import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import type { AppConfig } from './config.ts'
import { loadConfig } from './config.ts'
import { ensureDir } from './lib/files.ts'
import servicesPlugin from './plugins/services.ts'
import { bereavementRoutes } from './routes/bereavement.ts'
import type { BereavementStore } from './store/memory-store.ts'

export interface BuildAppOptions {
  config?: AppConfig
  store?: BereavementStore
  logger?: boolean
}

export async function buildApp (options: BuildAppOptions = {}) {
  const config = options.config ?? loadConfig()
  await ensureDir(config.uploadDir)
  await ensureDir(config.generatedDir)

  const app = Fastify({
    logger: options.logger ?? true,
  })

  await app.register(cors, { origin: true })
  await app.register(multipart, {
    limits: {
      fileSize: 25 * 1024 * 1024,
      files: 1,
    },
  })
  await app.register(servicesPlugin, {
    config,
    store: options.store,
  })
  await app.register(bereavementRoutes)

  return app
}
