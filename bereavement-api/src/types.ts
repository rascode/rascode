/**
 * Domain types for the bereavement arrangements API.
 * Designed to sit alongside a dbui / PostgreSQL-backed family record system.
 */

export type CaseStatus =
  | 'intake'
  | 'gathering'
  | 'drafting'
  | 'ready_for_service'
  | 'closed'

export type DocumentCategory =
  | 'death_certificate'
  | 'photo'
  | 'identification'
  | 'will_or_directive'
  | 'military_records'
  | 'insurance'
  | 'other'

export type ObituaryStatus = 'draft' | 'revised' | 'final'

export type PackageStatus = 'pending' | 'ready' | 'failed'

export interface FamilyContact {
  name: string
  relationship: string
  email?: string
  phone?: string
  isPrimary?: boolean
}

export interface ServiceDetails {
  serviceDate?: string
  serviceTime?: string
  venueName?: string
  venueAddress?: string
  officiant?: string
  visitationNotes?: string
  burialOrCremation?: 'burial' | 'cremation' | 'other' | 'undecided'
  musicSelections?: string[]
  readings?: string[]
  pallbearers?: string[]
  additionalNotes?: string
}

export interface BereavementCase {
  id: string
  title: string
  status: CaseStatus
  createdAt: string
  updatedAt: string
  familyContacts: FamilyContact[]
  service: ServiceDetails
  notes?: string
}

export interface BelovedBiography {
  caseId: string
  legalName: string
  preferredName?: string
  dateOfBirth?: string
  dateOfDeath?: string
  placeOfBirth?: string
  placeOfDeath?: string
  ageAtDeath?: number
  occupation?: string
  education?: string
  militaryService?: string
  spouseOrPartner?: string
  children?: string[]
  grandchildren?: string[]
  siblings?: string[]
  parents?: string[]
  hobbies?: string[]
  affiliations?: string[]
  faithTradition?: string
  memorableStories?: string[]
  personalityTraits?: string[]
  survivorList?: string[]
  precededInDeathBy?: string[]
  additionalNotes?: string
  updatedAt: string
}

export interface CaseDocument {
  id: string
  caseId: string
  category: DocumentCategory
  filename: string
  contentType: string
  sizeBytes: number
  storagePath: string
  description?: string
  uploadedAt: string
}

export interface Obituary {
  id: string
  caseId: string
  status: ObituaryStatus
  tone: ObituaryTone
  body: string
  headline?: string
  generatedBy: 'ai' | 'human'
  model?: string
  promptNotes?: string
  createdAt: string
  updatedAt: string
}

export type ObituaryTone =
  | 'traditional'
  | 'warm'
  | 'celebratory'
  | 'concise'
  | 'faith_centered'

export interface PdfTemplate {
  id: string
  name: string
  description: string
  style: 'classic' | 'modern' | 'garden' | 'faith'
  pageSize: 'letter' | 'half_letter'
  includesObituary: boolean
  includesServiceProgram: boolean
  previewSummary: string
}

export interface ServiceProgramContent {
  orderOfService?: string[]
  welcomeMessage?: string
  acknowledgements?: string
  donationRequests?: string
}

export interface BereavementPackage {
  id: string
  caseId: string
  templateId: string
  obituaryId: string
  status: PackageStatus
  program: ServiceProgramContent
  filename?: string
  storagePath?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export interface CreateCaseInput {
  title?: string
  familyContacts?: FamilyContact[]
  service?: ServiceDetails
  notes?: string
}

export interface UpdateCaseInput {
  title?: string
  status?: CaseStatus
  familyContacts?: FamilyContact[]
  service?: ServiceDetails
  notes?: string
}

export interface UpsertBiographyInput {
  legalName: string
  preferredName?: string
  dateOfBirth?: string
  dateOfDeath?: string
  placeOfBirth?: string
  placeOfDeath?: string
  ageAtDeath?: number
  occupation?: string
  education?: string
  militaryService?: string
  spouseOrPartner?: string
  children?: string[]
  grandchildren?: string[]
  siblings?: string[]
  parents?: string[]
  hobbies?: string[]
  affiliations?: string[]
  faithTradition?: string
  memorableStories?: string[]
  personalityTraits?: string[]
  survivorList?: string[]
  precededInDeathBy?: string[]
  additionalNotes?: string
}

export interface DraftObituaryInput {
  tone?: ObituaryTone
  promptNotes?: string
  length?: 'short' | 'standard' | 'long'
}

export interface UpdateObituaryInput {
  body?: string
  headline?: string
  tone?: ObituaryTone
  status?: ObituaryStatus
  promptNotes?: string
}

export interface CreatePackageInput {
  templateId: string
  obituaryId: string
  program?: ServiceProgramContent
}
