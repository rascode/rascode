import path from 'node:path'
import type { CaseDocument, DocumentCategory } from '../types.ts'
import { badRequest, newId, nowIso, notFound } from '../lib/errors.ts'
import { removeFileIfExists, safeFilename, saveBinaryFile } from '../lib/files.ts'
import type { BereavementStore } from '../store/memory-store.ts'
import type { CaseService } from './case-service.ts'

const ALLOWED_CATEGORIES = new Set<DocumentCategory>([
  'death_certificate',
  'photo',
  'identification',
  'will_or_directive',
  'military_records',
  'insurance',
  'other',
])

export class DocumentService {
  private readonly store: BereavementStore
  private readonly cases: CaseService
  private readonly uploadDir: string

  constructor (store: BereavementStore, cases: CaseService, uploadDir: string) {
    this.store = store
    this.cases = cases
    this.uploadDir = uploadDir
  }

  async list (caseId: string): Promise<CaseDocument[]> {
    await this.cases.ensureExists(caseId)
    return this.store.listDocuments(caseId)
  }

  async get (caseId: string, documentId: string): Promise<CaseDocument> {
    await this.cases.ensureExists(caseId)
    const doc = await this.store.getDocument(caseId, documentId)
    if (!doc) throw notFound('Document', documentId)
    return doc
  }

  async upload (input: {
    caseId: string
    category: string
    filename: string
    contentType: string
    buffer: Buffer
    description?: string
  }): Promise<CaseDocument> {
    await this.cases.ensureExists(input.caseId)

    if (!ALLOWED_CATEGORIES.has(input.category as DocumentCategory)) {
      throw badRequest(`Invalid document category: ${input.category}`)
    }
    if (!input.buffer.length) {
      throw badRequest('Uploaded file is empty')
    }
    if (input.buffer.length > 25 * 1024 * 1024) {
      throw badRequest('Uploaded file exceeds 25MB limit')
    }

    const id = newId()
    const filename = safeFilename(input.filename || 'document.bin')
    const storagePath = path.join(this.uploadDir, input.caseId, `${id}-${filename}`)
    await saveBinaryFile(storagePath, input.buffer)

    const doc: CaseDocument = {
      id,
      caseId: input.caseId,
      category: input.category as DocumentCategory,
      filename,
      contentType: input.contentType || 'application/octet-stream',
      sizeBytes: input.buffer.length,
      storagePath,
      description: input.description,
      uploadedAt: nowIso(),
    }

    const saved = await this.store.saveDocument(doc)
    const current = await this.cases.get(input.caseId)
    if (current.status === 'intake') {
      await this.cases.update(input.caseId, { status: 'gathering' })
    }
    return saved
  }

  async remove (caseId: string, documentId: string): Promise<void> {
    const doc = await this.get(caseId, documentId)
    await removeFileIfExists(doc.storagePath)
    await this.store.deleteDocument(caseId, documentId)
  }
}
