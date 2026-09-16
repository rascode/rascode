import type { FastifyPluginAsync } from 'fastify'
import { Type } from '@sinclair/typebox'
import {
  BiographySchema,
  CaseSchema,
  CreateCaseBodySchema,
  CreatePackageBodySchema,
  DocumentParamsSchema,
  DocumentSchema,
  DraftObituaryBodySchema,
  ErrorSchema,
  IdParamsSchema,
  ObituaryParamsSchema,
  ObituarySchema,
  PackageParamsSchema,
  PackageSchema,
  PdfTemplateSchema,
  TemplateParamsSchema,
  UpdateCaseBodySchema,
  UpdateObituaryBodySchema,
  UpsertBiographyBodySchema,
  type CreateCaseBody,
  type CreatePackageBody,
  type DraftObituaryBody,
  type UpdateCaseBody,
  type UpdateObituaryBody,
  type UpsertBiographyBody,
} from '../schemas/index.ts'
import { AppError } from '../lib/errors.ts'
import { readBinaryFile } from '../lib/files.ts'
import type { DocumentCategory } from '../types.ts'

export const bereavementRoutes: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({
        error: error.code,
        message: error.message,
        details: error.details,
      })
      return
    }

    if (typeof error === 'object' && error !== null && 'validation' in error) {
      const validationError = error as { message: string; validation?: unknown }
      reply.code(400).send({
        error: 'validation_error',
        message: validationError.message,
        details: validationError.validation,
      })
      return
    }

    app.log.error(error)
    reply.code(500).send({
      error: 'internal_error',
      message: 'Unexpected server error',
    })
  })

  app.get('/health', async () => ({ status: 'ok', service: 'bereavement-api' }))

  app.get('/api/v1/templates', {
    schema: {
      response: {
        200: Type.Object({ templates: Type.Array(PdfTemplateSchema) }),
      },
    },
  }, async () => ({
    templates: app.services.packages.listTemplates(),
  }))

  app.get<{ Params: { templateId: string } }>('/api/v1/templates/:templateId', {
    schema: {
      params: TemplateParamsSchema,
      response: {
        200: PdfTemplateSchema,
        404: ErrorSchema,
      },
    },
  }, async (request) => app.services.packages.getTemplate(request.params.templateId))

  app.get('/api/v1/cases', {
    schema: {
      response: {
        200: Type.Object({ cases: Type.Array(CaseSchema) }),
      },
    },
  }, async () => ({
    cases: await app.services.cases.list(),
  }))

  app.post<{ Body: CreateCaseBody }>('/api/v1/cases', {
    schema: {
      body: CreateCaseBodySchema,
      response: {
        201: CaseSchema,
        400: ErrorSchema,
      },
    },
  }, async (request, reply) => {
    const created = await app.services.cases.create(request.body)
    reply.code(201)
    return created
  })

  app.get<{ Params: { caseId: string } }>('/api/v1/cases/:caseId', {
    schema: {
      params: IdParamsSchema,
      response: {
        200: CaseSchema,
        404: ErrorSchema,
      },
    },
  }, async (request) => app.services.cases.get(request.params.caseId))

  app.patch<{ Params: { caseId: string }; Body: UpdateCaseBody }>('/api/v1/cases/:caseId', {
    schema: {
      params: IdParamsSchema,
      body: UpdateCaseBodySchema,
      response: {
        200: CaseSchema,
        400: ErrorSchema,
        404: ErrorSchema,
      },
    },
  }, async (request) => app.services.cases.update(request.params.caseId, request.body))

  app.put<{ Params: { caseId: string }; Body: UpsertBiographyBody }>(
    '/api/v1/cases/:caseId/biography',
    {
      schema: {
        params: IdParamsSchema,
        body: UpsertBiographyBodySchema,
        response: {
          200: BiographySchema,
          400: ErrorSchema,
          404: ErrorSchema,
        },
      },
    },
    async (request) => app.services.biography.upsert(request.params.caseId, request.body),
  )

  app.get<{ Params: { caseId: string } }>('/api/v1/cases/:caseId/biography', {
    schema: {
      params: IdParamsSchema,
      response: {
        200: BiographySchema,
        404: ErrorSchema,
      },
    },
  }, async (request) => app.services.biography.get(request.params.caseId))

  app.get<{ Params: { caseId: string } }>('/api/v1/cases/:caseId/documents', {
    schema: {
      params: IdParamsSchema,
      response: {
        200: Type.Object({ documents: Type.Array(DocumentSchema) }),
        404: ErrorSchema,
      },
    },
  }, async (request) => ({
    documents: await app.services.documents.list(request.params.caseId),
  }))

  app.post<{ Params: { caseId: string } }>('/api/v1/cases/:caseId/documents', {
    schema: {
      params: IdParamsSchema,
      response: {
        201: DocumentSchema,
        400: ErrorSchema,
        404: ErrorSchema,
      },
    },
  }, async (request, reply) => {
    const file = await request.file()
    if (!file) {
      throw new AppError(400, 'bad_request', 'Multipart file field is required')
    }

    const buffer = await file.toBuffer()
    const query = request.query as { category?: string; description?: string }
    const fieldValue = (name: string): string | undefined => {
      const entry = file.fields[name]
      if (!entry) return undefined
      const part = Array.isArray(entry) ? entry[0] : entry
      if (part && 'value' in part) return String(part.value)
      return undefined
    }

    const created = await app.services.documents.upload({
      caseId: request.params.caseId,
      category: (fieldValue('category') || query.category || 'other') as DocumentCategory,
      filename: file.filename,
      contentType: file.mimetype,
      buffer,
      description: fieldValue('description') || query.description,
    })
    reply.code(201)
    return created
  })

  app.get<{ Params: { caseId: string; documentId: string } }>(
    '/api/v1/cases/:caseId/documents/:documentId',
    {
      schema: {
        params: DocumentParamsSchema,
        response: {
          200: DocumentSchema,
          404: ErrorSchema,
        },
      },
    },
    async (request) => app.services.documents.get(request.params.caseId, request.params.documentId),
  )

  app.delete<{ Params: { caseId: string; documentId: string } }>(
    '/api/v1/cases/:caseId/documents/:documentId',
    {
      schema: {
        params: DocumentParamsSchema,
        response: {
          204: Type.Null(),
          404: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      await app.services.documents.remove(request.params.caseId, request.params.documentId)
      reply.code(204).send()
    },
  )

  app.post<{ Params: { caseId: string }; Body: DraftObituaryBody }>(
    '/api/v1/cases/:caseId/obituaries/draft',
    {
      schema: {
        params: IdParamsSchema,
        body: DraftObituaryBodySchema,
        response: {
          201: ObituarySchema,
          400: ErrorSchema,
          404: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const drafted = await app.services.obituaries.draft(request.params.caseId, request.body ?? {})
      reply.code(201)
      return drafted
    },
  )

  app.get<{ Params: { caseId: string } }>('/api/v1/cases/:caseId/obituaries', {
    schema: {
      params: IdParamsSchema,
      response: {
        200: Type.Object({ obituaries: Type.Array(ObituarySchema) }),
        404: ErrorSchema,
      },
    },
  }, async (request) => ({
    obituaries: await app.services.obituaries.list(request.params.caseId),
  }))

  app.get<{ Params: { caseId: string; obituaryId: string } }>(
    '/api/v1/cases/:caseId/obituaries/:obituaryId',
    {
      schema: {
        params: ObituaryParamsSchema,
        response: {
          200: ObituarySchema,
          404: ErrorSchema,
        },
      },
    },
    async (request) => app.services.obituaries.get(request.params.caseId, request.params.obituaryId),
  )

  app.patch<{ Params: { caseId: string; obituaryId: string }; Body: UpdateObituaryBody }>(
    '/api/v1/cases/:caseId/obituaries/:obituaryId',
    {
      schema: {
        params: ObituaryParamsSchema,
        body: UpdateObituaryBodySchema,
        response: {
          200: ObituarySchema,
          400: ErrorSchema,
          404: ErrorSchema,
        },
      },
    },
    async (request) =>
      app.services.obituaries.update(
        request.params.caseId,
        request.params.obituaryId,
        request.body,
      ),
  )

  app.post<{ Params: { caseId: string; obituaryId: string } }>(
    '/api/v1/cases/:caseId/obituaries/:obituaryId/finalize',
    {
      schema: {
        params: ObituaryParamsSchema,
        response: {
          200: ObituarySchema,
          404: ErrorSchema,
        },
      },
    },
    async (request) =>
      app.services.obituaries.finalize(request.params.caseId, request.params.obituaryId),
  )

  app.post<{ Params: { caseId: string }; Body: CreatePackageBody }>(
    '/api/v1/cases/:caseId/packages',
    {
      schema: {
        params: IdParamsSchema,
        body: CreatePackageBodySchema,
        response: {
          201: PackageSchema,
          400: ErrorSchema,
          404: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const created = await app.services.packages.create(request.params.caseId, request.body)
      reply.code(201)
      return created
    },
  )

  app.get<{ Params: { caseId: string } }>('/api/v1/cases/:caseId/packages', {
    schema: {
      params: IdParamsSchema,
      response: {
        200: Type.Object({ packages: Type.Array(PackageSchema) }),
        404: ErrorSchema,
      },
    },
  }, async (request) => ({
    packages: await app.services.packages.list(request.params.caseId),
  }))

  app.get<{ Params: { caseId: string; packageId: string } }>(
    '/api/v1/cases/:caseId/packages/:packageId',
    {
      schema: {
        params: PackageParamsSchema,
        response: {
          200: PackageSchema,
          404: ErrorSchema,
        },
      },
    },
    async (request) => app.services.packages.get(request.params.caseId, request.params.packageId),
  )

  app.get<{ Params: { caseId: string; packageId: string } }>(
    '/api/v1/cases/:caseId/packages/:packageId/download',
    {
      schema: {
        params: PackageParamsSchema,
        response: {
          404: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const pkg = await app.services.packages.get(request.params.caseId, request.params.packageId)
      if (pkg.status !== 'ready' || !pkg.storagePath || !pkg.filename) {
        throw new AppError(409, 'conflict', 'Package PDF is not ready for download')
      }
      const data = await readBinaryFile(pkg.storagePath)
      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${pkg.filename}"`)
        .send(data)
    },
  )
}
