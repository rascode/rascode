import { Type, type Static } from '@sinclair/typebox'

export const CaseStatusSchema = Type.Union([
  Type.Literal('intake'),
  Type.Literal('gathering'),
  Type.Literal('drafting'),
  Type.Literal('ready_for_service'),
  Type.Literal('closed'),
])

export const DocumentCategorySchema = Type.Union([
  Type.Literal('death_certificate'),
  Type.Literal('photo'),
  Type.Literal('identification'),
  Type.Literal('will_or_directive'),
  Type.Literal('military_records'),
  Type.Literal('insurance'),
  Type.Literal('other'),
])

export const ObituaryToneSchema = Type.Union([
  Type.Literal('traditional'),
  Type.Literal('warm'),
  Type.Literal('celebratory'),
  Type.Literal('concise'),
  Type.Literal('faith_centered'),
])

export const ObituaryStatusSchema = Type.Union([
  Type.Literal('draft'),
  Type.Literal('revised'),
  Type.Literal('final'),
])

export const FamilyContactSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  relationship: Type.String({ minLength: 1 }),
  email: Type.Optional(Type.String({ format: 'email' })),
  phone: Type.Optional(Type.String()),
  isPrimary: Type.Optional(Type.Boolean()),
})

export const ServiceDetailsSchema = Type.Object({
  serviceDate: Type.Optional(Type.String()),
  serviceTime: Type.Optional(Type.String()),
  venueName: Type.Optional(Type.String()),
  venueAddress: Type.Optional(Type.String()),
  officiant: Type.Optional(Type.String()),
  visitationNotes: Type.Optional(Type.String()),
  burialOrCremation: Type.Optional(
    Type.Union([
      Type.Literal('burial'),
      Type.Literal('cremation'),
      Type.Literal('other'),
      Type.Literal('undecided'),
    ]),
  ),
  musicSelections: Type.Optional(Type.Array(Type.String())),
  readings: Type.Optional(Type.Array(Type.String())),
  pallbearers: Type.Optional(Type.Array(Type.String())),
  additionalNotes: Type.Optional(Type.String()),
})

export const CreateCaseBodySchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 1 })),
  familyContacts: Type.Optional(Type.Array(FamilyContactSchema)),
  service: Type.Optional(ServiceDetailsSchema),
  notes: Type.Optional(Type.String()),
})

export const UpdateCaseBodySchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 1 })),
  status: Type.Optional(CaseStatusSchema),
  familyContacts: Type.Optional(Type.Array(FamilyContactSchema)),
  service: Type.Optional(ServiceDetailsSchema),
  notes: Type.Optional(Type.String()),
})

export const CaseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  title: Type.String(),
  status: CaseStatusSchema,
  createdAt: Type.String(),
  updatedAt: Type.String(),
  familyContacts: Type.Array(FamilyContactSchema),
  service: ServiceDetailsSchema,
  notes: Type.Optional(Type.String()),
})

export const UpsertBiographyBodySchema = Type.Object({
  legalName: Type.String({ minLength: 1 }),
  preferredName: Type.Optional(Type.String()),
  dateOfBirth: Type.Optional(Type.String()),
  dateOfDeath: Type.Optional(Type.String()),
  placeOfBirth: Type.Optional(Type.String()),
  placeOfDeath: Type.Optional(Type.String()),
  ageAtDeath: Type.Optional(Type.Integer({ minimum: 0 })),
  occupation: Type.Optional(Type.String()),
  education: Type.Optional(Type.String()),
  militaryService: Type.Optional(Type.String()),
  spouseOrPartner: Type.Optional(Type.String()),
  children: Type.Optional(Type.Array(Type.String())),
  grandchildren: Type.Optional(Type.Array(Type.String())),
  siblings: Type.Optional(Type.Array(Type.String())),
  parents: Type.Optional(Type.Array(Type.String())),
  hobbies: Type.Optional(Type.Array(Type.String())),
  affiliations: Type.Optional(Type.Array(Type.String())),
  faithTradition: Type.Optional(Type.String()),
  memorableStories: Type.Optional(Type.Array(Type.String())),
  personalityTraits: Type.Optional(Type.Array(Type.String())),
  survivorList: Type.Optional(Type.Array(Type.String())),
  precededInDeathBy: Type.Optional(Type.Array(Type.String())),
  additionalNotes: Type.Optional(Type.String()),
})

