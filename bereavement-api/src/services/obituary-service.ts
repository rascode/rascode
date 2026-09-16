import type {
  BelovedBiography,
  DraftObituaryInput,
  Obituary,
  ObituaryTone,
  ServiceDetails,
  UpdateObituaryInput,
} from '../types.ts'
import { badRequest, newId, nowIso, notFound } from '../lib/errors.ts'
import type { BereavementStore } from '../store/memory-store.ts'
import type { CaseService } from './case-service.ts'
import type { ObituaryDrafter } from './obituary-drafter.ts'

export class ObituaryService {
  private readonly store: BereavementStore
  private readonly cases: CaseService
  private readonly drafter: ObituaryDrafter

  constructor (store: BereavementStore, cases: CaseService, drafter: ObituaryDrafter) {
    this.store = store
    this.cases = cases
    this.drafter = drafter
  }

  async list (caseId: string): Promise<Obituary[]> {
    await this.cases.ensureExists(caseId)
    return this.store.listObituaries(caseId)
  }

  async get (caseId: string, obituaryId: string): Promise<Obituary> {
    await this.cases.ensureExists(caseId)
    const item = await this.store.getObituary(caseId, obituaryId)
    if (!item) throw notFound('Obituary', obituaryId)
    return item
  }

  async draft (caseId: string, input: DraftObituaryInput = {}): Promise<Obituary> {
    await this.cases.ensureExists(caseId)
    const biography = await this.store.getBiography(caseId)
    if (!biography) {
      throw badRequest('Biography is required before drafting an obituary')
    }

    const tone: ObituaryTone = input.tone ?? 'warm'
    const length = input.length ?? 'standard'
    const drafted = await this.drafter.draft({
      biography,
      service: (await this.cases.get(caseId)).service,
      tone,
      length,
      promptNotes: input.promptNotes,
    })

    const timestamp = nowIso()
    const item: Obituary = {
      id: newId(),
      caseId,
      status: 'draft',
      tone,
      body: drafted.body,
      headline: drafted.headline,
      generatedBy: 'ai',
      model: drafted.model,
      promptNotes: input.promptNotes,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    const saved = await this.store.saveObituary(item)
    await this.cases.update(caseId, { status: 'drafting' })
    return saved
  }

  async update (
    caseId: string,
    obituaryId: string,
    input: UpdateObituaryInput,
  ): Promise<Obituary> {
    const existing = await this.get(caseId, obituaryId)
    const updated: Obituary = {
      ...existing,
      body: input.body ?? existing.body,
      headline: input.headline ?? existing.headline,
      tone: input.tone ?? existing.tone,
      status: input.status ?? (input.body ? 'revised' : existing.status),
      promptNotes: input.promptNotes ?? existing.promptNotes,
      generatedBy: input.body ? 'human' : existing.generatedBy,
      updatedAt: nowIso(),
    }
    return this.store.saveObituary(updated)
  }

  async finalize (caseId: string, obituaryId: string): Promise<Obituary> {
    return this.update(caseId, obituaryId, { status: 'final' })
  }
}

export interface DraftContext {
  biography: BelovedBiography
  service: ServiceDetails
  tone: ObituaryTone
  length: 'short' | 'standard' | 'long'
  promptNotes?: string
}

export interface DraftResult {
  headline: string
  body: string
  model: string
}
