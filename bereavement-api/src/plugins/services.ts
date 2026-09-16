import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import type { AppConfig } from '../config.ts'
import { BiographyService, CaseService } from '../services/case-service.ts'
import { DocumentService } from '../services/document-service.ts'
import { createObituaryDrafter } from '../services/obituary-drafter.ts'
import { ObituaryService } from '../services/obituary-service.ts'
import { PackageService } from '../services/package-service.ts'
import { MemoryStore, type BereavementStore } from '../store/memory-store.ts'

export interface Services {
  store: BereavementStore
  cases: CaseService
  biography: BiographyService
  documents: DocumentService
  obituaries: ObituaryService
  packages: PackageService
}

declare module 'fastify' {
  interface FastifyInstance {
    services: Services
    config: AppConfig
  }
}

export interface ServicesPluginOpts {
  config: AppConfig
  store?: BereavementStore
}

const servicesPlugin: FastifyPluginAsync<ServicesPluginOpts> = async (app, opts) => {
  const store = opts.store ?? new MemoryStore()
  const cases = new CaseService(store)
  const biography = new BiographyService(store, cases)
  const documents = new DocumentService(store, cases, opts.config.uploadDir)
  const obituaries = new ObituaryService(
    store,
    cases,
    createObituaryDrafter({
      apiKey: opts.config.openaiApiKey,
      model: opts.config.openaiModel,
    }),
  )
  const packages = new PackageService(store, cases, opts.config.generatedDir)

  app.decorate('config', opts.config)
  app.decorate('services', {
    store,
    cases,
    biography,
    documents,
    obituaries,
    packages,
  })
}

export default fp(servicesPlugin, { name: 'bereavement-services' })