export const BiographySchema = Type.Object({
  caseId: Type.String({ format: 'uuid' }),
  legalName: Type.String(),
  preferredName: Type.Optional(Type.String()),
  dateOfBirth: Type.Optional(Type.String()),
  dateOfDeath: Type.Optional(Type.String()),
  placeOfBirth: Type.Optional(Type.String()),
  placeOfDeath: Type.Optional(Type.String()),
  ageAtDeath: Type.Optional(Type.Integer()),
  occupation: Type.Optional(Type.String()),
  education: Type.Optional(Type.String()),
  militaryService: Type.Optional(Type.String()),
  spouseOrPartner: Type.Optional(Type.String()),
  children: Type.Optional(Type.Array(Type.String())),
  grandchildren: Type.Optional(Type.Array(Type.String())),
  siblings: Type.Optional(Type.Array(Type.String())),
  parents: Type.Optional(Type.Array(Type.String())),
  hobbies: Type.Optional(Type.Array(Type.String())),
  affiliations: Type.Optional(Type.Array(Type.String())),
  faithTradition: Type.Optional(Type.String()),
  memorableStories: Type.Optional(Type.Array(Type.String())),
  personalityTraits: Type.Optional(Type.Array(Type.String())),
  survivorList: Type.Optional(Type.Array(Type.String())),
  precededInDeathBy: Type.Optional(Type.Array(Type.String())),
  additionalNotes: Type.Optional(Type.String()),
  updatedAt: Type.String(),
})

export const DocumentSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  caseId: Type.String({ format: 'uuid' }),
  category: DocumentCategorySchema,
  filename: Type.String(),
  contentType: Type.String(),
  sizeBytes: Type.Integer(),
  storagePath: Type.String(),
  description: Type.Optional(Type.String()),
  uploadedAt: Type.String(),
})

export const DraftObituaryBodySchema = Type.Object({
  tone: Type.Optional(ObituaryToneSchema),
  promptNotes: Type.Optional(Type.String()),
  length: Type.Optional(
    Type.Union([
      Type.Literal('short'),
      Type.Literal('standard'),
      Type.Literal('long'),
    ]),
  ),
})

export const UpdateObituaryBodySchema = Type.Object({
  body: Type.Optional(Type.String({ minLength: 1 })),
  headline: Type.Optional(Type.String()),
  tone: Type.Optional(ObituaryToneSchema),
  status: Type.Optional(ObituaryStatusSchema),
  promptNotes: Type.Optional(Type.String()),
})

export const ObituarySchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  caseId: Type.String({ format: 'uuid' }),
  status: ObituaryStatusSchema,
  tone: ObituaryToneSchema,
  body: Type.String(),
  headline: Type.Optional(Type.String()),
  generatedBy: Type.Union([Type.Literal('ai'), Type.Literal('human')]),
  model: Type.Optional(Type.String()),
  promptNotes: Type.Optional(Type.String()),
  createdAt: Type.String(),
  updatedAt: Type.String(),
})

export const PdfTemplateSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.String(),
  style: Type.Union([
    Type.Literal('classic'),
    Type.Literal('modern'),
    Type.Literal('garden'),
    Type.Literal('faith'),
  ]),
  pageSize: Type.Union([Type.Literal('letter'), Type.Literal('half_letter')]),
  includesObituary: Type.Boolean(),
  includesServiceProgram: Type.Boolean(),
  previewSummary: Type.String(),
})

export const ServiceProgramSchema = Type.Object({
  orderOfService: Type.Optional(Type.Array(Type.String())),
  welcomeMessage: Type.Optional(Type.String()),
  acknowledgements: Type.Optional(Type.String()),
  donationRequests: Type.Optional(Type.String()),
})

export const CreatePackageBodySchema = Type.Object({
  templateId: Type.String({ minLength: 1 }),
  obituaryId: Type.String({ format: 'uuid' }),
  program: Type.Optional(ServiceProgramSchema),
})

export const PackageSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  caseId: Type.String({ format: 'uuid' }),
  templateId: Type.String(),
  obituaryId: Type.String({ format: 'uuid' }),
  status: Type.Union([
    Type.Literal('pending'),
    Type.Literal('ready'),
    Type.Literal('failed'),
  ]),
  program: ServiceProgramSchema,
  filename: Type.Optional(Type.String()),
  storagePath: Type.Optional(Type.String()),
  errorMessage: Type.Optional(Type.String()),
  createdAt: Type.String(),
  updatedAt: Type.String(),
})

export const ErrorSchema = Type.Object({
  error: Type.String(),
  message: Type.String(),
  details: Type.Optional(Type.Unknown()),
})

export const IdParamsSchema = Type.Object({
  caseId: Type.String({ format: 'uuid' }),
})

export const DocumentParamsSchema = Type.Object({
  caseId: Type.String({ format: 'uuid' }),
  documentId: Type.String({ format: 'uuid' }),
})

export const ObituaryParamsSchema = Type.Object({
  caseId: Type.String({ format: 'uuid' }),
  obituaryId: Type.String({ format: 'uuid' }),
})

export const PackageParamsSchema = Type.Object({
  caseId: Type.String({ format: 'uuid' }),
  packageId: Type.String({ format: 'uuid' }),
})

export const TemplateParamsSchema = Type.Object({
  templateId: Type.String({ minLength: 1 }),
})

export type CreateCaseBody = Static<typeof CreateCaseBodySchema>
export type UpdateCaseBody = Static<typeof UpdateCaseBodySchema>
export type UpsertBiographyBody = Static<typeof UpsertBiographyBodySchema>
export type DraftObituaryBody = Static<typeof DraftObituaryBodySchema>
export type UpdateObituaryBody = Static<typeof UpdateObituaryBodySchema>
export type CreatePackageBody = Static<typeof CreatePackageBodySchema>
