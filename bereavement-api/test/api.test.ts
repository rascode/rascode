import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { buildApp } from '../src/app.ts'
import { MemoryStore } from '../src/store/memory-store.ts'
import type { AppConfig } from '../src/config.ts'

describe('bereavement API', () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  let root: string

  before(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'bereavement-api-'))
    const config: AppConfig = {
      host: '127.0.0.1',
      port: 0,
      uploadDir: path.join(root, 'uploads'),
      generatedDir: path.join(root, 'generated'),
      openaiModel: 'gpt-4o-mini',
    }
    app = await buildApp({
      config,
      store: new MemoryStore(),
      logger: false,
    })
    await app.ready()
  })

  after(async () => {
    await app.close()
    await rm(root, { recursive: true, force: true })
  })

  it('lists predefined PDF templates', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/templates' })
    assert.equal(response.statusCode, 200)
    const body = response.json()
    assert.ok(body.templates.length >= 4)
    assert.ok(body.templates.some((t: { id: string }) => t.id === 'classic-letter'))
  })

  it('runs the full arrangement flow', async () => {
    const createdCase = await app.inject({
      method: 'POST',
      url: '/api/v1/cases',
      payload: {
        title: 'Remembering Jordan Lee',
        familyContacts: [
          {
            name: 'Alex Lee',
            relationship: 'spouse',
            email: 'alex@example.com',
            isPrimary: true,
          },
        ],
        service: {
          serviceDate: '2026-10-04',
          serviceTime: '11:00 AM',
          venueName: 'Harbor Chapel',
          musicSelections: ['Amazing Grace'],
          readings: ['Psalm 23'],
        },
      },
    })
    assert.equal(createdCase.statusCode, 201)
    const caseBody = createdCase.json()
    const caseId = caseBody.id as string

    const bio = await app.inject({
      method: 'PUT',
      url: `/api/v1/cases/${caseId}/biography`,
      payload: {
        legalName: 'Jordan Avery Lee',
        preferredName: 'Jordan Lee',
        dateOfBirth: '1958-03-12',
        dateOfDeath: '2026-09-10',
        placeOfBirth: 'Portland, OR',
        placeOfDeath: 'Seattle, WA',
        ageAtDeath: 68,
        occupation: 'pediatric nurse',
        spouseOrPartner: 'Alex Lee',
        children: ['Sam Lee', 'Riley Lee'],
        hobbies: ['gardening', 'choir'],
        personalityTraits: ['gentle', 'witty'],
        survivorList: ['Alex Lee', 'Sam Lee', 'Riley Lee'],
        memorableStories: ['hosted neighborhood potlucks every summer'],
      },
    })
    assert.equal(bio.statusCode, 200)
    assert.equal(bio.json().legalName, 'Jordan Avery Lee')

    const form = new FormData()
    form.append('category', 'photo')
    form.append('description', 'Favorite portrait')
    form.append(
      'file',
      new Blob(['fake-image-bytes'], { type: 'image/jpeg' }),
      'jordan-portrait.jpg',
    )

    const docResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${caseId}/documents`,
      payload: form,
    })

    // Fastify inject with FormData / Blob support varies; fall back to raw multipart
    let documentId: string
    if (docResponse.statusCode === 201) {
      documentId = docResponse.json().id
    } else {
      const boundary = '----bereavementBoundary'
      const multipartBody = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="category"',
        '',
        'photo',
        `--${boundary}`,
        'Content-Disposition: form-data; name="description"',
        '',
        'Favorite portrait',
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="jordan-portrait.jpg"',
        'Content-Type: image/jpeg',
        '',
        'fake-image-bytes',
        `--${boundary}--`,
        '',
      ].join('\r\n')

      const rawUpload = await app.inject({
        method: 'POST',
        url: `/api/v1/cases/${caseId}/documents`,
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload: multipartBody,
      })
      assert.equal(rawUpload.statusCode, 201, rawUpload.body)
      documentId = rawUpload.json().id
    }
    assert.ok(documentId)

    const draft = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${caseId}/obituaries/draft`,
      payload: {
        tone: 'warm',
        length: 'standard',
        promptNotes: 'Keep the tone hopeful and mention the garden.',
      },
    })
    assert.equal(draft.statusCode, 201, draft.body)
    const obituary = draft.json()
    assert.match(obituary.body, /Jordan/)
    assert.equal(obituary.generatedBy, 'ai')
    assert.equal(obituary.status, 'draft')

    const finalized = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${caseId}/obituaries/${obituary.id}/finalize`,
    })
    assert.equal(finalized.statusCode, 200)
    assert.equal(finalized.json().status, 'final')

    const pkg = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${caseId}/packages`,
      payload: {
        templateId: 'classic-letter',
        obituaryId: obituary.id,
        program: {
          welcomeMessage: 'Welcome as we celebrate Jordan’s life.',
          donationRequests: 'In lieu of flowers, please support Harbor Hospice.',
        },
      },
    })
    assert.equal(pkg.statusCode, 201, pkg.body)
    const packageBody = pkg.json()
    assert.equal(packageBody.status, 'ready')
    assert.ok(packageBody.filename?.endsWith('.pdf'))

    const download = await app.inject({
      method: 'GET',
      url: `/api/v1/cases/${caseId}/packages/${packageBody.id}/download`,
    })
    assert.equal(download.statusCode, 200)
    assert.equal(download.headers['content-type'], 'application/pdf')
    assert.ok(download.rawPayload.length > 500)

    const updatedCase = await app.inject({
      method: 'GET',
      url: `/api/v1/cases/${caseId}`,
    })
    assert.equal(updatedCase.json().status, 'ready_for_service')
  })

  it('rejects obituary drafting without biography', async () => {
    const createdCase = await app.inject({
      method: 'POST',
      url: '/api/v1/cases',
      payload: { title: 'Incomplete case' },
    })
    const caseId = createdCase.json().id
    const draft = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${caseId}/obituaries/draft`,
      payload: {},
    })
    assert.equal(draft.statusCode, 400)
    assert.match(draft.json().message, /Biography is required/)
  })

  it('returns 404 for unknown templates', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/templates/does-not-exist',
    })
    assert.equal(response.statusCode, 404)
  })
})
