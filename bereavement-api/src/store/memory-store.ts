import type {
  BelovedBiography,
  BereavementCase,
  BereavementPackage,
  CaseDocument,
  Obituary,
} from '../types.ts'

/**
 * Persistence boundary for the bereavement API.
 * Swap MemoryStore for a PostgreSQL/dbui-backed implementation without changing routes.
 */
export interface BereavementStore {
  listCases (): Promise<BereavementCase[]>
  getCase (id: string): Promise<BereavementCase | undefined>
  saveCase (item: BereavementCase): Promise<BereavementCase>
  deleteCase (id: string): Promise<boolean>

  getBiography (caseId: string): Promise<BelovedBiography | undefined>
  saveBiography (item: BelovedBiography): Promise<BelovedBiography>

  listDocuments (caseId: string): Promise<CaseDocument[]>
  getDocument (caseId: string, documentId: string): Promise<CaseDocument | undefined>
  saveDocument (item: CaseDocument): Promise<CaseDocument>
  deleteDocument (caseId: string, documentId: string): Promise<boolean>

  listObituaries (caseId: string): Promise<Obituary[]>
  getObituary (caseId: string, obituaryId: string): Promise<Obituary | undefined>
  saveObituary (item: Obituary): Promise<Obituary>

  listPackages (caseId: string): Promise<BereavementPackage[]>
  getPackage (caseId: string, packageId: string): Promise<BereavementPackage | undefined>
  savePackage (item: BereavementPackage): Promise<BereavementPackage>
}

export class MemoryStore implements BereavementStore {
  private cases = new Map<string, BereavementCase>()
  private biographies = new Map<string, BelovedBiography>()
  private documents = new Map<string, CaseDocument>()
  private obituaries = new Map<string, Obituary>()
  private packages = new Map<string, BereavementPackage>()

  async listCases (): Promise<BereavementCase[]> {
    return [...this.cases.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async getCase (id: string): Promise<BereavementCase | undefined> {
    return this.cases.get(id)
  }

  async saveCase (item: BereavementCase): Promise<BereavementCase> {
    this.cases.set(item.id, item)
    return item
  }

  async deleteCase (id: string): Promise<boolean> {
    return this.cases.delete(id)
  }

  async getBiography (caseId: string): Promise<BelovedBiography | undefined> {
    return this.biographies.get(caseId)
  }

  async saveBiography (item: BelovedBiography): Promise<BelovedBiography> {
    this.biographies.set(item.caseId, item)
    return item
  }

  async listDocuments (caseId: string): Promise<CaseDocument[]> {
    return [...this.documents.values()]
      .filter((doc) => doc.caseId === caseId)
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  }

  async getDocument (caseId: string, documentId: string): Promise<CaseDocument | undefined> {
    const doc = this.documents.get(documentId)
    if (!doc || doc.caseId !== caseId) return undefined
    return doc
  }

  async saveDocument (item: CaseDocument): Promise<CaseDocument> {
    this.documents.set(item.id, item)
    return item
  }

  async deleteDocument (caseId: string, documentId: string): Promise<boolean> {
    const existing = await this.getDocument(caseId, documentId)
    if (!existing) return false
    return this.documents.delete(documentId)
  }

  async listObituaries (caseId: string): Promise<Obituary[]> {
    return [...this.obituaries.values()]
      .filter((item) => item.caseId === caseId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async getObituary (caseId: string, obituaryId: string): Promise<Obituary | undefined> {
    const item = this.obituaries.get(obituaryId)
    if (!item || item.caseId !== caseId) return undefined
    return item
  }

  async saveObituary (item: Obituary): Promise<Obituary> {
    this.obituaries.set(item.id, item)
    return item
  }

  async listPackages (caseId: string): Promise<BereavementPackage[]> {
    return [...this.packages.values()]
      .filter((item) => item.caseId === caseId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async getPackage (caseId: string, packageId: string): Promise<BereavementPackage | undefined> {
    const item = this.packages.get(packageId)
    if (!item || item.caseId !== caseId) return undefined
    return item
  }

  async savePackage (item: BereavementPackage): Promise<BereavementPackage> {
    this.packages.set(item.id, item)
    return item
  }
}
