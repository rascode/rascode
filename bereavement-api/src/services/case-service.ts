import type {
  BelovedBiography,
  BereavementCase,
  CreateCaseInput,
  UpdateCaseInput,
  UpsertBiographyInput,
} from '../types.ts'
import { newId, nowIso, notFound } from '../lib/errors.ts'
import type { BereavementStore } from '../store/memory-store.ts'

export class CaseService {
  private readonly store: BereavementStore

  constructor (store: BereavementStore) {
    this.store = store
  }

  list (): Promise<BereavementCase[]> {
    return this.store.listCases()
  }

  async get (caseId: string): Promise<BereavementCase> {
    const item = await this.store.getCase(caseId)
    if (!item) throw notFound('Case', caseId)
    return item
  }

  async create (input: CreateCaseInput): Promise<BereavementCase> {
    const timestamp = nowIso()
    const item: BereavementCase = {
      id: newId(),
      title: input.title?.trim() || 'Bereavement arrangement',
      status: 'intake',
      createdAt: timestamp,
      updatedAt: timestamp,
      familyContacts: input.familyContacts ?? [],
      service: input.service ?? {},
      notes: input.notes,
    }
    return this.store.saveCase(item)
  }

  async update (caseId: string, input: UpdateCaseInput): Promise<BereavementCase> {
    const existing = await this.get(caseId)
    const updated: BereavementCase = {
      ...existing,
      title: input.title?.trim() ?? existing.title,
      status: input.status ?? existing.status,
      familyContacts: input.familyContacts ?? existing.familyContacts,
      service: input.service ? { ...existing.service, ...input.service } : existing.service,
      notes: input.notes ?? existing.notes,
      updatedAt: nowIso(),
    }
    return this.store.saveCase(updated)
  }

  async ensureExists (caseId: string): Promise<BereavementCase> {
    return this.get(caseId)
  }
}

export class BiographyService {
  private readonly store: BereavementStore
  private readonly cases: CaseService

  constructor (store: BereavementStore, cases: CaseService) {
    this.store = store
    this.cases = cases
  }

  async get (caseId: string): Promise<BelovedBiography> {
    await this.cases.ensureExists(caseId)
    const bio = await this.store.getBiography(caseId)
    if (!bio) throw notFound('Biography', caseId)
    return bio
  }

  async upsert (caseId: string, input: UpsertBiographyInput): Promise<BelovedBiography> {
    await this.cases.ensureExists(caseId)
    const item: BelovedBiography = {
      caseId,
      ...input,
      legalName: input.legalName.trim(),
      updatedAt: nowIso(),
    }
    const saved = await this.store.saveBiography(item)
    const current = await this.cases.get(caseId)
    if (current.status === 'intake') {
      await this.cases.update(caseId, { status: 'gathering' })
    }
    return saved
  }
}
